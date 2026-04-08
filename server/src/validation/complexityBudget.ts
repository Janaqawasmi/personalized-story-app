// server/src/validation/complexityBudget.ts
//
// Complexity budget calculator for the Story Brief (spec v1.3, Section 16).
//
// Every narrative obligation has a base page cost (calibrated to ages 3–5).
// The system sums all costs, scales by an age-range multiplier, and compares
// the total against the lower bound of the available page budget for the
// selected age × length combination.
//
// When overloaded, a soft warning lists the specific obligations contributing
// to the excess so the psychologist can decide what to adjust.

import type { StoryBrief, AgeRange, StoryLength } from "../models/storyBrief.model";
import {
  OBLIGATION_WEIGHTS,
  AGE_WEIGHT_MULTIPLIERS,
  STRUCTURAL_PARAMS,
  STORY_LENGTH_LABELS,
} from "../models/storyBrief.model";

// ============================================================================
// Types
// ============================================================================

export interface ObligationItem {
  /** Human-readable label for the obligation. */
  label: string;
  /** Base page cost before age scaling (3–5 baseline). */
  baseCost: number;
}

export interface ComplexityBudgetResult {
  /** Sum of all obligation costs after age-range scaling. */
  totalPageCost: number;
  /** Available page range [min, max] for the selected age × length. */
  availablePages: [number, number];
  /** True when totalPageCost exceeds the lower bound of availablePages. */
  isOverBudget: boolean;
  /** Itemized list of every obligation that contributed to the cost. */
  obligations: ObligationItem[];
  /** The age-range multiplier that was applied. */
  ageMultiplier: number;
  /** Pre-formatted warning message, or null if within budget. */
  warningMessage: string | null;
}

// ============================================================================
// Core Calculation
// ============================================================================

/**
 * Computes the complexity budget for a complete Story Brief.
 *
 * The algorithm:
 * 1. Walk every brief field that creates a narrative obligation.
 * 2. Sum the baseline page costs (Section 16 weights, ages 3–5).
 * 3. Multiply by the age-range scaling factor.
 * 4. Compare against the **lower bound** of the page range for
 *    the selected age × length combination.
 * 5. If over budget, build a human-readable warning listing each
 *    obligation and its cost.
 */
export function calculateComplexityBudget(
  brief: StoryBrief,
): ComplexityBudgetResult {
  const ageRange: AgeRange = brief.ageAndScope.ageRange;
  const storyLength: StoryLength = brief.ageAndScope.storyLength;

  // ── Collect obligations ──────────────────────────────────────────────

  const obligations: ObligationItem[] = [];

  // Core arc is always present
  obligations.push({
    label: "Core arc (safe beginning + trigger + peak + tool + landing)",
    baseCost: OBLIGATION_WEIGHTS.coreArc,
  });

  // Somatic expressions (Fear & Anxiety field 3.4)
  if (brief.therapeuticArchitecture.typeSpecificField.fieldType === "somatic_expression") {
    const count = brief.therapeuticArchitecture.typeSpecificField.selections.length;
    if (count > 0) {
      obligations.push({
        label: `Somatic expression${count > 1 ? "s" : ""} (${count} selected)`,
        baseCost: count * OBLIGATION_WEIGHTS.somaticExpressionEach,
      });
    }
  }

  // Supporting approach
  if (brief.therapeuticArchitecture.supportingApproach) {
    obligations.push({
      label: "Supporting therapeutic approach",
      baseCost: OBLIGATION_WEIGHTS.supportingApproach,
    });
  }

  // Shame dimension
  if (brief.therapeuticArchitecture.shameDimension === "central") {
    obligations.push({
      label: "Shame = Central (normalization + witnessing + acceptance)",
      baseCost: OBLIGATION_WEIGHTS.shameCentral,
    });
  } else if (brief.therapeuticArchitecture.shameDimension === "present") {
    obligations.push({
      label: "Shame = Present (avoidance constraints)",
      baseCost: OBLIGATION_WEIGHTS.shamePresent,
    });
  }

  // Supporting characters
  const characterCount = brief.storyWorld.supportingCharacters?.length ?? 0;
  if (characterCount > 0) {
    obligations.push({
      label: `Supporting character${characterCount > 1 ? "s" : ""} (${characterCount})`,
      baseCost: characterCount * OBLIGATION_WEIGHTS.supportingCharacterEach,
    });
  }

  // Caregiver presence overhead
  if (brief.storyWorld.caregiverPresence === "leaves_and_returns") {
    obligations.push({
      label: 'Caregiver "Leaves and returns" (goodbye + reunion arc)',
      baseCost: OBLIGATION_WEIGHTS.caregiverLeavesAndReturns,
    });
  } else if (brief.storyWorld.caregiverPresence === "waiting_at_the_end") {
    obligations.push({
      label: 'Caregiver "Waiting at the end" (return scene)',
      baseCost: OBLIGATION_WEIGHTS.caregiverWaitingAtEnd,
    });
  }

  // Narrative distance overhead
  if (brief.storyWorld.narrativeDistance === "parallel") {
    obligations.push({
      label: "Parallel narrative distance (world-building overhead)",
      baseCost: OBLIGATION_WEIGHTS.narrativeParallel,
    });
  } else if (brief.storyWorld.narrativeDistance === "metaphorical") {
    obligations.push({
      label: "Metaphorical narrative distance (symbolic mapping overhead)",
      baseCost: OBLIGATION_WEIGHTS.narrativeMetaphorical,
    });
  }

  // ── Apply age-range scaling ──────────────────────────────────────────

  const ageMultiplier = AGE_WEIGHT_MULTIPLIERS[ageRange];
  const baseTotal = obligations.reduce((sum, o) => sum + o.baseCost, 0);
  const totalPageCost = roundToHalf(baseTotal * ageMultiplier);

  // ── Compare against available budget ─────────────────────────────────

  const params = STRUCTURAL_PARAMS[ageRange][storyLength];
  const availablePages: [number, number] = [params.pages[0], params.pages[1]];
  const lowerBound = availablePages[0];
  const isOverBudget = totalPageCost > lowerBound;

  // ── Build warning message ────────────────────────────────────────────

  let warningMessage: string | null = null;

  if (isOverBudget) {
    const lengthLabel = STORY_LENGTH_LABELS[storyLength];
    const obligationLines = obligations.map(
      (o) => `  • ${o.label}: ${roundToHalf(o.baseCost * ageMultiplier)} pages`,
    );

    warningMessage =
      `Your story design requires approximately ${totalPageCost} pages to include all ` +
      `elements well. You've selected ${lengthLabel} (${availablePages[0]}–${availablePages[1]} pages). ` +
      `Consider increasing the story length, or reducing complexity by removing a supporting ` +
      `character, changing the supporting approach, or adjusting the shame level.\n\n` +
      `Obligation breakdown:\n${obligationLines.join("\n")}`;
  }

  return {
    totalPageCost,
    availablePages,
    isOverBudget,
    obligations,
    ageMultiplier,
    warningMessage,
  };
}

// ============================================================================
// Utility
// ============================================================================

/** Round to nearest 0.5 for cleaner display values. */
function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
