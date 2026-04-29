// server/src/specialist/prompt-builder.ts
//
// Assembles the final Seedream 4.0 prompt for a single page illustration from
// the Claude-generated imagePrompt + Visual Bible constraints.
//
// Seedream 4.0 guide: use coherent natural language (subject + action + environment),
// not keyword lists. Concise prompts outperform verbose stacked descriptions.
//
// Final structure (single natural-language paragraph):
//   <scene description>. Rendered in the style of <styleGuide>. The main character
//   is <protagonist>. Color palette: <palette>. No text, no speech bubbles, no
//   logos. Children's book illustration.

import type { PageIllustration, VisualBible } from "@/models/story.model";

const PROMPT_WARN_CHARS = 1200;

/**
 * Assembles the Seedream 4.0 submission prompt by weaving Visual Bible
 * constraints into a single natural-language paragraph.
 *
 * Throws if `page.imagePrompt` is null (call only after prompts are generated).
 */
export function assembleSeedreamPrompt(
  page: PageIllustration,
  visualBible: VisualBible,
): string {
  if (!page.imagePrompt) {
    throw new Error(
      `assembleSeedreamPrompt: page ${page.pageNumber} has no imagePrompt`,
    );
  }

  const prompt = [
    page.imagePrompt.trimEnd().replace(/\.$/, "") + ".",
    `Rendered in the style of ${visualBible.styleGuide}.`,
    `The main character is ${visualBible.protagonist}.`,
    `Color palette: ${visualBible.palette}.`,
    "No text, no speech bubbles, no logos. Children's book illustration.",
  ].join(" ");

  if (prompt.length > PROMPT_WARN_CHARS) {
    console.warn(
      `assembleSeedreamPrompt: page ${page.pageNumber} prompt is ${prompt.length} chars — may be truncated by the model.`,
    );
  }

  return prompt;
}
