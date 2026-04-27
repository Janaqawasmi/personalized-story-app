import type { StoryBrief } from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildStep2SectionJ(brief: StoryBrief): string {
  const personalizationNote = conditionalBlock(
    brief.storyWorld.personalization === true,
    'Use [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders in every page text.',
  );

  // Page rules are injected verbatim into the prompt. Keep them tight — every
  // token here is paid on every generation.
  const pageRules = [
    'Each page is ONE visual moment: one scene, one emotional beat, one location at one instant.',
    'A reader should be able to illustrate each page as a single image.',
    'Pages must flow continuously — page N leads naturally into page N+1.',
    'Page count must fall within the Target page count range stated in Section E.',
    'Each page must contain at least one complete sentence.',
    'Do NOT add headers, labels, or chapter titles inside page text.',
  ].join('\n');

  const schemaExample = `Output ONLY valid JSON. No explanation, no markdown fences, no text outside the JSON.

Schema:
{
  "title": "string — a title a child would be drawn to. Not clinical, not cute.",
  "pages": [
    { "pageNumber": 1, "text": "string — full prose text for this page" },
    { "pageNumber": 2, "text": "string — full prose text for this page" }
  ]
}`;

  return [
    'OUTPUT FORMAT',
    schemaExample,
    'PAGE RULES',
    pageRules,
    personalizationNote,
  ]
    .filter((block) => block.length > 0)
    .join('\n\n');
}
