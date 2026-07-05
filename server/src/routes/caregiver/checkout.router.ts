import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { cartItemConverter } from "../../shared/firestore/converters";
import { validateCartItems } from "../../services/cart.service";
import { generateFullStory } from "../../services/fullStoryGeneration.service";
import { PaymentProvider } from "../../shared/types/paymentProvider";
import { Purchase } from "../../shared/types/purchase";
import { CartItem } from "../../shared/types/cartItem";
import { PurchaseFormat } from "../../shared/types/commerce";
import {
  PurchasePricingError,
  resolveTemplatePurchasePricing,
} from "../../services/purchasePricing.service";
import { validateShippingDetails } from "../../services/shippingValidation.service";

const router = Router();

export interface CheckoutItemPricingResult {
  valid: boolean;
  reason?: string;
  purchaseFormat?: PurchaseFormat;
  priceCents?: number;
  currency?: string;
}

/**
 * Resolves server-side price/currency for a single cart item at checkout,
 * and — for print items — re-validates shipping/contact details before the
 * item can proceed to a pending purchase.
 *
 * cart.router.ts already validates shippingDetails when a print item is
 * added to the cart, but that's a UX check at add-time, not a security
 * boundary: the cart Firestore rules allow the owning buyer to write cart
 * items directly (bypassing the REST API), so checkout — the point where a
 * pending Purchase and payment session are actually created — must
 * re-validate independently rather than trust whatever is stored on the
 * cart item. Digital items are never required to have shipping details.
 *
 * Exported for unit testing (no Firestore access — templateData is passed
 * in already-fetched, matching the pattern of resolveTemplatePurchasePricing).
 */
export function priceAndValidateCheckoutItem(
  item: CartItem,
  templateData: Record<string, unknown> | null,
): CheckoutItemPricingResult {
  if (!templateData) {
    return { valid: false, reason: "This story is no longer available" };
  }

  try {
    const pricing = resolveTemplatePurchasePricing(templateData, item.purchaseFormat ?? "digital");

    if (pricing.purchaseFormat === "print") {
      const shippingValidation = validateShippingDetails(
        item.shippingDetails as Record<string, unknown> | undefined,
      );
      if (!shippingValidation.valid) {
        return {
          valid: false,
          reason: `Shipping details are invalid: ${shippingValidation.errors.join(", ")}`,
        };
      }
    }

    return {
      valid: true,
      purchaseFormat: pricing.purchaseFormat,
      priceCents: pricing.priceCents,
      currency: pricing.currency,
    };
  } catch (error) {
    if (error instanceof PurchasePricingError && error.code === "PRINT_NOT_AVAILABLE") {
      return { valid: false, reason: "Print version is no longer available" };
    }
    throw error;
  }
}

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
 * Validates all items, creates pending purchase documents, marks the
 * corresponding previews as "checkout_pending" (NOT "purchased" — payment
 * has not been confirmed yet), and returns the payment provider's checkout
 * URL. The preview only becomes "purchased" once processPaymentEvent()
 * confirms the payment succeeded.
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

      const pricingInvalidItems: Array<{ cartItemId: string; reason: string }> = [];
      const pricedCheckoutItems: typeof checkoutItems = [];

      for (const item of checkoutItems) {
        const templateDoc = await db
          .collection(COLLECTIONS.STORY_TEMPLATES)
          .doc(item.templateId)
          .get();

        const result = priceAndValidateCheckoutItem(
          item,
          templateDoc.exists ? (templateDoc.data() as Record<string, unknown>) : null,
        );

        if (!result.valid) {
          pricingInvalidItems.push({ cartItemId: item.cartItemId, reason: result.reason! });
          continue;
        }

        pricedCheckoutItems.push({
          ...item,
          purchaseFormat: result.purchaseFormat!,
          priceCents: result.priceCents!,
          currency: result.currency!,
        });
      }

      if (pricingInvalidItems.length > 0) {
        res.status(400).json({
          success: false,
          error: "invalid_items",
          invalidItems: [...invalidItems, ...pricingInvalidItems],
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
      const lineItems = pricedCheckoutItems.map((item) => ({
        name: item.templateTitle,
        // Fixed ("Buy Story") purchases have no child data — describe them as
        // the original story rather than "Personalized story for " (blank name).
        description: item.childFirstName
          ? `Personalized ${item.purchaseFormat} story for ${item.childFirstName}`
          : `${item.purchaseFormat === "print" ? "Printed" : "Original"} story: ${item.templateTitle}`,
        amountCents: item.priceCents,
        currency: item.currency,
        quantity: 1,
        metadata: {
          previewId: item.previewId,
          templateId: item.templateId,
          cartItemId: item.cartItemId,
          purchaseFormat: item.purchaseFormat,
        },
      }));

      // Build metadata for the session
      const sessionMetadata: Record<string, string> = {
        caregiverUid,
        itemCount: String(pricedCheckoutItems.length),
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

      for (const item of pricedCheckoutItems) {
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
          templateTitle: item.templateTitle,
          childFirstName: item.childFirstName,
          personalizedStoryId: null,
          cartItemId: item.cartItemId,
          itemType: item.childFirstName ? "personalized" : "template",
          purchaseFormat: item.purchaseFormat,
          printOrder: null,
          shippingDetails: item.purchaseFormat === "print" ? item.shippingDetails ?? null : null,
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

        // Mark the preview as mid-checkout. This is NOT "purchased" — payment
        // has not been confirmed yet (the caregiver is about to be redirected
        // to the payment provider). "purchased" is only set by
        // processPaymentEvent() once the webhook/mock-simulate callback
        // confirms success. If payment fails or is abandoned, this reverts to
        // "ready" (see the payment.failed branch of processPaymentEvent).
        const previewRef = db
          .collection(COLLECTIONS.STORY_PREVIEWS)
          .doc(item.previewId);
        batch.update(previewRef, {
          status: "checkout_pending",
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

function createPendingPrintOrder() {
  const now = new Date().toISOString();
  return {
    status: "order_received" as const,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Removes the cart item a now-confirmed purchase came from, so a purchased
 * story never lingers in "caregivers/{uid}/cart" — a stale purchased cart
 * item fails cart.service.ts's re-validation on the next checkout attempt
 * ("Already purchased" / "Preview is in an unexpected state"), and since the
 * client sends every cart item id on checkout, that one stale item blocks
 * the whole request (cart/payment flow Bug 6). Only ever called after
 * payment is confirmed — never on checkout initiation or payment failure, so
 * a failed/cancelled payment always leaves the item in the cart to retry.
 *
 * Prefers the purchase's own `cartItemId` (exact, O(1) delete). Falls back
 * to a previewId lookup for purchases created before that field existed.
 * Best-effort: the purchase/preview state is already correctly updated by
 * the time this runs, so a failure here is logged, not fatal.
 */
async function deleteCartItemForPurchase(purchase: Purchase): Promise<void> {
  try {
    if (purchase.cartItemId) {
      await db.collection(COLLECTIONS.cart(purchase.caregiverUid)).doc(purchase.cartItemId).delete();
      return;
    }
    const staleCartItems = await db
      .collection(COLLECTIONS.cart(purchase.caregiverUid))
      .where("previewId", "==", purchase.previewId)
      .get();
    await Promise.all(staleCartItems.docs.map((doc) => doc.ref.delete()));
  } catch (error) {
    console.warn(`Failed to remove cart item for purchase ${purchase.purchaseId}:`, error);
  }
}

/**
 * Applies a payment-provider event to the matching purchase(s). Shared by the
 * real webhook route and the sandbox-only mock-simulate route so both paths
 * exercise identical purchase-finalization logic.
 *
 * On payment success: updates purchase to "paid", moves the preview from
 * "checkout_pending" to "purchased", and triggers full story generation.
 * On payment failure: updates purchase to "failed" and reverts the preview
 * to "ready" (undoing the "checkout_pending" mark from checkout initiation).
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
        printOrder:
          purchase.purchaseFormat === "print"
            ? purchase.printOrder ?? createPendingPrintOrder()
            : null,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Payment is now confirmed — only now does the preview become
      // "purchased" (moving it out of "My previews"). generateFullStory()
      // will later advance it to "converted" once the story is generated.
      await db
        .collection(COLLECTIONS.STORY_PREVIEWS)
        .doc(purchase.previewId)
        .update({
          status: "purchased",
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Payment confirmed — the purchased item must never linger in the
      // cart (it would fail re-validation and block the next checkout).
      await deleteCartItemForPurchase(purchase);

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
