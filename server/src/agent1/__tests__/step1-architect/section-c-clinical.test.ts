import { Timestamp } from 'firebase-admin/firestore';

import { getApproachInstruction } from '@/agent1/shared/approach-instructions';
import { buildSectionCClinical } from '@/agent1/step1-architect/prompt-sections/section-c-clinical';
import type { VagueIntentionResult } from '@/agent1/types';
import {
  SOMATIC_EXPRESSION_LABELS,
  type AgeRange,
  type CaregiverPresence,
  type CopingTool,
  type FearAnxietyApproach,
  type ShameDimension,
  type SomaticExpression,
  type StoryBrief,
  type SupportingCharacterSelection,
} from '@/models/storyBrief.model';

type BriefOverrides = {
  ageRange?: AgeRange;
  primaryApproach?: FearAnxietyApproach;
  supportingApproach?: FearAnxietyApproach;
  shameDimension?: ShameDimension;
  copingTool?: CopingTool;
  somaticSelections?: SomaticExpression[];
  somaticFreeText?: string;
  mustNeverList?: string[];
  caregiverPresence?: CaregiverPresence;
  supportingCharacters?: SupportingCharacterSelection[];
  feel?: string;
  because?: string;
};

const DEFAULT_FEEL = 'That they can face new situations';
const DEFAULT_BECAUSE =
  'even when their body tells them to run, they have tools to stay';

function makeMinimalBrief(overrides: BriefOverrides = {}): StoryBrief {
  const now = Timestamp.now();

  const therapeuticArchitecture: StoryBrief['therapeuticArchitecture'] = {
    primaryApproach: overrides.primaryApproach ?? 'graduated_exposure',
    shameDimension: overrides.shameDimension ?? 'not_significant',
    typeSpecificField: {
      fieldType: 'somatic_expression',
      selections: overrides.somaticSelections ?? ['stomach_ache_feeling_sick'],
    },
    copingTool: overrides.copingTool ?? 'deep_breathing',
    resolutionCompleteness: 'full',
    mustNeverList: overrides.mustNeverList ?? [],
  };
  if (overrides.supportingApproach !== undefined) {
    therapeuticArchitecture.supportingApproach = overrides.supportingApproach;
  }
  if (overrides.somaticFreeText !== undefined) {
    therapeuticArchitecture.typeSpecificField = {
      fieldType: 'somatic_expression',
      selections:
        overrides.somaticSelections ?? ['stomach_ache_feeling_sick'],
      freeText: overrides.somaticFreeText,
    };
  }

  const storyWorld: StoryBrief['storyWorld'] = {
    personalization: false,
    protagonistGender: 'girl',
    protagonistType: 'child',
    protagonistAge: 'same_age',
    caregiverPresence:
      overrides.caregiverPresence ?? 'present_and_comforting',
    narrativeDistance: 'direct',
  };
  if (overrides.supportingCharacters !== undefined) {
    storyWorld.supportingCharacters = overrides.supportingCharacters;
  }

  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user-id',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ageAndScope: {
      ageRange: overrides.ageRange ?? '5-7',
      peakIntensity: 'moderate',
      storyLength: 'standard',
    },
    clinicalFoundation: {
      population: 'p'.repeat(100),
      trigger: 't'.repeat(100),
      therapeuticIntention: {
        feel: overrides.feel ?? DEFAULT_FEEL,
        because: overrides.because ?? DEFAULT_BECAUSE,
      },
      creativeVision: 'A child hiding under a blanket.',
    },
    therapeuticArchitecture,
    storyWorld,
    personalizationConfig: {},
  };
}

const DEFAULT_VAGUE: VagueIntentionResult = { isVague: false };
const VAGUE_TRUE: VagueIntentionResult = { isVague: true };

describe('buildSectionCClinical — hard constraints', () => {
  it('contains the HARD CONSTRAINTS header', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain('HARD CONSTRAINTS');
  });

  it('renders an empty mustNeverList as "(none)"', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain('Must-never list: (none)');
  });

  it('joins a populated mustNeverList with semicolon-space', () => {
    const list = [
      'The child is left alone in the dark',
      'Adults dismiss the fear',
    ];
    const out = buildSectionCClinical(
      makeMinimalBrief({ mustNeverList: list }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain(
      'Must-never list: The child is left alone in the dark; Adults dismiss the fear',
    );
  });

  it('when shame is "present", adds the "shame is internal" rule', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ shameDimension: 'present' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('Shame is internal. It is not performed.');
  });

  it('when shame is "central", adds the three-hard-rules block', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ shameDimension: 'central' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('three hard rules');
    expect(out).toContain('acceptance, not correction.');
  });

  it('when shame is "not_significant", omits both shame conditionals', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('Shame is internal');
    expect(out).not.toContain('three hard rules');
  });
});

describe('buildSectionCClinical — clinical core', () => {
  it('includes the verbatim feel and because from the brief', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain(DEFAULT_FEEL);
    expect(out).toContain(DEFAULT_BECAUSE);
  });

  it('includes the vague-intention note when isVague is true', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), VAGUE_TRUE);
    expect(out).toContain('intention appears vague');
  });

  it('omits the vague-intention note when isVague is false', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('intention appears vague');
  });

  it('renders the primary approach display label and token', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain('Graduated exposure');
    expect(out).toContain('(token: graduated_exposure)');
  });

  it('omits the supporting-approach line when not set', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('Supporting approach:');
  });

  it('renders the supporting approach line when set', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ supportingApproach: 'normalization' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('Supporting approach: Normalization');
  });
});

describe('buildSectionCClinical — coping tool conditionals', () => {
  it('comfort_object_or_memory adds the clinically-distinct block', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ copingTool: 'comfort_object_or_memory' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('clinically distinct from positive self-talk');
  });

  it('deep_breathing does NOT add the clinically-distinct block', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('clinically distinct');
  });

  it('ages 3–5 + abstract coping tool adds the physical-action block', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        ageRange: '3-5',
        copingTool: 'visualization',
      }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain(
      'simple physical action or repeated sensory pattern',
    );
  });

  it('ages 5–7 + abstract coping tool does NOT add the physical-action block', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        ageRange: '5-7',
        copingTool: 'visualization',
      }),
      DEFAULT_VAGUE,
    );
    expect(out).not.toContain('simple physical action');
  });

  it('ages 3–5 + non-abstract coping tool does NOT add the physical-action block', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        ageRange: '3-5',
        copingTool: 'deep_breathing',
      }),
      DEFAULT_VAGUE,
    );
    expect(out).not.toContain('simple physical action');
  });
});

describe('buildSectionCClinical — somatic expressions', () => {
  it('renders the display label for a single somatic selection', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain(
      SOMATIC_EXPRESSION_LABELS.stomach_ache_feeling_sick,
    );
  });

  it('renders both display labels when two somatics are selected', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        somaticSelections: [
          'stomach_ache_feeling_sick',
          'heart_racing_cant_breathe',
        ],
      }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain(
      SOMATIC_EXPRESSION_LABELS.stomach_ache_feeling_sick,
    );
    expect(out).toContain(
      SOMATIC_EXPRESSION_LABELS.heart_racing_cant_breathe,
    );
  });

  it('renders the freeText line when freeText is present', () => {
    const freeText = 'She chews the inside of her cheek';
    const out = buildSectionCClinical(
      makeMinimalBrief({ somaticFreeText: freeText }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('Additional detail:');
    expect(out).toContain(freeText);
  });

  it('omits the freeText line when freeText is absent', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('Additional detail:');
  });
});

describe('buildSectionCClinical — approach instructions', () => {
  it('includes the primary approach instruction text from the shared helper', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).toContain(getApproachInstruction('graduated_exposure'));
  });

  it('psychoeducation primary adds the "NOT a lecture" note', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ primaryApproach: 'psychoeducation' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('NOT a lecture');
  });

  it('non-psychoeducation primary omits the "NOT a lecture" note', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('NOT a lecture');
  });

  it('reassurance_predictability primary adds the "notices the pattern" note', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ primaryApproach: 'reassurance_predictability' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('protagonist notices the pattern themselves');
  });

  it('non-reassurance_predictability primary omits the "notices the pattern" note', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('protagonist notices the pattern');
  });
});

describe('buildSectionCClinical — modeling fallback', () => {
  it('modeling + no caregiver + no supporting chars fires the fallback', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        primaryApproach: 'modeling',
        caregiverPresence: 'not_present',
      }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('No model character was provided');
  });

  it('modeling with a present caregiver does NOT fire the fallback', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        primaryApproach: 'modeling',
        caregiverPresence: 'present_and_comforting',
      }),
      DEFAULT_VAGUE,
    );
    expect(out).not.toContain('No model character was provided');
  });

  it('modeling + no caregiver + one supporting char does NOT fire the fallback', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({
        primaryApproach: 'modeling',
        caregiverPresence: 'not_present',
        supportingCharacters: [{ type: 'peer_shows_possible' }],
      }),
      DEFAULT_VAGUE,
    );
    expect(out).not.toContain('No model character');
  });

  it('non-modeling primary does NOT fire the fallback', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ caregiverPresence: 'not_present' }),
      DEFAULT_VAGUE,
    );
    expect(out).not.toContain('No model character');
  });
});

describe('buildSectionCClinical — supporting approach instruction', () => {
  it('emits the supporting-approach narrative block when set', () => {
    const out = buildSectionCClinical(
      makeMinimalBrief({ supportingApproach: 'normalization' }),
      DEFAULT_VAGUE,
    );
    expect(out).toContain('HOW THE SUPPORTING APPROACH FLAVORS THE STORY');
    expect(out).toContain(getApproachInstruction('normalization'));
  });

  it('omits the supporting-approach narrative block when not set', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('HOW THE SUPPORTING APPROACH FLAVORS THE STORY');
  });
});

describe('buildSectionCClinical — no undefined leaks', () => {
  it('default brief output never contains the literal "undefined"', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('undefined');
  });

  it('brief with all optional fields absent never contains "undefined"', () => {
    const out = buildSectionCClinical(makeMinimalBrief(), DEFAULT_VAGUE);
    expect(out).not.toContain('undefined');
  });
});
