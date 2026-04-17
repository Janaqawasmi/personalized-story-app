import type { StoryBrief } from '@/models/storyBrief.model';
import { SOMATIC_EXPRESSION_LABELS } from '@/models/storyBrief.model';
import { assertSomaticField } from '@/agent1/shared/token-helpers';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionD(brief: StoryBrief): string {
  const somatic = assertSomaticField(brief.therapeuticArchitecture.typeSpecificField);
  const somatic1Display = SOMATIC_EXPRESSION_LABELS[somatic.selections[0]!];

  const lines: string[] = [
    `This child's anxiety lives in their body as:`,
    somatic1Display,
  ];

  if (somatic.selections.length >= 2 && somatic.selections[1] !== undefined) {
    lines.push(SOMATIC_EXPRESSION_LABELS[somatic.selections[1]]);
  }

  const freeTrimmed = somatic.freeText?.trim();
  if (freeTrimmed) {
    lines.push(freeTrimmed);
  }

  lines.push('Show the body. The reader should feel it physically.');

  const metaphoricalConditional = conditionalBlock(
    brief.storyWorld.narrativeDistance === 'metaphorical',
    `Translate these somatic experiences into the metaphorical world — the sensation should feel equivalent even if the body is different.`,
  );
  if (metaphoricalConditional) {
    lines.push(metaphoricalConditional);
  }

  return lines.join('\n');
}
