/**
 * Shared text-personalization readiness check for `story_templates` data,
 * used by every public-facing surface that reads a template directly from
 * Firestore (Story Detail page, Personalize wizard).
 *
 * A placeholder like {{CHILD_NAME}} is only required on a page if that
 * page's *source* text actually referenced the protagonist — short
 * scene-setting pages legitimately have no {{CHILD_NAME}}. The public client
 * has no access to per-page source text (the `textVariants` subcollection is
 * locked to specialists/admins by firestore.rules), so it can't re-derive
 * that per-page rule itself. Instead it trusts `textPersonalizationReady`,
 * the flag `finalizeTextVariants()` sets (server/src/services/textVariants.service.ts)
 * using the correct per-page/source-text-derived rule, and falls back to the
 * blanket per-page check only for templates whose `pages[]` were patched
 * outside the normal review flow (e.g. scripts/patchTextTemplates.ts, which
 * always writes {{CHILD_NAME}} on every page) without that flag ever being set.
 */

const CHILD_NAME_PLACEHOLDER = "{{CHILD_NAME}}";

/**
 * Blanket, per-page-unconditional check: true only when EVERY page has a
 * non-empty masculine and feminine text template each containing
 * {{CHILD_NAME}}. Used only as the legacy-patched-template fallback — see
 * isTextPersonalizationReady() for the actual public readiness gate.
 */
export function hasValidTextTemplates(pages: unknown): boolean {
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return (pages as Record<string, unknown>[]).every((page) => {
    const tt = page.textTemplate as { masculine?: string; feminine?: string } | null | undefined;
    const masc = tt?.masculine;
    const fem = tt?.feminine;
    return (
      typeof masc === "string" && masc.trim().length > 0 && masc.includes(CHILD_NAME_PLACEHOLDER) &&
      typeof fem === "string" && fem.trim().length > 0 && fem.includes(CHILD_NAME_PLACEHOLDER)
    );
  });
}

/**
 * The public-facing text-readiness gate: true when the specialist has
 * finalized/activated text personalization (the authoritative signal), OR
 * when the blanket per-page check happens to already pass (the
 * legacy-patched-template fallback).
 */
export function isTextPersonalizationReady(data: {
  textPersonalizationReady?: unknown;
  pages?: unknown;
}): boolean {
  return data.textPersonalizationReady === true || hasValidTextTemplates(data.pages);
}
