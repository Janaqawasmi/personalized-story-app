/**
 * Assembles the final Seedream prompt from a StyleBible + structured scene sections.
 *
 * Ordering is deliberate: most critical visual information first so that if
 * Seedream truncates near the 1200-char limit, the style lock and scene are
 * preserved over the palette/avoid footer. The no-text constraint is placed
 * first because Seedream weights earlier tokens more heavily, and text
 * suppression must be a hard constraint, not an afterthought.
 *
 *   1. No-text constraint    — hard suppression, highest token weight
 *   2. Consistency anchors   — style lock
 *   3. Setting               — where/when/which props
 *   4. Character             — who, on what, body language
 *   5. Focal point           — viewer's eye target
 *   6. Lighting              — source, quality, shadow, mood
 *   7. Palette               — colour lock
 *   8. Avoid                 — negative guidance (embedded in positive prompt)
 *   9. Footer                — standard Seedream tail
 */

import type { StyleBible, ScenePromptSections } from "./style-bible.types";

const PROMPT_WARN_CHARS = 1200;

/**
 * Optional instruction that tells Seedream exactly what role the attached
 * reference image plays. Injected at position 2 (after the no-text hard
 * constraint) so it receives high token weight without displacing the
 * no-text suppression that must always be first.
 *
 * Examples:
 *   CHARACTER_REF_INSTRUCTION  — use reference for character identity only
 *   ENVIRONMENT_REF_INSTRUCTION — use reference for layout only
 *   AVATAR_ENV_REF_INSTRUCTION  — use reference for layout; character from text
 */
export const CHARACTER_REF_INSTRUCTION =
  "CHARACTER REFERENCE IMAGE ATTACHED: match this character's face shape, hair color and length, skin tone, and clothing colors exactly. Use reference for character appearance only — not for background, composition, or lighting.";

export const ENVIRONMENT_REF_INSTRUCTION =
  "ENVIRONMENT LAYOUT REFERENCE IMAGE ATTACHED: preserve the exact positions of the door, floor, walls, and handle from the reference image. Use reference for spatial layout only — not for character appearance or lighting.";

export const AVATAR_ENV_REF_INSTRUCTION =
  "ENVIRONMENT LAYOUT REFERENCE IMAGE ATTACHED: preserve spatial layout and furniture positions from the reference. Character appearance comes from the text description below only — do not copy any figure from the reference image.";

export const COMPOSITE_REF_INSTRUCTION =
  "COMPOSITE REFERENCE IMAGE ATTACHED — two halves, two roles: " +
  "LEFT HALF shows the character — match face shape, hair color and length, skin tone, and clothing colors exactly from the left half. " +
  "RIGHT HALF shows the environment layout — preserve the exact positions of the door, floor, walls, and handle from the right half. " +
  "Do not copy the overall composition or lighting from either half.";

export const DUAL_REF_INSTRUCTION =
  "TWO REFERENCE IMAGES ATTACHED — each has a distinct role: " +
  "FIRST IMAGE is the character reference — match face shape, hair color and length, skin tone, and clothing colors exactly from this image. " +
  "SECOND IMAGE is the environment layout reference — preserve the exact positions of the door, floor, walls, and handle from this image. " +
  "Do not copy overall composition or lighting from either reference.";

export function assembleStyleBiblePagePrompt(
  scene: ScenePromptSections,
  bible: StyleBible,
  pageNumber: number,
  referenceInstruction?: string,
): string {
  // Top 2 anchors only — they lock the style without burning token budget.
  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  // First 4 palette colors only (most distinctive ones come first).
  const palette = bible.palette.split(",").slice(0, 4).map((c) => c.trim()).join(", ");
  // Top 3 avoids — the most critical rendering mistakes.
  const avoid = `Avoid: ${bible.avoidList.slice(0, 3).join("; ")}.`;
  // Composition is omitted — helpful for humans but adds noise without
  // improving Seedream's spatial reasoning; budget spent on setting instead.

  const parts = [
    "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.",
    // Reference instruction goes here — position 2, high token weight,
    // tells the model what role the image param plays before anything else.
    ...(referenceInstruction ? [referenceInstruction] : []),
    anchors + ".",
    `Setting: ${scene.setting}.`,
    `${bible.characterAnchor} In this scene: ${scene.character}.`,
    `Focal point: ${scene.focalPoint}.`,
    `Lighting: ${scene.lighting}.`,
    `Color palette: ${palette}.`,
    avoid,
    "Children's book illustration.",
  ];

  const prompt = parts.join(" ");

  if (prompt.length > PROMPT_WARN_CHARS) {
    console.warn(
      `assembleStyleBiblePagePrompt: page ${pageNumber} prompt is ${prompt.length} chars — may be truncated by Seedream.`,
    );
  }

  return prompt;
}

/**
 * Assembles the final prompt with the full environment description from the
 * StyleBible registry injected as text (atmosphere + spatialLayout) instead
 * of relying on an environment reference image.
 *
 * Use this when passing only a character avatar reference — the environment
 * must be locked through verbose text so Seedream reproduces the same spatial
 * layout across every page.
 */
export function assembleWithDetailedEnv(
  scene: ScenePromptSections,
  bible: StyleBible,
  pageNumber: number,
  referenceInstruction?: string,
): string {
  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  const palette = bible.palette.split(",").slice(0, 4).map((c) => c.trim()).join(", ");
  const avoid = `Avoid: ${bible.avoidList.slice(0, 3).join("; ")}.`;

  // Extract env key and any dynamic extras (light state, active props).
  const settingParts = scene.setting.split("|").map((s) => s.trim());
  const envKey = settingParts[0] ?? scene.setting;
  const dynamicExtras = settingParts.slice(1).join(", ");

  // Inject only atmosphere (mood, light quality, spatial feel) — NOT spatialLayout,
  // which contains text labels like "Room 4" that Seedream would render as visible
  // text. Specific visible props come from the scene-specific dynamic extras that
  // Call 2 selected for this exact camera frame.
  const envEntry = bible.environmentRegistry[envKey];
  const settingText = envEntry
    ? `${envEntry.atmosphere}${dynamicExtras ? ` ${dynamicExtras}.` : ""}`
    : `${scene.setting}.`;

  const parts = [
    "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.",
    ...(referenceInstruction ? [referenceInstruction] : []),
    anchors + ".",
    `Setting: ${settingText}`,
    `${bible.characterAnchor} In this scene: ${scene.character}.`,
    `Focal point: ${scene.focalPoint}.`,
    `Lighting: ${scene.lighting}.`,
    `Color palette: ${palette}.`,
    avoid,
    "Children's book illustration.",
  ];

  const prompt = parts.join(" ");

  if (prompt.length > PROMPT_WARN_CHARS) {
    console.warn(
      `assembleWithDetailedEnv: page ${pageNumber} prompt is ${prompt.length} chars — may be truncated by Seedream.`,
    );
  }

  return prompt;
}

/**
 * Returns the scene prompt in a human-readable format for report.md.
 * Shows each section on its own labelled line.
 */
export function formatScenePromptForReport(scene: ScenePromptSections): string {
  return [
    `SETTING:     ${scene.setting}`,
    `CHARACTER:   ${scene.character}`,
    `FOCAL POINT: ${scene.focalPoint}`,
    `COMPOSITION: ${scene.composition}`,
    `LIGHTING:    ${scene.lighting}`,
  ].join("\n");
}
