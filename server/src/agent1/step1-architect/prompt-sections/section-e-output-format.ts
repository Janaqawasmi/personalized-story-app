import {
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  type StoryBrief,
} from '@/models/storyBrief.model';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';
import type { VagueIntentionResult } from '@/agent1/types';

export function buildSectionE(
  brief: StoryBrief,
  vagueIntention: VagueIntentionResult,
  hasComplexityStatus: boolean,
  hasSupportingCharacterRoles: boolean,
): string {
  const copingToolDisplay =
    FEAR_ANXIETY_COPING_TOOL_LABELS[brief.therapeuticArchitecture.copingTool];

  // ── Output 1: EMOTIONAL TRUTH ──────────────────────────────────────────
  const output1 = `EMOTIONAL TRUTH (one paragraph, 60–120 words)
Write what this child is living through in plain human language.
No clinical terms. No field names. No therapeutic jargon.
This paragraph must convey:

What the child feels in their body and mind
What they are afraid of (the real fear beneath the situation)
The shame dimension, if present, woven into the description
Must end with: "By the end, this child needs to feel ___."`; // token-ignore

  // ── Output 2: NARRATIVE BLUEPRINT ─────────────────────────────────────
  const supportingCharacterRolesNote = conditionalBlock(
    hasSupportingCharacterRoles,
    `Supporting characters and their roles must be reflected in the blueprint.`,
  );

  const blueprintParts = [
    `NARRATIVE BLUEPRINT (6 points — mapped to 7-phase arc, see Section A)
Who the protagonist is and what we sense about them immediately
What the world of the story is — time, place, sensory context
What happens in the opening that pulls the child reader in
The emotional peak — the moment the child reader will feel most.
This must include how the protagonist's body experiences the fear —
not as a label, but as a moment the reader can feel physically.
How the protagonist finds their way through
(the coping tool in action — name it explicitly)
The final image the child holds after the story ends
(compresses Phases 6+7: the shift AND the landing)

Each point: 1–3 sentences. Concrete and specific, not abstract.
Use narrative language, not clinical language.
Write each point with density proportional to its narrative
importance. The relative density tells the author where the story's
center of gravity belongs.`,
    supportingCharacterRolesNote,
  ]
    .filter((p) => p.length > 0)
    .join('\n');

  // ── Output 3: COPING TOOL PLACEMENT NOTE ──────────────────────────────
  const output3 = `COPING TOOL PLACEMENT NOTE (1–2 sentences)
"The coping tool [${copingToolDisplay}] appears at blueprint
point [N]: [one-sentence description of how it manifests]."`;

  // ── Output 4: APPROACH INSTRUCTION ────────────────────────────────────
  const supportingApproachNote = conditionalBlock(
    brief.therapeuticArchitecture.supportingApproach !== undefined,
    `Then describe how the supporting approach flavors the story.`,
  );

  const approachParts = [
    `APPROACH INSTRUCTION (2–4 sentences, plain language)
Describe how the primary approach manifests as narrative action in
this specific story.`,
    supportingApproachNote,
    `No clinical terminology.`,
  ]
    .filter((p) => p.length > 0)
    .join('\n');

  // ── Output 5: INFERRED INTENTION FLAG (conditional) ───────────────────
  const inferredIntentionBlock = conditionalBlock(
    vagueIntention.isVague,
    `INFERRED INTENTION FLAG
The brief's therapeutic intention may be too general. Based on the
trigger, approach, and coping tool, a more specific intention could
be: "they should feel ___ because ___." The specialist should review.`,
  );

  // ── Output 6: COMPRESSION METADATA (conditional) ──────────────────────
  const compressionMetadataBlock = conditionalBlock(
    hasComplexityStatus,
    `COMPRESSION METADATA
List: what was fully included, what was compressed (and how), and
what was omitted (and why). This is shown to the specialist during
review so they can adjust and regenerate if needed.`,
  );

  // ── BEFORE FINALIZING ─────────────────────────────────────────────────
  const normalizationOpenCheck = conditionalBlock(
    brief.therapeuticArchitecture.primaryApproach === 'normalization' &&
      brief.therapeuticArchitecture.resolutionCompleteness === 'open',
    `The protagonist has discovered they are not alone, but the fear is
unresolved. Company changes the experience, not the problem.`,
  );

  const beforeFinalizingParts = [
    `BEFORE FINALIZING — checks:
Structural safety: Review each blueprint point against the must-never
list. If any point would require violating a constraint, redesign it.
Anti-generic check: Could this blueprint describe a story that
already exists in every children's anxiety book? The blueprint must
contain at least one structural choice a generic story would not
make.`,
    normalizationOpenCheck,
  ]
    .filter((p) => p.length > 0)
    .join('\n');

  // ── Final assembly ─────────────────────────────────────────────────────
  const allParts = [
    output1,
    blueprintParts,
    output3,
    approachParts,
    inferredIntentionBlock,
    compressionMetadataBlock,
    beforeFinalizingParts,
  ].filter((p) => p.length > 0);

  const combined = allParts.join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
