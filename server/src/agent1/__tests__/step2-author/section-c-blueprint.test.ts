import { Timestamp } from 'firebase-admin/firestore';

import {
  FEAR_ANXIETY_APPROACHES,
  FEAR_ANXIETY_COPING_TOOL_LABELS,
} from '@/models/storyBrief.model';
import type { ClinicalFoundation, StoryBrief } from '@/models/storyBrief.model';
import type { LLMCallRecord, Step1Output } from '@/agent1/types';
import { buildStep2SectionC } from '@/agent1/step2-author/prompt-sections/section-c-blueprint';

const DEFAULT_CREATIVE_VISION =
  'A child hiding under a blanket, peeking out at the dark hallway';

type BriefOverrides = {
  copingTool?: StoryBrief['therapeuticArchitecture']['copingTool'];
};

function makeMinimalBrief(overrides: BriefOverrides = {}): StoryBrief {
  const now = Timestamp.now();
  const clinicalFoundation: ClinicalFoundation = {
    population: 'p'.repeat(100),
    trigger: 't'.repeat(100),
    therapeuticIntention: {
      feel: 'That they can face new situations',
      because:
        'even when their body tells them to run, they have tools to stay',
    },
    creativeVision: DEFAULT_CREATIVE_VISION,
  };
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
    clinicalFoundation,
    therapeuticArchitecture: {
      primaryApproach: 'graduated_exposure',
      shameDimension: 'not_significant',
      typeSpecificField: {
        fieldType: 'somatic_expression',
        selections: ['stomach_ache_feeling_sick'],
      },
      copingTool: overrides.copingTool ?? 'deep_breathing',
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

const minimalLlmCallRecord: LLMCallRecord = {
  step: 'step1_architect',
  model: 'claude-opus-4-20250514',
  inputTokens: 100,
  outputTokens: 200,
  latencyMs: 1234,
  attempt: 1,
  promptHash: 'a'.repeat(64),
};

const mockStep1Output: Step1Output = {
  emotionalTruth:
    'This is a child who freezes when the lights go out...',
  blueprint: [
    { index: 1, text: 'A small rabbit named Pip' },
    { index: 2, text: 'The burrow at dusk' },
    { index: 3, text: 'Mother says goodnight' },
    { index: 4, text: 'A branch scrapes the ceiling' },
    { index: 5, text: 'Pip remembers the counting game' },
    { index: 6, text: 'Dawn finds Pip curled in his usual spot' },
  ],
  copingToolPlacement: 'The coping tool [Counting] appears at blueprint point 5.',
  approachInstruction:
    'The story uses graduated exposure through a single night cycle.',
  rawResponse: '',
  promptHash: '',
  llmCallRecord: minimalLlmCallRecord,
};

describe('buildStep2SectionC', () => {
  it('contains EMOTIONAL TRUTH header and the emotional truth text', () => {
    const out = buildStep2SectionC(makeMinimalBrief(), mockStep1Output);
    expect(out).toContain('EMOTIONAL TRUTH:');
    expect(out).toContain(mockStep1Output.emotionalTruth);
  });

  it('contains NARRATIVE BLUEPRINT header', () => {
    expect(buildStep2SectionC(makeMinimalBrief(), mockStep1Output)).toContain(
      'NARRATIVE BLUEPRINT:',
    );
  });

  it('contains all 6 blueprint points as a numbered list', () => {
    const out = buildStep2SectionC(makeMinimalBrief(), mockStep1Output);
    for (let i = 1; i <= 6; i++) {
      expect(out).toContain(`${i}. `);
    }
  });

  it('contains COPING TOOL header and the placement note text', () => {
    const out = buildStep2SectionC(makeMinimalBrief(), mockStep1Output);
    expect(out).toContain('COPING TOOL:');
    expect(out).toContain(mockStep1Output.copingToolPlacement);
  });

  it('contains "Show it happening. Do not name it."', () => {
    expect(buildStep2SectionC(makeMinimalBrief(), mockStep1Output)).toContain(
      'Show it happening. Do not name it.',
    );
  });

  it('contains the coping tool display label from FEAR_ANXIETY_COPING_TOOL_LABELS', () => {
    const brief = makeMinimalBrief();
    const out = buildStep2SectionC(brief, mockStep1Output);
    expect(out).toContain(
      FEAR_ANXIETY_COPING_TOOL_LABELS[brief.therapeuticArchitecture.copingTool],
    );
  });

  it('when coping tool is comfort_object_or_memory, includes recalls another person\'s presence', () => {
    const out = buildStep2SectionC(
      makeMinimalBrief({ copingTool: 'comfort_object_or_memory' }),
      mockStep1Output,
    );
    expect(out).toContain("recalls another person's presence");
  });

  it('when coping tool is deep_breathing, does not include recalls another person\'s presence', () => {
    const out = buildStep2SectionC(
      makeMinimalBrief({ copingTool: 'deep_breathing' }),
      mockStep1Output,
    );
    expect(out).not.toContain("recalls another person's presence");
  });

  it('contains HOW THE APPROACH WORKS IN THIS STORY and the approach instruction text', () => {
    const out = buildStep2SectionC(makeMinimalBrief(), mockStep1Output);
    expect(out).toContain('HOW THE APPROACH WORKS IN THIS STORY:');
    expect(out).toContain(mockStep1Output.approachInstruction);
  });

  it('does not contain any FEAR_ANXIETY_APPROACHES token (Decision D4)', () => {
    const out = buildStep2SectionC(makeMinimalBrief(), mockStep1Output);
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(out).not.toContain(approach);
    }
  });

  it('does not contain the string "undefined"', () => {
    expect(buildStep2SectionC(makeMinimalBrief(), mockStep1Output)).not.toContain(
      'undefined',
    );
  });
});
