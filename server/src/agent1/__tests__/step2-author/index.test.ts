import { Timestamp } from 'firebase-admin/firestore';

jest.mock('@/agent1/shared/llm-client', () => ({
  callLLM: jest.fn(),
}));

jest.mock('@/agent1/step2-author/few-shot-retriever', () => ({
  getStoryExample: jest.fn(),
}));

import { runAuthor } from '@/agent1/step2-author';
import { callLLM } from '@/agent1/shared/llm-client';
import type { LLMCallInput, LLMCallOutput } from '@/agent1/shared/llm-client';
import { getStoryExample } from '@/agent1/step2-author/few-shot-retriever';
import type { StoryFewShotResult } from '@/agent1/step2-author/prompt-sections/section-i-few-shot';
import type { StoryBrief } from '@/models/storyBrief.model';
import type { Step1Output } from '@/agent1/types';

const mockCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;
const mockGetStoryExample = getStoryExample as jest.MockedFunction<
  typeof getStoryExample
>;

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

function makeMinimalStep1Output(): Step1Output {
  return {
    emotionalTruth:
      'By the end, this child needs to feel that the dark holds nothing new.',
    blueprint: [
      { index: 1, text: 'Opening scene.' },
      { index: 2, text: 'Rising tension.' },
      { index: 3, text: 'Somatic moment.' },
      { index: 4, text: 'Coping tool.' },
      { index: 5, text: 'Resolution.' },
      { index: 6, text: 'Closing.' },
    ],
    copingToolPlacement: 'At blueprint point 4.',
    approachInstruction: 'Graduated exposure through a single night cycle.',
    rawResponse: 'mock raw response',
    promptHash: 'a'.repeat(64),
    llmCallRecord: {
      step: 'step1_architect',
      model: 'claude-sonnet-4-6',
      inputTokens: 1200,
      outputTokens: 450,
      latencyMs: 1800,
      attempt: 1,
      promptHash: 'a'.repeat(64),
    },
  };
}

function makeColdStartFewShot(): StoryFewShotResult {
  return { example: null, sourceAgeRange: '5-7', crossBucket: false };
}

// A well-formed LLM response containing TITLE and STORY sections
const GOOD_RESPONSE = `1. TITLE
The Night Sounds Game
2. STORY
Pip was a small rabbit who slept with one ear pressed to the wall.
Every night, when the amber light faded to blue-gray, he would
listen for his mother's footsteps padding down the hall.
The sounds were always the same: first the creak of the third step,
then the soft hush of her slippers, then silence.
Pip counted the sounds like stones in his pocket.
He breathed out slowly, the way his mother had shown him,
and the dark stayed just the dark.`;

function makeLLMOutput(text: string): LLMCallOutput {
  return {
    text,
    inputTokens: 1200,
    outputTokens: 450,
    latencyMs: 1800,
  };
}

describe('runAuthor', () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
    mockGetStoryExample.mockReset();
    mockGetStoryExample.mockReturnValue(makeColdStartFewShot());
    mockCallLLM.mockResolvedValue(makeLLMOutput(GOOD_RESPONSE));
  });

  it('test 1: resolves with step2Output containing title and story', async () => {
    const { step2Output } = await runAuthor(
      makeMinimalBrief(),
      makeMinimalStep1Output(),
    );
    expect(typeof step2Output.title).toBe('string');
    expect(step2Output.title.length).toBeGreaterThan(0);
    expect(typeof step2Output.story).toBe('string');
    expect(step2Output.story.length).toBeGreaterThan(0);
  });

  it('test 2: step2Output.llmCallRecord.step is "step2_author"', async () => {
    const { step2Output } = await runAuthor(
      makeMinimalBrief(),
      makeMinimalStep1Output(),
    );
    expect(step2Output.llmCallRecord.step).toBe('step2_author');
  });

  it('test 3: step2Output.promptHash is a 64-char hex string', async () => {
    const { step2Output } = await runAuthor(
      makeMinimalBrief(),
      makeMinimalStep1Output(),
    );
    expect(step2Output.promptHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('test 4: exampleBankStatus is one of the three legal values', async () => {
    const { exampleBankStatus } = await runAuthor(
      makeMinimalBrief(),
      makeMinimalStep1Output(),
    );
    expect([
      'examples_used',
      'cross_bucket_retrieval',
      'cold_start_no_examples',
    ]).toContain(exampleBankStatus);
  });

  it('test 5: callLLM was called exactly once (no retry)', async () => {
    await runAuthor(makeMinimalBrief(), makeMinimalStep1Output());
    expect(mockCallLLM).toHaveBeenCalledTimes(1);
  });

  it('test 6: callLLM was called with maxTokens: 8192', async () => {
    await runAuthor(makeMinimalBrief(), makeMinimalStep1Output());
    const callArg = mockCallLLM.mock.calls[0]![0] as LLMCallInput;
    expect(callArg.maxTokens).toBe(8192);
  });

  it('test 7: callLLM was called with step: "step2_author"', async () => {
    await runAuthor(makeMinimalBrief(), makeMinimalStep1Output());
    const callArg = mockCallLLM.mock.calls[0]![0] as LLMCallInput;
    expect(callArg.step).toBe('step2_author');
  });
});
