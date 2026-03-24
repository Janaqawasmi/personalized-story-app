import { Timestamp } from "firebase-admin/firestore";
import { Gender } from "./childProfile";

export type PreviewGenerationStatus = "pending" | "in_progress" | "completed" | "failed";
export type PreviewStatus = "created" | "generating" | "ready" | "added_to_cart" | "purchased" | "converted" | "expired";

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
  childId: string;
  templateId: string;

  // Snapshots at creation time
  childFirstName: string;
  childGender: Gender;
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";

  previewPageCount: number;
  pages: PreviewPage[];
  coverImageUrl: string | null;

  // Generation tracking
  generationStatus: PreviewGenerationStatus;
  pagesCompleted: number;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
  failureReason: string | null;

  // Lifecycle
  status: PreviewStatus;
  expiresAt: string | null;
  purchaseId: string | null;
  personalizedStoryId: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
