import { Timestamp } from "firebase-admin/firestore";
import type { AgeRange } from "../../models/storyBrief.model";
import type { IllustrationStyleId } from "./visualStyles";

export interface LocalizedString {
  ar?: string;
  he?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalization — art-direction snapshot types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-page art-direction data needed to re-assemble a personalized image prompt
 * without re-running any LLM and without reading the source `stories/` document.
 */
export interface TemplatePageArtDirection {
  pageNumber: number;
  emotionalIntent: string;
  /**
   * Stage-2 structured prompt fields (setting, character pose, focalPoint,
   * composition, lighting). null when the scene plan had no structuredPrompt
   * at publish time.
   */
  structuredPrompt: {
    setting: string;
    /** Pose / physical action in this scene — NOT protagonist appearance. */
    character: string;
    focalPoint: string;
    composition: string;
    lighting: string;
  } | null;
}

/**
 * Snapshot of the Visual Bible fields + per-page structured prompts captured
 * at publish time. Combined with `protagonistSlot`, this is everything Phase 5
 * needs to build personalized image prompts — scene preserved, only character
 * identity and art style change.
 *
 * `protagonistSlot.sampleCharacterDescription` is intentionally kept SEPARATE
 * so that personalized mode can exclude it by construction (the appearance leak
 * is in characterAnchor, not in these fields).
 */
export interface ArtDirectionSnapshot {
  styleGuide: string;
  consistencyAnchors: string[];
  environmentRegistry: Record<string, { atmosphere: string; spatialLayout: string }>;
  palette: string;
  avoidList: string[];
  pages: TemplatePageArtDirection[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalization — protagonist and policy types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks the replaceable protagonist in the pilot (single child protagonist only).
 * `sampleCharacterDescription` = Visual Bible `characterAnchor` — used by
 * template/sample mode; excluded by personalized mode to prevent appearance leak.
 */
export interface ProtagonistSlot {
  role: "main_child_character";
  replaceable: boolean;
  /** Visual Bible characterAnchor (sample protagonist appearance). Template mode uses this. */
  sampleCharacterDescription: string;
  /** Visual Bible characterSheet (full sample character reference). Template mode uses this. */
  sampleCharacterSheet: string;
}

/**
 * Controls how personalization handles the protagonist in image generation.
 * - `"replace_with_child_photo"` — swap the protagonist with the uploaded child
 *   photo + child-identity anchor (pilot default when personalizationEnabled).
 * - `"keep_sample"` — keep the specialist protagonist appearance (non-personalizable).
 */
export type PersonalizedCharacterPolicy = "replace_with_child_photo" | "keep_sample";

// ─────────────────────────────────────────────────────────────────────────────
// Core page type
// ─────────────────────────────────────────────────────────────────────────────

export interface StoryTemplatePage {
  pageNumber: number;
  textTemplate: {
    masculine: string;
    feminine: string;
  };
  /**
   * Stage-3 final prompt string — the specialist's approved full prompt including
   * the sample protagonist's characterAnchor. Used for template/sample image
   * generation only. MUST NOT be used as the prompt base for personalized images
   * because the sample protagonist appearance is baked in.
   */
  imagePromptTemplate: string;
  emotionalTone: string;
  /**
   * Public URL of the specialist-approved sample illustration for this page.
   * Used by the public sample reader (§7A.5). Immutable after publish; never
   * overwritten by personalized-image generation.
   */
  sampleImageUrl?: string;
}

export interface StoryTemplatePreviewSpread {
  imageUrl: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main template document
// ─────────────────────────────────────────────────────────────────────────────

export interface StoryTemplate {
  // ── Existing catalog fields ────────────────────────────────────────────────
  draftId: string;
  briefId: string;
  title: string;
  status: "approved";
  /**
   * Stable catalog taxonomy key = the therapeutic DOMAIN (brief `storyType`,
   * e.g. "fear_anxiety"). This is the value the public catalog filters on
   * (category browse, mega-menu). It must match a `referenceData/topics` id.
   */
  primaryTopic: string;
  /** Mirror of `primaryTopic`. The public catalog matches on either. */
  topicKey?: string;
  specificSituation: string;
  /**
   * Story target age range. Stored as the exact brief `ageRange`
   * ("3-5" | "5-7" | "7-9" | "9-12") so the public catalog age filter matches
   * the Specialist Dashboard 1:1.
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

  // ── Public library fields ──────────────────────────────────────────────────
  slug: string;
  shortDescription: LocalizedString;
  /**
   * Legacy field kept for backward compatibility.
   * Prefer `coverImage` for new UI.
   */
  coverImageUrl: string;
  /** Public Story Detail Page cover image (Firebase Storage download URL). */
  coverImage?: string;
  /** Exactly the first 2 spreads for the Story Detail Page (pre-personalization). */
  previewSpreads?: [StoryTemplatePreviewSpread, StoryTemplatePreviewSpread];
  displayTopic: LocalizedString;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  purchaseCount: number;
  previewPageCount: number;
  totalPageCount: number;
  /** One sentence with `{{CHILD_NAME}}` for the personalize flow live name preview. */
  previewSentence?: string;

  // ── Personalization metadata (Phase 1+) ───────────────────────────────────

  /**
   * Author intent: whether the specialist designed this story to support
   * child personalization. Derived from `brief.storyWorld.personalization`.
   * Does NOT imply the data is ready — check `textPersonalizationReady` and
   * `visualPersonalizationReady` for that.
   */
  personalizationEnabled?: boolean;

  /**
   * @deprecated No longer used as a hard gate for personalization.
   * The API and UI now derive text readiness from the actual page data:
   * every page must have non-empty `textTemplate.masculine` and
   * `textTemplate.feminine` strings each containing `{{CHILD_NAME}}`.
   * This flag is kept as legacy metadata; do not use it for gating logic.
   */
  textPersonalizationReady?: boolean;

  /**
   * Review lifecycle for the text-variant step (Phase 3).
   *   "none"           → no variants generated yet (initial state after publish)
   *   "generating"     → LLM call in flight (optimistic; reset to "none" on error)
   *   "pending_review" → variants written to textVariants subcollection, awaiting specialist sign-off
   * The terminal state ("approved") is represented by textPersonalizationReady = true;
   * this field is cleared (or absent) once finalized.
   * Pre-Phase-3 templates omit this field; treat absence as "none".
   */
  textVariantStatus?: "none" | "generating" | "pending_review";

  /**
   * true when the art-direction snapshot (Visual Bible + per-page structured
   * prompts) is complete and available (inline or subcollection). Gates visual
   * (image) personalization in the API and UI.
   */
  visualPersonalizationReady?: boolean;

  /**
   * Author/specialist intent: this story is designed to support child-photo-based
   * visual (image) personalization. Set at publish time from the brief.
   *
   * This is an INTENT flag only — it does NOT mean the technical data is ready.
   * Never combine this with `visualPersonalizationReady` into a single field.
   *
   * To decide whether visual personalization is actually usable, derive:
   *   canUseVisualPersonalization =
   *     personalizationEnabled && visualPersonalizationEnabled && visualPersonalizationReady
   */
  visualPersonalizationEnabled?: boolean;

  /**
   * Illustration style IDs the caregiver may choose from for this story.
   * Uses the internal IDs from `IllustrationStyleId`.
   * Populated at publish time; defaults to all styles for personalizable stories.
   */
  allowedIllustrationStyles?: IllustrationStyleId[];

  /**
   * The default style pre-selected in the personalization wizard.
   * Must be one of `allowedIllustrationStyles`.
   */
  defaultIllustrationStyle?: IllustrationStyleId;

  /** The `stories/` document ID this template was published from. */
  sourceStoryId?: string;

  /** UID of the specialist who published this template. */
  specialistId?: string;

  /**
   * The replaceable protagonist definition for the pilot single-child-protagonist model.
   * Set when `personalizationEnabled` and the Visual Bible was available at publish.
   */
  protagonistSlot?: ProtagonistSlot;

  /**
   * Controls how personalization handles the protagonist in image generation.
   * Set to `"replace_with_child_photo"` when `personalizationEnabled`.
   */
  personalizedCharacterPolicy?: PersonalizedCharacterPolicy;

  /**
   * Art-direction snapshot for personalized image generation (Phase 5+).
   * Present when `artDirectionStoredInline = true`.
   * null when the data lives in the `personalizationArtefacts` subcollection.
   *
   * IMPORTANT: The snapshot intentionally excludes `protagonistSlot.sampleCharacterDescription`
   * (the specialist's characterAnchor). Personalized mode reads the snapshot fields and
   * injects a child-identity anchor in place of the sample character — the appearance
   * leak is prevented by construction.
   */
  artDirectionSnapshot?: ArtDirectionSnapshot | null;

  /**
   * true  → art-direction snapshot is embedded in this document (`artDirectionSnapshot`).
   * false → snapshot is in the `personalizationArtefacts` subcollection
   *         (`story_templates/{id}/personalizationArtefacts/snapshot`).
   * undefined → story pre-dates Phase 1; no snapshot captured.
   */
  artDirectionStoredInline?: boolean;
}
