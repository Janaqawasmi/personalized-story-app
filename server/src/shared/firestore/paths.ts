export const COLLECTIONS = {
  STORIES: "stories",
  STORY_TEMPLATES: "story_templates",
  CAREGIVERS: "caregivers",
  STORY_PREVIEWS: "storyPreviews",
  PERSONALIZED_STORIES: "personalizedStories",

  /** Specialist story subcollections — v2 illustration artefacts (paths: stories/{id}/...) */
  STORY_VISUAL_BIBLES: "visualBibles",
  STORY_SCENE_PLANS: "scenePlans",
  STORY_FINAL_PROMPTS: "finalPrompts",
  STORY_IMAGES: "images",
  STORY_ILLUSTRATION_JOBS: "illustrationJobs",

  /**
   * Subcollection under story_templates/{id} that stores the art-direction
   * snapshot when it is too large to embed inline on the template document.
   * Written by publishStory when the inline snapshot exceeds INLINE_SIZE_LIMIT.
   * Read by Phase 5+ personalized image generation.
   *
   * Key doc: "snapshot" — contains the full ArtDirectionSnapshot.
   */
  TEMPLATE_PERSONALIZATION_ARTEFACTS: "personalizationArtefacts",

  /**
   * Subcollection under story_templates/{id} for text variant review (Phase 3).
   * One doc per page, keyed by pageNumber (e.g. "1", "2", …).
   * Contains masculine/feminine variants pending specialist review.
   * On finalize the approved content is merged into the template's pages[] and
   * textPersonalizationReady is flipped to true.
   */
  TEMPLATE_TEXT_VARIANTS: "textVariants",

  cart: (caregiverUid: string) => `caregivers/${caregiverUid}/cart`,
  purchases: (caregiverUid: string) => `caregivers/${caregiverUid}/purchases`,
} as const;

export const STORAGE_PATHS = {
  childPhoto: (caregiverUid: string, previewId: string, filename: string) =>
    `child-photos/${caregiverUid}/${previewId}/${filename}`,
  previewIllustration: (caregiverUid: string, previewId: string, pageNumber: number, ext: string) =>
    `preview-illustrations/${caregiverUid}/${previewId}/page-${pageNumber}.${ext}`,
  generatedIllustration: (caregiverUid: string, storyId: string, pageNumber: number, ext: string) =>
    `generated-illustrations/${caregiverUid}/${storyId}/page-${pageNumber}.${ext}`,
  templateAsset: (templateId: string, filename: string) =>
    `template-assets/${templateId}/${filename}`,
  /**
   * Versioned specialist illustration object path (v2). Rejections never
   * overwrite prior versions — each new image gets a new monotonic `version`.
   * See docs/illustration/spec.md §10.7.
   */
  specialistIllustrationV2: (
    storyId: string,
    pageNumber: number,
    version: number,
    ext: string,
  ) =>
    `specialist-illustrations/${storyId}/p${pageNumber}-v${version}.${ext}`,
  /** Cached ElevenLabs TTS output per caregiver / story page / voice / text hash. */
  voiceover: (
    caregiverUid: string,
    storyId: string,
    pageNumber: number,
    voiceId: string,
    textHash: string,
  ) =>
    `voiceover/${caregiverUid}/${storyId}/p${pageNumber}_${voiceId.slice(0, 12)}_${textHash}.mp3`,
} as const;
