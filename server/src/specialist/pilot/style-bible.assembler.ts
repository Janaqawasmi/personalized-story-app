/**
 * Final prompt assembler for the pilot pipeline.
 *
 * Mirrors server/experiments/src/style-bible.assembler.ts. Pilot owns its own
 * copy so the experiments folder can evolve independently.
 *
 * Ordering is deliberate: most critical visual information first so that if
 * Seedream truncates near the 1200-char limit, the style lock and scene are
 * preserved over the palette/avoid footer.
 *
 *   1. No-text constraint    — hard suppression, highest token weight
 *   2. Reference instruction — explains what role the attached image plays
 *   3. Consistency anchors   — style lock
 *   4. Setting               — where/when/which props
 *   5. Character             — who, on what, body language
 *   6. Focal point           — viewer's eye target
 *   7. Lighting              — source, quality, shadow, mood
 *   8. Palette               — colour lock
 *   9. Avoid                 — negative guidance
 *  10. Footer                — standard Seedream tail
 */

import type { StyleBible, ScenePromptSections } from "./style-bible.types";

const PROMPT_WARN_CHARS = 1200;

export const CHARACTER_REF_INSTRUCTION =
  "CHARACTER REFERENCE IMAGE ATTACHED: match this character's face shape, hair color and length, skin tone, and clothing colors exactly. Use reference for character appearance only — not for background, composition, or lighting.";

/**
 * Assembles the final prompt with the full environment description from the
 * StyleBible registry injected as text (atmosphere + dynamic props from the
 * scene's setting). Used when only a character avatar is passed as reference —
 * the environment must be locked through verbose text.
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

  const settingParts = scene.setting.split("|").map((s) => s.trim());
  const envKey = settingParts[0] ?? scene.setting;
  const dynamicExtras = settingParts.slice(1).join(", ");

  // Inject only atmosphere (mood, light quality) — NOT spatialLayout, which
  // may contain text labels (e.g. "Room 4") that Seedream would render as
  // visible text. Specific visible props come from the scene's dynamic extras.
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
      `[pilot] page ${pageNumber} prompt is ${prompt.length} chars — may be truncated by Seedream.`,
    );
  }

  return prompt;
}

/** Returns the scene prompt in a human-readable format for the developer UI. */
export function formatScenePromptForReport(scene: ScenePromptSections): string {
  return [
    `SETTING:     ${scene.setting}`,
    `CHARACTER:   ${scene.character}`,
    `FOCAL POINT: ${scene.focalPoint}`,
    `COMPOSITION: ${scene.composition}`,
    `LIGHTING:    ${scene.lighting}`,
  ].join("\n");
}
