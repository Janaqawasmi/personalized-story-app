import { Timestamp } from "firebase-admin/firestore";

export type FreePreviewStatus = "claimed" | "ready" | "failed";

export interface Caregiver {
  uid: string;
  email: string;
  displayName: string | null;
  language: "ar" | "he";
  paymentCustomerId: string | null;
  consentTimestamp: string;
  consentVersion: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  purchaseCount: number;

  /** Preview quota — server-only writes, blocked by Firestore rules for clients */
  freePreviewUsed?: boolean;
  freePreviewUsedAt?: Timestamp | null;
  freePreviewId?: string | null;
  freePreviewStatus?: FreePreviewStatus | null;
  unlimitedPreviews?: boolean;
}
