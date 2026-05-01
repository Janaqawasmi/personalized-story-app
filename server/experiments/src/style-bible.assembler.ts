/**
 * Assembles the final Seedream prompt from a StyleBible + structured scene sections.
 *
 * Ordering is deliberate: most critical visual information first so that if
 * Seedream truncates near the 1200-char limit, the style lock and scene are
 * preserved over the palette/avoid footer.
 *
 *   1. Consistency anchors   — style lock
 *   2. Setting               — where/when/which props
 *   3. Character             — who, on what, body language
 *   4. Focal point           — viewer's eye target
 *   5. Composition           — framing / angle / layers
 *   6. Lighting              — source, quality, shadow, mood
 *   7. Palette               — colour lock
 *   8. Avoid                 — negative guidance (embedded in positive prompt)
 *   9. Footer                — standard Seedream tail
 */

import type { StyleBible, ScenePromptSections } from "./style-bible.types";

const PROMPT_WARN_CHARS = 1200;

export function assembleStyleBiblePagePrompt(
  scene: ScenePromptSections,
  bible: StyleBible,
  pageNumber: number,
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
    anchors + ".",
    `Setting: ${scene.setting}.`,
    `${bible.characterAnchor} In this scene: ${scene.character}.`,
    `Focal point: ${scene.focalPoint}.`,
    `Lighting: ${scene.lighting}.`,
    `Color palette: ${palette}.`,
    avoid,
    "No text, no speech bubbles, no logos. Children's book illustration.",
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
