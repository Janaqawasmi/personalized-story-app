// server/src/specialist/prompt-builder.ts
//
// Assembles the final Seedream text prompt for a single page illustration
// from the Claude-generated imagePrompt + the Visual Bible constraints.
//
// Structure of the assembled prompt:
//   <imagePrompt text>
//   Style: <styleGuide>
//   Character: <protagonist>
//   Palette: <palette>
//   No text, no speech bubbles, no logos. Children's book illustration.

import type { PageIllustration, VisualBible } from "@/models/story.model";

/**
 * Assembles the Seedream submission prompt by appending Visual Bible
 * constraints to the Claude-generated imagePrompt for a page.
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

  const lines = [
    page.imagePrompt,
    `Style: ${visualBible.styleGuide}`,
    `Character: ${visualBible.protagonist}`,
    `Palette: ${visualBible.palette}`,
    "No text, no speech bubbles, no logos. Children's book illustration.",
  ];

  return lines.join("\n");
}
