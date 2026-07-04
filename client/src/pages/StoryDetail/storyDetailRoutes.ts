/**
 * Route builder for the "Personalize this story" CTA (personalizable stories):
 * the personalization wizard → preview → cart → checkout.
 *
 * "Buy this story" (shown instead, for stories that do NOT support
 * personalization) never uses this route — it adds the original template
 * straight to the cart with no wizard step at all (see
 * StoryDetailPage.handleBuy / createFixedStoryPreview).
 *
 * Keeping this in one place prevents the Personalize CTA from silently
 * regressing to a dead-end fallback (e.g. a `mailto:` link) — see Bug 1 in
 * the cart/payment flow bug report.
 */
export function getPersonalizeRoute(storyId: string): string {
  return `/stories/${storyId}/personalize`;
}
