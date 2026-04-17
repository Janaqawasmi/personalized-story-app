import { Timestamp } from 'firebase-admin/firestore';

import { buildSectionCStoryWorld } from '@/agent1/step1-architect/prompt-sections/section-c-story-world';
import type { ComplexityBudgetResult } from '@/agent1/types';
import {
  AGE_RANGE_LABELS,
  CAREGIVER_PRESENCE_LABELS,
  PEAK_INTENSITY_LABELS,
  PROTAGONIST_TYPE_LABELS,
  STORY_LENGTH_LABELS,
  SUPPORTING_CHARACTER_LABELS,
  type AgeRange,
  type CaregiverPresence,
  type NarrativeDistance,
  type PeakIntensity,
  type ProtagonistAge,
  type ProtagonistGender,
  type ProtagonistType,
  type ResolutionCompleteness,
  type StoryBrief,
  type StoryLength,
  type SupportingCharacterSelection,
} from '@/models/storyBrief.model';

const defaultComplexity: ComplexityBudgetResult = {
  totalPageCost: 4.4,
  availablePageRange: [10, 14] as const,
  state: 'green',
  contributions: [],
};

type BriefOverrides = {
  population?: string;
  trigger?: string;
  ageRange?: AgeRange;
  peakIntensity?: PeakIntensity;
  storyLength?: StoryLength;
  resolutionCompleteness?: ResolutionCompleteness;
  personalization?: boolean;
  protagonistGender?: ProtagonistGender;
  protagonistType?: ProtagonistType;
  protagonistAge?: ProtagonistAge;
  caregiverPresence?: CaregiverPresence;
  narrativeDistance?: NarrativeDistance;
  parallelChallenge?: string;
  supportingCharacters?: SupportingCharacterSelection[];
  characterNotes?: string;
  acknowledgedWarnings?: string[];
  omitOptionalStoryWorldKeys?: boolean;
};

function makeMinimalBrief(overrides: BriefOverrides = {}): StoryBrief {
  const now = Timestamp.now();

  const storyWorld: StoryBrief['storyWorld'] = {
    personalization: overrides.personalization ?? false,
    protagonistType: overrides.protagonistType ?? 'child',
    caregiverPresence: overrides.caregiverPresence ?? 'present_and_comforting',
    narrativeDistance: overrides.narrativeDistance ?? 'direct',
  };

  if (!overrides.omitOptionalStoryWorldKeys) {
    if (overrides.personalization !== true) {
      if (overrides.protagonistGender !== undefined) {
        storyWorld.protagonistGender = overrides.protagonistGender;
      } else {
        storyWorld.protagonistGender = 'girl';
      }
      if (overrides.protagonistAge !== undefined) {
        storyWorld.protagonistAge = overrides.protagonistAge;
      } else {
        storyWorld.protagonistAge = 'same_age';
      }
    }
    if (overrides.parallelChallenge !== undefined) {
      storyWorld.parallelChallenge = overrides.parallelChallenge;
    }
    if (overrides.supportingCharacters !== undefined) {
      storyWorld.supportingCharacters = overrides.supportingCharacters;
    }
    if (overrides.characterNotes !== undefined) {
      storyWorld.characterNotes = overrides.characterNotes;
    }
  } else {
    if (overrides.parallelChallenge !== undefined) {
      storyWorld.parallelChallenge = overrides.parallelChallenge;
    }
    if (overrides.supportingCharacters !== undefined) {
      storyWorld.supportingCharacters = overrides.supportingCharacters;
    }
    if (overrides.characterNotes !== undefined) {
      storyWorld.characterNotes = overrides.characterNotes;
    }
  }

  if (overrides.personalization === true) {
    storyWorld.personalization = true;
    delete storyWorld.protagonistGender;
    delete storyWorld.protagonistAge;
  }

  const brief: StoryBrief = {
    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user-id',
    status: 'submitted',
    version: 1,
    storyType: 'fear_anxiety',
    ageAndScope: {
      ageRange: overrides.ageRange ?? '5-7',
      peakIntensity: overrides.peakIntensity ?? 'moderate',
      storyLength: overrides.storyLength ?? 'standard',
    },
    clinicalFoundation: {
      population: overrides.population ?? 'p'.repeat(100),
      trigger: overrides.trigger ?? 't'.repeat(100),
      therapeuticIntention: {
        feel: 'feel',
        because: 'because',
      },
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
      resolutionCompleteness: overrides.resolutionCompleteness ?? 'full',
      mustNeverList: [],
    },
    storyWorld,
    personalizationConfig: {},
  };

  if (overrides.acknowledgedWarnings !== undefined) {
    brief.acknowledgedWarnings = overrides.acknowledgedWarnings;
  }

  return brief;
}

describe('buildSectionCStoryWorld — emotional world', () => {
  it('includes EMOTIONAL WORLD header', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).toContain('EMOTIONAL WORLD');
  });

  it('includes population text verbatim', () => {
    const population = 'Unique population phrase for this test.';
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ population }),
      defaultComplexity,
    );
    expect(out).toContain(population);
  });

  it('includes trigger text verbatim', () => {
    const trigger = 'Unique trigger phrase for this test.';
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ trigger }),
      defaultComplexity,
    );
    expect(out).toContain(trigger);
  });
});

describe('buildSectionCStoryWorld — story world core fields', () => {
  it('includes age range display label from AGE_RANGE_LABELS', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ ageRange: '7-9' }),
      defaultComplexity,
    );
    expect(out).toContain(AGE_RANGE_LABELS['7-9']);
  });

  it('includes peak intensity display label', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ peakIntensity: 'very_gentle' }),
      defaultComplexity,
    );
    expect(out).toContain(PEAK_INTENSITY_LABELS.very_gentle);
  });

  it('includes story length display label', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ storyLength: 'extended' }),
      defaultComplexity,
    );
    expect(out).toContain(STORY_LENGTH_LABELS.extended);
  });

  it('resolution full includes relief / accomplishment signature', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).toContain('relief, accomplishment, safety restored');
  });

  it('resolution partial includes cautious hope', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ resolutionCompleteness: 'partial' }),
      defaultComplexity,
    );
    expect(out).toContain('cautious hope');
  });

  it('resolution open includes journey unfinished', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ resolutionCompleteness: 'open' }),
      defaultComplexity,
    );
    expect(out).toContain('journey unfinished');
  });
});

describe('buildSectionCStoryWorld — personalization', () => {
  it('personalization on uses placeholders and omits type/gender/age labels', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ personalization: true }),
      defaultComplexity,
    );
    expect(out).toContain('[CHILD_NAME]');
    expect(out).toContain('locked to');
    expect(out).not.toContain(PROTAGONIST_TYPE_LABELS.child);
    expect(out).not.toContain('Protagonist gender:');
    expect(out).not.toContain('Protagonist age relation:');
  });

  it('personalization off includes protagonist type label, not [CHILD_NAME]', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ personalization: false, protagonistType: 'animal' }),
      defaultComplexity,
    );
    expect(out).toContain(PROTAGONIST_TYPE_LABELS.animal);
    expect(out).not.toContain('[CHILD_NAME]');
  });

  it('personalization off + kept_open includes neutral name and pronoun note', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        personalization: false,
        protagonistGender: 'kept_open',
      }),
      defaultComplexity,
    );
    expect(out).toContain('neutral name');
    expect(out).toContain('No they/them pronouns');
  });

  it('personalization off + girl omits neutral name note', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        personalization: false,
        protagonistGender: 'girl',
      }),
      defaultComplexity,
    );
    expect(out).not.toContain('neutral name');
  });

  it('personalization off + slightly_older includes age note', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        personalization: false,
        protagonistAge: 'slightly_older',
      }),
      defaultComplexity,
    );
    expect(out).toContain('1–2 years older');
  });

  it('personalization off + same_age omits slightly older note', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        personalization: false,
        protagonistAge: 'same_age',
      }),
      defaultComplexity,
    );
    expect(out).not.toContain('1–2 years older');
  });
});

describe('buildSectionCStoryWorld — caregiver and separation anxiety', () => {
  it('includes caregiver display label', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ caregiverPresence: 'guides_from_the_side' }),
      defaultComplexity,
    );
    expect(out).toContain(CAREGIVER_PRESENCE_LABELS.guides_from_the_side);
  });

  it('defers caregiver narrative guidance to Step 2 Author', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).toContain("Author's job (Step 2)");
  });

  it('acknowledged separation_anxiety_no_caregiver yields intentional framing', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        acknowledgedWarnings: ['separation_anxiety_no_caregiver'],
        caregiverPresence: 'not_present',
        trigger: 'fear of separation when parents leave',
      }),
      defaultComplexity,
    );
    expect(out).toContain('Treat the absent caregiver as intentional');
  });

  it('separation trigger + not_present + not acknowledged yields configuration risk', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        trigger: 'separation at school drop-off',
        caregiverPresence: 'not_present',
      }),
      defaultComplexity,
    );
    expect(out).toContain('configuration risk');
    expect(out).toContain('relational anchor');
  });

  it('acknowledged wins over trigger-based configuration risk', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        acknowledgedWarnings: ['separation_anxiety_no_caregiver'],
        caregiverPresence: 'not_present',
        trigger: 'separation when saying goodbye',
      }),
      defaultComplexity,
    );
    expect(out).toContain('intentional');
    expect(out).not.toContain('configuration risk');
  });

  it('separation trigger adds relational blueprint note regardless of caregiver', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        trigger: 'separation anxiety in new places',
        caregiverPresence: 'present_and_comforting',
      }),
      defaultComplexity,
    );
    expect(out).toContain(
      'establish the specific relationship that will be tested',
    );
  });

  it('non-separation trigger omits relational blueprint note', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        trigger: 'worry about a math test tomorrow',
      }),
      defaultComplexity,
    );
    expect(out).not.toContain(
      'establish the specific relationship that will be tested',
    );
  });

  it('without mom + not_present + not acknowledged triggers configuration risk', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        trigger: 'being without mom during the trip',
        caregiverPresence: 'not_present',
      }),
      defaultComplexity,
    );
    expect(out).toContain('configuration risk');
  });

  it('without a flashlight does not trigger configuration risk', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        trigger: 'being without a flashlight in the cave',
        caregiverPresence: 'not_present',
      }),
      defaultComplexity,
    );
    expect(out).not.toContain('configuration risk');
  });
});

describe('buildSectionCStoryWorld — narrative distance', () => {
  it('direct omits parallel and metaphorical instruction phrases', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).not.toContain('Equivalent challenge');
    expect(out).not.toContain('Translate somatic');
  });

  it('parallel with parallelChallenge includes challenge and preserve line', () => {
    const challenge = 'First day at a new hive as a worker bee';
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        narrativeDistance: 'parallel',
        parallelChallenge: challenge,
      }),
      defaultComplexity,
    );
    expect(out).toContain('Equivalent challenge:');
    expect(out).toContain(challenge);
    expect(out).toContain('Preserve emotional core');
  });

  it('parallel without parallelChallenge uses construction instruction', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        narrativeDistance: 'parallel',
      }),
      defaultComplexity,
    );
    expect(out).toContain('Construct the parallel by preserving');
  });

  it('metaphorical includes somatic translation instruction', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ narrativeDistance: 'metaphorical' }),
      defaultComplexity,
    );
    expect(out).toContain(
      'Translate somatic expressions into the metaphorical world',
    );
  });
});

describe('buildSectionCStoryWorld — supporting characters', () => {
  it('omits supporting characters block when none', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ supportingCharacters: [] }),
      defaultComplexity,
    );
    expect(out).not.toContain('Supporting characters:');
  });

  it('one character with functional role lists type and role', () => {
    const role = 'offers a steadying hand on the bridge';
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        supportingCharacters: [
          { type: 'peer_alongside', functionalRole: role },
        ],
      }),
      defaultComplexity,
    );
    expect(out).toContain(SUPPORTING_CHARACTER_LABELS.peer_alongside);
    expect(out).toContain(role);
  });

  it('one character without functional role omits role phrase', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        supportingCharacters: [{ type: 'animal_friend' }],
      }),
      defaultComplexity,
    );
    expect(out).toContain(SUPPORTING_CHARACTER_LABELS.animal_friend);
    expect(out).not.toContain('functional role at key moment');
  });

  it('two characters + green omits tier annotation', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        supportingCharacters: [
          { type: 'peer_shows_possible', functionalRole: 'a' },
          { type: 'peer_alongside', functionalRole: 'b' },
        ],
      }),
      defaultComplexity,
    );
    expect(out).not.toContain('Tier 3');
    expect(out).not.toContain('Tier 4');
  });

  it('two characters + yellow includes tier annotation', () => {
    const yellow: ComplexityBudgetResult = {
      ...defaultComplexity,
      state: 'yellow',
    };
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        supportingCharacters: [
          { type: 'peer_shows_possible' },
          { type: 'peer_alongside' },
        ],
      }),
      yellow,
    );
    expect(out).toContain('Tier 3');
    expect(out).toContain('Tier 4');
  });

  it('two characters + red includes tier annotation', () => {
    const red: ComplexityBudgetResult = {
      ...defaultComplexity,
      state: 'red',
    };
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        supportingCharacters: [
          { type: 'teacher_adult_guides' },
          { type: 'sibling_perspective' },
        ],
      }),
      red,
    );
    expect(out).toContain('Tier 3');
    expect(out).toContain('Tier 4');
  });
});

describe('buildSectionCStoryWorld — character notes', () => {
  it('includes notes and structured-fields-win note when set', () => {
    const notes = 'The sidekick wears a red scarf.';
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ characterNotes: notes }),
      defaultComplexity,
    );
    expect(out).toContain(notes);
    expect(out).toContain('structured fields win');
  });

  it('omits character notes block when undefined', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).not.toContain('Character notes:');
    expect(out).not.toContain('structured fields win');
  });

  it('omits character notes block when empty string', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({ characterNotes: '   ' }),
      defaultComplexity,
    );
    expect(out).not.toContain('Character notes:');
  });
});

describe('buildSectionCStoryWorld — no undefined leaks', () => {
  it('default brief output never contains the literal undefined', () => {
    const out = buildSectionCStoryWorld(makeMinimalBrief(), defaultComplexity);
    expect(out).not.toContain('undefined');
  });

  it('brief with optional story-world fields omitted has no undefined', () => {
    const out = buildSectionCStoryWorld(
      makeMinimalBrief({
        omitOptionalStoryWorldKeys: true,
        personalization: false,
      }),
      defaultComplexity,
    );
    expect(out).not.toContain('undefined');
  });
});
