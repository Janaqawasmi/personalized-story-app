import { parsePostValidationResponse } from '@/agent1/step3-post-validation/output-parser';
import type { LLMCallRecord } from '@/agent1/types';

function makeLLMCallRecord(): LLMCallRecord {
  return {
    step: 'step3_post_validation',
    model: 'claude-sonnet-4-20250514',
    inputTokens: 500,
    outputTokens: 200,
    latencyMs: 900,
    attempt: 1,
    promptHash: 'a'.repeat(64),
  };
}

const PROMPT_HASH = 'b'.repeat(64);

// ─── Fixture 1 — clean PASS ────────────────────────────────────────────────────

const FIXTURE_1 = `PASS
===== ALIGNMENT NOTE =====
The story embodies graduated exposure through a single night cycle.
The coping tool (counting) appears at the emotional peak. The arc achieves cautious hope with honest resolution.`;

// ─── Fixture 2 — one flag ───────────────────────────────────────────────────

const FIXTURE_2 = `Check 1: "there's nothing to be scared of" — directly contradicts must-never rule #2. Severity: likely violation.
===== ALIGNMENT NOTE =====
The story attempts normalization but includes a reassurance line that lectures.`;

// ─── Fixture 3 — multiple flags (checks 1 and 4) ──────────────────────────────

const FIXTURE_3 = `Check 1: "never feel afraid" — violates must-never rule #1. Severity: likely violation.
Check 4: "graphic violence" — exceeds peak intensity for this band. Severity: likely violation.
===== ALIGNMENT NOTE =====
Mixed alignment note.`;

// ─── Fixture 4 — PASS, no alignment section ──────────────────────────────────

const FIXTURE_4 = `PASS
`;

// ─── Fixture 5 — borderline severity ─────────────────────────────────────────

const FIXTURE_5 = `Check 1: "you should know better" — borderline shame handling. Severity: borderline — specialist should review.
===== ALIGNMENT NOTE =====
Note here.`;

// ─── Fixture 6 — malformed prose ───────────────────────────────────────────

const FIXTURE_6 = `The narrative proceeds without structured findings or severity labels.`;

function parse(raw: string) {
  return parsePostValidationResponse(raw, makeLLMCallRecord(), PROMPT_HASH);
}

describe('parsePostValidationResponse', () => {
  it('test 1: clean PASS → result PASS, flags empty', () => {
    const r = parse(FIXTURE_1);
    expect(r.result).toBe('PASS');
    expect(r.flags).toEqual([]);
  });

  it('test 2: alignment note contains graduated exposure', () => {
    const r = parse(FIXTURE_1);
    expect(r.alignmentNote).toContain('graduated exposure');
  });

  it('test 3: one flag → FLAGS', () => {
    const r = parse(FIXTURE_2);
    expect(r.result).toBe('FLAGS');
  });

  it('test 4: one flag → length 1', () => {
    const r = parse(FIXTURE_2);
    expect(r.flags.length).toBe(1);
  });

  it('test 5: must_never check type', () => {
    const r = parse(FIXTURE_2);
    expect(r.flags[0]!.checkType).toBe('must_never');
  });

  it('test 6: likely violation severity', () => {
    const r = parse(FIXTURE_2);
    expect(r.flags[0]!.severity).toBe('likely_violation');
  });

  it('test 7: passage contains quoted text', () => {
    const r = parse(FIXTURE_2);
    expect(r.flags[0]!.passage.toLowerCase()).toContain('nothing to be scared of');
  });

  it('test 8: two flags', () => {
    const r = parse(FIXTURE_3);
    expect(r.flags.length).toBe(2);
  });

  it('test 9: includes must_never and age_appropriateness', () => {
    const r = parse(FIXTURE_3);
    const types = r.flags.map((f) => f.checkType);
    expect(types).toContain('must_never');
    expect(types).toContain('age_appropriateness');
  });

  it('test 10: missing alignment note → default message', () => {
    const r = parse(FIXTURE_4);
    expect(r.alignmentNote).toBe('Alignment note not available.');
  });

  it('test 11: borderline severity mapping', () => {
    const r = parse(FIXTURE_5);
    expect(r.flags[0]!.severity).toBe('borderline_specialist_review');
  });

  it('test 12: malformed response does not throw; PASS and empty flags', () => {
    expect(() => parse(FIXTURE_6)).not.toThrow();
    const r = parse(FIXTURE_6);
    expect(r.result).toBe('PASS');
    expect(r.flags).toEqual([]);
  });
});
