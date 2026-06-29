import { Timestamp } from 'firebase-admin/firestore';

jest.mock('@/agent1/step2-author/few-shot-retriever', () => ({
  getStoryExample: jest.fn(),
}));

import { buildStep2Prompt } from '@/agent1/step2-author/prompt-builder';
import { getStoryExample } from '@/agent1/step2-author/few-shot-retriever';
import type { StoryFewShotResult } from '@/agent1/step2-author/prompt-sections/section-i-few-shot';
import type { StoryBrief, StoryLanguage } from '@/models/storyBrief.model';
import type { Step1Output } from '@/agent1/types';

const mockGetStoryExample = getStoryExample as jest.MockedFunction<
  typeof getStoryExample
>;

function makeBrief(outputLanguage?: StoryLanguage): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ...(outputLanguage ? { outputLanguage } : {}),
    ageAndScope: {
      ageRange: '5-7',
      peakIntensity: 'moderate',
      storyLength: 'standard',
    },
    clinicalFoundation: {
      population: 'p'.repeat(100),
      trigger: 't'.repeat(100),
      therapeuticIntention: { feel: 'feel', because: 'because' },
      creativeVision: 'vision',
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

function makeStep1Output(): Step1Output {
  return {
    emotionalTruth: 'truth',
    blueprint: [
      { index: 1, text: 'a' },
      { index: 2, text: 'b' },
      { index: 3, text: 'c' },
      { index: 4, text: 'd' },
      { index: 5, text: 'e' },
      { index: 6, text: 'f' },
    ],
    copingToolPlacement: 'point 4',
    approachInstruction: 'graduated exposure',
    rawResponse: 'raw',
    promptHash: 'a'.repeat(64),
    llmCallRecord: {
      step: 'step1_architect',
      model: 'claude-sonnet-4-6',
      inputTokens: 10,
      outputTokens: 10,
      latencyMs: 10,
      attempt: 1,
      promptHash: 'a'.repeat(64),
    },
  };
}

const ENGLISH_EXAMPLE: StoryFewShotResult = {
  example: { content: { title: 'Example', pages: [] }, filename: 'story-1.json' },
  sourceAgeRange: '5-7',
  crossBucket: false,
};

describe('buildStep2Prompt — output language', () => {
  beforeEach(() => {
    mockGetStoryExample.mockReset();
    mockGetStoryExample.mockReturnValue(ENGLISH_EXAMPLE);
  });

  it('English brief → no language directive, few-shot consulted', () => {
    const { prompt, exampleBankStatus } = buildStep2Prompt(
      makeBrief('en'),
      makeStep1Output(),
    );
    expect(prompt).not.toContain('OUTPUT LANGUAGE');
    expect(mockGetStoryExample).toHaveBeenCalledTimes(1);
    expect(exampleBankStatus).toBe('examples_used');
  });

  it('absent output language behaves like English', () => {
    const { prompt } = buildStep2Prompt(makeBrief(), makeStep1Output());
    expect(prompt).not.toContain('OUTPUT LANGUAGE');
    expect(mockGetStoryExample).toHaveBeenCalledTimes(1);
  });

  it('Arabic brief → language directive present', () => {
    const { prompt } = buildStep2Prompt(makeBrief('ar'), makeStep1Output());
    expect(prompt).toContain('OUTPUT LANGUAGE');
    expect(prompt).toContain('Arabic');
  });

  it('Arabic brief → forces cold-start (few-shot NOT consulted)', () => {
    const { exampleBankStatus } = buildStep2Prompt(
      makeBrief('ar'),
      makeStep1Output(),
    );
    expect(mockGetStoryExample).not.toHaveBeenCalled();
    expect(exampleBankStatus).toBe('cold_start_no_examples');
  });

  it('Hebrew brief → language directive present', () => {
    const { prompt } = buildStep2Prompt(makeBrief('he'), makeStep1Output());
    expect(prompt).toContain('OUTPUT LANGUAGE');
    expect(prompt).toContain('Hebrew');
  });

  it('Hebrew brief → forces cold-start (few-shot NOT consulted)', () => {
    const { exampleBankStatus } = buildStep2Prompt(
      makeBrief('he'),
      makeStep1Output(),
    );
    expect(mockGetStoryExample).not.toHaveBeenCalled();
    expect(exampleBankStatus).toBe('cold_start_no_examples');
  });
});
