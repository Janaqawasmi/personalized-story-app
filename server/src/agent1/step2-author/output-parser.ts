import type { Step2Output, LLMCallRecord } from '@/agent1/types';
import { STRUCTURAL_PARAMS, type AgeRange, type StoryLength } from '@/models/storyBrief.model';

export function parseStep2Response(
  rawResponse: string,
  ageRange: AgeRange,
  storyLength: StoryLength,
  llmCallRecord: LLMCallRecord,
  promptHash: string,
): Step2Output {
  // ─── Step 1: Extract title ───────────────────────────────────────────────

  let title = '';
  let titleLineIndex = -1;
  const lines = rawResponse.split('\n');

  // Priority 1: line starting with "1. TITLE" or "TITLE:" (case-insensitive).
  // Allow the marker at end-of-line (e.g. bare "1. TITLE" with title on next line).
  const titleMarkerRe = /^(?:1\.\s*)?TITLE(?:[:\s]|$)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (titleMarkerRe.test(line)) {
      // Check for inline title: "TITLE: Some Title" or "1. TITLE: Some Title"
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const inline = line.slice(colonIdx + 1).trim();
        if (inline.length > 0) {
          title = inline;
          titleLineIndex = i;
          break;
        }
      }
      // Title is on the next non-empty line
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]!.trim();
        if (next.length > 0) {
          // Make sure it's not the STORY marker
          if (!/^(?:2\.\s*)?STORY(?:[:\s]|$)/i.test(next)) {
            title = next;
            titleLineIndex = j;
          } else {
            // No separate title line found, title stays empty — will fallback
            titleLineIndex = i;
          }
          break;
        }
      }
      if (titleLineIndex === -1) titleLineIndex = i;
      break;
    }
  }

  // Fallback: first non-empty line is the title
  if (title.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line.length > 0) {
        title = line;
        titleLineIndex = i;
        break;
      }
    }
  }

  // Remove surrounding quotes from title
  title = title.trim().replace(/^["'](.*)["']$/, '$1').trim();

  // ─── Step 2: Extract story ───────────────────────────────────────────────

  let story = '';
  const storyMarkerRe = /^(?:2\.\s*)?STORY(?:[:\s]|$)/i;

  let storyStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (storyMarkerRe.test(lines[i]!)) {
      storyStartLine = i + 1;
      break;
    }
  }

  if (storyStartLine !== -1) {
    story = lines.slice(storyStartLine).join('\n').trim();
  } else {
    // No STORY marker: everything after the title line is the story
    story = lines
      .slice(titleLineIndex + 1)
      .join('\n')
      .trim();
  }

  // ─── Step 3: Compute word count ──────────────────────────────────────────

  const wordCount = story.split(/\s+/).filter((w) => w.length > 0).length;

  // ─── Step 4: Read target word range ──────────────────────────────────────

  const params = STRUCTURAL_PARAMS[ageRange][storyLength];
  const targetWordRange: readonly [number, number] = [
    params.totalWords[0]!,
    params.totalWords[1]!,
  ];

  // ─── Step 5: Compute word count drift ────────────────────────────────────

  const [minWords, maxWords] = targetWordRange;
  const lowerBound = minWords * 0.7;
  const upperBound = maxWords * 1.3;

  let wordCountDrift: 'within_range' | 'under' | 'over';
  if (wordCount < lowerBound) {
    wordCountDrift = 'under';
  } else if (wordCount > upperBound) {
    wordCountDrift = 'over';
  } else {
    wordCountDrift = 'within_range';
  }

  // ─── Step 6: Return ──────────────────────────────────────────────────────

  return {
    title,
    story,
    wordCount,
    targetWordRange,
    wordCountDrift,
    rawResponse,
    promptHash,
    llmCallRecord,
  };
}
