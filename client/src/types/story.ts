// client/src/types/story.ts
//
// Client-side Story entity types — mirrors server/src/models/story.model.ts
// field-for-field, with two deliberate divergences noted inline.
// The server file is the source of truth on any disagreement.
//
// Deliberate divergences from the server:
//   1. `Story.brief` is typed as `CompleteBrief` (the draft-friendly shape)
//      instead of `StoryBrief` (the server shape). The server converts to
//      StoryBrief internally for Agent 1.
//   2. `createStoryForGeneration` factory is server-only and is not mirrored.

import type { AgeRange, CompleteBrief, StoryType } from "./storyBrief";
import type { Agent1Result } from "./agent1Result";

// ============================================================================
// COLLECTION CONSTANT
// ============================================================================

export const STORIES_COLLECTION = "stories";

// ============================================================================
// STATUS TYPES
// ============================================================================

export const STORY_STATUSES = [
  "draft_brief",
  "generating",
  "awaiting_review",
  "in_review",
  "needs_revision",
  "approved",
  "published",
  "archived",
] as const;

export type StoryStatus = (typeof STORY_STATUSES)[number];

export const BRIEF_STATUSES = [
  "draft",
  "submitted",
] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface StoryDraft {
  title: string;
  body: string;
  wordCount: number;
  /** ms since epoch */
  updatedAt: number;
}

export type EditHistoryEvent =
  | { kind: "draft_created"; agent1Version: number }
  | { kind: "draft_edited"; snapshot: StoryDraft }
  | { kind: "status_changed"; from: StoryStatus; to: StoryStatus }
  | { kind: "brief_submitted" }
  | { kind: "agent1_generated"; version: number; succeeded: boolean }
  | { kind: "regeneration_requested"; feedback: string }
  | { kind: "archived" }
  | { kind: "restored" };

export interface EditHistoryEntry {
  /** UUID */
  id: string;
  /** ms since epoch */
  at: number;
  byUid: string;
  event: EditHistoryEvent;
}

// ============================================================================
// STORY INTERFACE
// ============================================================================

export interface Story {
  // Identity
  id: string;
  ownerUid: string;
  parentStoryId: string | null;

  // Display metadata
  title: string;
  storyType: StoryType;
  ageRange: AgeRange | null;
  tags: string[];

  // Status
  status: StoryStatus;
  briefStatus: BriefStatus;

  // Content
  /** On the client, briefs are always CompleteBrief (the draft-friendly
   *  shape with Partial<> sections). The server converts to StoryBrief
   *  internally for Agent 1. */
  brief: CompleteBrief;
  agent1Result: Agent1Result | null;
  agent1Versions: Agent1Result[];
  currentDraft: StoryDraft | null;
  editHistory: EditHistoryEntry[];

  // Timestamps (ms since epoch for Firestore compatibility)
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  submittedAt: number | null;
  approvedAt: number | null;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

interface Transition {
  from: StoryStatus;
  to: StoryStatus;
}

export const ALLOWED_TRANSITIONS: readonly Transition[] = [
  { from: "draft_brief",     to: "generating" },
  { from: "draft_brief",     to: "archived" },
  { from: "generating",      to: "awaiting_review" },
  { from: "generating",      to: "draft_brief" },
  { from: "awaiting_review", to: "in_review" },
  { from: "in_review",       to: "needs_revision" },
  { from: "in_review",       to: "approved" },
  { from: "in_review",       to: "archived" },
  { from: "needs_revision",  to: "awaiting_review" },
  { from: "needs_revision",  to: "in_review" },
  { from: "approved",        to: "published" },
  { from: "approved",        to: "in_review" },
  { from: "approved",        to: "archived" },
  { from: "published",       to: "archived" },
  { from: "archived",        to: "draft_brief" },
  { from: "archived",        to: "in_review" },
] as const;

export function isTransitionAllowed(
  from: StoryStatus,
  to: StoryStatus,
): boolean {
  return ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to,
  );
}

// ============================================================================
// PRESERVED — StoryTemplate (used by the personalize flow)
// ============================================================================

/**
 * Shape of `story_templates` documents used by the personalize flow.
 * @see PersonalizeStoryPage
 */
export interface StoryTemplate {
  id: string;
  title: string;
  language?: string;
  ageGroup?: string;
  targetAgeGroup?: string;
  topic?: string | Record<string, string>;
  generationConfig?: {
    targetAgeGroup?: string;
  };
  /** e.g. "{{CHILD_NAME}} took a deep breath..." — live preview on Name step */
  previewSentence?: string;
}
