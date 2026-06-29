import { Timestamp } from "firebase-admin/firestore";
import type { AgeRange } from "../../models/storyBrief.model";

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
  /**
   * Stable catalog taxonomy key = the therapeutic DOMAIN (brief `storyType`,
   * e.g. "fear_anxiety"). This is the value the public catalog filters on
   * (category browse, mega-menu). It must match a `referenceData/topics` id.
   * NOTE: this is the clinical *domain*, NOT the therapeutic *approach*.
   */
  primaryTopic: string;
  /**
   * Mirror of `primaryTopic` (the domain key). The public catalog matches
   * stories on either `primaryTopic` or `topicKey`, so both are written.
   */
  topicKey?: string;
  specificSituation: string;
  /**
   * Story target age range. Stored as the exact brief `ageRange`
   * ("3-5" | "5-7" | "7-9" | "9-12") so the public catalog age filter matches
   * the Specialist Dashboard 1:1. NOT the caregiver child-age band (`AgeGroup`).
   */
  ageGroup: AgeRange;
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
