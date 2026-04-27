// server/src/specialist/prompt-builder.ts
//
// Assembles the Seedream text prompt for a single page illustration.
// Implemented in Step 3.3.

import type { PageIllustration, VisualBible } from "@/models/story.model";

export function assembleSeedreamPrompt(
  _page: PageIllustration,
  _visualBible: VisualBible,
): string {
  throw new Error("assembleSeedreamPrompt: not yet implemented");
}
