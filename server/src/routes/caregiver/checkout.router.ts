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
      const result = await validateCartItems(caregiverUid);

      // Filter to requested items only (best-effort for invalid/photos-needed cases)
      let checkoutItems = result.readyToPay;
      let photosNeeded = result.photosNeeded;
      let invalidItems = result.invalid;

      if (cartItemIds?.length) {
        const requestedIds = new Set(cartItemIds);
        checkoutItems = result.readyToPay.filter((item) => requestedIds.has(item.cartItemId));
        invalidItems = result.invalid.filter((e) => requestedIds.has(e.cartItemId));
      } else if (previewIds?.length) {
        const requestedPreviews = new Set(previewIds);
        checkoutItems = result.readyToPay.filter((item) => requestedPreviews.has(item.previewId));
        photosNeeded = result.photosNeeded.filter((p) => requestedPreviews.has(p.previewId));
      }

      if (photosNeeded.length > 0) {
        res.status(400).json({
          success: false,
          error: "photos_required",
          photosNeeded,
          invalidItems,
          message: "Please re-upload photos for the listed children before checkout",
        });
        return;
      }

      if (invalidItems.length > 0) {
        res.status(400).json({
          success: false,
          error: "invalid_items",
          invalidItems,
        });
        return;
      }

      if (checkoutItems.length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid items for checkout",
          invalidItems,
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
        // Fixed ("Buy Story") purchases have no child data — describe them as
        // the original story rather than "Personalized story for " (blank name).
        description: item.childFirstName
          ? `Personalized story for ${item.childFirstName}`
          : `Original story: ${item.templateTitle}`,
        amountCents: item.priceCents,
        currency: item.currency,
        quantity: 1,
        metadata: {
          previewId: item.previewId,
          templateId: item.templateId,
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
        cancelUrl: `${process.env.FRONTEND_URL || "https://app.example.com"}/checkout/cancel`,
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
          personalizedStoryId: null,
          itemType: item.childFirstName ? "personalized" : "template",
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

interface PaymentEvent {
  type: string;
  data?: {
    sessionId?: string;
    chargeId?: string;
    failureReason?: string;
  };
}

/**
 * Applies a payment-provider event to the matching purchase(s). Shared by the
 * real webhook route and the sandbox-only mock-simulate route so both paths
 * exercise identical purchase-finalization logic.
 *
 * On payment success: updates purchase to "paid", triggers full story generation.
 * On payment failure: updates purchase to "failed" and reverts the preview.
 * Idempotent: purchases not in "pending" status are skipped.
 */
export async function processPaymentEvent(event: PaymentEvent): Promise<void> {
  const sessionId = event.data?.sessionId;
  if (!sessionId) {
    throw new Error("Missing sessionId in payment event");
  }

  const purchasesQuery = await db
    .collectionGroup("purchases")
    .where("paymentSessionId", "==", sessionId)
    .get();

  if (purchasesQuery.empty) {
    console.warn(`No purchases found for session: ${sessionId}`);
    return;
  }

  if (event.type === "payment.success" || event.type === "checkout.completed") {
    for (const purchaseDoc of purchasesQuery.docs) {
      const purchase = purchaseDoc.data() as Purchase;

      // Skip already processed purchases (idempotency)
      if (purchase.status !== "pending") {
        continue;
      }

      await purchaseDoc.ref.update({
        status: "paid",
        paidAt: new Date().toISOString(),
        paymentChargeId: event.data?.chargeId || null,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Trigger full story generation
      generateFullStory(purchase.purchaseId, purchase.previewId).catch((error) => {
        console.error(
          `Full story generation trigger failed for purchase ${purchase.purchaseId}:`,
          error
        );
      });
    }
  } else if (event.type === "payment.failed") {
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
}

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

      const event = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as PaymentEvent;

      if (!event.data?.sessionId) {
        res.status(400).json({
          success: false,
          error: "Missing sessionId in webhook payload",
        });
        return;
      }

      await processPaymentEvent(event);

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

/**
 * POST /api/caregiver/checkout/mock-simulate
 *
 * Sandbox-only endpoint used by the mock checkout page to simulate the
 * callback a real payment provider would send. Only reachable while the
 * registered provider is the MockPaymentProvider — once a real gateway is
 * registered, this route always 404s, so it can never bypass real payments.
 *
 * Input: { sessionId: string, outcome: "success" | "failure" }
 */
router.post(
  "/mock-simulate",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    const paymentProvider = requirePaymentProvider();
    if (paymentProvider.providerId !== "mock") {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const { sessionId, outcome } = req.body as {
      sessionId?: string;
      outcome?: "success" | "failure";
    };

    if (!sessionId || (outcome !== "success" && outcome !== "failure")) {
      res.status(400).json({
        success: false,
        error: "sessionId and outcome ('success' | 'failure') are required",
      });
      return;
    }

    try {
      const event: PaymentEvent =
        outcome === "success"
          ? { type: "checkout.completed", data: { sessionId, chargeId: `mock_ch_${sessionId}` } }
          : {
              type: "payment.failed",
              data: { sessionId, failureReason: "Simulated decline (mock payment provider)" },
            };

      await processPaymentEvent(event);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Mock payment simulation error:", error);
      const message = error instanceof Error ? error.message : "Simulation failed";
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
