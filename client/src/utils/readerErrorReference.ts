export interface ReaderErrorReference {
  /** i18n key; interpolate with { id } */
  key: string;
  id: string;
}

/**
 * Picks which identifier to surface on the BookReaderPage error screen so a
 * failed "Read Story" open always tells the caregiver (or support) exactly
 * what was being opened, instead of a bare generic error.
 *
 * Precedence matches how BookReaderPage resolves content: a purchased-story
 * open (personalizedStoryId) takes priority over a free-preview open
 * (previewId), which takes priority over the raw template route param.
 */
export function getReaderErrorReference(params: {
  personalizedStoryId?: string | null;
  previewId?: string | null;
  storyId?: string | null;
}): ReaderErrorReference | null {
  if (params.personalizedStoryId) {
    return { key: "pages.bookReader.errorReferencePersonalizedStory", id: params.personalizedStoryId };
  }
  if (params.previewId) {
    return { key: "pages.bookReader.errorReferencePreview", id: params.previewId };
  }
  if (params.storyId) {
    return { key: "pages.bookReader.errorReferenceTemplate", id: params.storyId };
  }
  return null;
}
