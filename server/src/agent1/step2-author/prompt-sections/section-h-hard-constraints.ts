import type { StoryBrief } from '@/models/storyBrief.model';
import { SHAME_DIMENSION_LABELS } from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionH(brief: StoryBrief): string {
  // CRITICAL: Source is brief.therapeuticArchitecture.mustNeverList
  // (the psychologist's final edited list). NEVER read from generic
  // type-level default lists for this field — those hold pre-fill
  // defaults and reading them reverses clinical judgment.
  // See v3.2 §6.2 Section H.
  const mustNeverList = brief.therapeuticArchitecture.mustNeverList;

  const mustNeverFormatted =
    mustNeverList.length === 0
      ? '(none)'
      : mustNeverList.map((item) => `- ${item}`).join('\n');

  const shameDimension = brief.therapeuticArchitecture.shameDimension;
  const shameLevelDisplay = SHAME_DIMENSION_LABELS[shameDimension];

  const shameConditional = conditionalBlock(
    shameDimension === 'present',
    'Never put protagonist in position of being observed in their shame.',
  );

  const shameCentralBlock = conditionalBlock(
    shameDimension === 'central',
    `(1) Story demonstrates child is not alone in this feeling.
(2) Never implies child should have known/done/felt differently.
(3) At least one character witnesses the protagonist's difficulty and responds with acceptance, not correction.`,
  );

  const shameTail = [shameConditional, shameCentralBlock].filter(Boolean).join('\n\n');

  return `WHAT THIS STORY MUST NEVER DO:
${mustNeverFormatted}
SHAME RULES:
${shameLevelDisplay}
${shameTail}
These constraints are absolute.`;
}
