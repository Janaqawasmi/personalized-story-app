import { Timestamp } from "firebase-admin/firestore";
import { PurchaseFormat } from "./commerce";

export interface CartItem {
  cartItemId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  templateTitle: string;
  childFirstName: string;
  coverImageUrl: string | null;
  purchaseFormat: PurchaseFormat;
  priceCents: number;
  currency: string;
  language: "ar" | "he";
  addedAt: Timestamp;
}
