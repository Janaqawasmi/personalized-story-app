import { conditionalBlock } from '@/agent1/shared/prompt-utils';
import type { StoryBrief } from '@/models/storyBrief.model';

export function buildSectionB(brief: StoryBrief): string {
  const ott = brief.clinicalFoundation.oneTrueThing;
  const hasOneTrueThing =
    ott !== undefined && ott.trim().length > 0;

  const staticPortion = `THE HEART OF THIS STORY:
The psychologist has seen something specific — one image, one moment,
one detail that is the emotional center of this story:
"${brief.clinicalFoundation.creativeVision}"
This is not a detail to include. This is the seed the story grows from.
Your blueprint must be built around this image.
PLACING THE VISION IN THE ARC:
Ask which phase of the 7-phase arc (Section A2) this vision most
naturally inhabits:

Phases 1–3 (setup, trigger, body) → place at blueprint points 1–3
Phase 4 (the difficult peak)      → place at blueprint point 4
Phase 5 (the tool in action)      → place at blueprint point 5
Phases 6–7 (shift, landing)       → place at blueprint point 6

Default placement if the vision describes a moment of difficulty:
Point 4. If the vision describes a resolution or ending moment:
Point 6. The story grows toward the vision rather than around it.
IMPORTANT: If this vision conflicts with the therapeutic mechanism,
adapt the vision to serve the mechanism. The mechanism defines the
story's arc. The vision enriches it — it does not override it.
Example: if the mechanism is graduated_exposure and the vision
describes a safe hiding place, the hiding place becomes the starting
point from which the protagonist gradually ventures out.`;

  const conditionalPortion = conditionalBlock(
    hasOneTrueThing,
    `\nAnd this is something real — observed in real children, not invented:
"${ott ?? ''}"
Hold this detail. It belongs somewhere in the story. Pass it to the
author. Do not force it into the blueprint structure — just know it
exists and let it inform your understanding.`,
  );

  return staticPortion + conditionalPortion;
}
