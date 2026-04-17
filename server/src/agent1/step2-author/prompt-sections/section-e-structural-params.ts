import {
  AGE_RANGE_LABELS,
  CAREGIVER_PRESENCE_LABELS,
  NARRATIVE_DISTANCE_LABELS,
  PEAK_INTENSITY_LABELS,
  PROTAGONIST_AGE_LABELS,
  PROTAGONIST_GENDER_LABELS,
  PROTAGONIST_TYPE_LABELS,
  RESOLUTION_LABELS,
  STORY_LENGTH_LABELS,
  STRUCTURAL_PARAMS,
  SUPPORTING_CHARACTER_LABELS,
  type StoryBrief,
} from '@/models/storyBrief.model';
import { getAgeRangeRules } from '@/agent1/shared/age-range-rules';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

function intensityDescription(
  token: StoryBrief['ageAndScope']['peakIntensity'],
): string {
  if (token === 'very_gentle') {
    return 'Protagonist feels uneasy; discomfort is brief.';
  }
  if (token === 'moderate') {
    return 'Real distress within a contained arc.';
  }
  return 'Genuinely overwhelmed before resolution.';
}

function resolutionDescription(
  token: StoryBrief['therapeuticArchitecture']['resolutionCompleteness'],
): string {
  if (token === 'full') {
    return 'Relief, accomplishment, safety restored. Ends on a high.';
  }
  if (token === 'partial') {
    return 'Cautious hope — tool helped but feeling lingers gently. Ends warm but honest.';
  }
  return 'Something new — tool, friend, understanding — but journey unfinished. Courage without certainty. Ends looking forward.';
}

function caregiverDescription(
  token: StoryBrief['storyWorld']['caregiverPresence'],
): string {
  if (token === 'present_and_comforting') {
    return 'In the story, actively warm.';
  }
  if (token === 'guides_from_the_side') {
    return 'Helps, but protagonist does the hard part.';
  }
  if (token === 'leaves_and_returns') {
    return 'The caregiver departs and comes back. Show both the goodbye and the reunion. The leaving is part of the story.';
  }
  if (token === 'waiting_at_the_end') {
    return 'Exists in the world but not the immediate scene. Protagonist knows they are there.';
  }
  return 'No caregiver. Protagonist navigates alone.';
}

function narrativeDistanceDescription(brief: StoryBrief): string {
  const nd = brief.storyWorld.narrativeDistance;
  if (nd === 'direct') {
    return 'Same setting, same challenge, recognizable world.';
  }
  if (nd === 'parallel') {
    const base = 'Different setting, same emotional core.';
    const trimmed = brief.storyWorld.parallelChallenge?.trim();
    if (trimmed !== undefined && trimmed.length > 0) {
      return `${base}\nEquivalent challenge: "${trimmed}"`;
    }
    return base;
  }
  return 'Symbolic. Challenge never named directly.';
}

function buildPersonalizationBlock(brief: StoryBrief): string {
  const onOff = brief.storyWorld.personalization ? 'on' : 'off';
  const header = `PERSONALIZATION: ${onOff}`;

  if (brief.storyWorld.personalization) {
    return `${header}
[CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders.
Gender-neutral narrative.`;
  }

  const typeLine = `Protagonist type: ${PROTAGONIST_TYPE_LABELS[brief.storyWorld.protagonistType]}`;

  let genderLine = '';
  const gender = brief.storyWorld.protagonistGender;
  if (gender !== undefined) {
    genderLine = `Protagonist gender: ${PROTAGONIST_GENDER_LABELS[gender]}`;
    if (gender === 'kept_open') {
      genderLine += `\nUse character's name, avoid pronouns. No they/them when age range is "3-5" or "5-7" (linguistically complex for the target audience).`;
    }
  }

  let ageLine = '';
  const age = brief.storyWorld.protagonistAge;
  if (age !== undefined) {
    ageLine = `Protagonist age relation: ${PROTAGONIST_AGE_LABELS[age]}`;
    if (age === 'slightly_older') {
      ageLine += `\n1–2 years older than target age. Relatable but slightly more capable.`;
    }
  }

  const parts = [header, typeLine, genderLine, ageLine].filter(
    (s) => s.length > 0,
  );
  return parts.join('\n');
}

function buildSupportingCharactersBlock(brief: StoryBrief): string {
  const chars = brief.storyWorld.supportingCharacters;
  if (chars === undefined || chars.length === 0) {
    return '';
  }

  const characterBlocks = chars.map((character) => {
    const label = SUPPORTING_CHARACTER_LABELS[character.type];
    const roleTrimmed = character.functionalRole?.trim();
    if (roleTrimmed !== undefined && roleTrimmed.length > 0) {
      return `${label}\nAt the key moment: "${roleTrimmed}"`;
    }
    return label;
  });

  return `SUPPORTING CHARACTERS:\n${characterBlocks.join('\n\n')}`;
}

function buildCharacterNotesBlock(brief: StoryBrief): string {
  const trimmed = brief.storyWorld.characterNotes?.trim();
  return conditionalBlock(
    trimmed !== undefined && trimmed.length > 0,
    `CHARACTER NOTES: ${trimmed}`,
  );
}

export function buildStep2SectionE(brief: StoryBrief): string {
  const { ageAndScope, therapeuticArchitecture, storyWorld } = brief;

  const params = STRUCTURAL_PARAMS[ageAndScope.ageRange][ageAndScope.storyLength];
  const totalWordsLow = params.totalWords[0]!;
  const totalWordsHigh = params.totalWords[1]!;
  const pagesLow = params.pages[0]!;
  const pagesHigh = params.pages[1]!;

  const block1 = `AGE RANGE: ${AGE_RANGE_LABELS[ageAndScope.ageRange]}
STORY LENGTH: ${STORY_LENGTH_LABELS[ageAndScope.storyLength]}
Target word count: ${totalWordsLow}–${totalWordsHigh} words
Target page count: ${pagesLow}–${pagesHigh} pages
Write to the word range. A shorter story that works is better than a longer story that drifts.`;

  const block2 = `VOCABULARY AND COMPLEXITY:
${getAgeRangeRules(ageAndScope.ageRange)}`;

  const block3 = `PEAK EMOTIONAL INTENSITY: ${PEAK_INTENSITY_LABELS[ageAndScope.peakIntensity]}
${intensityDescription(ageAndScope.peakIntensity)}`;

  const block4 = `RESOLUTION: ${RESOLUTION_LABELS[therapeuticArchitecture.resolutionCompleteness]}
${resolutionDescription(therapeuticArchitecture.resolutionCompleteness)}`;

  const block5 = `CAREGIVER: ${CAREGIVER_PRESENCE_LABELS[storyWorld.caregiverPresence]}
${caregiverDescription(storyWorld.caregiverPresence)}`;

  const block6 = `NARRATIVE DISTANCE: ${NARRATIVE_DISTANCE_LABELS[storyWorld.narrativeDistance]}
${narrativeDistanceDescription(brief)}`;

  const block7 = buildPersonalizationBlock(brief);
  const block8 = buildSupportingCharactersBlock(brief);
  const block9 = buildCharacterNotesBlock(brief);

  const parts = [
    block1,
    block2,
    block3,
    block4,
    block5,
    block6,
    block7,
    block8,
    block9,
  ].filter((p) => p.length > 0);

  const combined = parts.join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
