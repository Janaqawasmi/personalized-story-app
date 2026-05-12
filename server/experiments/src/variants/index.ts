// Variant registry. Add new variants here as they are implemented.

import type { ExperimentVariant } from "../types";
import { baselineVariant } from "./baseline";
import { noReferenceVariant } from "./no-reference";
import { rollingReferenceVariant } from "./rolling-reference";
import { promptEngineeringVariant } from "./prompt-engineering";
import { styleBibleVariant } from "./style-bible";
import { styleBibleSonnetVariant } from "./style-bible-sonnet";
import { avatarOnlyVariant } from "./avatar-only";
import { environmentOnlyVariant } from "./environment-only";
import { avatarEnvironmentVariant } from "./avatar-environment";
import { sceneDIrectorVariant } from "./scene-director";
import { sceneDIrectorAvatarVariant } from "./scene-director-avatar";
import { sceneDIrectorAvatarOnlyVariant } from "./scene-director-avatar-only";
import { literalScenesVariant } from "./literal-scenes";

export const VARIANTS: Record<string, ExperimentVariant> = {
  [baselineVariant.id]: baselineVariant,
  [noReferenceVariant.id]: noReferenceVariant,
  [rollingReferenceVariant.id]: rollingReferenceVariant,
  [promptEngineeringVariant.id]: promptEngineeringVariant,
  [styleBibleVariant.id]: styleBibleVariant,
  [styleBibleSonnetVariant.id]: styleBibleSonnetVariant,
  // exp-08 series: character/environment reference separation
  [avatarOnlyVariant.id]: avatarOnlyVariant,
  [environmentOnlyVariant.id]: environmentOnlyVariant,
  [avatarEnvironmentVariant.id]: avatarEnvironmentVariant,
  // exp-09: two-stage creative director pipeline
  [sceneDIrectorVariant.id]: sceneDIrectorVariant,
  // exp-09b: scene director + dual reference (avatar + environment images)
  [sceneDIrectorAvatarVariant.id]: sceneDIrectorAvatarVariant,
  // exp-09c: scene director + avatar reference only, env locked via verbose text (figurative mode)
  [sceneDIrectorAvatarOnlyVariant.id]: sceneDIrectorAvatarOnlyVariant,
  // exp-09d: same pipeline as 09c but scene-director runs in literal mode (no metaphor / simile)
  [literalScenesVariant.id]: literalScenesVariant,
};

export function getVariant(id: string): ExperimentVariant {
  const v = VARIANTS[id];
  if (!v) {
    const known = Object.keys(VARIANTS).join(", ");
    throw new Error(`Unknown variant '${id}'. Known variants: ${known}`);
  }
  return v;
}
