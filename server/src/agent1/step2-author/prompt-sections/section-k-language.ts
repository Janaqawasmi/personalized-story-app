import type { StoryBrief } from '@/models/storyBrief.model';

// Output-language directive for the Author. Empty for English so the English
// prompt is byte-for-byte unchanged. For Arabic and Hebrew it instructs the
// model to compose original prose (not translate) and to keep placeholders and
// JSON keys in Latin/English script.
export function buildStep2SectionK(brief: StoryBrief): string {
  if (brief.outputLanguage === 'ar') {
    return [
      'OUTPUT LANGUAGE',
      'Write the entire story — the title and every page — in natural, child-friendly Modern Standard Arabic (فصحى مبسطة).',
      'This is NOT a translation task. Compose original Arabic prose with the rhythm, warmth, and simplicity a child would hear read aloud. Use the English material above only as meaning to express, then write freshly in Arabic — never translate word-by-word.',
      'Use vocabulary and sentence length appropriate to the target age range. Keep cultural references neutral and appropriate for an Arabic-speaking child audience.',
      'Keep all placeholder tokens exactly as written and in Latin script: [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR]. Do not translate or transliterate them.',
      'The JSON keys ("title", "pages", "pageNumber", "text") MUST stay in English exactly as specified in the OUTPUT FORMAT section. Only the VALUES of "title" and "text" are written in Arabic.',
    ].join('\n');
  }

  if (brief.outputLanguage === 'he') {
    return [
      'OUTPUT LANGUAGE',
      'Write the entire story — the title and every page — in natural, child-friendly Modern Hebrew (עברית יומיומית פשוטה).',
      'This is NOT a translation task. Compose original Hebrew prose with the rhythm, warmth, and simplicity a child would hear read aloud. Use the English material above only as meaning to express, then write freshly in Hebrew — never translate word-by-word.',
      'Use vocabulary and sentence length appropriate to the target age range. Keep cultural references neutral and appropriate for a Hebrew-speaking child audience.',
      'Keep all placeholder tokens exactly as written and in Latin script: [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR]. Do not translate or transliterate them.',
      'The JSON keys ("title", "pages", "pageNumber", "text") MUST stay in English exactly as specified in the OUTPUT FORMAT section. Only the VALUES of "title" and "text" are written in Hebrew.',
    ].join('\n');
  }

  return '';
}
