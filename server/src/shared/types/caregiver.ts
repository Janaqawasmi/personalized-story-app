import { Timestamp } from "firebase-admin/firestore";

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
  childCount: number;
  purchaseCount: number;
}
