import { Timestamp } from "firebase-admin/firestore";

export type PurchaseStatus = "pending" | "paid" | "generation_in_progress" | "completed" | "failed" | "refunded";

export interface Purchase {
  purchaseId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  childId: string;
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
