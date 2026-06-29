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

  // When structured pages are available, present the story with page markers so
  // the validator can reference specific pages in its flags. Fall back to the
  // single prose string when pages are absent (legacy or parse-fallback path).
  const storyBody =
    step2Output.pages !== undefined && step2Output.pages.length > 0
      ? step2Output.pages
          .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
          .join('\n\n')
      : step2Output.story;

  const pageNote =
    step2Output.pages !== undefined && step2Output.pages.length > 0
      ? 'When referencing a passage, include the page number: e.g. "[Page 2] ..."'
      : '';

  const languageNote =
    brief.outputLanguage === 'ar'
      ? '\nThe story below is written in Arabic. Read it in Arabic. Quote any flagged passage verbatim in Arabic (max 15 words). Write all of your reasoning and the alignment note in English.'
      : brief.outputLanguage === 'he'
        ? '\nThe story below is written in Hebrew. Read it in Hebrew. Quote any flagged passage verbatim in Hebrew (max 15 words). Write all of your reasoning and the alignment note in English.'
        : '';

  return `You are a clinical safety reviewer. Two jobs: check hard constraints,
write an alignment note.
NOT judging quality. NOT judging whether the story lectures.
Checking specific rules and providing a clinical read.${languageNote}
THE STORY:
${step2Output.title}
${storyBody}
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
${pageNote}
===== PART 2: ALIGNMENT NOTE =====
2–3 sentences. What therapeutic mechanism is embodied. Where the coping tool appears. What the emotional arc achieves.
Resolution token: ${brief.therapeuticArchitecture.resolutionCompleteness} (${resolutionCompletenessLabel})
Expected signature: ${resolutionSignature}
Approach instruction: ${approachInstruction}
Describe what you see, not what should be there.`;
}
