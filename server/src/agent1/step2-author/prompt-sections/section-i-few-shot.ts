import {
  AGE_RANGE_LABELS,
  STORY_TYPE_LABELS,
  type AgeRange,
  type StoryType,
} from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export interface StoryExample {
  content: Record<string, unknown>;
  filename: string;
}

export interface StoryFewShotResult {
  example: StoryExample | null;
  sourceAgeRange: AgeRange;
  crossBucket: boolean;
}

const COLD_START =
  'Standards: specificity, restraint, concrete detail, coping tool shown not named, body experience specific to provided expressions.';

export function buildStep2SectionI(
  fewShotResult: StoryFewShotResult,
  storyType: StoryType,
  ageRange: AgeRange,
): string {
  if (fewShotResult.example === null) {
    return COLD_START;
  }

  const crossBucketNote = conditionalBlock(
    fewShotResult.crossBucket,
    `NOTE: No approved story examples exist yet for the ${AGE_RANGE_LABELS[ageRange]} age range. The example below is from the ${AGE_RANGE_LABELS[fewShotResult.sourceAgeRange]} range. Adapt prose complexity and vocabulary accordingly.`,
  );

  const lead = [
    crossBucketNote,
    `One approved story for ${STORY_TYPE_LABELS[storyType]}, age ${AGE_RANGE_LABELS[ageRange]}.`,
    'Study prose quality, pacing, coping tool presentation, body language.',
    'Do not imitate — match the standard.',
    JSON.stringify(fewShotResult.example.content, null, 2),
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');

  return lead;
}
