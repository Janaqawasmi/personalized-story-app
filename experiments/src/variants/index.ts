// Variant registry.
//
// Historical note: The early variants (baseline, no-reference, rolling-reference,
// prompt-engineering) ran against the v1 specialist illustration pipeline
// (image-prompt-generator + prompt-builder), which was removed when the v2
// architecture was adopted. They have been deleted; their findings are encoded
// in docs/illustration/spec.md.

import type { ExperimentVariant } from "../types";
import { styleBibleVariant } from "./style-bible";
import { styleBibleSonnetVariant } from "./style-bible-sonnet";
import { avatarOnlyVariant } from "./avatar-only";
import { environmentOnlyVariant } from "./environment-only";
import { avatarEnvironmentVariant } from "./avatar-environment";
import { sceneDIrectorVariant } from "./scene-director";
import { sceneDIrectorAvatarVariant } from "./scene-director-avatar";
import { sceneDIrectorAvatarOnlyVariant } from "./scene-director-avatar-only";

export const VARIANTS: Record<string, ExperimentVariant> = {
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
  // exp-09c: scene director + avatar reference only, env locked via verbose text
  [sceneDIrectorAvatarOnlyVariant.id]: sceneDIrectorAvatarOnlyVariant,
};

export function getVariant(id: string): ExperimentVariant {
  const v = VARIANTS[id];
  if (!v) {
    const known = Object.keys(VARIANTS).join(", ");
    throw new Error(`Unknown variant '${id}'. Known variants: ${known}`);
  }
  return v;
}
