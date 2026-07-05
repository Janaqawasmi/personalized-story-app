/**
 * Shared placeholder-requirement logic for personalized story text.
 *
 * A page's text only needs to preserve a personalization placeholder (e.g.
 * `{{CHILD_NAME}}`) if the page's *source* text actually referenced the
 * protagonist in the first place — plenty of pages (short scene-setting
 * beats, descriptions of the setting, other characters) never mention the
 * child at all, and must not be treated as invalid for lacking a token they
 * never needed.
 *
 * Two source-text shapes exist in this codebase, both of which must be
 * recognized as "this page requires {{CHILD_NAME}}":
 *
 *  - Agent 1's authored manuscript, which uses bracket-style author tokens
 *    (`[CHILD_NAME]`, `[HE/SHE/THEY]`, `[HIS/HER/THEIR]`) — see
 *    server/src/agent1/step2-author/prompt-sections/section-j-output-format.ts.
 *    This is the source text on a page's FIRST text-variant generation.
 *  - Already-personalized text using the caregiver-facing `{{TOKEN}}` format
 *    — this is the source text when a specialist re-runs generation after a
 *    prior approval (the previous output becomes the new input).
 */

/** Bracket-style protagonist markers Agent 1 writes into the manuscript when personalization is enabled. */
const AUTHOR_PROTAGONIST_MARKERS = ["[CHILD_NAME]", "[HE/SHE/THEY]", "[HIS/HER/THEIR]"];

/** Matches any `{{TOKEN_NAME}}`-style placeholder, e.g. {{CHILD_NAME}}, {{PRONOUN_SUBJECT}}. */
const CURLY_PLACEHOLDER_PATTERN = /\{\{[A-Z_]+\}\}/g;

export const CHILD_NAME_PLACEHOLDER = "{{CHILD_NAME}}";

/**
 * Returns the set of `{{TOKEN}}`-style placeholders that a variant of this
 * page is required to preserve, derived entirely from the page's source text.
 */
export function extractRequiredPlaceholders(sourceText: string): string[] {
  const required = new Set(sourceText.match(CURLY_PLACEHOLDER_PATTERN) ?? []);
  if (AUTHOR_PROTAGONIST_MARKERS.some((marker) => sourceText.includes(marker))) {
    required.add(CHILD_NAME_PLACEHOLDER);
  }
  return Array.from(required);
}

/** Returns the subset of placeholders required by `sourceText` that `variantText` fails to preserve. */
export function findMissingPlaceholders(sourceText: string, variantText: string): string[] {
  return extractRequiredPlaceholders(sourceText).filter((ph) => !variantText.includes(ph));
}
