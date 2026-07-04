export interface PreviewSubtitleKey {
  key: string;
  params?: Record<string, string>;
}

/**
 * Chooses the "Personalized for {name}" vs. "Original story" subtitle for a
 * preview/cart/purchased-story card.
 *
 * Fixed (non-personalizable) "Buy Story" purchases have no child name — a
 * blank "Personalized for" line would read as broken UI, so those items get
 * a generic "Original story" label instead.
 */
export function getPreviewSubtitleKey(childFirstName: string | null | undefined): PreviewSubtitleKey {
  const name = childFirstName?.trim();
  if (!name) {
    return { key: "pages.myStories.previews.originalStoryLabel" };
  }
  return { key: "pages.myStories.previews.personalizedFor", params: { name } };
}
