// server/src/models/dammaStoryBriefFeedback.model.ts
//
// Validation allowlists for specialist Story Brief feedback (Firestore + API).

export const DAMMA_BRIEF_FEEDBACK_SCHEMA_VERSION = "damma-story-brief-feedback-v1";

/** Must match client BRIEF_FEEDBACK_FIELD_CATALOG ids */
export const ALLOWED_FIELD_IDS: ReadonlySet<string> = new Set([
  "storyType",
  "1.1",
  "1.2",
  "1.3",
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "3.6",
  "3.7",
  "4.0",
  "4.1",
  "4.2",
  "4.3",
  "4.4",
  "4.5",
  "4.6",
  "4.7",
  "5.1",
  "5.2",
]);

export const ALLOWED_OVERALL_QUICK_TAGS: ReadonlySet<string> = new Set([
  "clarify_clinical_framing",
  "strengthen_mechanism",
  "check_age_length_fit",
  "alignment_sections",
  "minor_edits_only",
  "ready_for_next_step",
]);

export const ALLOWED_FIELD_QUICK_TAGS: ReadonlySet<string> = new Set([
  "needs_more_detail",
  "reconsider_choice",
  "strength_here",
  "tension_with_intention",
]);

/** Must match client BRIEF_FEEDBACK_VERDICTS ids */
export const ALLOWED_FIELD_VERDICTS: ReadonlySet<string> = new Set([
  "good",
  "needs_modification",
  "unclear",
  "remove_or_rethink",
  "keep_as_is",
]);

export const FEEDBACK_SUBCOLLECTION = "feedback";

export const MAX_GENERAL_COMMENT_CHARS = 8000;
export const MAX_FIELD_COMMENT_CHARS = 4000;
export const MAX_FIELD_FEEDBACK_KEYS = 32;
