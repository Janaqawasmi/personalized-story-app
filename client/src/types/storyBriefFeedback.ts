// client/src/types/storyBriefFeedback.ts
//
// Specialist review feedback for a DAMMAH Story Brief (separate from form fields).
// Field IDs align with /docs/dammah-story-brief-spec-v1.3.md numbering.

/** Spec-aligned field targets for optional per-field feedback */
export const BRIEF_FEEDBACK_FIELD_CATALOG: ReadonlyArray<{
  id: string;
  label: string;
  section: string;
}> = [
  { id: "storyType", label: "Story type (pre-brief)", section: "Pre-brief" },
  { id: "1.1", label: "Target age range", section: "Section 1 — Age & Story Scope" },
  { id: "1.2", label: "Peak emotional intensity", section: "Section 1 — Age & Story Scope" },
  { id: "1.3", label: "Story length", section: "Section 1 — Age & Story Scope" },
  { id: "2.1", label: "Emotional world of the population", section: "Section 2 — Clinical Foundation" },
  { id: "2.2", label: "The specific trigger", section: "Section 2 — Clinical Foundation" },
  { id: "2.3", label: "Therapeutic intention", section: "Section 2 — Clinical Foundation" },
  { id: "2.4", label: "Clinical creative vision", section: "Section 2 — Clinical Foundation" },
  { id: "2.5", label: "One true thing", section: "Section 2 — Clinical Foundation" },
  { id: "3.1", label: "Primary therapeutic approach", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.2", label: "Supporting approach", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.3", label: "Shame dimension", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.4", label: "Somatic expression", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.5", label: "Coping tool", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.6", label: "Resolution completeness", section: "Section 3 — Therapeutic Architecture" },
  { id: "3.7", label: "Must-never list", section: "Section 3 — Therapeutic Architecture" },
  { id: "4.0", label: "Personalization decision", section: "Section 4 — Story World" },
  { id: "4.1", label: "Protagonist gender", section: "Section 4 — Story World" },
  { id: "4.2", label: "Protagonist type", section: "Section 4 — Story World" },
  { id: "4.3", label: "Protagonist age relative to reader", section: "Section 4 — Story World" },
  { id: "4.4", label: "Caregiver presence", section: "Section 4 — Story World" },
  { id: "4.5", label: "Narrative distance (and parallel challenge if applicable)", section: "Section 4 — Story World" },
  { id: "4.6", label: "Supporting characters", section: "Section 4 — Story World" },
  { id: "4.7", label: "Character notes", section: "Section 4 — Story World" },
  { id: "5.1", label: "Personalization constraints", section: "Section 5 — Personalization Configuration" },
  { id: "5.2", label: "Why not personalize", section: "Section 5 — Personalization Configuration" },
];

export const BRIEF_FEEDBACK_FIELD_IDS = BRIEF_FEEDBACK_FIELD_CATALOG.map((f) => f.id);

/**
 * Field IDs to show in the feedback panel for the current brief step.
 * Mirrors form visibility: Section 4 hides 4.1 / 4.3 when personalization is on; Section 5 is skipped when on (only 5.2 when personalization is off).
 *
 * @param step — `0` = pre-brief story type; `1`–`5` = sections; `null` = no section context (e.g. post-submit screen)
 */
export function getFeedbackFieldIdsForStep(
  step: number | null,
  personalization: "yes" | "no",
): string[] {
  if (step === null) return [];
  if (step === 0) return ["storyType"];
  if (step === 1) return ["1.1", "1.2", "1.3"];
  if (step === 2) return ["2.1", "2.2", "2.3", "2.4", "2.5"];
  if (step === 3) return ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"];
  if (step === 4) {
    if (personalization === "no") {
      return ["4.0", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"];
    }
    return ["4.0", "4.2", "4.4", "4.5", "4.6", "4.7"];
  }
  if (step === 5) {
    return personalization === "yes" ? [] : ["5.2"];
  }
  return [];
}

// ============================================================================
// Per-field verdict (single choice) — section-aware review UI
// ============================================================================

/**
 * Specialist assessment for one spec field. At most one verdict per field per feedback submission.
 * Stored under `fieldFeedback[fieldId].verdict`.
 */
export const BRIEF_FEEDBACK_VERDICTS = [
  {
    id: "good",
    label: "Good",
    description: "This field is clinically sound and clear for the brief.",
  },
  {
    id: "needs_modification",
    label: "Needs modification",
    description: "Something here should change before the brief is ready.",
  },
  {
    id: "unclear",
    label: "Not clear",
    description: "The intent or wording needs clarification for the author or downstream use.",
  },
  {
    id: "remove_or_rethink",
    label: "Remove or rethink",
    description: "This content or choice should not stay as written; reconsider or replace it.",
  },
  {
    id: "keep_as_is",
    label: "Keep as-is",
    description: "Explicitly leave this choice or text unchanged (no substantive edit).",
  },
] as const;

export type BriefFeedbackVerdictId = (typeof BRIEF_FEEDBACK_VERDICTS)[number]["id"];

/** Short label for chips, radio groups, and summaries */
export const BRIEF_FEEDBACK_VERDICT_LABELS: Record<BriefFeedbackVerdictId, string> =
  BRIEF_FEEDBACK_VERDICTS.reduce(
    (acc, v) => {
      acc[v.id] = v.label;
      return acc;
    },
    {} as Record<BriefFeedbackVerdictId, string>,
  );

/** Helper / tooltip / subtitle copy */
export const BRIEF_FEEDBACK_VERDICT_DESCRIPTIONS: Record<BriefFeedbackVerdictId, string> =
  BRIEF_FEEDBACK_VERDICTS.reduce(
    (acc, v) => {
      acc[v.id] = v.description;
      return acc;
    },
    {} as Record<BriefFeedbackVerdictId, string>,
  );

/** Structured tags for the brief overall (multi-select) */
export const BRIEF_FEEDBACK_OVERALL_QUICK_TAGS = [
  { id: "clarify_clinical_framing", label: "Clarify clinical framing" },
  { id: "strengthen_mechanism", label: "Strengthen therapeutic mechanism" },
  { id: "check_age_length_fit", label: "Check age / length fit" },
  { id: "alignment_sections", label: "Sections feel misaligned with each other" },
  { id: "minor_edits_only", label: "Minor edits only" },
  { id: "ready_for_next_step", label: "Ready for next step" },
] as const;

export type BriefFeedbackOverallQuickTagId = (typeof BRIEF_FEEDBACK_OVERALL_QUICK_TAGS)[number]["id"];

/** Per-field quick tags (multi-select per field) */
export const BRIEF_FEEDBACK_FIELD_QUICK_TAGS = [
  { id: "needs_more_detail", label: "Needs more detail" },
  { id: "reconsider_choice", label: "Reconsider this choice" },
  { id: "strength_here", label: "Strength here" },
  { id: "tension_with_intention", label: "Tension with stated intention" },
] as const;

export type BriefFeedbackFieldQuickTagId = (typeof BRIEF_FEEDBACK_FIELD_QUICK_TAGS)[number]["id"];

export interface BriefFieldFeedbackEntry {
  /** Preferred structured assessment for this field (single choice) */
  verdict?: BriefFeedbackVerdictId;
  /** Optional supplementary tags (e.g. legacy or extra nuance) */
  quickTags: BriefFeedbackFieldQuickTagId[];
  comment: string;
}

export interface BriefFeedbackPayload {
  generalComment: string;
  overallQuickTags: BriefFeedbackOverallQuickTagId[];
  /** Only include fields the reviewer chose to comment on */
  fieldFeedback: Record<string, BriefFieldFeedbackEntry>;
}

export interface StoryBriefFeedbackDoc {
  id: string;
  schemaVersion: string;
  briefId: string;
  submittedAt: string;
  submittedByUid: string;
  submittedByEmail?: string;
  submittedByDisplayName?: string;
  generalComment: string;
  overallQuickTags: string[];
  fieldFeedback: Record<
    string,
    { verdict?: string; quickTags: string[]; comment: string }
  >;
  /** Snapshot of `brief` from the parent Firestore document at feedback time */
  briefSnapshotAtFeedback?: unknown;
}
