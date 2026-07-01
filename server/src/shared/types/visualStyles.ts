/**
 * Canonical illustration style taxonomy.
 *
 * These are the stable internal IDs used by:
 *  - The caregiver wizard (client/src/pages/PersonalizeStoryPage.tsx)
 *  - story_templates.allowedIllustrationStyles / defaultIllustrationStyle
 *  - Backend validation on the preview/checkout routes (Phase 2+)
 *  - The personalized prompt assembler style-instruction map (Phase 5+)
 *
 * Display labels are translated separately in i18n dictionaries.
 * The values stored in Firestore are always these internal IDs.
 */
export const ILLUSTRATION_STYLE_IDS = [
  "watercolor",
  "semi_realistic",
  "flat_cartoon",
  "paper_craft",
  "vintage_1950s_little_golden",
] as const;

export type IllustrationStyleId = (typeof ILLUSTRATION_STYLE_IDS)[number];

export function isValidIllustrationStyleId(value: unknown): value is IllustrationStyleId {
  return typeof value === "string" && (ILLUSTRATION_STYLE_IDS as readonly string[]).includes(value);
}
