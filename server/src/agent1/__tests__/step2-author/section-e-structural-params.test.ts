import { Timestamp } from 'firebase-admin/firestore';

import { buildStep2SectionE } from '@/agent1/step2-author/prompt-sections/section-e-structural-params';
import {
  AGE_RANGE_LABELS,
  FEAR_ANXIETY_APPROACHES,
  PROTAGONIST_AGE_LABELS,
  PROTAGONIST_GENDER_LABELS,
  PROTAGONIST_TYPE_LABELS,
  STORY_LENGTH_LABELS,
  STRUCTURAL_PARAMS,
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

type BriefOverrides = {
  ageRange?: AgeRange;
  storyLength?: StoryLength;
  peakIntensity?: PeakIntensity;
  resolutionCompleteness?: ResolutionCompleteness;
  caregiverPresence?: CaregiverPresence;
  narrativeDistance?: NarrativeDistance;
  parallelChallenge?: string;
  personalization?: boolean;
  protagonistType?: ProtagonistType;
  protagonistGender?: ProtagonistGender;
  protagonistAge?: ProtagonistAge;
  supportingCharacters?: SupportingCharacterSelection[];
  characterNotes?: string;
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
      storyWorld.protagonistGender = overrides.protagonistGender ?? 'girl';
      storyWorld.protagonistAge = overrides.protagonistAge ?? 'same_age';
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

  return {
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
      resolutionCompleteness: overrides.resolutionCompleteness ?? 'full',
      mustNeverList: [],
    },
    storyWorld,
    personalizationConfig: {},
  };
}

describe('buildStep2SectionE — age range and targets', () => {
  it('contains the age range display label', () => {
    const out = buildStep2SectionE(makeMinimalBrief({ ageRange: '7-9' }));
    expect(out).toContain(AGE_RANGE_LABELS['7-9']);
  });

  it('contains the story length display label', () => {
    const out = buildStep2SectionE(makeMinimalBrief({ storyLength: 'extended' }));
    expect(out).toContain(STORY_LENGTH_LABELS.extended);
  });

  it('contains Target word count: with numbers from STRUCTURAL_PARAMS', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ ageRange: '5-7', storyLength: 'standard' }),
    );
    const params = STRUCTURAL_PARAMS['5-7'].standard;
    expect(out).toContain(
      `Target word count: ${params.totalWords[0]}–${params.totalWords[1]} words`,
    );
  });

  it('contains Target page count: with numbers from STRUCTURAL_PARAMS', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ ageRange: '5-7', storyLength: 'standard' }),
    );
    const params = STRUCTURAL_PARAMS['5-7'].standard;
    expect(out).toContain(
      `Target page count: ${params.pages[0]}–${params.pages[1]} pages`,
    );
  });

  it('contains the "Write to the word range." guidance', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    expect(out).toContain('Write to the word range.');
  });
});

describe('buildStep2SectionE — vocabulary and complexity', () => {
  it('contains the VOCABULARY AND COMPLEXITY header', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    expect(out).toContain('VOCABULARY AND COMPLEXITY:');
  });

  it('contains a distinctive phrase from getAgeRangeRules("5-7")', () => {
    const out = buildStep2SectionE(makeMinimalBrief({ ageRange: '5-7' }));
    expect(out).toContain('"Worried" is acceptable');
  });
});

describe('buildStep2SectionE — peak intensity branches', () => {
  it('very_gentle → Protagonist feels uneasy', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ peakIntensity: 'very_gentle' }),
    );
    expect(out).toContain('Protagonist feels uneasy');
  });

  it('moderate → Real distress within a contained arc', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ peakIntensity: 'moderate' }),
    );
    expect(out).toContain('Real distress within a contained arc');
  });

  it('significant → Genuinely overwhelmed', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ peakIntensity: 'significant' }),
    );
    expect(out).toContain('Genuinely overwhelmed');
  });
});

describe('buildStep2SectionE — resolution branches', () => {
  it('full → Relief, accomplishment, safety restored', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ resolutionCompleteness: 'full' }),
    );
    expect(out).toContain('Relief, accomplishment, safety restored');
  });

  it('partial → Cautious hope', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ resolutionCompleteness: 'partial' }),
    );
    expect(out).toContain('Cautious hope');
  });

  it('open → Courage without certainty', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ resolutionCompleteness: 'open' }),
    );
    expect(out).toContain('Courage without certainty');
  });
});

describe('buildStep2SectionE — caregiver branches', () => {
  it('present_and_comforting → actively warm', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ caregiverPresence: 'present_and_comforting' }),
    );
    expect(out).toContain('actively warm');
  });

  it('guides_from_the_side → protagonist does the hard part', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ caregiverPresence: 'guides_from_the_side' }),
    );
    expect(out).toContain('protagonist does the hard part');
  });

  it('leaves_and_returns → Show both the goodbye and the reunion', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ caregiverPresence: 'leaves_and_returns' }),
    );
    expect(out).toContain('Show both the goodbye and the reunion');
  });

  it('waiting_at_the_end → not the immediate scene', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ caregiverPresence: 'waiting_at_the_end' }),
    );
    expect(out).toContain('not the immediate scene');
  });

  it('not_present → Protagonist navigates alone', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ caregiverPresence: 'not_present' }),
    );
    expect(out).toContain('Protagonist navigates alone');
  });
});

describe('buildStep2SectionE — narrative distance branches', () => {
  it('direct → Same setting, same challenge', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ narrativeDistance: 'direct' }),
    );
    expect(out).toContain('Same setting, same challenge');
  });

  it('parallel + parallelChallenge set → Equivalent challenge and text', () => {
    const challenge = 'first day at a new hive as a worker bee';
    const out = buildStep2SectionE(
      makeMinimalBrief({
        narrativeDistance: 'parallel',
        parallelChallenge: challenge,
      }),
    );
    expect(out).toContain('Equivalent challenge:');
    expect(out).toContain(challenge);
  });

  it('parallel without parallelChallenge → Different setting but no Equivalent challenge:', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ narrativeDistance: 'parallel' }),
    );
    expect(out).toContain('Different setting');
    expect(out).not.toContain('Equivalent challenge:');
  });

  it('metaphorical → Symbolic. Challenge never named directly.', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ narrativeDistance: 'metaphorical' }),
    );
    expect(out).toContain('Symbolic. Challenge never named directly.');
  });
});

describe('buildStep2SectionE — personalization', () => {
  it('personalization true → placeholders + gender-neutral, no type/gender/age labels', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({ personalization: true }),
    );
    expect(out).toContain('[CHILD_NAME]');
    expect(out).toContain('Gender-neutral narrative');
    expect(out).not.toContain(PROTAGONIST_TYPE_LABELS.child);
    expect(out).not.toContain(PROTAGONIST_GENDER_LABELS.girl);
    expect(out).not.toContain(PROTAGONIST_AGE_LABELS.same_age);
  });

  it('personalization false → protagonist type label shown', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        personalization: false,
        protagonistType: 'animal',
      }),
    );
    expect(out).toContain(PROTAGONIST_TYPE_LABELS.animal);
  });

  it('personalization false + kept_open → avoid pronouns note', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        personalization: false,
        protagonistGender: 'kept_open',
      }),
    );
    expect(out).toContain('avoid pronouns');
  });

  it('personalization false + girl → no avoid pronouns note', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        personalization: false,
        protagonistGender: 'girl',
      }),
    );
    expect(out).not.toContain('avoid pronouns');
  });

  it('personalization false + slightly_older → 1–2 years older note', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        personalization: false,
        protagonistAge: 'slightly_older',
      }),
    );
    expect(out).toContain('1–2 years older');
  });

  it('personalization false + same_age → no 1–2 years older note', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        personalization: false,
        protagonistAge: 'same_age',
      }),
    );
    expect(out).not.toContain('1–2 years older');
  });
});

describe('buildStep2SectionE — supporting characters', () => {
  it('no supporting characters → no SUPPORTING CHARACTERS: header', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    expect(out).not.toContain('SUPPORTING CHARACTERS:');
  });

  it('one character with functional role → label + At the key moment: + role', () => {
    const role = 'offers a steadying hand on the bridge';
    const out = buildStep2SectionE(
      makeMinimalBrief({
        supportingCharacters: [
          { type: 'peer_alongside', functionalRole: role },
        ],
      }),
    );
    expect(out).toContain('SUPPORTING CHARACTERS:');
    expect(out).toContain(SUPPORTING_CHARACTER_LABELS.peer_alongside);
    expect(out).toContain('At the key moment:');
    expect(out).toContain(role);
  });

  it('one character without functional role → label only, no At the key moment:', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        supportingCharacters: [{ type: 'animal_friend' }],
      }),
    );
    expect(out).toContain(SUPPORTING_CHARACTER_LABELS.animal_friend);
    expect(out).not.toContain('At the key moment:');
  });
});

describe('buildStep2SectionE — character notes', () => {
  it('character notes set → CHARACTER NOTES: header and text', () => {
    const notes = 'The sidekick wears a red scarf.';
    const out = buildStep2SectionE(makeMinimalBrief({ characterNotes: notes }));
    expect(out).toContain('CHARACTER NOTES:');
    expect(out).toContain(notes);
  });

  it('character notes undefined → no CHARACTER NOTES: header', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    expect(out).not.toContain('CHARACTER NOTES:');
  });
});

describe('buildStep2SectionE — Decision D4 + no undefined leaks', () => {
  it('does not contain any FEAR_ANXIETY_APPROACHES token', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    for (const approach of FEAR_ANXIETY_APPROACHES) {
      expect(out).not.toContain(approach);
    }
  });

  it('default brief output never contains the literal undefined', () => {
    const out = buildStep2SectionE(makeMinimalBrief());
    expect(out).not.toContain('undefined');
  });

  it('brief with optional story-world fields absent → no undefined', () => {
    const out = buildStep2SectionE(
      makeMinimalBrief({
        omitOptionalStoryWorldKeys: true,
        personalization: false,
      }),
    );
    expect(out).not.toContain('undefined');
  });
});
