import { Timestamp } from 'firebase-admin/firestore';

import {
  SOMATIC_EXPRESSION_LABELS,
} from '@/models/storyBrief.model';
import type {
  ClinicalFoundation,
  NarrativeDistance,
  SomaticExpression,
  SomaticExpressionField,
  StoryBrief,
} from '@/models/storyBrief.model';
import { buildStep2SectionD } from '@/agent1/step2-author/prompt-sections/section-d-bodys-language';

const DEFAULT_CREATIVE_VISION =
  'A child hiding under a blanket, peeking out at the dark hallway';

type BriefOverrides = {
  somaticSelections?: readonly SomaticExpression[];
  somaticFreeText?: string;
  narrativeDistance?: NarrativeDistance;
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

  const typeSpecificField: SomaticExpressionField = {
    fieldType: 'somatic_expression',
    selections: [
      ...(overrides.somaticSelections ?? ['stomach_ache_feeling_sick']),
    ],
  };
  if (overrides.somaticFreeText !== undefined) {
    typeSpecificField.freeText = overrides.somaticFreeText;
  }

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
      typeSpecificField,
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
      narrativeDistance: overrides.narrativeDistance ?? 'direct',
    },
    personalizationConfig: {},
  };
}

describe('buildStep2SectionD', () => {
  it('contains anxiety lives in their body as:', () => {
    expect(buildStep2SectionD(makeMinimalBrief())).toContain(
      "anxiety lives in their body as:",
    );
  });

  it('contains the somatic display label for the first selection', () => {
    expect(buildStep2SectionD(makeMinimalBrief())).toContain(
      SOMATIC_EXPRESSION_LABELS['stomach_ache_feeling_sick'],
    );
  });

  it('with two somatic expressions, contains both labels', () => {
    const out = buildStep2SectionD(
      makeMinimalBrief({
        somaticSelections: [
          'stomach_ache_feeling_sick',
          'heart_racing_cant_breathe',
        ],
      }),
    );
    expect(out).toContain(
      SOMATIC_EXPRESSION_LABELS['stomach_ache_feeling_sick'],
    );
    expect(out).toContain(
      SOMATIC_EXPRESSION_LABELS['heart_racing_cant_breathe'],
    );
  });

  it('when somatic freeText is present, includes the free text', () => {
    const freeText = 'Shoulders hunched like carrying a heavy backpack';
    const out = makeMinimalBrief({ somaticFreeText: freeText });
    expect(buildStep2SectionD(out)).toContain(freeText);
  });

  it('when somatic freeText is absent, does not include undefined', () => {
    const brief = makeMinimalBrief();
    expect(brief.therapeuticArchitecture.typeSpecificField).not.toHaveProperty(
      'freeText',
    );
    expect(buildStep2SectionD(brief)).not.toContain('undefined');
  });

  it('contains Show the body. The reader should feel it physically.', () => {
    expect(buildStep2SectionD(makeMinimalBrief())).toContain(
      'Show the body. The reader should feel it physically.',
    );
  });

  it('when narrative distance is metaphorical, includes translation instruction', () => {
    const out = buildStep2SectionD(
      makeMinimalBrief({ narrativeDistance: 'metaphorical' }),
    );
    expect(out).toContain(
      'Translate these somatic experiences into the metaphorical world',
    );
  });

  it('when narrative distance is direct, does not include Translate these somatic experiences', () => {
    const out = buildStep2SectionD(
      makeMinimalBrief({ narrativeDistance: 'direct' }),
    );
    expect(out).not.toContain('Translate these somatic experiences');
  });

  it('when narrative distance is parallel, does not include Translate these somatic experiences', () => {
    const out = buildStep2SectionD(
      makeMinimalBrief({ narrativeDistance: 'parallel' }),
    );
    expect(out).not.toContain('Translate these somatic experiences');
  });

  it('does not contain the string "undefined"', () => {
    expect(buildStep2SectionD(makeMinimalBrief())).not.toContain('undefined');
  });
});
