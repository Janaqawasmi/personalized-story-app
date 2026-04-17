import type { StoryBrief } from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionB(brief: StoryBrief): string {
  const { creativeVision, oneTrueThing } = brief.clinicalFoundation;

  const hasOneTrueThing =
    oneTrueThing !== undefined && oneTrueThing.trim().length > 0;

  const oneTrueThing_block = conditionalBlock(
    hasOneTrueThing,
    `\nAND SOMETHING REAL:\n"${oneTrueThing}"\nA real detail observed in real children. Find where it belongs\nand let it live there without explanation.`,
  );

  return `THE IMAGE AT THE CENTER:
"${creativeVision}"
Build the story around this. The reader should remember this
moment most vividly.${oneTrueThing_block}`;
}
