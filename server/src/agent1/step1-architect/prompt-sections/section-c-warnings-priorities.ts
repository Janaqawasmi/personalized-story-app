import {
  CROSS_FIELD_VALIDATIONS,
  type StoryBrief,
} from '@/models/storyBrief.model';

export function buildSectionCWarningsPriorities(brief: StoryBrief): string {
  // ──────────────────────────────────────────────────────────────
  // Block 1 — ACKNOWLEDGED WARNINGS (conditional on non-empty)
  // ──────────────────────────────────────────────────────────────
  const warnings = brief.acknowledgedWarnings ?? [];

  let block1 = '';
  if (warnings.length > 0) {
    const bulletLines = warnings.map((id) => {
      const validation = CROSS_FIELD_VALIDATIONS.find((v) => v.id === id);
      const description =
        validation?.description ?? `(unknown validation: ${id})`;
      return `- ${description}`;
    });

    block1 = `ACKNOWLEDGED RISK COMBINATIONS — the psychologist confirmed these
are intentional. Treat them as design choices, not errors.

${bulletLines.join('\n')}

The post-validation alignment note may comment on how the story
navigates these trade-offs.`;
  }

  // ──────────────────────────────────────────────────────────────
  // Block 2 — PRIORITY RULES (static, always present)
  // ──────────────────────────────────────────────────────────────
  const block2 = `PRIORITY RULES (when fields conflict — from brief Section 14):

Cross-field validations — passed combinations are intentional
Therapeutic mechanism — defines the arc, overrides creative vision
Therapeutic intention — defines the destination
Coping tool — defines therapeutic delivery
Structured field selections — define architecture
Clinical creative vision — enriches, does not override
Free text fields — add texture within the architecture`;

  const parts = [block1, block2].filter((p) => p.length > 0);
  const combined = parts.join('\n\n');
  return combined.replace(/\n{3,}/g, '\n\n');
}
