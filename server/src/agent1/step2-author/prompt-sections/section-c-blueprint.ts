import type { StoryBrief } from '@/models/storyBrief.model';
import { FEAR_ANXIETY_COPING_TOOL_LABELS } from '@/models/storyBrief.model';
import type { Step1Output } from '@/agent1/types';
import { conditionalBlock, numberedList } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionC(
  brief: StoryBrief,
  step1Output: Step1Output,
): string {
  const formattedBlueprint = numberedList(
    step1Output.blueprint.map((bp) => bp.text),
  );
  const copingToolDisplay =
    FEAR_ANXIETY_COPING_TOOL_LABELS[brief.therapeuticArchitecture.copingTool];

  const comfortObjectConditional = conditionalBlock(
    brief.therapeuticArchitecture.copingTool === 'comfort_object_or_memory',
    `\nThis recalls another person's presence — a physical object for younger children, a memory or internalized voice for older children. It is NOT self-generated encouragement.`,
  );

  return `EMOTIONAL TRUTH:
${step1Output.emotionalTruth}
NARRATIVE BLUEPRINT:
${formattedBlueprint}
COPING TOOL:
${step1Output.copingToolPlacement}
The coping tool is ${copingToolDisplay}. Show it happening. Do not name it.${comfortObjectConditional}
HOW THE APPROACH WORKS IN THIS STORY:
${step1Output.approachInstruction}`;
}
