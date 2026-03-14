export const COLLECTIONS = {
  STORY_TEMPLATES: "story_templates",
  CAREGIVERS: "caregivers",
  STORY_PREVIEWS: "storyPreviews",
  PERSONALIZED_STORIES: "personalizedStories",

  // Subcollection builders
  children: (caregiverUid: string) => `caregivers/${caregiverUid}/children`,
  cart: (caregiverUid: string) => `caregivers/${caregiverUid}/cart`,
  purchases: (caregiverUid: string) => `caregivers/${caregiverUid}/purchases`,
} as const;

export const STORAGE_PATHS = {
  childPhoto: (caregiverUid: string, childId: string, filename: string) =>
    `child-photos/${caregiverUid}/${childId}/${filename}`,
  previewIllustration: (caregiverUid: string, previewId: string, pageNumber: number, ext: string) =>
    `preview-illustrations/${caregiverUid}/${previewId}/page-${pageNumber}.${ext}`,
  generatedIllustration: (caregiverUid: string, storyId: string, pageNumber: number, ext: string) =>
    `generated-illustrations/${caregiverUid}/${storyId}/page-${pageNumber}.${ext}`,
  templateAsset: (templateId: string, filename: string) =>
    `template-assets/${templateId}/${filename}`,
} as const;
