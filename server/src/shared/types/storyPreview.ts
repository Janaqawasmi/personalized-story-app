import { Timestamp } from "firebase-admin/firestore";
import { AgeGroup, Gender, PhotoStatus } from "./common";
import type { StoryLanguage } from "../../models/storyBrief.model";

/**
 * Discriminates how a preview's content was produced:
 * - "preview" — free AI-generated preview (child photo + name).
 * - "direct_purchase" — buy-without-preview flow (personalizable story, AI generation
 *   deferred to full-story generation after payment).
 * - "fixed" — non-personalizable story bought as-is ("Buy Story" CTA). No child data,
 *   no photo, no AI generation: pages are the specialist-approved sample text/images
 *   captured at publish time (see `createFixedStoryPreview` in preview.service.ts).
 */
export type PreviewKind = "preview" | "direct_purchase" | "fixed";

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
  /**
   * Checkout has been initiated (a pending Purchase exists and the caregiver
   * has been redirected to the payment provider) but payment has not yet been
   * confirmed. Distinct from "purchased" on purpose: nothing should be
   * treated as sold until the payment-provider webhook/mock-simulate callback
   * confirms success (see processPaymentEvent in checkout.router.ts). If the
   * caregiver abandons or the payment fails, the preview reverts to "ready".
   */
  | "checkout_pending"
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
  language: StoryLanguage;
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
