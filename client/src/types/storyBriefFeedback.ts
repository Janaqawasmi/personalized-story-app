// client/src/types/storyBriefFeedback.ts
//
// Specialist review feedback for a DAMMAH Story Brief (separate from form fields).
// Field IDs align with /docs/dammah-story-brief-spec-v1.2.md numbering.

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
  fieldFeedback: Record<string, { quickTags: string[]; comment: string }>;
  /** Snapshot of `brief` from the parent Firestore document at feedback time */
  briefSnapshotAtFeedback?: unknown;
}
