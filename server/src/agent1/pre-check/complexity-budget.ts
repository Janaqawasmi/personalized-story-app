import type { ComplexityBudgetResult } from "@/agent1/types";
import type { StoryBrief } from "@/models/storyBrief.model";
import {
  AGE_WEIGHT_MULTIPLIERS,
  OBLIGATION_WEIGHTS,
  STRUCTURAL_PARAMS,
} from "@/models/storyBrief.model";

export function calculateComplexityBudget(brief: StoryBrief): ComplexityBudgetResult {
  const contributions: Array<{ obligation: string; cost: number }> = [];

  contributions.push({
    obligation: "Core arc",
    cost: OBLIGATION_WEIGHTS.coreArc,
  });

  const tsf = brief.therapeuticArchitecture.typeSpecificField;
  if (tsf.fieldType === "somatic_expression") {
    for (const _sel of tsf.selections) {
      contributions.push({
        obligation: "Somatic expression",
        cost: OBLIGATION_WEIGHTS.somaticExpressionEach,
      });
    }
  }

  if (brief.therapeuticArchitecture.supportingApproach !== undefined) {
    contributions.push({
      obligation: "Supporting approach",
      cost: OBLIGATION_WEIGHTS.supportingApproach,
    });
  }

  switch (brief.therapeuticArchitecture.shameDimension) {
    case "central":
      contributions.push({
        obligation: "Shame (central)",
        cost: OBLIGATION_WEIGHTS.shameCentral,
      });
      break;
    case "present":
      contributions.push({
        obligation: "Shame (present)",
        cost: OBLIGATION_WEIGHTS.shamePresent,
      });
      break;
    default:
      break;
  }

  const supporting = brief.storyWorld.supportingCharacters;
  if (supporting !== undefined) {
    for (const _c of supporting) {
      contributions.push({
        obligation: "Supporting character",
        cost: OBLIGATION_WEIGHTS.supportingCharacterEach,
      });
    }
  }

  switch (brief.storyWorld.caregiverPresence) {
    case "leaves_and_returns":
      contributions.push({
        obligation: "Caregiver (leaves and returns)",
        cost: OBLIGATION_WEIGHTS.caregiverLeavesAndReturns,
      });
      break;
    case "waiting_at_the_end":
      contributions.push({
        obligation: "Caregiver (waiting at the end)",
        cost: OBLIGATION_WEIGHTS.caregiverWaitingAtEnd,
      });
      break;
    default:
      break;
  }

  switch (brief.storyWorld.narrativeDistance) {
    case "parallel":
      contributions.push({
        obligation: "Narrative distance (parallel)",
        cost: OBLIGATION_WEIGHTS.narrativeParallel,
      });
      break;
    case "metaphorical":
      contributions.push({
        obligation: "Narrative distance (metaphorical)",
        cost: OBLIGATION_WEIGHTS.narrativeMetaphorical,
      });
      break;
    default:
      break;
  }

  const baselineTotal = contributions.reduce((sum, c) => sum + c.cost, 0);
  const multiplier = AGE_WEIGHT_MULTIPLIERS[brief.ageAndScope.ageRange];
  const totalPageCost = baselineTotal * multiplier;

  const params =
    STRUCTURAL_PARAMS[brief.ageAndScope.ageRange][brief.ageAndScope.storyLength];
  // STRUCTURAL_PARAMS always defines pages as a two-element tuple per age × length; values are validated in the model.
  const minPages = params.pages[0]!;
  const maxPages = params.pages[1]!;
  const availablePageRange: readonly [number, number] = [minPages, maxPages];

  let state: "green" | "yellow" | "red";
  if (totalPageCost <= minPages) {
    state = "green";
  } else if (totalPageCost <= maxPages) {
    state = "yellow";
  } else {
    state = "red";
  }

  if (state === "green") {
    return {
      totalPageCost,
      availablePageRange,
      state,
      contributions,
    };
  }

  const complexityStatusText = `COMPLEXITY STATUS: This brief's narrative obligations exceed the selected story length. Total estimated page cost: ${totalPageCost} pages. Available: ${minPages}–${maxPages} pages. Color state: ${state}. Follow the narrative obligation tiers (provided below) to make compression decisions.`;

  return {
    totalPageCost,
    availablePageRange,
    state,
    contributions,
    complexityStatusText,
  };
}
