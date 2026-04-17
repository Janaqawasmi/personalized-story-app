import type { ComplexityBudgetResult } from '@/agent1/types';
import { conditionalBlock } from '@/agent1/shared/prompt-utils';

export function buildSectionD(complexityBudget: ComplexityBudgetResult): string {
  const staticTiers = `NARRATIVE OBLIGATION TIERS:
When this story's obligations exceed its word/page budget, follow
these tiers. Higher tiers are never compressed for lower tiers.

TIER 1 — Must appear as fully realized scenes (non-negotiable):

The trigger moment (from the specific trigger field)
Somatic mirroring — at least the first selected expression shown
physically
The coping tool in action
The resolution matching the chosen completeness level

TIER 2 — Must appear, can be compressed into fewer beats:

The primary therapeutic approach — defines the arc
The caregiver's presence at the specified role
Shame rules when shame dimension is central — all three rules
honored but can be served through a single scene rather than
multiple
An introduced model character if primary is modeling and none was
provided in the brief (see Section C)

TIER 3 — Should appear if space permits, can be reduced to a single beat:

The supporting approach — can become tonal quality rather than
a distinct scene
Supporting characters — can appear in a single interaction
The first supporting character's functional role
The second somatic expression (first is Tier 1, second is Tier 3)
The "One true thing" detail

TIER 4 — Enrichment, omit if space is tight:

The creative vision as a distinct set piece — can be reduced to a
visual detail or atmospheric element
Character notes details
The second supporting character's functional role (if two were
selected)`;

  const complexityBlock = conditionalBlock(
    complexityBudget.state !== 'green' &&
      complexityBudget.complexityStatusText !== undefined,
    `COMPLEXITY STATUS:
${complexityBudget.complexityStatusText ?? ''}

Plan your blueprint with these compression needs in mind from the
start. Do not design a full-scale blueprint that must be cut later.
Design a blueprint that serves the available space while honoring
the tier priorities.`,
  );

  const parts = [staticTiers, complexityBlock].filter((p) => p.length > 0);
  const combined = parts.join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
