export const COLLECTIONS = {
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
} as const;
