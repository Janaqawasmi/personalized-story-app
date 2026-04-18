jest.mock('@/agent1/shared/llm-client', () => ({
  callLLM: jest.fn(),
}));

import { Timestamp } from 'firebase-admin/firestore';

import { runPostValidation } from '@/agent1/step3-post-validation/index';
import { callLLM } from '@/agent1/shared/llm-client';
import type { LLMCallInput, LLMCallOutput } from '@/agent1/shared/llm-client';
import type { StoryBrief } from '@/models/storyBrief.model';
import type { Step2Output } from '@/agent1/types';
import * as step3OutputParser from '@/agent1/step3-post-validation/output-parser';

const mockCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

function makeBrief(): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'u',
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
        feel: 'feel',
        because: 'because',
      },
      creativeVision: 'c'.repeat(100),
    },
    therapeuticArchitecture: {
      primaryApproach: 'graduated_exposure',
      shameDimension: 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['restless_fidgety'],
      },
      copingTool: 'counting',
      resolutionCompleteness: 'partial',
      mustNeverList: ['Never minimize fear'],
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

function makeStep2(): Step2Output {
  return {
    title: 'Title',
    story: 'Story body text.'.repeat(10),
    wordCount: 120,
    targetWordRange: [150, 250] as const,
    wordCountDrift: 'within_range',
    rawResponse: '',
    promptHash: 'f'.repeat(64),
    llmCallRecord: {
      step: 'step2_author',
      model: 'claude-opus-4-20250514',
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      attempt: 1,
      promptHash: 'f'.repeat(64),
    },
  };
}

function llmGoodOutput(): LLMCallOutput {
  return {
    text:
      'PASS\n===== ALIGNMENT NOTE =====\nAlignment ok.',
    inputTokens: 400,
    outputTokens: 100,
    latencyMs: 800,
  };
}

describe('runPostValidation', () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
    mockCallLLM.mockResolvedValue(llmGoodOutput());
    jest.restoreAllMocks();
  });

  it('test 1: resolves with PostValidationResult', async () => {
    const r = await runPostValidation(
      makeStep2(),
      makeBrief(),
      'Approach instruction.',
    );
    expect(r).toMatchObject({
      result: 'PASS',
      alignmentNote: expect.any(String),
    });
  });

  it('test 2: llmCallRecord.step is step3_post_validation', async () => {
    const r = await runPostValidation(
      makeStep2(),
      makeBrief(),
      'Approach.',
    );
    expect(r.llmCallRecord.step).toBe('step3_post_validation');
  });

  it('test 3: model is sonnet, not opus', async () => {
    const r = await runPostValidation(
      makeStep2(),
      makeBrief(),
      'Approach.',
    );
    expect(r.llmCallRecord.model).toContain('sonnet');
    expect(r.llmCallRecord.model).not.toContain('opus');
  });

  it('test 4: callLLM maxTokens 2048', async () => {
    await runPostValidation(makeStep2(), makeBrief(), 'Approach.');
    const arg = mockCallLLM.mock.calls[0]![0] as LLMCallInput;
    expect(arg.maxTokens).toBe(2048);
  });

  it('test 5: callLLM exactly once', async () => {
    await runPostValidation(makeStep2(), makeBrief(), 'Approach.');
    expect(mockCallLLM).toHaveBeenCalledTimes(1);
  });

  it('test 6: LLM throws → soft-fail PASS', async () => {
    mockCallLLM.mockRejectedValueOnce(new Error('network down'));
    const r = await runPostValidation(
      makeStep2(),
      makeBrief(),
      'Approach.',
    );
    expect(r.result).toBe('PASS');
    expect(r.flags).toEqual([]);
    expect(r.alignmentNote).toContain('unable to complete');
  });

  it('test 7: parser throws → soft-fail PASS', async () => {
    jest.spyOn(step3OutputParser, 'parsePostValidationResponse').mockImplementationOnce(() => {
      throw new Error('forced parse failure');
    });
    const r = await runPostValidation(
      makeStep2(),
      makeBrief(),
      'Approach.',
    );
    expect(r.result).toBe('PASS');
    expect(r.flags).toEqual([]);
    expect(r.alignmentNote).toContain('unable to complete');
  });
});
