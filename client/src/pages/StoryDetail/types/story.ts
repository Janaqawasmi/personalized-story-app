/** View-model types for Story Detail v2 (mapped from Firestore `story_templates`). */

export interface PreviewSpreadVM {
  imageUrl?: string;
  text: Record<string, string>;
}

export interface FaqItemVM {
  question: Record<string, string>;
  answer: Record<string, string>;
}

export type StoryDetailStatus = "published" | "draft" | "coming_soon";

export interface StoryTemplatePageVM {
  textTemplate?: string | { masculine: string; feminine: string };
}

export interface StoryDetailVM {
  id: string;
  /** Resolved for current UI language at map time (see `mapFirestoreToStoryDetailVM`). */
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string;
  ageRange: string;
  /** Raw Firestore age key (e.g. `3_6`) for matching related stories. */
  ageGroupRaw: string;
  primaryTopic: string;
  topicKey: string;
  /** Resolved for current UI language at map time. */
  topicLabel: string;
  priceDigital?: number;
  pricePrint?: number;
  currency: string;
  printAvailable: boolean;
  previewSpreads: PreviewSpreadVM[];
  faq: FaqItemVM[];
  status: StoryDetailStatus;
  /** First pages from Firestore — used only to fill preview text when CMS spread text is empty. */
  templatePages?: StoryTemplatePageVM[];
  storyLanguage?: string;
  /**
   * Author/specialist intent: story supports personalization in general.
   * Defaults to false for pre-Phase-1 templates.
   * When false the story is permanently "fixed" — show the Fixed story chip.
   */
  personalizationEnabled: boolean;
  /**
   * Technical gate: text variants reviewed and ready for use.
   * Defaults to false; flipped in Phase 3.
   */
  textPersonalizationReady: boolean;
  /**
   * Author/specialist intent: story supports child-photo-based visual personalization.
   * Intent flag only — does NOT mean the technical data is ready.
   * Defaults to false.
   */
  visualPersonalizationEnabled: boolean;
  /**
   * Technical gate: Visual Bible + structured prompts captured at publish time.
   * Defaults to false.
   */
  visualPersonalizationReady: boolean;
  /**
   * Derived: true only when the full wizard flow (name + photo) can run end-to-end.
   * Computed in mapFirestoreToStoryDetailVM — never stored in Firestore.
   *   = personalizationEnabled && textPersonalizationReady
   *     && visualPersonalizationEnabled && visualPersonalizationReady
   */
  canStartPersonalization: boolean;
}

export interface RelatedStoryCardVM {
  id: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  targetAgeGroup?: string;
  topicKey?: string;
  /** Resolved or fallback label for uppercase topic line on catalog cards */
  topicLabel?: string;
}
