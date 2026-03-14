import { Timestamp } from "firebase-admin/firestore";

export interface CartItem {
  cartItemId: string;
  caregiverUid: string;
  previewId: string;
  templateId: string;
  templateTitle: string;
  childId: string;
  childFirstName: string;
  coverImageUrl: string | null;
  priceCents: number;
  currency: string;
  language: "ar" | "he";
  addedAt: Timestamp;
}
