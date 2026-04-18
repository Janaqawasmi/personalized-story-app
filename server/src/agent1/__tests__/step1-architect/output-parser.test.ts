import { parseStep1Response } from '@/agent1/step1-architect/output-parser';
import type { LLMCallRecord } from '@/agent1/types';

function makeCallRecord(attempt: 1 | 2 = 1): LLMCallRecord {
  return {
    step: 'step1_architect',
    model: 'claude-sonnet-4-6',
    inputTokens: 100,
    outputTokens: 200,
    latencyMs: 1234,
    attempt,
    promptHash: 'a'.repeat(64),
  };
}

const PROMPT_HASH = 'b'.repeat(64);

// ─── Fixture 1 — clean complete response ──────────────────────────────
const FIXTURE_1 = `EMOTIONAL TRUTH
This is a child who freezes when the lights go out. Their body
goes rigid, breath held, eyes scanning the dark for shapes. The
fear isn't of monsters — it's of being alone with the bigness of
night. By the end, this child needs to feel that darkness holds
nothing that daylight doesn't.

NARRATIVE BLUEPRINT
1. A small rabbit named Pip who sleeps with one ear pressed to
the wall, listening for his mother's footsteps
2. The burrow at dusk — warm amber light fading to blue-gray,
the sounds of the forest growing louder
3. Mother says goodnight and the darkness arrives all at once.
Pip's ears flatten against his head
4. A branch scrapes the ceiling. Pip's whole body locks — legs
stiff, whiskers trembling, the thump in his chest so loud he
thinks the dark can hear it
5. Pip remembers the counting game — he counts the sounds he
knows: drip, cricket, wind. The unknown sounds shrink between
the familiar ones
6. Dawn finds Pip curled in his usual spot, one ear still
pressed to the wall — but this time he fell asleep before
the footsteps came

COPING TOOL PLACEMENT NOTE
The coping tool [Counting] appears at blueprint point 5: Pip
counts the familiar sounds, turning the unknown darkness into a
landscape of recognizable pieces.

APPROACH INSTRUCTION
The story uses graduated exposure through a single night cycle.
Pip faces the dark in stages — first with mother's voice still
echoing, then in full silence, then with the startling branch
sound. Each stage is harder but survivable.`;

// ─── Fixture 2 — with inferred intention ──────────────────────────────
const FIXTURE_2 =
  FIXTURE_1 +
  `

INFERRED INTENTION FLAG
The brief's intention was generic. A more specific version:
they should feel that the dark is just the same room with the
lights off because every sound they heard in the dark was a sound
they already knew from daytime.`;

// ─── Fixture 3 — with compression metadata ────────────────────────────
const FIXTURE_3 =
  FIXTURE_1 +
  `

COMPRESSION METADATA
Fully included: trigger moment, somatic mirroring (freezing), coping tool (counting), resolution (partial)
Compressed: supporting approach (normalization → tonal quality, single scene rather than separate thread)
Omitted: creative vision as distinct set piece (reduced to atmospheric detail in point 2), character notes details`;

// ─── Fixture 4 — missing emotional truth header ───────────────────────
const FIXTURE_4 = `NARRATIVE BLUEPRINT
1. Protagonist introduction
2. World at dusk
3. The trigger moment
4. The body locks up
5. The coping tool arrives
6. Dawn and the final image

APPROACH INSTRUCTION
Plain approach description.`;

// ─── Fixture 5 — only 4 blueprint points ──────────────────────────────
const FIXTURE_5 = `EMOTIONAL TRUTH
This child's world narrows when the fear hits. By the end, this
child needs to feel that the narrowing is temporary.

NARRATIVE BLUEPRINT
1. First point about the protagonist.
2. Second point about the world.
3. Third point about the opening.
4. Fourth point about the peak.

COPING TOOL PLACEMENT NOTE
Placement text.

APPROACH INSTRUCTION
Approach text.`;

// ─── Fixture 6 — extra whitespace and inconsistent numbering ──────────
const FIXTURE_6 = `   1.   EMOTIONAL TRUTH   
   This child freezes.   By the end, this child needs to feel held.

   2.  NARRATIVE BLUEPRINT   
    1.   First   point with extra    spacing
    2.  Second point
    3.  Third
    4.  Fourth
    5.  Fifth
    6.  Sixth

## COPING TOOL PLACEMENT NOTE
   The tool appears at point 3.

**APPROACH INSTRUCTION**
   Plain approach description.`;

// ─── Tests ────────────────────────────────────────────────────────────
describe('parseStep1Response — fixture 1 (clean complete response)', () => {
  const record = makeCallRecord();
  const result = parseStep1Response(FIXTURE_1, record, PROMPT_HASH);

  it('test 1: parse succeeds and returns Step1Output with all 4 required fields populated', () => {
    expect(result.emotionalTruth.length).toBeGreaterThan(0);
    expect(result.blueprint.length).toBe(6);
    expect(result.copingToolPlacement.length).toBeGreaterThan(0);
    expect(result.approachInstruction.length).toBeGreaterThan(0);
  });

  it('test 2: emotionalTruth contains "By the end, this child needs to feel"', () => {
    expect(result.emotionalTruth).toMatch(
      /By the end, this child needs to feel/i,
    );
  });

  it('test 3: blueprint has exactly 6 entries with correct indices 1-6', () => {
    expect(result.blueprint).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(result.blueprint[i]!.index).toBe(i + 1);
    }
  });

  it('test 4: blueprint[3].text (point 4, the emotional peak) is non-empty', () => {
    expect(result.blueprint[3]!.text.length).toBeGreaterThan(0);
    expect(result.blueprint[3]!.text).toMatch(/branch scrapes|body locks/i);
  });

  it('test 5: copingToolPlacement is non-empty', () => {
    expect(result.copingToolPlacement.length).toBeGreaterThan(0);
    expect(result.copingToolPlacement).toMatch(/Counting/);
  });

  it('test 6: approachInstruction is non-empty', () => {
    expect(result.approachInstruction.length).toBeGreaterThan(0);
    expect(result.approachInstruction).toMatch(/graduated exposure/i);
  });

  it('test 7: inferredIntention is undefined when not present', () => {
    expect(result.inferredIntention).toBeUndefined();
  });

  it('test 8: compressionMetadata is undefined when not present', () => {
    expect(result.compressionMetadata).toBeUndefined();
  });

  it('test 9: rawResponse equals the full fixture text', () => {
    expect(result.rawResponse).toBe(FIXTURE_1);
  });

  it('test 10: promptHash equals the passed hash', () => {
    expect(result.promptHash).toBe(PROMPT_HASH);
    expect(result.llmCallRecord).toBe(record);
  });
});

describe('parseStep1Response — fixture 2 (inferred intention present)', () => {
  it('test 11: inferredIntention is defined with non-empty feel and because', () => {
    const result = parseStep1Response(FIXTURE_2, makeCallRecord(), PROMPT_HASH);
    expect(result.inferredIntention).toBeDefined();
    expect(result.inferredIntention!.feel.length).toBeGreaterThan(0);
    expect(result.inferredIntention!.because.length).toBeGreaterThan(0);
    expect(result.inferredIntention!.reason.length).toBeGreaterThan(0);
  });
});

describe('parseStep1Response — fixture 3 (compression metadata present)', () => {
  const result = parseStep1Response(FIXTURE_3, makeCallRecord(), PROMPT_HASH);

  it('test 12: compressionMetadata is defined', () => {
    expect(result.compressionMetadata).toBeDefined();
  });

  it('test 13: compressionMetadata.fullyIncluded is a non-empty array', () => {
    expect(Array.isArray(result.compressionMetadata!.fullyIncluded)).toBe(true);
    expect(result.compressionMetadata!.fullyIncluded.length).toBeGreaterThan(0);
  });
});

describe('parseStep1Response — fixture 4 (missing emotional truth header)', () => {
  it('test 14: parser throws a plain Error with descriptive message', () => {
    expect(() =>
      parseStep1Response(FIXTURE_4, makeCallRecord(), PROMPT_HASH),
    ).toThrow(Error);
    expect(() =>
      parseStep1Response(FIXTURE_4, makeCallRecord(), PROMPT_HASH),
    ).toThrow(/EMOTIONAL TRUTH/i);
  });
});

describe('parseStep1Response — fixture 5 (fewer than 6 blueprint points)', () => {
  it('test 15: parser does not throw; blueprint has 6 entries with last 2 empty; warning logged', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = parseStep1Response(
        FIXTURE_5,
        makeCallRecord(),
        PROMPT_HASH,
      );
      expect(result.blueprint).toHaveLength(6);
      expect(result.blueprint[0]!.text.length).toBeGreaterThan(0);
      expect(result.blueprint[3]!.text.length).toBeGreaterThan(0);
      expect(result.blueprint[4]!.text).toBe('');
      expect(result.blueprint[5]!.text).toBe('');
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('parseStep1Response — fixture 6 (extra whitespace and decorators)', () => {
  it('test 16: parse succeeds with all required fields populated', () => {
    const result = parseStep1Response(FIXTURE_6, makeCallRecord(), PROMPT_HASH);
    expect(result.emotionalTruth.length).toBeGreaterThan(0);
    expect(result.emotionalTruth).toMatch(/by the end, this child needs to feel/i);
    expect(result.blueprint).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(result.blueprint[i]!.text.length).toBeGreaterThan(0);
    }
    expect(result.copingToolPlacement.length).toBeGreaterThan(0);
    expect(result.approachInstruction.length).toBeGreaterThan(0);
  });
});
