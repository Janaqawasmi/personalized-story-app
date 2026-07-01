import { Timestamp } from "firebase-admin/firestore";
import { AgeGroup, Gender } from "./common";
import type { IllustrationStyleId } from "./visualStyles";

export type StoryGenerationStatus = "pending" | "in_progress" | "completed" | "failed" | "partially_failed";

export interface PersonalizedStoryPage {
  pageNumber: number;
  personalizedText: string;
  imagePromptUsed: string;
  generatedImagePath: string | null;
  fromPreview: boolean;
  aiMetadata: {
    providerId: string;
    modelId: string;
    generatedAt: string;
    latencyMs: number;
  } | null;
}

export interface PersonalizedStory {
  storyId: string;
  caregiverUid: string;
  purchaseId: string;
  previewId: string;

  childFirstName: string;
  childGender: Gender;
  childAgeGroup: AgeGroup;
  templateId: string;
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";
  dedicationName: string | null;

  coverImageUrl: string;

  /** Internal illustration style ID chosen by the caregiver (Phase 6+). */
  selectedIllustrationStyle?: IllustrationStyleId;

  generationStatus: StoryGenerationStatus;
  totalPages: number;
  pagesCompleted: number;
  pagesFromPreview: number;
  pagesFailedIndexes: number[];
  generationStartedAt: string | null;
  generationCompletedAt: string | null;

  pages: PersonalizedStoryPage[];

  isAccessible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
