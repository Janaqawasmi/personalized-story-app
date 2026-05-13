import type { Step2Output, StoryPage, LLMCallRecord, PageCountDrift } from '@/agent1/types';
import { STRUCTURAL_PARAMS, type AgeRange, type StoryLength } from '@/models/storyBrief.model';

// ─── JSON response shape expected from the Author LLM ────────────────────────

type AuthorJsonResponse = {
  title: string;
  pages: Array<{ pageNumber: number; text: string }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function computeDrift(
  value: number,
  min: number,
  max: number,
): 'within_range' | 'under' | 'over' {
  if (value < min * 0.7) return 'under';
  if (value > max * 1.3) return 'over';
  return 'within_range';
}

// Strip optional markdown code fences the model may wrap around JSON despite
// being told not to (e.g. ```json ... ``` or ``` ... ```).
function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parseStep2Response(
  rawResponse: string,
  ageRange: AgeRange,
  storyLength: StoryLength,
  llmCallRecord: LLMCallRecord,
  promptHash: string,
): Step2Output {
  const params = STRUCTURAL_PARAMS[ageRange][storyLength];

  const targetWordRange: readonly [number, number] = [
    params.totalWords[0]!,
    params.totalWords[1]!,
  ];
  const targetPageRange: readonly [number, number] = [
    params.pages[0]!,
    params.pages[1]!,
  ];

  // ─── Parse JSON ────────────────────────────────────────────────────────────

  let parsed: AuthorJsonResponse;
  try {
    const cleaned = stripMarkdownFences(rawResponse);
    parsed = JSON.parse(cleaned) as AuthorJsonResponse;
  } catch {
    // JSON parse failed — fall back to legacy TITLE/STORY text extraction so
    // that a single bad generation doesn't hard-crash the pipeline.
    return parseLegacyTextFormat(
      rawResponse,
      targetWordRange,
      targetPageRange,
      llmCallRecord,
      promptHash,
    );
  }

  // ─── Validate structure ────────────────────────────────────────────────────

  const title = (typeof parsed.title === 'string' ? parsed.title.trim() : '').replace(
    /^["'](.*)["']$/,
    '$1',
  );

  const rawPages = Array.isArray(parsed.pages) ? parsed.pages : [];

  // ─── Build StoryPage array ─────────────────────────────────────────────────

  const pages: StoryPage[] = rawPages
    .filter((p) => typeof p.pageNumber === 'number' && typeof p.text === 'string')
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text.trim(),
      wordCount: countWords(p.text),
    }));

  // ─── Totals ────────────────────────────────────────────────────────────────

  const totalWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0);
  const story = pages.map((p) => p.text).join('\n\n');

  // ─── Drift calculations ────────────────────────────────────────────────────

  const wordCountDrift = computeDrift(totalWordCount, targetWordRange[0], targetWordRange[1]);
  const pageCountDrift: PageCountDrift = computeDrift(
    pages.length,
    targetPageRange[0],
    targetPageRange[1],
  );

  return {
    title,
    story,
    wordCount: totalWordCount,
    targetWordRange,
    wordCountDrift,
    pages,
    pageCount: pages.length,
    targetPageRange,
    pageCountDrift,
    rawResponse,
    promptHash,
    llmCallRecord,
  };
}

// ─── Legacy fallback for old TITLE/STORY text format ─────────────────────────
// Retained so that any existing story drafts or smoke tests that produce the
// old format continue to parse rather than crash. Remove once all generation
// is confirmed to produce JSON.

function parseLegacyTextFormat(
  rawResponse: string,
  targetWordRange: readonly [number, number],
  targetPageRange: readonly [number, number],
  llmCallRecord: LLMCallRecord,
  promptHash: string,
): Step2Output {
  let title = '';
  let titleLineIndex = -1;
  const lines = rawResponse.split('\n');

  const titleMarkerRe = /^(?:1\.\s*)?TITLE(?:[:\s]|$)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (titleMarkerRe.test(line)) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const inline = line.slice(colonIdx + 1).trim();
        if (inline.length > 0) {
          title = inline;
          titleLineIndex = i;
          break;
        }
      }
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]!.trim();
        if (next.length > 0) {
          if (!/^(?:2\.\s*)?STORY(?:[:\s]|$)/i.test(next)) {
            title = next;
            titleLineIndex = j;
          } else {
            titleLineIndex = i;
          }
          break;
        }
      }
      if (titleLineIndex === -1) titleLineIndex = i;
      break;
    }
  }

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

  title = title.trim().replace(/^["'](.*)["']$/, '$1').trim();

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
    story = lines.slice(titleLineIndex + 1).join('\n').trim();
  }

  const wordCount = countWords(story);
  const wordCountDrift = computeDrift(wordCount, targetWordRange[0], targetWordRange[1]);

  return {
    title,
    story,
    wordCount,
    targetWordRange,
    wordCountDrift,
    // pages not available from legacy format
    targetPageRange,
    rawResponse,
    promptHash,
    llmCallRecord,
  };
}
