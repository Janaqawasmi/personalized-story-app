// server/src/validation/complexityParts.ts
//
// Maps canonical server `StoryBrief` → shared package `NormalizedComplexityParts`.
// Client wire mapping lives in @dammah/story-brief-complexity (clientWireAdapter).

import type { NormalizedComplexityParts } from "@dammah/story-brief-complexity";
import type { StoryBrief } from "../models/storyBrief.model";

/**
 * Extract complexity inputs from canonical server `StoryBrief`.
 */
export function extractComplexityPartsFromStoryBrief(brief: StoryBrief): NormalizedComplexityParts {
  const ageRange = brief.ageAndScope.ageRange;
  const storyLength = brief.ageAndScope.storyLength;

  let somaticSelectionCount = 0;
  const tsf = brief.therapeuticArchitecture.typeSpecificField;
  if (tsf?.fieldType === "somatic_expression") {
    somaticSelectionCount = tsf.selections.length;
  }

  const supportingCharacterCount = brief.storyWorld.supportingCharacters?.length ?? 0;

  return {
    ageRange,
    storyLength,
    somaticSelectionCount,
    hasSupportingApproach: !!brief.therapeuticArchitecture.supportingApproach,
    shameDimension: brief.therapeuticArchitecture.shameDimension,
    supportingCharacterCount,
    caregiverPresence: brief.storyWorld.caregiverPresence,
    narrativeDistance: brief.storyWorld.narrativeDistance,
  };
}
