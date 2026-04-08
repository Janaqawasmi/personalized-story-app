/**
 * Story brief complexity load (spec §16 weights, §10 page budgets, load state vs page band).
 * Pure functions — no React or I/O.
 */

import type { AgeRange, CompleteBrief, StoryLength } from "../types/storyBrief";
import { STORY_LENGTH_DEFAULT } from "../types/storyBrief";

/** Client brief aggregate — same shape as `CompleteBrief` (see `storyBrief.ts`). */
export type StoryBrief = CompleteBrief;

// ---------------------------------------------------------------------------
// Obligation weights — baseline ages 3–5 (spec §16)
// ---------------------------------------------------------------------------

export const OBLIGATION_CORE_ARC_PAGES = 5;
export const OBLIGATION_SOMATIC_EACH_PAGES = 0.5;
export const OBLIGATION_SUPPORTING_APPROACH_PAGES = 1;
export const OBLIGATION_SHAME_CENTRAL_PAGES = 1;
export const OBLIGATION_SHAME_PRESENT_PAGES = 0.5;
export const OBLIGATION_SUPPORTING_CHARACTER_EACH_PAGES = 1;
export const OBLIGATION_CAREGIVER_LEAVES_RETURNS_PAGES = 1.5;
export const OBLIGATION_CAREGIVER_WAITING_END_PAGES = 0.5;
export const OBLIGATION_NARRATIVE_PARALLEL_PAGES = 1;
export const OBLIGATION_NARRATIVE_METAPHORICAL_PAGES = 1.5;

// ---------------------------------------------------------------------------
// Age-range scaling (spec §16)
// ---------------------------------------------------------------------------

export const AGE_RANGE_MULTIPLIERS: Record<AgeRange, number> = {
  "3-5": 1.0,
  "5-7": 0.8,
  "7-9": 0.6,
  "9-12": 0.5,
};

// ---------------------------------------------------------------------------
// Page budget min/max by age × length — spec §10 / §16 (Pages column)
// ---------------------------------------------------------------------------

export const PAGE_BUDGET_TABLE: Record<
  AgeRange,
  Record<StoryLength, { min: number; max: number }>
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComplexityLoadState = "green" | "yellow" | "red";

export interface ComplexityBreakdownEntry {
  /** Stable key for analytics / keys */
  id: string;
  /** Full human-readable obligation name */
  name: string;
  /** Short label for compact UI (e.g. "2 supporting characters") */
  displayLabel: string;
  /** Baseline page cost before age multiplier (3–5 baseline) */
  rawCost: number;
  /** Cost after applying the age-range multiplier */
  scaledCost: number;
}

export interface ComplexityLoadResult {
  totalPageCost: number;
  budget: { min: number; max: number };
  state: ComplexityLoadState;
  breakdown: ComplexityBreakdownEntry[];
  /** Age-range multiplier applied to each raw weight */
  ageRangeMultiplier: number;
}

interface RawObligation {
  id: string;
  name: string;
  displayLabel: string;
  rawCost: number;
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function resolveAgeRange(brief: StoryBrief): AgeRange {
  return brief.section1.ageRange ?? "3-5";
}

function resolveStoryLength(brief: StoryBrief): StoryLength {
  return brief.section1.storyLength ?? STORY_LENGTH_DEFAULT;
}

function collectRawObligations(brief: StoryBrief): RawObligation[] {
  const out: RawObligation[] = [];

  out.push({
    id: "core_arc",
    name: "Core arc (safe beginning + trigger + peak + tool + landing)",
    displayLabel: "Core story arc",
    rawCost: OBLIGATION_CORE_ARC_PAGES,
  });

  const st = brief.storyType;
  const somatic =
    st === "fear_anxiety" || st == null
      ? brief.section3.somaticExpressions?.length ?? 0
      : 0;

  if (somatic > 0) {
    const raw = somatic * OBLIGATION_SOMATIC_EACH_PAGES;
    const label =
      somatic === 1 ? "1 somatic expression" : `${somatic} somatic expressions`;
    out.push({
      id: "somatic_expressions",
      name: "Somatic expressions (Field 3.4)",
      displayLabel: label,
      rawCost: raw,
    });
  }

  if (brief.section3.supportingApproach) {
    out.push({
      id: "supporting_approach",
      name: "Supporting therapeutic approach (Field 3.2)",
      displayLabel: "Supporting approach",
      rawCost: OBLIGATION_SUPPORTING_APPROACH_PAGES,
    });
  }

  const shame = brief.section3.shameDimension;
  if (shame === "central") {
    out.push({
      id: "shame_central",
      name: "Shame — central to the experience (Field 3.3)",
      displayLabel: "Shame: central",
      rawCost: OBLIGATION_SHAME_CENTRAL_PAGES,
    });
  } else if (shame === "present") {
    out.push({
      id: "shame_present",
      name: "Shame — present, handle with care (Field 3.3)",
      displayLabel: "Shame: present",
      rawCost: OBLIGATION_SHAME_PRESENT_PAGES,
    });
  }

  const charCount = brief.section4.supportingCharacters?.length ?? 0;
  if (charCount > 0) {
    const raw = charCount * OBLIGATION_SUPPORTING_CHARACTER_EACH_PAGES;
    const label =
      charCount === 1
        ? "1 supporting character"
        : `${charCount} supporting characters`;
    out.push({
      id: "supporting_characters",
      name: "Supporting characters (Field 4.6)",
      displayLabel: label,
      rawCost: raw,
    });
  }

  const caregiver = brief.section4.caregiverPresence;
  if (caregiver === "leaves_returns") {
    out.push({
      id: "caregiver_leaves_returns",
      name: 'Caregiver — "Leaves and returns" (Field 4.4)',
      displayLabel: "Caregiver: leaves and returns",
      rawCost: OBLIGATION_CAREGIVER_LEAVES_RETURNS_PAGES,
    });
  } else if (caregiver === "waiting_end") {
    out.push({
      id: "caregiver_waiting_end",
      name: 'Caregiver — "Waiting at the end" (Field 4.4)',
      displayLabel: "Caregiver: waiting at the end",
      rawCost: OBLIGATION_CAREGIVER_WAITING_END_PAGES,
    });
  }

  const narrative = brief.section4.narrativeDistance;
  if (narrative === "parallel") {
    out.push({
      id: "narrative_parallel",
      name: "Parallel narrative distance (Field 4.5)",
      displayLabel: "Parallel narrative distance",
      rawCost: OBLIGATION_NARRATIVE_PARALLEL_PAGES,
    });
  } else if (narrative === "metaphorical") {
    out.push({
      id: "narrative_metaphorical",
      name: "Metaphorical narrative distance (Field 4.5)",
      displayLabel: "Metaphorical narrative distance",
      rawCost: OBLIGATION_NARRATIVE_METAPHORICAL_PAGES,
    });
  }

  return out;
}

/**
 * Load state aligned with §16 page band `[min, max]` and §21 Layer 4 (pre-submit only when red):
 * - green: total ≤ min (not past the lower bound of the chosen length)
 * - yellow: min < total ≤ max (§16 soft-warning “overload” zone, still within published range)
 * - red: total > max (past the upper bound; Layer 4 pre-submit modal)
 */
function loadStateForTotal(total: number, budgetMin: number, budgetMax: number): ComplexityLoadState {
  if (total <= budgetMin) return "green";
  if (total <= budgetMax) return "yellow";
  return "red";
}

/**
 * Computes weighted narrative obligation load for a story brief draft.
 *
 * Uses §16 weights, per-obligation age scaling (same multiplier on each weight, then summed),
 * §10/§16 page ranges for the selected age × length, and green/yellow/red vs that band.
 */
export function calculateComplexityLoad(brief: StoryBrief): ComplexityLoadResult {
  const ageRange = resolveAgeRange(brief);
  const storyLength = resolveStoryLength(brief);
  const multiplier = AGE_RANGE_MULTIPLIERS[ageRange];
  const budget = PAGE_BUDGET_TABLE[ageRange][storyLength];

  const rawRows = collectRawObligations(brief);
  const baseSum = rawRows.reduce((s, r) => s + r.rawCost, 0);
  const totalPageCost = roundToHalf(baseSum * multiplier);

  const breakdown: ComplexityBreakdownEntry[] = rawRows.map((r) => ({
    id: r.id,
    name: r.name,
    displayLabel: r.displayLabel,
    rawCost: r.rawCost,
    scaledCost: roundToHalf(r.rawCost * multiplier),
  }));

  const state = loadStateForTotal(totalPageCost, budget.min, budget.max);

  return {
    totalPageCost,
    budget: { min: budget.min, max: budget.max },
    state,
    breakdown,
    ageRangeMultiplier: multiplier,
  };
}
