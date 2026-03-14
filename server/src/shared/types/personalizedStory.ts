import { Timestamp } from "firebase-admin/firestore";
import { Gender } from "./childProfile";

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
  childId: string;
  purchaseId: string;
  previewId: string;

  childFirstName: string;
  childGender: Gender;
  templateId: string;
  templateTitle: string;
  templateVersion: number;
  language: "ar" | "he";
  dedicationName: string | null;

  coverImageUrl: string;

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
