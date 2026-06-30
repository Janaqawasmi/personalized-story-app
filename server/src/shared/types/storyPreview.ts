import { Timestamp } from "firebase-admin/firestore";
import { AgeGroup, Gender, PhotoStatus } from "./common";

export type PreviewKind = "preview" | "direct_purchase";

export type PreviewGenerationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";
export type PreviewStatus =
  | "created"
  | "generating"
  | "ready"
  | "failed"
  | "added_to_cart"
  | "purchased"
  | "converted"
  | "expired";

export interface PreviewPage {
  pageNumber: number;
  personalizedText: string;
  imagePromptUsed: string;
  generatedImagePath: string | null;
  aiMetadata: {
    providerId: string;
    modelId: string;
    generatedAt: string;
    latencyMs: number;
  } | null;
}

export interface StoryPreview {
  previewId: string;
  caregiverUid: string;
  templateId: string;
  /** Discriminator: AI preview (default) vs buy-without-preview flow */
  kind?: PreviewKind;

  // --- Child data (inline, no separate collection) ---
  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;

  // --- Photo lifecycle (owned by this preview) ---
  photoPath: string | null;
  photoStatus: PhotoStatus;
  photoUploadedAt: string | null;
  photoRetainUntil: string | null;

  // --- Template snapshot ---
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";
  dedicationName: string | null;

  // --- Preview content ---
  previewPageCount: number;
  pages: PreviewPage[];
  coverImageUrl: string | null;
  /** Optional; migration and client types may include this field */
  characterProfileSnapshot?: Record<string, unknown> | null;

  // --- Generation tracking ---
  generationStatus: PreviewGenerationStatus;
  pagesCompleted: number;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
  failureReason: string | null;

  // --- Lifecycle ---
  status: PreviewStatus;
  expiresAt: string | null;
  purchaseId: string | null;
  personalizedStoryId: string | null;

  // --- Personalization metadata (Phase 4+) ---
  /** Internal illustration style ID chosen by the caregiver. */
  selectedIllustrationStyle?: string;
  /** ms-since-epoch when the child photo expires (48h TTL from upload). */
  childPhotoExpiresAt?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
