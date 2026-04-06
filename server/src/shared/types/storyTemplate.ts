import { Timestamp } from "firebase-admin/firestore";
import { AgeGroup } from "./common";

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

export interface StoryTemplatePreviewSpread {
  imageUrl: string;
  text: string;
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
  /**
   * Legacy field kept for backward compatibility across older services/routes.
   * Prefer `coverImage` for new UI.
   */
  coverImageUrl: string;
  /**
   * Public Story Detail Page cover image (download URL from Firebase Storage).
   * Stored as URL only (the image binary lives in Storage).
   */
  coverImage?: string;
  /**
   * Exactly the first 2 spreads to show on the Story Detail Page (pre-personalization).
   * Each spread combines image + matching text.
   */
  previewSpreads?: [StoryTemplatePreviewSpread, StoryTemplatePreviewSpread];
  displayTopic: LocalizedString;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  purchaseCount: number;
  previewPageCount: number;
  totalPageCount: number;
  /**
   * One sentence with `{{CHILD_NAME}}` for the personalize flow live name preview (optional).
   */
  previewSentence?: string;
}
