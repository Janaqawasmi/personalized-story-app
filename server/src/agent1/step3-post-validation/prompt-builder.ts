import type { StoryBrief } from '@/models/storyBrief.model';
import {
  AGE_RANGE_LABELS,
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  PEAK_INTENSITY_LABELS,
  RESOLUTION_LABELS,
  SHAME_DIMENSION_LABELS,
  SOMATIC_EXPRESSION_LABELS,
} from '@/models/storyBrief.model';
import { assertSomaticField } from '@/agent1/shared/token-helpers';
import type { Step2Output } from '@/agent1/types';

export function buildPostValidationPrompt(
  step2Output: Step2Output,
  brief: StoryBrief,
  approachInstruction: string,
): string {
  const somaticField = assertSomaticField(brief.therapeuticArchitecture.typeSpecificField);
  const somaticExpressionSummary = somaticField.selections
    .map((ex) => SOMATIC_EXPRESSION_LABELS[ex])
    .join('; ');

  const mustNeverFormatted =
    brief.therapeuticArchitecture.mustNeverList.length === 0
      ? '(none)'
      : brief.therapeuticArchitecture.mustNeverList.map((item) => `- ${item}`).join('\n');

  const shameToken = brief.therapeuticArchitecture.shameDimension;
  const shameLevelDisplay = SHAME_DIMENSION_LABELS[shameToken];

  let shameCheckInstructions: string;
  if (shameToken === 'central') {
    shameCheckInstructions =
      'Check all three rules — (1) not alone demonstrated, (2) no implication of should-have-known, (3) witnessing character responds with acceptance not correction.';
  } else if (shameToken === 'present') {
    shameCheckInstructions = 'Is protagonist observed in their shame?';
  } else {
    shameCheckInstructions = 'No shame-specific checks required.';
  }

  const copingToolDisplay =
    FEAR_ANXIETY_COPING_TOOL_LABELS[brief.therapeuticArchitecture.copingTool];

  const ageRangeDisplay = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];
  const intensityDisplay = PEAK_INTENSITY_LABELS[brief.ageAndScope.peakIntensity];

  const resolutionToken = brief.therapeuticArchitecture.resolutionCompleteness;
  const resolutionCompletenessLabel = RESOLUTION_LABELS[resolutionToken];

  let resolutionSignature: string;
  if (resolutionToken === 'full') {
    resolutionSignature = 'Relief, accomplishment, safety restored.';
  } else if (resolutionToken === 'partial') {
    resolutionSignature = 'Cautious hope — tool helped but feeling lingers gently.';
  } else {
    resolutionSignature = 'Something new but journey unfinished. Ends looking forward.';
  }

  return `You are a clinical safety reviewer. Two jobs: check hard constraints,
write an alignment note.
NOT judging quality. NOT judging whether the story lectures.
Checking specific rules and providing a clinical read.
THE STORY:
${step2Output.title}
${step2Output.story}
Brief somatic expressions (from brief): ${somaticExpressionSummary}
===== PART 1: CONSTRAINT CHECK =====

MUST-NEVER LIST:
${mustNeverFormatted}
Violations? Quote passage (max 15 words), name the rule.
SHAME HANDLING:
${shameLevelDisplay}  (token: ${brief.therapeuticArchitecture.shameDimension})
${shameCheckInstructions}
COPING TOOL:
Tool: ${copingToolDisplay}. Should appear at emotional peak.
Present? Shown in action or explained/named?
AGE APPROPRIATENESS:
Age: ${ageRangeDisplay}. Intensity: ${intensityDisplay}.
Any scene exceeds specified intensity?

OUTPUT:
"PASS" or per-concern: check number, passage, reasoning, severity
("likely violation" / "borderline — specialist should review").
Flag only what a clinical reviewer would genuinely question.
===== PART 2: ALIGNMENT NOTE =====
2–3 sentences. What therapeutic mechanism is embodied. Where the coping tool appears. What the emotional arc achieves.
Resolution token: ${brief.therapeuticArchitecture.resolutionCompleteness} (${resolutionCompletenessLabel})
Expected signature: ${resolutionSignature}
Approach instruction: ${approachInstruction}
Describe what you see, not what should be there.`;
}
