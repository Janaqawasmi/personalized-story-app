import { Timestamp } from 'firebase-admin/firestore';

import { buildPostValidationPrompt } from '@/agent1/step3-post-validation/prompt-builder';
import type { StoryBrief } from '@/models/storyBrief.model';
import type { Step2Output } from '@/agent1/types';

function makeMinimalBrief(overrides?: Partial<StoryBrief>): StoryBrief {
  const now = Timestamp.now();
  const base: StoryBrief = {
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
      copingTool: 'counting',
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
  return { ...base, ...overrides };
}

function makeMockStep2Output(): Step2Output {
  return {
    title: 'The Night Sounds Game',
    story: 'Pip was a small rabbit who listened for footsteps.',
    wordCount: 42,
    targetWordRange: [150, 250] as const,
    wordCountDrift: 'within_range',
    rawResponse: 'mock',
    promptHash: 'a'.repeat(64),
    llmCallRecord: {
      step: 'step2_author',
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 1000,
      attempt: 1,
      promptHash: 'a'.repeat(64),
    },
  };
}

describe('buildPostValidationPrompt', () => {
  it('test 1: output contains clinical safety reviewer', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out.toLowerCase()).toContain('clinical safety reviewer');
  });

  it('test 2: output contains the story title and story text', () => {
    const step2 = makeMockStep2Output();
    const out = buildPostValidationPrompt(
      step2,
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain(step2.title);
    expect(out).toContain(step2.story);
  });

  it('test 3: output contains PART 1: CONSTRAINT CHECK', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain('PART 1: CONSTRAINT CHECK');
  });

  it('test 4: output contains PART 2: ALIGNMENT NOTE', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain('PART 2: ALIGNMENT NOTE');
  });

  it('test 5: must-never list with items → bullets', () => {
    const brief = makeMinimalBrief({
      therapeuticArchitecture: {
        ...makeMinimalBrief().therapeuticArchitecture,
        mustNeverList: ['No lectures', 'No dismissal'],
      },
    });
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      brief,
      'Approach text.',
    );
    expect(out).toContain('- No lectures');
    expect(out).toContain('- No dismissal');
  });

  it('test 6: empty must-never list → (none)', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief({ therapeuticArchitecture: { ...makeMinimalBrief().therapeuticArchitecture, mustNeverList: [] } }),
      'Approach text.',
    );
    expect(out).toContain('(none)');
  });

  it('test 7: shame central → Check all three rules', () => {
    const brief = makeMinimalBrief({
      therapeuticArchitecture: {
        ...makeMinimalBrief().therapeuticArchitecture,
        shameDimension: 'central',
      },
    });
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      brief,
      'Approach text.',
    );
    expect(out).toContain('Check all three rules');
  });

  it('test 8: shame present → observed in their shame', () => {
    const brief = makeMinimalBrief({
      therapeuticArchitecture: {
        ...makeMinimalBrief().therapeuticArchitecture,
        shameDimension: 'present',
      },
    });
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      brief,
      'Approach text.',
    );
    expect(out).toContain('observed in their shame');
  });

  it('test 9: shame not_significant → No shame-specific checks required.', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain('No shame-specific checks required.');
  });

  it('test 10: output contains coping tool display label', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain('Counting');
  });

  it('test 11: output contains age range display label', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach text.',
    );
    expect(out).toContain('5–7');
  });

  it('test 12: output contains approach instruction text', () => {
    const instruction = 'Graduated exposure through a single night cycle.';
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      instruction,
    );
    expect(out).toContain(instruction);
  });

  it('test 13: resolution full → correct signature', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach.',
    );
    expect(out).toContain('Relief, accomplishment, safety restored.');
  });

  it('test 14: judging whether the story lectures only on NOT judging line', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach.',
    );
    const needle = 'judging whether the story lectures';
    const first = out.indexOf(needle);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(out.indexOf(needle, first + 1)).toBe(-1);
  });

  it('test 15: no undefined in output', () => {
    const out = buildPostValidationPrompt(
      makeMockStep2Output(),
      makeMinimalBrief(),
      'Approach.',
    );
    expect(out).not.toContain('undefined');
  });
});
