import { parseStep2Response } from '@/agent1/step2-author/output-parser';
import type { LLMCallRecord } from '@/agent1/types';

// ─── Shared test fixtures ─────────────────────────────────────────────────────

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

/**
 * Build a story string containing exactly `n` space-separated words.
 * Each word is "word" so the split is unambiguous.
 */
function makeStory(n: number): string {
  return Array(n).fill('word').join(' ');
}

// A short but realistic story body (~50 words) used in most fixtures
const SHORT_STORY_BODY =
  'Pip was a small rabbit who slept with one ear pressed to the wall. ' +
  'Every night, when the amber light faded to blue-gray, he would listen ' +
  'for his mother\'s footsteps padding down the hall. The sounds were always ' +
  'the same: first the creak of the third step, then the soft hush of her ' +
  'slippers, then silence.';

// ─── Fixture 1 — clean response with TITLE / STORY markers ───────────────────

const FIXTURE_1 = `1. TITLE
The Night Sounds Game
2. STORY
${SHORT_STORY_BODY}`;

// ─── Fixture 2 — TITLE: inline format ────────────────────────────────────────

const FIXTURE_2 = `TITLE: The Counting Rabbit
${SHORT_STORY_BODY}`;

// ─── Fixture 3 — no markers at all ───────────────────────────────────────────

const FIXTURE_3 = `The Night Sounds Game
${SHORT_STORY_BODY}`;

// ─── Fixture 4 — title with surrounding quotes ───────────────────────────────

const FIXTURE_4 = `1. TITLE
"The Night Sounds Game"
2. STORY
${SHORT_STORY_BODY}`;

// ─── Fixture 5 — very long story (over drift for 3-5 short) ──────────────────
// 3-5 short: totalWords [150, 250], upperBound = 250 * 1.3 = 325
// Use 1500 words → well over 325

const FIXTURE_5 = `1. TITLE
A Very Long Story
2. STORY
${makeStory(1500)}`;

// ─── Shared parser call helper ────────────────────────────────────────────────

function parse(
  fixture: string,
  { ageRange = '5-7' as const, storyLength = 'standard' as const } = {},
) {
  return parseStep2Response(
    fixture,
    ageRange,
    storyLength,
    makeLLMCallRecord(),
    'b'.repeat(64),
  );
}

// ─── Tests: Fixture 1 ─────────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 1: clean TITLE / STORY markers', () => {
  it('test 1: title equals "The Night Sounds Game"', () => {
    const result = parse(FIXTURE_1);
    expect(result.title).toBe('The Night Sounds Game');
  });

  it('test 2: story starts with "Pip was a small rabbit"', () => {
    const result = parse(FIXTURE_1);
    expect(result.story).toMatch(/^Pip was a small rabbit/);
  });

  it('test 3: wordCount is a positive integer', () => {
    const result = parse(FIXTURE_1);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(Number.isInteger(result.wordCount)).toBe(true);
  });

  it('test 4: 5-7 standard (500-800 words), short story → wordCountDrift "under"', () => {
    // SHORT_STORY_BODY is ~50 words; lowerBound = 500 * 0.7 = 350
    const result = parse(FIXTURE_1, { ageRange: '5-7', storyLength: 'standard' });
    expect(result.wordCountDrift).toBe('under');
  });

  it('test 5: 3-5 short (150-250 words), 200-word story → wordCountDrift "within_range"', () => {
    // 200 words: lowerBound = 150 * 0.7 = 105, upperBound = 250 * 1.3 = 325
    const story200 = makeStory(200);
    const fixture = `1. TITLE\nA Title\n2. STORY\n${story200}`;
    const result = parseStep2Response(
      fixture,
      '3-5',
      'short',
      makeLLMCallRecord(),
      'c'.repeat(64),
    );
    expect(result.wordCountDrift).toBe('within_range');
  });
});

// ─── Tests: Fixture 2 ─────────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 2: TITLE: inline format', () => {
  it('test 6: title extracted correctly as "The Counting Rabbit"', () => {
    const result = parse(FIXTURE_2);
    expect(result.title).toBe('The Counting Rabbit');
  });
});

// ─── Tests: Fixture 3 ─────────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 3: no markers at all', () => {
  it('test 7: first line becomes the title, rest is the story', () => {
    const result = parse(FIXTURE_3);
    expect(result.title).toBe('The Night Sounds Game');
    expect(result.story).toMatch(/^Pip was a small rabbit/);
  });
});

// ─── Tests: Fixture 4 ─────────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 4: title with surrounding quotes', () => {
  it('test 8: quotes stripped from title', () => {
    const result = parse(FIXTURE_4);
    expect(result.title).toBe('The Night Sounds Game');
    expect(result.title).not.toMatch(/^"/);
  });
});

// ─── Tests: Fixture 5 ─────────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 5: very long story (over drift)', () => {
  it('test 9: 1500-word story vs 3-5 short (upperBound 325) → wordCountDrift "over"', () => {
    const result = parseStep2Response(
      FIXTURE_5,
      '3-5',
      'short',
      makeLLMCallRecord(),
      'd'.repeat(64),
    );
    expect(result.wordCountDrift).toBe('over');
  });
});

// ─── Tests: Boundary tests ────────────────────────────────────────────────────

describe('parseStep2Response — Fixture 6: exact boundary tests (3-5 short: min=150, max=250)', () => {
  // lowerBound = 150 * 0.7 = 105
  // upperBound = 250 * 1.3 = 325

  function parseWithWordCount(n: number) {
    const fixture = `1. TITLE\nA Title\n2. STORY\n${makeStory(n)}`;
    return parseStep2Response(
      fixture,
      '3-5',
      'short',
      makeLLMCallRecord(),
      'e'.repeat(64),
    );
  }

  it('test 10: word count exactly at minWords * 0.7 (105) → "within_range"', () => {
    const result = parseWithWordCount(105);
    expect(result.wordCount).toBe(105);
    expect(result.wordCountDrift).toBe('within_range');
  });

  it('test 11: word count exactly at maxWords * 1.3 (325) → "within_range"', () => {
    const result = parseWithWordCount(325);
    expect(result.wordCount).toBe(325);
    expect(result.wordCountDrift).toBe('within_range');
  });

  it('test 12: word count one below minWords * 0.7 (104) → "under"', () => {
    const result = parseWithWordCount(104);
    expect(result.wordCount).toBe(104);
    expect(result.wordCountDrift).toBe('under');
  });

  it('test 13: word count one above maxWords * 1.3 (326) → "over"', () => {
    const result = parseWithWordCount(326);
    expect(result.wordCount).toBe(326);
    expect(result.wordCountDrift).toBe('over');
  });
});
