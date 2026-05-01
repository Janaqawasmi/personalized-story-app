// Variant registry. Add new variants here as they are implemented.

import type { ExperimentVariant } from "../types";
import { baselineVariant } from "./baseline";
import { noReferenceVariant } from "./no-reference";
import { rollingReferenceVariant } from "./rolling-reference";
import { promptEngineeringVariant } from "./prompt-engineering";

export const VARIANTS: Record<string, ExperimentVariant> = {
  [baselineVariant.id]: baselineVariant,
  [noReferenceVariant.id]: noReferenceVariant,
  [rollingReferenceVariant.id]: rollingReferenceVariant,
  [promptEngineeringVariant.id]: promptEngineeringVariant,
};

export function getVariant(id: string): ExperimentVariant {
  const v = VARIANTS[id];
  if (!v) {
    const known = Object.keys(VARIANTS).join(", ");
    throw new Error(`Unknown variant '${id}'. Known variants: ${known}`);
  }
  return v;
}
