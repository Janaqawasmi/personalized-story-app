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
  /**
   * Full story generation finished but some pages failed after retry.
   * The raw child photo is retained until `photoRetainUntil` (extended at
   * generation start). The preview document is kept so support/retry tooling
   * can look up the `personalizedStoryId` and `purchaseId` relationship.
   * Cleanup Job 6 removes these previews after the support window (30 days).
   */
  | "generation_partially_failed"
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
  /**
   * ms-since-epoch when the child photo expires (48h TTL from upload).
   *
   * Both `photoRetainUntil` (ISO string) and `childPhotoExpiresAt` (ms-epoch)
   * represent the same instant — they are always derived from the same computed
   * value at write time so they can never drift.
   *
   * `photoRetainUntil` predates Phase 4 and is used by the cleanup service
   * Firestore queries (`where("photoRetainUntil", "<", nowIso)`).
   * `childPhotoExpiresAt` is the ms-epoch form added for Phase 4 consistency
   * with the project-wide convention (CLAUDE.md §6) and for future numeric
   * range queries in Phase 5+ image generation services.
   */
  childPhotoExpiresAt?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
