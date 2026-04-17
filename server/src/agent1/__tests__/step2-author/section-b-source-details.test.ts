import { Timestamp } from 'firebase-admin/firestore';

import { FEAR_ANXIETY_APPROACHES } from '@/models/storyBrief.model';
import type { ClinicalFoundation, StoryBrief } from '@/models/storyBrief.model';
import { buildStep2SectionB } from '@/agent1/step2-author/prompt-sections/section-b-source-details';

const DEFAULT_CREATIVE_VISION =
  'A child hiding under a blanket, peeking out at the dark hallway';

const ONE_TRUE_THING_TEXT =
  'Many children with this fear sleep with one eye open, facing the door';

type ClinicalFoundationOverrides = {
  creativeVision?: string;
  oneTrueThing?: string;
};

function makeMinimalBrief(
  overrides: ClinicalFoundationOverrides = {},
): StoryBrief {
  const now = Timestamp.now();
  const clinicalFoundation: ClinicalFoundation = {
    population: 'p'.repeat(100),
    trigger: 't'.repeat(100),
    therapeuticIntention: {
      feel: 'That they can face new situations',
      because:
        'even when their body tells them to run, they have tools to stay',
    },
    creativeVision: overrides.creativeVision ?? DEFAULT_CREATIVE_VISION,
  };
  if (overrides.oneTrueThing !== undefined) {
    clinicalFoundation.oneTrueThing = overrides.oneTrueThing;
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

describe('buildStep2SectionB', () => {
  it('contains "THE IMAGE AT THE CENTER"', () => {
    expect(buildStep2SectionB(makeMinimalBrief())).toContain(
      'THE IMAGE AT THE CENTER',
    );
  });

  it('contains the creative vision text verbatim', () => {
    expect(buildStep2SectionB(makeMinimalBrief())).toContain(
      DEFAULT_CREATIVE_VISION,
    );
  });

  it('contains "Build the story around this"', () => {
    expect(buildStep2SectionB(makeMinimalBrief())).toContain(
      'Build the story around this',
    );
  });

  it('when oneTrueThing is undefined, omits "AND SOMETHING REAL"', () => {
    expect(buildStep2SectionB(makeMinimalBrief())).not.toContain(
      'AND SOMETHING REAL',
    );
  });

  it('when oneTrueThing is set, includes "AND SOMETHING REAL" and the text verbatim', () => {
    const out = buildStep2SectionB(
      makeMinimalBrief({ oneTrueThing: ONE_TRUE_THING_TEXT }),
    );
    expect(out).toContain('AND SOMETHING REAL');
    expect(out).toContain(ONE_TRUE_THING_TEXT);
  });

  it('when oneTrueThing is empty string, omits "AND SOMETHING REAL"', () => {
    expect(
      buildStep2SectionB(makeMinimalBrief({ oneTrueThing: '' })),
    ).not.toContain('AND SOMETHING REAL');
  });

  it('when oneTrueThing is whitespace only, omits "AND SOMETHING REAL"', () => {
    expect(
      buildStep2SectionB(makeMinimalBrief({ oneTrueThing: '   ' })),
    ).not.toContain('AND SOMETHING REAL');
  });

  it('does not include population or trigger as section headers', () => {
    const out = buildStep2SectionB(makeMinimalBrief());
    expect(out).not.toMatch(/^POPULATION/m);
    expect(out).not.toMatch(/^TRIGGER/m);
  });

  it('does not contain any therapeutic approach token (Decision D4)', () => {
    const out = buildStep2SectionB(
      makeMinimalBrief({ oneTrueThing: ONE_TRUE_THING_TEXT }),
    );
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(out).not.toContain(approach);
    }
  });

  it('does not contain the string "undefined"', () => {
    expect(buildStep2SectionB(makeMinimalBrief())).not.toContain('undefined');
  });
});
