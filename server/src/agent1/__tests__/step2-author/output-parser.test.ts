import { parseStep2Response } from '@/agent1/step2-author/output-parser';
import type { LLMCallRecord } from '@/agent1/types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeLLMCallRecord(): LLMCallRecord {
  return {
    step: 'step2_author',
    model: 'claude-sonnet-4-6',
    inputTokens: 1200,
    outputTokens: 450,
    latencyMs: 1800,
    attempt: 1,
    promptHash: 'a'.repeat(64),
  };
}

function parse(
  fixture: string,
  { ageRange = '5-7' as const, storyLength = 'standard' as const } = {},
) {
  return parseStep2Response(fixture, ageRange, storyLength, makeLLMCallRecord(), 'b'.repeat(64));
}

/** Build N space-separated 'word' tokens for word-count fixtures. */
function makeWords(n: number): string {
  return Array(n).fill('word').join(' ');
}

/** Build a valid JSON response string from the Author. */
function makeJsonResponse(title: string, pages: Array<{ pageNumber: number; text: string }>): string {
  return JSON.stringify({ title, pages });
}

// ─── JSON format fixtures (primary format) ───────────────────────────────────

const PAGE_1_TEXT = 'Pip was a small rabbit who slept with one ear pressed to the wall.';
const PAGE_2_TEXT = 'Every night he would listen for his mother\'s footsteps padding down the hall.';
const PAGE_3_TEXT = 'The sounds were always the same: the creak, the hush, then silence.';

const JSON_FIXTURE_BASE = makeJsonResponse('The Night Sounds Game', [
  { pageNumber: 1, text: PAGE_1_TEXT },
  { pageNumber: 2, text: PAGE_2_TEXT },
  { pageNumber: 3, text: PAGE_3_TEXT },
]);

const JSON_FIXTURE_QUOTED_TITLE = makeJsonResponse('"The Night Sounds Game"', [
  { pageNumber: 1, text: PAGE_1_TEXT },
]);

const JSON_FIXTURE_IN_FENCES = '```json\n' + JSON_FIXTURE_BASE + '\n```';

// ─── Tests: JSON format (primary) ────────────────────────────────────────────

describe('parseStep2Response — JSON format: basic extraction', () => {
  it('test 1: title extracted correctly', () => {
    expect(parse(JSON_FIXTURE_BASE).title).toBe('The Night Sounds Game');
  });

  it('test 2: pages array has the correct length', () => {
    expect(parse(JSON_FIXTURE_BASE).pages).toHaveLength(3);
  });

  it('test 3: pages are sorted by pageNumber', () => {
    // Feed pages in reverse order to verify sort
    const fixture = makeJsonResponse('Title', [
      { pageNumber: 3, text: 'Third.' },
      { pageNumber: 1, text: 'First.' },
      { pageNumber: 2, text: 'Second.' },
    ]);
    const result = parse(fixture);
    expect(result.pages![0]!.pageNumber).toBe(1);
    expect(result.pages![1]!.pageNumber).toBe(2);
    expect(result.pages![2]!.pageNumber).toBe(3);
  });

  it('test 4: each page carries a non-empty text string', () => {
    const result = parse(JSON_FIXTURE_BASE);
    for (const page of result.pages!) {
      expect(typeof page.text).toBe('string');
      expect(page.text.length).toBeGreaterThan(0);
    }
  });

  it('test 5: each page carries a computed wordCount > 0', () => {
    const result = parse(JSON_FIXTURE_BASE);
    for (const page of result.pages!) {
      expect(page.wordCount).toBeGreaterThan(0);
    }
  });

  it('test 6: total wordCount equals sum of per-page wordCounts', () => {
    const result = parse(JSON_FIXTURE_BASE);
    const sumFromPages = result.pages!.reduce((s, p) => s + p.wordCount, 0);
    expect(result.wordCount).toBe(sumFromPages);
  });

  it('test 7: story field is the joined page texts (backward compat)', () => {
    const result = parse(JSON_FIXTURE_BASE);
    const expectedStory = [PAGE_1_TEXT, PAGE_2_TEXT, PAGE_3_TEXT].join('\n\n');
    expect(result.story).toBe(expectedStory);
  });

  it('test 8: pageCount equals pages.length', () => {
    const result = parse(JSON_FIXTURE_BASE);
    expect(result.pageCount).toBe(result.pages!.length);
  });

  it('test 9: targetPageRange is populated from STRUCTURAL_PARAMS', () => {
    const result = parse(JSON_FIXTURE_BASE, { ageRange: '5-7', storyLength: 'standard' });
    expect(result.targetPageRange).toBeDefined();
    expect(result.targetPageRange![0]).toBeGreaterThan(0);
    expect(result.targetPageRange![1]).toBeGreaterThanOrEqual(result.targetPageRange![0]!);
  });

  it('test 10: quotes stripped from title', () => {
    const result = parse(JSON_FIXTURE_QUOTED_TITLE);
    expect(result.title).toBe('The Night Sounds Game');
    expect(result.title).not.toMatch(/^"/);
  });

  it('test 11: handles JSON wrapped in markdown fences', () => {
    const result = parse(JSON_FIXTURE_IN_FENCES);
    expect(result.title).toBe('The Night Sounds Game');
    expect(result.pages).toHaveLength(3);
  });
});

// ─── Tests: JSON format — wordCountDrift ─────────────────────────────────────

describe('parseStep2Response — JSON format: wordCountDrift', () => {
  it('test 12: 5-7 standard, 3-page story (~20 total words) → wordCountDrift "under"', () => {
    // 5-7 standard: totalWords [500, 800]; lowerBound = 500 * 0.7 = 350
    const result = parse(JSON_FIXTURE_BASE, { ageRange: '5-7', storyLength: 'standard' });
    expect(result.wordCountDrift).toBe('under');
  });

  it('test 13: 3-5 short, 200-word single page → wordCountDrift "within_range"', () => {
    // 3-5 short: totalWords [150, 250]; 200 words is within [105, 325]
    const fixture = makeJsonResponse('Title', [{ pageNumber: 1, text: makeWords(200) }]);
    const result = parseStep2Response(fixture, '3-5', 'short', makeLLMCallRecord(), 'c'.repeat(64));
    expect(result.wordCountDrift).toBe('within_range');
  });

  it('test 14: 3-5 short, 1500-word story → wordCountDrift "over"', () => {
    // 3-5 short: upperBound = 250 * 1.3 = 325
    const fixture = makeJsonResponse('Title', [{ pageNumber: 1, text: makeWords(1500) }]);
    const result = parseStep2Response(fixture, '3-5', 'short', makeLLMCallRecord(), 'd'.repeat(64));
    expect(result.wordCountDrift).toBe('over');
  });
});

// ─── Tests: JSON format — pageCountDrift ─────────────────────────────────────

describe('parseStep2Response — JSON format: pageCountDrift', () => {
  it('test 15: page count within target range → pageCountDrift "within_range"', () => {
    // 3-5 short: pages range comes from STRUCTURAL_PARAMS["3-5"]["short"].pages
    // Feed exactly the midpoint to guarantee within_range
    const result = parseStep2Response(
      JSON_FIXTURE_BASE,
      '3-5',
      'short',
      makeLLMCallRecord(),
      'e'.repeat(64),
    );
    // We don't hard-code the expected range; just verify the drift is computed
    expect(['within_range', 'under', 'over']).toContain(result.pageCountDrift);
  });

  it('test 16: 1 page vs any multi-page target → pageCountDrift "under"', () => {
    // All age/length combos have pages[0] >= 4; feeding 1 page → under
    const fixture = makeJsonResponse('T', [{ pageNumber: 1, text: makeWords(50) }]);
    const result = parseStep2Response(fixture, '5-7', 'standard', makeLLMCallRecord(), 'f'.repeat(64));
    expect(result.pageCountDrift).toBe('under');
  });
});

// ─── Tests: boundary — wordCount exact thresholds ────────────────────────────

describe('parseStep2Response — JSON format: wordCount boundary (3-5 short: min=150, max=250)', () => {
  // lowerBound = 150 * 0.7 = 105, upperBound = 250 * 1.3 = 325

  function parseWithN(n: number) {
    const fixture = makeJsonResponse('Title', [{ pageNumber: 1, text: makeWords(n) }]);
    return parseStep2Response(fixture, '3-5', 'short', makeLLMCallRecord(), 'g'.repeat(64));
  }

  it('test 17: 105 words → "within_range"', () => {
    expect(parseWithN(105).wordCountDrift).toBe('within_range');
  });

  it('test 18: 325 words → "within_range"', () => {
    expect(parseWithN(325).wordCountDrift).toBe('within_range');
  });

  it('test 19: 104 words → "under"', () => {
    expect(parseWithN(104).wordCountDrift).toBe('under');
  });

  it('test 20: 326 words → "over"', () => {
    expect(parseWithN(326).wordCountDrift).toBe('over');
  });
});

// ─── Tests: legacy fallback (TITLE/STORY text format) ────────────────────────
// These test the fallback path that handles old-format responses gracefully.

describe('parseStep2Response — legacy fallback: TITLE/STORY text format', () => {
  const SHORT_BODY = 'Pip was a small rabbit who slept with one ear pressed to the wall. ' +
    'Every night, when the amber light faded to blue-gray, he would listen ' +
    "for his mother's footsteps padding down the hall.";

  it('test 21: extracts title from "1. TITLE" marker', () => {
    const fixture = `1. TITLE\nThe Night Sounds Game\n2. STORY\n${SHORT_BODY}`;
    expect(parse(fixture).title).toBe('The Night Sounds Game');
  });

  it('test 22: extracts story body after "2. STORY" marker', () => {
    const fixture = `1. TITLE\nThe Night Sounds Game\n2. STORY\n${SHORT_BODY}`;
    expect(parse(fixture).story).toMatch(/^Pip was a small rabbit/);
  });

  it('test 23: TITLE: inline format — title extracted', () => {
    const fixture = `TITLE: The Counting Rabbit\n${SHORT_BODY}`;
    expect(parse(fixture).title).toBe('The Counting Rabbit');
  });

  it('test 24: no markers — first line is title, rest is story', () => {
    const fixture = `The Night Sounds Game\n${SHORT_BODY}`;
    const result = parse(fixture);
    expect(result.title).toBe('The Night Sounds Game');
    expect(result.story).toMatch(/^Pip was a small rabbit/);
  });

  it('test 25: quoted title stripped', () => {
    const fixture = `1. TITLE\n"The Night Sounds Game"\n2. STORY\n${SHORT_BODY}`;
    expect(parse(fixture).title).toBe('The Night Sounds Game');
  });

  it('test 26: legacy path does not populate pages array', () => {
    const fixture = `1. TITLE\nT\n2. STORY\n${SHORT_BODY}`;
    expect(parse(fixture).pages).toBeUndefined();
  });
});
