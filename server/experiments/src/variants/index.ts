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
};

export function getVariant(id: string): ExperimentVariant {
  const v = VARIANTS[id];
  if (!v) {
    const known = Object.keys(VARIANTS).join(", ");
    throw new Error(`Unknown variant '${id}'. Known variants: ${known}`);
  }
  return v;
}
