import { Timestamp } from "firebase-admin/firestore";
import { AgeGroup } from "./childProfile";

export interface LocalizedString {
  ar?: string;
  he?: string;
}

export interface StoryTemplatePage {
  pageNumber: number;
  textTemplate: {
    masculine: string;
    feminine: string;
  };
  imagePromptTemplate: string;
  emotionalTone: string;
}

export interface StoryTemplate {
  // Existing fields
  draftId: string;
  briefId: string;
  title: string;
  status: "approved";
  primaryTopic: string;
  specificSituation: string;
  ageGroup: AgeGroup;
  generationConfig: {
    language: "ar" | "he";
    targetAgeGroup: string;
    length: string;
    tone: string;
    emphasis: string;
  };
  approvedBy: string;
  approvedAt: string;
  revisionCount: number;
  isActive: boolean;
  pages: StoryTemplatePage[];

  // New fields for public library
  slug: string;
  shortDescription: LocalizedString;
  coverImageUrl: string;
  displayTopic: LocalizedString;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  purchaseCount: number;
  previewPageCount: number;
  totalPageCount: number;
}
