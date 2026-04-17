import {
  FEAR_ANXIETY_APPROACH_LABELS,
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  SHAME_DIMENSION_LABELS,
  SOMATIC_EXPRESSION_LABELS,
  type StoryBrief,
} from '@/models/storyBrief.model';
import { getApproachInstruction } from '@/agent1/shared/approach-instructions';
import { conditionalBlock, joinList } from '@/agent1/shared/prompt-utils';
import {
  assertSomaticField,
  isAbstractCopingTool,
} from '@/agent1/shared/token-helpers';
import type { VagueIntentionResult } from '@/agent1/types';

// joinList is imported per the Section C spec contract but is not
// currently used by this half of Section C (the story-world half in
// prompt 3b-2 consumes it). Keep the import so future edits have it
// at hand without changing the import surface.
void joinList;

export function buildSectionCClinical(
  brief: StoryBrief,
  vagueIntention: VagueIntentionResult,
): string {
  const {
    mustNeverList,
    shameDimension,
    primaryApproach,
    supportingApproach,
    copingTool,
  } = brief.therapeuticArchitecture;

  // ──────────────────────────────────────────────────────────────
  // Block 1 — HARD CONSTRAINTS
  // Must-never list comes from the brief (never from
  // STORY_TYPE_ROUTING.mustNeverDefaults — per v3.2 §6.2 Section H,
  // reading the defaults reverses clinical judgment).
  // ──────────────────────────────────────────────────────────────
  const mustNeverListFormatted =
    mustNeverList.length === 0 ? '(none)' : mustNeverList.join('; ');

  const shameDimensionDisplay = SHAME_DIMENSION_LABELS[shameDimension];

  let shameConditional = '';
  if (shameDimension === 'present') {
    shameConditional = `The story must never put the protagonist in a position of being
observed in their shame by others. Shame is internal. It is not performed.`;
  } else if (shameDimension === 'central') {
    shameConditional = `Shame is the deepest layer. The agent prioritizes normalization
(even if not the primary mechanism) and follows three hard rules:
(1) the story must demonstrate the child is not alone in this
feeling, (2) the story must never imply the child should have
known better, done better, or felt differently, (3) at least one
character must witness the protagonist's difficulty and respond
with acceptance, not correction.`;
  }

  const block1 = `HARD CONSTRAINTS — absolute, never violated:

Must-never list: ${mustNeverListFormatted}
Shame dimension: ${shameDimensionDisplay}
${shameConditional}`;

  // ──────────────────────────────────────────────────────────────
  // Block 2 — CLINICAL CORE
  // ──────────────────────────────────────────────────────────────
  const vagueNote = conditionalBlock(
    vagueIntention.isVague,
    `Note: This intention appears vague. See the intention inference
instruction in the output section below.`,
  );

  const primaryApproachDisplay = FEAR_ANXIETY_APPROACH_LABELS[primaryApproach];

  const supportingApproachLine =
    supportingApproach !== undefined
      ? `Supporting approach: ${FEAR_ANXIETY_APPROACH_LABELS[supportingApproach]}
(token: ${supportingApproach})`
      : '';

  const copingToolDisplay = FEAR_ANXIETY_COPING_TOOL_LABELS[copingTool];

  const copingConditionals: string[] = [];
  if (copingTool === 'comfort_object_or_memory') {
    copingConditionals.push(
      `This is clinically distinct from positive self-talk. It represents
the absent caregiver or a safe relationship — a physical object
for younger children (a scarf, a stone, a drawing), a memory or
internalized voice for older children. It recalls another person's
presence, not self-generated encouragement.`,
    );
  }
  if (
    brief.ageAndScope.ageRange === '3-5' &&
    isAbstractCopingTool(copingTool)
  ) {
    copingConditionals.push(
      `For this age range, show this tool as a
simple physical action or repeated sensory pattern — not verbal
self-talk or abstract internal process.`,
    );
  }
  const copingConditionalsText =
    copingConditionals.length > 0
      ? `\n\n${copingConditionals.join('\n\n')}`
      : '';

  const { feel, because } = brief.clinicalFoundation.therapeuticIntention;

  const block2 = `CLINICAL CORE — the story's reason for existing:

Therapeutic intention: When a child closes this book, they should
feel ${feel} because ${because}
${vagueNote}
Primary therapeutic approach: ${primaryApproachDisplay}
(token: ${primaryApproach})
${supportingApproachLine}
Coping tool: ${copingToolDisplay}
(token: ${copingTool})
This tool must be shown in action at the story's most difficult
moment. Not explained. Not suggested by a character. Demonstrated
by the protagonist or discovered through experience.${copingConditionalsText}`;

  // ──────────────────────────────────────────────────────────────
  // Block 3 — SOMATIC EXPRESSIONS
  // Narrow the TypeSpecificClinicalField discriminated union to the
  // Fear & Anxiety shape before reading selections / freeText.
  // ──────────────────────────────────────────────────────────────
  const somatic = assertSomaticField(
    brief.therapeuticArchitecture.typeSpecificField,
  );

  // selections[0] is non-null: the model-imports test guarantees
  // SomaticExpressionField always has at least one selection.
  const firstSomatic = somatic.selections[0]!;
  const somatic1Display = SOMATIC_EXPRESSION_LABELS[firstSomatic];

  const secondSomatic = somatic.selections[1];
  const somatic2Line =
    somatic.selections.length >= 2 && secondSomatic !== undefined
      ? SOMATIC_EXPRESSION_LABELS[secondSomatic]
      : '';

  const trimmedFreeText = somatic.freeText?.trim();
  const somaticFreeTextLine =
    trimmedFreeText !== undefined && trimmedFreeText.length > 0
      ? `Additional detail: ${trimmedFreeText}`
      : '';

  const block3 = [
    `Somatic expression: ${somatic1Display}`,
    somatic2Line,
    somaticFreeTextLine,
    `These are how this child's body holds the fear.`,
    `The story must show the body's experience, not just the mind's.`,
  ]
    .filter((line) => line.length > 0)
    .join('\n');

  // ──────────────────────────────────────────────────────────────
  // Block 4 — APPROACH NARRATIVE INSTRUCTIONS
  // ──────────────────────────────────────────────────────────────
  const primaryInstruction = getApproachInstruction(primaryApproach);

  const psychoNote = conditionalBlock(
    primaryApproach === 'psychoeducation',
    `Note: Psychoeducation names the feeling or body response in simple,
age-appropriate language within the story's natural flow. This is
NOT a lecture — it is a moment of recognition. The explanation must
emerge from a character's voice or the protagonist's discovery,
never from narrator exposition. For ages 3–5: concrete and physical
("your tummy does that when it's worried"). For ages 7+: can include
simple cause-and-effect ("when your brain thinks something might be
scary, it sends a signal to your body to get ready").`,
  );

  const reassuranceNote = conditionalBlock(
    primaryApproach === 'reassurance_predictability',
    `Note: The story must include at least one moment where the
protagonist notices the pattern themselves — recognizing the
predictability rather than only receiving it. This seeds internal
capacity without requiring the protagonist to self-regulate.`,
  );

  const supportingChars = brief.storyWorld.supportingCharacters;
  const hasSupportingChars =
    supportingChars !== undefined && supportingChars.length > 0;

  const modelingFallback = conditionalBlock(
    primaryApproach === 'modeling' &&
      brief.storyWorld.caregiverPresence === 'not_present' &&
      !hasSupportingChars,
    `No model character was provided. The protagonist must observe the
modeling behavior in another character that you introduce — a
passing peer, an animal, a memory of a sibling. Treat this
introduced model as Tier 2 — must appear, can be compressed.`,
  );

  const supportingApproachInstructionBlock =
    supportingApproach !== undefined
      ? `HOW THE SUPPORTING APPROACH FLAVORS THE STORY:
${getApproachInstruction(supportingApproach)}
The supporting approach does not drive the arc — the primary does.
It manifests as a quality of the story world or a secondary thread.`
      : '';

  const block4 = [
    `HOW THE PRIMARY APPROACH WORKS IN NARRATIVE:
${primaryInstruction}`,
    psychoNote,
    reassuranceNote,
    modelingFallback,
    supportingApproachInstructionBlock,
  ]
    .filter((part) => part.length > 0)
    .join('\n\n');

  // Final assembly — concatenate with blank lines and collapse any
  // accidental runs of 3+ consecutive newlines produced by empty
  // conditionals.
  const combined = [block1, block2, block3, block4].join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
