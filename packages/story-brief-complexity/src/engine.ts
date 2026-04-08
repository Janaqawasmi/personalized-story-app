import { OBLIGATION_WEIGHTS, PAGE_BUDGET_TABLE, AGE_RANGE_MULTIPLIERS } from "./constants";
import type {
  ComplexityEngineResult,
  ComplexityLoadState,
  NormalizedComplexityParts,
  ComplexityBreakdownEntry,
  ServerObligationRow,
} from "./types";

export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function loadStateForTotal(total: number, budgetMin: number, budgetMax: number): ComplexityLoadState {
  if (total <= budgetMin) return "green";
  if (total <= budgetMax) return "yellow";
  return "red";
}

interface InternalRow {
  id: string;
  name: string;
  displayLabel: string;
  rawCost: number;
  serverLabel: string;
}

/**
 * Single §16 engine: normalized parts → totals, UI breakdown, and server obligation rows.
 */
export function computeComplexityFromParts(parts: NormalizedComplexityParts): ComplexityEngineResult {
  const { ageRange, storyLength } = parts;
  const multiplier = AGE_RANGE_MULTIPLIERS[ageRange];
  const budget = PAGE_BUDGET_TABLE[ageRange][storyLength];

  const rawRows: InternalRow[] = [];

  rawRows.push({
    id: "core_arc",
    name: "Core arc (safe beginning + trigger + peak + tool + landing)",
    displayLabel: "Core story arc",
    rawCost: OBLIGATION_WEIGHTS.coreArc,
    serverLabel: "Core arc (safe beginning + trigger + peak + tool + landing)",
  });

  if (parts.somaticSelectionCount > 0) {
    const count = parts.somaticSelectionCount;
    const raw = count * OBLIGATION_WEIGHTS.somaticExpressionEach;
    const clientLabel = count === 1 ? "1 somatic expression" : `${count} somatic expressions`;
    rawRows.push({
      id: "somatic_expressions",
      name: "Somatic expressions (Field 3.4)",
      displayLabel: clientLabel,
      rawCost: raw,
      serverLabel: `Somatic expression${count > 1 ? "s" : ""} (${count} selected)`,
    });
  }

  if (parts.hasSupportingApproach) {
    rawRows.push({
      id: "supporting_approach",
      name: "Supporting therapeutic approach (Field 3.2)",
      displayLabel: "Supporting approach",
      rawCost: OBLIGATION_WEIGHTS.supportingApproach,
      serverLabel: "Supporting therapeutic approach",
    });
  }

  if (parts.shameDimension === "central") {
    rawRows.push({
      id: "shame_central",
      name: "Shame — central to the experience (Field 3.3)",
      displayLabel: "Shame: central",
      rawCost: OBLIGATION_WEIGHTS.shameCentral,
      serverLabel: "Shame = Central (normalization + witnessing + acceptance)",
    });
  } else if (parts.shameDimension === "present") {
    rawRows.push({
      id: "shame_present",
      name: "Shame — present, handle with care (Field 3.3)",
      displayLabel: "Shame: present",
      rawCost: OBLIGATION_WEIGHTS.shamePresent,
      serverLabel: "Shame = Present (avoidance constraints)",
    });
  }

  const characterCount = parts.supportingCharacterCount;
  if (characterCount > 0) {
    const raw = characterCount * OBLIGATION_WEIGHTS.supportingCharacterEach;
    const clientLabel =
      characterCount === 1 ? "1 supporting character" : `${characterCount} supporting characters`;
    rawRows.push({
      id: "supporting_characters",
      name: "Supporting characters (Field 4.6)",
      displayLabel: clientLabel,
      rawCost: raw,
      serverLabel: `Supporting character${characterCount > 1 ? "s" : ""} (${characterCount})`,
    });
  }

  if (parts.caregiverPresence === "leaves_and_returns") {
    rawRows.push({
      id: "caregiver_leaves_returns",
      name: 'Caregiver — "Leaves and returns" (Field 4.4)',
      displayLabel: "Caregiver: leaves and returns",
      rawCost: OBLIGATION_WEIGHTS.caregiverLeavesAndReturns,
      serverLabel: 'Caregiver "Leaves and returns" (goodbye + reunion arc)',
    });
  } else if (parts.caregiverPresence === "waiting_at_the_end") {
    rawRows.push({
      id: "caregiver_waiting_end",
      name: 'Caregiver — "Waiting at the end" (Field 4.4)',
      displayLabel: "Caregiver: waiting at the end",
      rawCost: OBLIGATION_WEIGHTS.caregiverWaitingAtEnd,
      serverLabel: 'Caregiver "Waiting at the end" (return scene)',
    });
  }

  if (parts.narrativeDistance === "parallel") {
    rawRows.push({
      id: "narrative_parallel",
      name: "Parallel narrative distance (Field 4.5)",
      displayLabel: "Parallel narrative distance",
      rawCost: OBLIGATION_WEIGHTS.narrativeParallel,
      serverLabel: "Parallel narrative distance (world-building overhead)",
    });
  } else if (parts.narrativeDistance === "metaphorical") {
    rawRows.push({
      id: "narrative_metaphorical",
      name: "Metaphorical narrative distance (Field 4.5)",
      displayLabel: "Metaphorical narrative distance",
      rawCost: OBLIGATION_WEIGHTS.narrativeMetaphorical,
      serverLabel: "Metaphorical narrative distance (symbolic mapping overhead)",
    });
  }

  const baseSum = rawRows.reduce((s, r) => s + r.rawCost, 0);
  const totalPageCost = roundToHalf(baseSum * multiplier);

  const clientBreakdown: ComplexityBreakdownEntry[] = rawRows.map((r) => ({
    id: r.id,
    name: r.name,
    displayLabel: r.displayLabel,
    rawCost: r.rawCost,
    scaledCost: roundToHalf(r.rawCost * multiplier),
  }));

  const serverObligations: ServerObligationRow[] = rawRows.map((r) => ({
    label: r.serverLabel,
    baseCost: r.rawCost,
  }));

  const loadState = loadStateForTotal(totalPageCost, budget.min, budget.max);

  return {
    totalPageCost,
    ageMultiplier: multiplier,
    budget: { min: budget.min, max: budget.max },
    loadState,
    clientBreakdown,
    serverObligations,
  };
}
