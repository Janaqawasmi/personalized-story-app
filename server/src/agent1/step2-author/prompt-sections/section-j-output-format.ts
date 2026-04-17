import type { StoryBrief } from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionJ(brief: StoryBrief): string {
  const personalizationNote = conditionalBlock(
    brief.storyWorld.personalization === true,
    'Use [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders throughout.',
  );

  return [
    '1. TITLE',
    'A title a child would be drawn to. Not clinical, not cute.',
    '2. STORY',
    'Complete text. No headers. No chapter breaks (unless 9–12 Extended).',
    personalizationNote,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}
