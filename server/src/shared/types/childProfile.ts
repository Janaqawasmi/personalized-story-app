import { Timestamp } from "firebase-admin/firestore";

export type PhotoStatus = "none" | "uploaded" | "preview_used" | "processing" | "deleted" | "expired";
export type AgeGroup = "0_3" | "3_6" | "6_9" | "9_12";
export type Gender = "male" | "female";

export interface ChildProfile {
  childId: string;
  firstName: string;
  gender: Gender;
  ageGroup: AgeGroup;
  photoPath: string | null;
  photoStatus: PhotoStatus;
  photoUploadedAt: string | null;
  photoRetainUntil: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
