import { Timestamp } from 'firebase-admin/firestore';

jest.mock('@/agent1/shared/llm-client', () => ({
  callLLM: jest.fn(),
}));

jest.mock('@/agent1/step1-architect/few-shot-retriever', () => ({
  getBlueprintExamples: jest.fn(),
}));

import { runStoryArchitect } from '@/agent1/step1-architect';
import { callLLM } from '@/agent1/shared/llm-client';
import type { LLMCallInput, LLMCallOutput } from '@/agent1/shared/llm-client';
import { getBlueprintExamples } from '@/agent1/step1-architect/few-shot-retriever';
import type { FewShotResult } from '@/agent1/step1-architect/few-shot-retriever';
import { Step1IncoherentError, type PreCheckResult } from '@/agent1/types';
import type { StoryBrief } from '@/models/storyBrief.model';

const mockCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;
const mockGetBlueprintExamples =
  getBlueprintExamples as jest.MockedFunction<typeof getBlueprintExamples>;

function makeMinimalBrief(): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user-id',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ageAndScope: {
      ageRange: '5-7',
      peakIntensity: 'moderate',
      storyLength: 'standard',
    },
    clinicalFoundation: {
      population: 'p'.repeat(100),
      trigger: 't'.repeat(100),
      therapeuticIntention: {
        feel: 'That they can face new situations',
        because:
          'even when their body tells them to run, they have tools to stay',
      },
      creativeVision: 'c'.repeat(100),
    },
    therapeuticArchitecture: {
      primaryApproach: 'graduated_exposure',
      shameDimension: 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['stomach_ache_feeling_sick'],
      },
      copingTool: 'deep_breathing',
      resolutionCompleteness: 'full',
      mustNeverList: [],
    },
    storyWorld: {
      personalization: false,
      protagonistGender: 'girl',
      protagonistType: 'child',
      protagonistAge: 'same_age',
      caregiverPresence: 'present_and_comforting',
      narrativeDistance: 'direct',
    },
    personalizationConfig: {},
  };
}

function makeCleanPreCheckResult(): PreCheckResult {
  return {
    qualityGate: { triggerThin: false, intentionThin: false },
    vagueIntention: { isVague: false },
    complexityBudget: {
      totalPageCost: 5,
      availablePageRange: [8, 12] as const,
      state: 'green',
      contributions: [],
    },
    warnings: [],
  };
}

function makeColdStartFewShot(): FewShotResult {
  return { examples: [], sourceAgeRange: '5-7', crossBucket: false };
}

// A well-formed LLM response text containing all 4 required sections.
const GOOD_RESPONSE = `EMOTIONAL TRUTH
This is a child who freezes when the lights go out. Their body
goes rigid. By the end, this child needs to feel that darkness
holds nothing that daylight doesn't.

NARRATIVE BLUEPRINT
1. A small rabbit named Pip.
2. The burrow at dusk.
3. Mother says goodnight.
4. A branch scrapes the ceiling. Pip's whole body locks.
5. Pip counts the familiar sounds.
6. Dawn finds Pip asleep.

COPING TOOL PLACEMENT NOTE
The coping tool appears at blueprint point 5.

APPROACH INSTRUCTION
The story uses graduated exposure through a single night cycle.`;

const GARBAGE_RESPONSE = 'This response is completely malformed and has no required sections.';

function makeLLMOutput(text: string): LLMCallOutput {
  return {
    text,
    inputTokens: 1200,
    outputTokens: 450,
    latencyMs: 1800,
  };
}

describe('runStoryArchitect', () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
    mockGetBlueprintExamples.mockReset();
    mockGetBlueprintExamples.mockReturnValue(makeColdStartFewShot());
  });

  describe('happy path — first-attempt parse succeeds', () => {
    beforeEach(() => {
      mockCallLLM.mockResolvedValueOnce(makeLLMOutput(GOOD_RESPONSE));
    });

    it('test 1: resolves with step1Output containing all 4 required fields', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.emotionalTruth.length).toBeGreaterThan(0);
      expect(step1Output.blueprint).toHaveLength(6);
      expect(step1Output.copingToolPlacement.length).toBeGreaterThan(0);
      expect(step1Output.approachInstruction.length).toBeGreaterThan(0);
    });

    it('test 2: step1Output.llmCallRecord.step is "step1_architect"', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.llmCallRecord.step).toBe('step1_architect');
    });

    it('test 3: step1Output.llmCallRecord.attempt is 1', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.llmCallRecord.attempt).toBe(1);
    });

    it('test 4: promptHash is a 64-character hex string (sha256)', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.promptHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('test 5: exampleBankStatus is one of the three legal values', async () => {
      const { exampleBankStatus } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect([
        'examples_used',
        'cross_bucket_retrieval',
        'cold_start_no_examples',
      ]).toContain(exampleBankStatus);
    });

    it('passes the correct shape to callLLM', async () => {
      await runStoryArchitect(makeMinimalBrief(), makeCleanPreCheckResult());
      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      const callArg = mockCallLLM.mock.calls[0]![0] as LLMCallInput;
      expect(callArg.model).toBe('claude-sonnet-4-6');
      expect(callArg.maxTokens).toBe(4096);
      expect(callArg.step).toBe('step1_architect');
      expect(callArg.attempt).toBe(1);
      expect(typeof callArg.prompt).toBe('string');
      expect(callArg.prompt.length).toBeGreaterThan(0);
    });
  });

  describe('retry path — first parse fails, second succeeds', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockCallLLM
        .mockResolvedValueOnce(makeLLMOutput(GARBAGE_RESPONSE))
        .mockResolvedValueOnce(makeLLMOutput(GOOD_RESPONSE));
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('test 6: resolves (retry succeeded) and callLLM was called twice', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.emotionalTruth.length).toBeGreaterThan(0);
      expect(mockCallLLM).toHaveBeenCalledTimes(2);
    });

    it('test 7: step1Output.llmCallRecord.attempt is 2 (from the retry)', async () => {
      const { step1Output } = await runStoryArchitect(
        makeMinimalBrief(),
        makeCleanPreCheckResult(),
      );
      expect(step1Output.llmCallRecord.attempt).toBe(2);
      expect(mockCallLLM.mock.calls[1]![0].attempt).toBe(2);
    });
  });

  describe('failure path — both parses fail', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockCallLLM.mockResolvedValue(makeLLMOutput(GARBAGE_RESPONSE));
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('test 8: rejects with Step1IncoherentError and error.attempts === 2', async () => {
      let caught: unknown;
      try {
        await runStoryArchitect(makeMinimalBrief(), makeCleanPreCheckResult());
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(Step1IncoherentError);
      expect((caught as Step1IncoherentError).attempts).toBe(2);
      expect(mockCallLLM).toHaveBeenCalledTimes(2);
      expect(mockCallLLM.mock.calls[1]![0].attempt).toBe(2);
    });
  });
});
