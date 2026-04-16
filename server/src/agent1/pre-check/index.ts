import type { StoryBrief } from "@/models/storyBrief.model";
import type { PreCheckResult, PreCheckWarning } from "@/agent1/types";

import { calculateComplexityBudget } from "./complexity-budget";
import { checkQualityGate } from "./quality-gate";
import { checkVagueIntention } from "./vague-intention";

export function runPreCheck(brief: StoryBrief): PreCheckResult {
  const qualityGate = checkQualityGate(brief);
  const vagueIntention = checkVagueIntention(
    brief.clinicalFoundation.therapeuticIntention,
  );
  const complexityBudget = calculateComplexityBudget(brief);

  const warnings: PreCheckWarning[] = [];

  if (qualityGate.triggerThin) {
    warnings.push({
      code: "trigger_thin",
      message:
        "A detailed trigger scene — what the child sees, hears, feels in the moment — helps the story capture the right experience. Would you like to elaborate?",
      severity: "warn",
    });
  }

  if (qualityGate.intentionThin) {
    warnings.push({
      code: "intention_thin",
      message:
        "This may be too brief for the agent to work with. Can you make the second half more specific?",
      severity: "warn",
    });
  }

  if (vagueIntention.isVague) {
    warnings.push({
      code: "intention_vague",
      message:
        "The therapeutic intention may be too generic for the agent to plan a specific story. Consider making it more concrete.",
      severity: "info",
    });
  }

  // TODO: When storyBrief.model.ts adds a
  // complexityAcknowledgedInBrief field, replace this as any cast
  // with a typed access. The field is specified in v3.2 §4.3 but not
  // yet in the model file.
  const complexityAcknowledged =
    (brief as any).complexityAcknowledgedInBrief === true;

  const shouldShowComplexityWarning =
    complexityBudget.state === "red" &&
    brief.ageAndScope.storyLength !== "extended" &&
    !complexityAcknowledged;

  if (shouldShowComplexityWarning) {
    warnings.push({
      code: "complexity_red",
      message:
        "This brief's narrative obligations significantly exceed the selected story length. Consider increasing the story length, or reducing complexity.",
      severity: "warn",
    });
  }

  return {
    qualityGate,
    vagueIntention,
    complexityBudget,
    warnings,
  };
}
