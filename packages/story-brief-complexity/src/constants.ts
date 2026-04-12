import type { Section16AgeRange, Section16StoryLength } from "./types";

/** Section 16 obligation weights — baseline ages 3–5. */
export const OBLIGATION_WEIGHTS = {
  coreArc: 5,
  somaticExpressionEach: 0.5,
  supportingApproach: 1,
  shameCentral: 1,
  shamePresent: 0.5,
  supportingCharacterEach: 1,
  caregiverLeavesAndReturns: 1.5,
  caregiverWaitingAtEnd: 0.5,
  narrativeParallel: 1,
  narrativeMetaphorical: 1.5,
} as const;

/** Aliases for backward compatibility with previous client export names. */
export const OBLIGATION_CORE_ARC_PAGES = OBLIGATION_WEIGHTS.coreArc;
export const OBLIGATION_SOMATIC_EACH_PAGES = OBLIGATION_WEIGHTS.somaticExpressionEach;
export const OBLIGATION_SUPPORTING_APPROACH_PAGES = OBLIGATION_WEIGHTS.supportingApproach;
export const OBLIGATION_SHAME_CENTRAL_PAGES = OBLIGATION_WEIGHTS.shameCentral;
export const OBLIGATION_SHAME_PRESENT_PAGES = OBLIGATION_WEIGHTS.shamePresent;
export const OBLIGATION_SUPPORTING_CHARACTER_EACH_PAGES = OBLIGATION_WEIGHTS.supportingCharacterEach;
export const OBLIGATION_CAREGIVER_LEAVES_RETURNS_PAGES = OBLIGATION_WEIGHTS.caregiverLeavesAndReturns;
export const OBLIGATION_CAREGIVER_WAITING_END_PAGES = OBLIGATION_WEIGHTS.caregiverWaitingAtEnd;
export const OBLIGATION_NARRATIVE_PARALLEL_PAGES = OBLIGATION_WEIGHTS.narrativeParallel;
export const OBLIGATION_NARRATIVE_METAPHORICAL_PAGES = OBLIGATION_WEIGHTS.narrativeMetaphorical;

export const AGE_RANGE_MULTIPLIERS: Record<Section16AgeRange, number> = {
  "3-5": 1.0,
  "5-7": 0.8,
  "7-9": 0.6,
  "9-12": 0.5,
};

/** Spec §10 / §16 page bands (min–max pages). */
export const PAGE_BUDGET_TABLE: Record<
  Section16AgeRange,
  Record<Section16StoryLength, { min: number; max: number }>
> = {
  "3-5": {
    short: { min: 6, max: 8 },
    standard: { min: 8, max: 12 },
    extended: { min: 12, max: 16 },
  },
  "5-7": {
    short: { min: 8, max: 10 },
    standard: { min: 10, max: 14 },
    extended: { min: 14, max: 18 },
  },
  "7-9": {
    short: { min: 10, max: 12 },
    standard: { min: 12, max: 16 },
    extended: { min: 16, max: 22 },
  },
  "9-12": {
    short: { min: 12, max: 15 },
    standard: { min: 15, max: 20 },
    extended: { min: 20, max: 28 },
  },
};

export const AGE_RANGES: readonly Section16AgeRange[] = ["3-5", "5-7", "7-9", "9-12"];
export const STORY_LENGTHS: readonly Section16StoryLength[] = ["short", "standard", "extended"];
