/**
 * Story brief complexity load — thin adapter over shared @dammah/story-brief-complexity (§16).
 */

import type { CompleteBrief } from "../types/storyBrief";
import {
  computeComplexityFromParts,
  extractComplexityPartsFromClientWire,
  PAGE_BUDGET_TABLE,
  AGE_RANGE_MULTIPLIERS,
  OBLIGATION_CORE_ARC_PAGES,
  OBLIGATION_SOMATIC_EACH_PAGES,
  OBLIGATION_SUPPORTING_APPROACH_PAGES,
  OBLIGATION_SHAME_CENTRAL_PAGES,
  OBLIGATION_SHAME_PRESENT_PAGES,
  OBLIGATION_SUPPORTING_CHARACTER_EACH_PAGES,
  OBLIGATION_CAREGIVER_LEAVES_RETURNS_PAGES,
  OBLIGATION_CAREGIVER_WAITING_END_PAGES,
  OBLIGATION_NARRATIVE_PARALLEL_PAGES,
  OBLIGATION_NARRATIVE_METAPHORICAL_PAGES,
  type ComplexityLoadState,
  type ComplexityBreakdownEntry,
} from "@dammah/story-brief-complexity";

/** Client brief aggregate — same shape as `CompleteBrief` (see `storyBrief.ts`). */
export type StoryBrief = CompleteBrief;

export type { ComplexityLoadState, ComplexityBreakdownEntry };

export interface ComplexityLoadResult {
  totalPageCost: number;
  budget: { min: number; max: number };
  state: ComplexityLoadState;
  breakdown: ComplexityBreakdownEntry[];
  ageRangeMultiplier: number;
}

export {
  PAGE_BUDGET_TABLE,
  AGE_RANGE_MULTIPLIERS,
  OBLIGATION_CORE_ARC_PAGES,
  OBLIGATION_SOMATIC_EACH_PAGES,
  OBLIGATION_SUPPORTING_APPROACH_PAGES,
  OBLIGATION_SHAME_CENTRAL_PAGES,
  OBLIGATION_SHAME_PRESENT_PAGES,
  OBLIGATION_SUPPORTING_CHARACTER_EACH_PAGES,
  OBLIGATION_CAREGIVER_LEAVES_RETURNS_PAGES,
  OBLIGATION_CAREGIVER_WAITING_END_PAGES,
  OBLIGATION_NARRATIVE_PARALLEL_PAGES,
  OBLIGATION_NARRATIVE_METAPHORICAL_PAGES,
};

/**
 * Computes weighted narrative obligation load for a story brief draft.
 */
export function calculateComplexityLoad(brief: StoryBrief): ComplexityLoadResult {
  const parts = extractComplexityPartsFromClientWire(brief);
  const r = computeComplexityFromParts(parts);
  return {
    totalPageCost: r.totalPageCost,
    budget: r.budget,
    state: r.loadState,
    breakdown: r.clientBreakdown,
    ageRangeMultiplier: r.ageMultiplier,
  };
}
