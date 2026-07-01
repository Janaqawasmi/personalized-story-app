import { Timestamp } from "firebase-admin/firestore";

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
  personalizedStoryId: string | null;

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
