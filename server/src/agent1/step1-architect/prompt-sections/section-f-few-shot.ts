import {
  AGE_RANGE_LABELS,
  STORY_TYPE_LABELS,
  type AgeRange,
  type StoryType,
} from '@/models/storyBrief.model';
import type { FewShotResult } from '../few-shot-retriever';

export function buildSectionF(
  fewShotResult: FewShotResult,
  storyType: StoryType,
  ageRange: AgeRange,
): string {
  const storyTypeDisplay = STORY_TYPE_LABELS[storyType];
  const ageRangeDisplay = AGE_RANGE_LABELS[ageRange];

  if (fewShotResult.examples.length === 0) {
    return `No approved examples yet. Standards:

Each blueprint point must be specific enough to visualize
Emotional truth must convey felt experience, not clinical summary
At least one structural surprise
Coping tool must have a clear, concrete moment`;
  }

  const crossBucketNote =
    fewShotResult.crossBucket
      ? `NOTE: No approved examples exist yet for the ${ageRangeDisplay}
age range. The examples below are from the
${AGE_RANGE_LABELS[fewShotResult.sourceAgeRange]} range. Adapt
complexity, vocabulary, and pacing for ${ageRangeDisplay}.

`
      : '';

  const exampleBlocks = fewShotResult.examples
    .map(
      (example, i) =>
        `EXAMPLE ${i + 1}: ${JSON.stringify(example.content, null, 2)}`,
    )
    .join('\n\n');

  const parts = [
    `${crossBucketNote}Here are ${fewShotResult.examples.length} approved blueprints for ${storyTypeDisplay} stories
in the ${ageRangeDisplay} range. Study quality, specificity, and
pacing (expressed through point density).
Do not imitate their content — match their standard.`,
    exampleBlocks,
  ];

  return parts.join('\n\n');
}
