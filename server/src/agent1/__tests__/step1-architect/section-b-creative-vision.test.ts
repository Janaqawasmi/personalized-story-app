import { Timestamp } from 'firebase-admin/firestore';

import { buildSectionB } from '@/agent1/step1-architect/prompt-sections/section-b-creative-vision';
import type { ClinicalFoundation, StoryBrief } from '@/models/storyBrief.model';

const DEFAULT_CREATIVE_VISION =
  'A child hiding under a blanket, peeking out at the dark hallway';

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

describe('buildSectionB', () => {
  it('includes the creative vision text verbatim', () => {
    expect(buildSectionB(makeMinimalBrief())).toContain(DEFAULT_CREATIVE_VISION);
  });

  it('contains THE HEART OF THIS STORY', () => {
    expect(buildSectionB(makeMinimalBrief())).toContain('THE HEART OF THIS STORY');
  });

  it('contains PLACING THE VISION IN THE ARC', () => {
    expect(buildSectionB(makeMinimalBrief())).toContain(
      'PLACING THE VISION IN THE ARC',
    );
  });

  it('states the vision-mechanism conflict rule', () => {
    const out = buildSectionB(makeMinimalBrief());
    expect(out).toMatch(/mechanism defines the\s+story's arc/);
  });

  it('when oneTrueThing is undefined, omits observed in real children', () => {
    const out = buildSectionB(makeMinimalBrief());
    expect(out).not.toContain('observed in real children');
  });

  it('when oneTrueThing is set, includes the exact string and the observed line', () => {
    const ott =
      'Many children with this fear sleep with one eye open, facing the door';
    const out = buildSectionB(makeMinimalBrief({ oneTrueThing: ott }));
    expect(out).toContain(ott);
    expect(out).toContain('observed in real children');
  });

  it('when oneTrueThing is empty string, omits observed in real children', () => {
    const out = buildSectionB(makeMinimalBrief({ oneTrueThing: '' }));
    expect(out).not.toContain('observed in real children');
  });

  it('when oneTrueThing is whitespace only, omits observed in real children', () => {
    const out = buildSectionB(makeMinimalBrief({ oneTrueThing: '   ' }));
    expect(out).not.toContain('observed in real children');
  });
});
