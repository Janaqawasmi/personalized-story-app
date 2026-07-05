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
   * Authoritative technical gate, set to `true` by `finalizeTextVariants()`
   * (server/src/services/textVariants.service.ts) once the specialist
   * approves every page's text variants and clicks "Activate text
   * personalization". Preferred over `hasValidTextTemplates` for gating
   * because it reflects the correct per-page/source-text-derived placeholder
   * rule; `hasValidTextTemplates` is a blanket fallback only (see its doc
   * comment in mapFirestoreToVM.ts).
   */
  textPersonalizationReady: boolean;
  /**
   * Derived: true when every page has non-empty masculine + feminine
   * textTemplate strings each containing `{{CHILD_NAME}}`.
   * Computed in mapFirestoreToStoryDetailVM from `pages[]` — never stored.
   * This is a blanket, per-page-unconditional check used only as a fallback
   * for templates patched outside the normal review flow; prefer
   * `textPersonalizationReady` (see its doc comment above).
   */
  hasValidTextTemplates: boolean;
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
   *   = personalizationEnabled
   *     && (textPersonalizationReady || hasValidTextTemplates)
   *     && visualPersonalizationEnabled && visualPersonalizationReady
   */
  canStartPersonalization: boolean;
  /**
   * Short technical explanation for why `canStartPersonalization` is false,
   * for development/admin diagnostics only — never rendered to caregivers in
   * production. Null when personalization isn't blocked or isn't applicable.
   */
  personalizationBlockedReason: string | null;
}

export interface RelatedStoryCardVM {
  id: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  targetAgeGroup?: string;
  topicKey?: string;
  primaryTopic?: string;
  situationId?: string;
  /** Resolved or fallback label for uppercase topic line on catalog cards */
  topicLabel?: string;
}
