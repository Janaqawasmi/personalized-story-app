import { Timestamp } from "firebase-admin/firestore";
import { PrintOrder, PurchaseFormat, ShippingDetails } from "./commerce";

export type PurchaseStatus =
  | "pending"
  | "paid"
  | "generation_in_progress"
  | "completed"
  /**
   * Some story pages failed after retry. The story is NOT accessible.
   * The raw child photo is retained until `photoRetainUntil` to allow a
   * manual or automated retry. Purchase is not "completed" until the story
   * is fully usable.
   */
  | "generation_partially_failed"
  | "failed"
  | "refunded";

export interface Purchase {
  purchaseId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  templateTitle: string;
  childFirstName: string;
  personalizedStoryId: string | null;

  /**
   * The cart item this purchase was created from, so processPaymentEvent()
   * can remove it from `caregivers/{uid}/cart` once payment is confirmed
   * (a purchased item must never linger in the cart and block future
   * checkout — see cart/payment flow Bug 6). Optional for backward
   * compatibility with purchases created before this field existed; those
   * fall back to a previewId lookup instead (see deleteCartItemForPurchase).
   */
  cartItemId?: string | null;

  /**
   * Distinguishes a "Buy Story" original/template purchase (no
   * personalization) from a personalized purchase. Optional for backward
   * compatibility with purchases created before this field existed.
   */
  itemType?: "template" | "personalized";
  purchaseFormat: PurchaseFormat;
  printOrder: PrintOrder | null;
  /**
   * Contact/address details for a print purchase, carried over from the cart
   * item at checkout time. Always null for digital purchases.
   */
  shippingDetails: ShippingDetails | null;

  // Generic payment fields (not provider-specific)
  paymentTransactionId: string;
  paymentSessionId: string | null;
  paymentChargeId: string | null;
  amountCents: number;
  currency: string;

  status: PurchaseStatus;
  paidAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  refundedAt: string | null;
  paymentRefundId: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
