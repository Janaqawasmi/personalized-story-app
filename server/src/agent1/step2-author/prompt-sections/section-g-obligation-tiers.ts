import type { CompressionMetadata } from '@/agent1/types';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

function formatSpaceConstraints(meta: CompressionMetadata): string {
  const compressedLines = meta.compressed
    .map((entry) => `${entry.obligation}: ${entry.how}`)
    .join('\n');
  const omittedLines = meta.omitted
    .map((entry) => `${entry.obligation}: ${entry.why}`)
    .join('\n');

  return [
    'SPACE CONSTRAINTS:',
    'The story architect noted the following compression decisions:',
    `Fully included: ${meta.fullyIncluded.join(', ')}`,
    'Compressed:',
    compressedLines,
    'Omitted:',
    omittedLines,
    '',
    'Honor these decisions. Do not attempt to restore omitted elements.',
    'Focus your craft on the elements that remain.',
  ].join('\n');
}

const TIER_REMINDER = `PRIORITY TIERS:
If you find the story growing beyond the target word count, follow
these priorities:
Tier 1 (non-negotiable scenes): trigger, first somatic expression,
coping tool in action, resolution
Tier 2 (must appear, can compress): primary approach arc, caregiver
role, shame rules if shame dimension is central
Tier 3 (include if space permits): supporting approach, supporting
characters, second somatic expression, one true thing, first character's functional role
Tier 4 (enrichment only): creative vision as set piece, character
notes details, second character's functional role
Never flatten a Tier 1 element for a Tier 3 element.`;

export function buildStep2SectionG(
  compressionMetadata: CompressionMetadata | undefined,
): string {
  const compressionBlock = conditionalBlock(
    compressionMetadata !== undefined,
    compressionMetadata ? formatSpaceConstraints(compressionMetadata) : '',
  );

  return [compressionBlock, TIER_REMINDER].filter(Boolean).join('\n\n');
}
