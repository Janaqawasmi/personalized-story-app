import { conditionalBlock } from '@/agent1/shared/prompt-utils';
import type { ComplexityBudgetResult } from '@/agent1/types';
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
  SUPPORTING_CHARACTER_LABELS,
  type StoryBrief,
} from '@/models/storyBrief.model';

/**
 * Heuristic keyword check for whether the clinical trigger plausibly
 * involves separation or relational loss. Not a clinical classifier —
 * matches v3.2 intent for configuration-risk surfacing.
 */
function isSeparationTrigger(trigger: string): boolean {
  const lower = trigger.toLowerCase();
  return (
    lower.includes('separation') ||
    lower.includes('apart from') ||
    lower.includes('leaving') ||
    lower.includes('left behind') ||
    lower.includes('going away') ||
    lower.includes('loss of') ||
    (lower.includes('without') &&
      (lower.includes('parent') ||
        lower.includes('mother') ||
        lower.includes('father') ||
        lower.includes('caregiver') ||
        lower.includes('mom') ||
        lower.includes('dad')))
  );
}

function resolutionSignatureText(
  token: StoryBrief['therapeuticArchitecture']['resolutionCompleteness'],
): string {
  if (token === 'full') {
    return 'relief, accomplishment, safety restored. Ends on a high.';
  }
  if (token === 'partial') {
    return 'cautious hope — tool helped but feeling lingers gently. Ends warm but honest.';
  }
  return 'protagonist has something new — a tool, a friend, a new understanding — but journey unfinished. Ends looking forward.';
}

function buildPersonalizationBlock(brief: StoryBrief): string {
  const onOff = brief.storyWorld.personalization ? 'on' : 'off';
  const header = `Personalization: ${onOff}`;

  if (brief.storyWorld.personalization) {
    return `${header}

Protagonist is [CHILD_NAME], pronouns are [HE/SHE/THEY].
Protagonist type is locked to "child".`;
  }

  const typeLine = `Protagonist type: ${PROTAGONIST_TYPE_LABELS[brief.storyWorld.protagonistType]}`;

  let genderBlock = '';
  let ageBlock = '';
  const gender = brief.storyWorld.protagonistGender;
  if (gender !== undefined) {
    genderBlock = `Protagonist gender: ${PROTAGONIST_GENDER_LABELS[gender]}`;
    if (gender === 'kept_open') {
      genderBlock += `

Use a neutral name. No they/them pronouns when age range is
"3-5" or "5-7" (linguistically complex for the target audience).`;
    }
  }

  const age = brief.storyWorld.protagonistAge;
  if (age !== undefined) {
    ageBlock = `Protagonist age relation: ${PROTAGONIST_AGE_LABELS[age]}`;
    if (age === 'slightly_older') {
      ageBlock += `

Protagonist is 1–2 years older than the target age, showing a
near-future version of themselves navigating the difficulty.
Relatable but slightly more capable.`;
    }
  }

  const tail = [typeLine, genderBlock, ageBlock].filter((s) => s.length > 0);
  return [header, ...tail].join('\n\n');
}

function buildSeparationAnxietyBlock(brief: StoryBrief): string {
  const acknowledgedWarnings = brief.acknowledgedWarnings ?? [];
  const hasSeparationAcknowledged = acknowledgedWarnings.includes(
    'separation_anxiety_no_caregiver',
  );

  if (hasSeparationAcknowledged) {
    return `Treat the absent caregiver as intentional. The psychologist acknowledged this combination at submission.`;
  }
  if (
    isSeparationTrigger(brief.clinicalFoundation.trigger) &&
    brief.storyWorld.caregiverPresence === 'not_present'
  ) {
    return `Treat as configuration risk. Construct a relational anchor from whatever is available (supporting characters, the trigger context). Flag in compression metadata as 'Story configuration risk — separation trigger without relational anchor.'`;
  }
  return '';
}

function buildSeparationRelationalBlock(brief: StoryBrief): string {
  if (!isSeparationTrigger(brief.clinicalFoundation.trigger)) {
    return '';
  }
  return `The safe beginning (Phase 1, Point 1) must establish the specific relationship that will be tested — not just the protagonist's world, but who they feel safe with and how that safety feels.`;
}

function buildNarrativeDistanceConditionals(brief: StoryBrief): string {
  const nd = brief.storyWorld.narrativeDistance;
  if (nd === 'direct') {
    return '';
  }
  if (nd === 'parallel') {
    const trimmed = brief.storyWorld.parallelChallenge?.trim();
    if (trimmed !== undefined && trimmed.length > 0) {
      return `Equivalent challenge: "${trimmed}"
Use this as the emotional and situational mapping. Preserve emotional core, social dynamics, and practical stakes. Change surface setting.`;
    }
    return `Construct the parallel by preserving: (1) emotional core,
(2) social dynamics, (3) practical stakes. Change surface setting
and details.`;
  }
  // metaphorical
  return `Translate somatic expressions into the metaphorical world.
Preserve the quality of the sensation even if the body is
different.`;
}

function buildSupportingCharactersBlock(
  brief: StoryBrief,
  complexityBudget: ComplexityBudgetResult,
): string {
  const chars = brief.storyWorld.supportingCharacters;
  if (chars === undefined || chars.length === 0) {
    return '';
  }

  const lines: string[] = ['Supporting characters:'];
  for (const character of chars) {
    const label = SUPPORTING_CHARACTER_LABELS[character.type];
    const roleTrimmed = character.functionalRole?.trim();
    const functionalRoleLine =
      roleTrimmed !== undefined && roleTrimmed.length > 0
        ? `: functional role at key moment: "${roleTrimmed}"`
        : '';
    lines.push(`${label}${functionalRoleLine}`);
  }

  if (
    chars.length >= 2 &&
    complexityBudget.state !== 'green'
  ) {
    lines.push(`First character's functional role is Tier 3 — keep if space permits. Second character's functional role is Tier 4 — omit first under compression.`);
  }

  return lines.join('\n');
}

function buildCharacterNotesBlock(brief: StoryBrief): string {
  const trimmed = brief.storyWorld.characterNotes?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return '';
  }
  return `Character notes: ${trimmed}
NOTE: Character notes add texture within the architecture. If they
contradict structured fields, structured fields win.`;
}

export function buildSectionCStoryWorld(
  brief: StoryBrief,
  complexityBudget: ComplexityBudgetResult,
): string {
  const { ageAndScope, therapeuticArchitecture, clinicalFoundation, storyWorld } =
    brief;

  const ageRangeDisplay = AGE_RANGE_LABELS[ageAndScope.ageRange];
  const intensityDisplay = PEAK_INTENSITY_LABELS[ageAndScope.peakIntensity];
  const lengthDisplay = STORY_LENGTH_LABELS[ageAndScope.storyLength];
  const resolutionDisplay =
    RESOLUTION_LABELS[therapeuticArchitecture.resolutionCompleteness];
  const resolutionSig = resolutionSignatureText(
    therapeuticArchitecture.resolutionCompleteness,
  );

  const block1 = `EMOTIONAL WORLD:

What this population feels: ${clinicalFoundation.population}
The specific trigger: ${clinicalFoundation.trigger}`;

  const block2 = `STORY WORLD:

Age range: ${ageRangeDisplay}    (token: ${ageAndScope.ageRange})
Peak emotional intensity: ${intensityDisplay}
Story length: ${lengthDisplay}
Resolution completeness: ${resolutionDisplay}
(token: ${therapeuticArchitecture.resolutionCompleteness})
${resolutionSig}`;

  const block3 = buildPersonalizationBlock(brief);

  const separationAnxiety = buildSeparationAnxietyBlock(brief);
  const separationRelational = buildSeparationRelationalBlock(brief);

  const block4 = `Caregiver presence: ${CAREGIVER_PRESENCE_LABELS[storyWorld.caregiverPresence]}
(token: ${storyWorld.caregiverPresence})
Caregiver-specific narrative guidance is the Author's job (Step 2).
Step 1 only needs to know whether the caregiver participates in
the arc and at which phase. Plan blueprint accordingly.${conditionalBlock(
    separationAnxiety.length > 0,
    `

${separationAnxiety}`,
  )}${conditionalBlock(
    separationRelational.length > 0,
    `

${separationRelational}`,
  )}`;

  const narrativeConditionals = buildNarrativeDistanceConditionals(brief);
  const block5 = `Narrative distance: ${NARRATIVE_DISTANCE_LABELS[storyWorld.narrativeDistance]}
(token: ${storyWorld.narrativeDistance})
${narrativeConditionals}`.trimEnd();

  const block6 = buildSupportingCharactersBlock(brief, complexityBudget);
  const block7 = buildCharacterNotesBlock(brief);

  const parts = [block1, block2, block3, block4, block5, block6, block7].filter(
    (p) => p.length > 0,
  );
  const combined = parts.join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
