import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { cartItemConverter } from "../../shared/firestore/converters";
import { validateCartItems } from "../../services/cart.service";
import { generateFullStory } from "../../services/fullStoryGeneration.service";
import { PaymentProvider } from "../../shared/types/paymentProvider";
import { Purchase } from "../../shared/types/purchase";

const router = Router();

let _paymentProvider: PaymentProvider | null = null;

/**
 * Register the payment provider at application startup.
 */
export function registerPaymentProvider(provider: PaymentProvider): void {
  _paymentProvider = provider;
}

function requirePaymentProvider(): PaymentProvider {
  if (!_paymentProvider) {
    throw new Error(
      "Payment provider is not configured. " +
      "Call registerPaymentProvider() at application startup."
    );
  }
  return _paymentProvider;
}

/**
 * POST /api/caregiver/checkout
 *
 * Initiates checkout for cart items or specific previews.
 * Validates all items, creates pending purchase documents,
 * and returns the payment provider's checkout URL.
 *
 * Input: { cartItemIds: string[] } OR { previewIds: string[] }
 */
router.post(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const caregiverEmail = req.caregiverUser!.email;
      const { cartItemIds, previewIds } = req.body as {
        cartItemIds?: string[];
        previewIds?: string[];
      };

      if (!cartItemIds?.length && !previewIds?.length) {
        res.status(400).json({
          success: false,
          error: "cartItemIds or previewIds is required",
        });
        return;
      }

      // Validate cart items
      const { valid, invalid } = await validateCartItems(caregiverUid);

      // Filter to requested items only
      let checkoutItems = valid;
      if (cartItemIds?.length) {
        const requestedIds = new Set(cartItemIds);
        checkoutItems = valid.filter((item) => requestedIds.has(item.cartItemId));
      } else if (previewIds?.length) {
        const requestedPreviews = new Set(previewIds);
        checkoutItems = valid.filter((item) => requestedPreviews.has(item.previewId));
      }

      if (checkoutItems.length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid items for checkout",
          invalidItems: invalid,
        });
        return;
      }

      // Load caregiver for payment customer ID
      const caregiverDoc = await db
        .collection(COLLECTIONS.CAREGIVERS)
        .doc(caregiverUid)
        .get();

      const paymentCustomerId = caregiverDoc.exists
        ? (caregiverDoc.data()?.paymentCustomerId as string | null)
        : null;

      const paymentProvider = requirePaymentProvider();

      // Build line items
      const lineItems = checkoutItems.map((item) => ({
        name: item.templateTitle,
        description: `Personalized story for ${item.childFirstName}`,
        amountCents: item.priceCents,
        currency: item.currency,
        quantity: 1,
        metadata: {
          previewId: item.previewId,
          templateId: item.templateId,
          childId: item.childId,
          cartItemId: item.cartItemId,
        },
      }));

      // Build metadata for the session
      const sessionMetadata: Record<string, string> = {
        caregiverUid,
        itemCount: String(checkoutItems.length),
      };

      // Create checkout session with payment provider
      const session = await paymentProvider.createCheckoutSession({
        customerId: paymentCustomerId,
        customerEmail: caregiverEmail,
        lineItems,
        successUrl: `${process.env.FRONTEND_URL || "https://app.example.com"}/checkout/success?session_id={SESSION_ID}`,
        cancelUrl: `${process.env.FRONTEND_URL || "https://app.example.com"}/cart`,
        metadata: sessionMetadata,
      });

      // Create pending purchase documents for each item
      const batch = db.batch();
      const purchaseIds: string[] = [];

      for (const item of checkoutItems) {
        const purchaseRef = db
          .collection(COLLECTIONS.purchases(caregiverUid))
          .doc();
        const purchaseId = purchaseRef.id;
        purchaseIds.push(purchaseId);

        const purchaseData: Purchase = {
          purchaseId,
          caregiverUid,
          previewId: item.previewId,
          templateId: item.templateId,
          childId: item.childId,
          personalizedStoryId: null,
          paymentTransactionId: session.paymentIntentId,
          paymentSessionId: session.sessionId,
          paymentChargeId: null,
          amountCents: item.priceCents,
          currency: item.currency,
          status: "pending",
          paidAt: null,
          completedAt: null,
          failedAt: null,
          failureReason: null,
          refundedAt: null,
          paymentRefundId: null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };

        batch.set(purchaseRef, purchaseData);

        // Update preview status
        const previewRef = db
          .collection(COLLECTIONS.STORY_PREVIEWS)
          .doc(item.previewId);
        batch.update(previewRef, {
          status: "purchased",
          purchaseId,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      await batch.commit();

      res.status(200).json({
        success: true,
        data: {
          checkoutUrl: session.checkoutUrl,
          sessionId: session.sessionId,
          purchaseIds,
        },
      });
    } catch (error) {
      console.error("Checkout error:", error);
      const message = error instanceof Error ? error.message : "Checkout failed";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/caregiver/checkout/webhook
 *
 * Webhook from payment provider.
 * No auth (verified by signature).
 *
 * On payment success: updates purchase to "paid", triggers full story generation.
 * On payment failure: updates purchase to "failed".
 */
router.post(
  "/webhook",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentProvider = requirePaymentProvider();

      // Verify webhook signature
      const signature = req.headers["x-payment-signature"] as string || "";
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

      if (!paymentProvider.verifyWebhookSignature(rawBody, signature)) {
        res.status(400).json({
          success: false,
          error: "Invalid webhook signature",
        });
        return;
      }

      const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const eventType = event.type as string;
      const sessionId = event.data?.sessionId as string;
      const chargeId = event.data?.chargeId as string | undefined;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: "Missing sessionId in webhook payload",
        });
        return;
      }

      // Find purchases by paymentSessionId
      const purchasesQuery = await db
        .collectionGroup("purchases")
        .where("paymentSessionId", "==", sessionId)
        .get();

      if (purchasesQuery.empty) {
        console.warn(`No purchases found for session: ${sessionId}`);
        res.status(200).json({ success: true, message: "No matching purchases" });
        return;
      }

      if (eventType === "payment.success" || eventType === "checkout.completed") {
        // Payment successful
        for (const purchaseDoc of purchasesQuery.docs) {
          const purchase = purchaseDoc.data() as Purchase;

          // Skip already processed purchases (idempotency)
          if (purchase.status !== "pending") {
            continue;
          }

          await purchaseDoc.ref.update({
            status: "paid",
            paidAt: new Date().toISOString(),
            paymentChargeId: chargeId || null,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          // Trigger full story generation
          generateFullStory(purchase.purchaseId, purchase.previewId).catch(
            (error) => {
              console.error(
                `Full story generation trigger failed for purchase ${purchase.purchaseId}:`,
                error
              );
            }
          );
        }
      } else if (eventType === "payment.failed") {
        // Payment failed
        for (const purchaseDoc of purchasesQuery.docs) {
          const purchase = purchaseDoc.data() as Purchase;

          if (purchase.status !== "pending") {
            continue;
          }

          await purchaseDoc.ref.update({
            status: "failed",
            failedAt: new Date().toISOString(),
            failureReason: event.data?.failureReason || "Payment failed",
            updatedAt: admin.firestore.Timestamp.now(),
          });

          // Revert preview status
          await db
            .collection(COLLECTIONS.STORY_PREVIEWS)
            .doc(purchase.previewId)
            .update({
              status: "ready",
              purchaseId: null,
              updatedAt: admin.firestore.Timestamp.now(),
            });
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({
        success: false,
        error: "Webhook processing failed",
      });
    }
  }
);

export default router;
