// server/src/models/story.model.ts
//
// Server-side Story entity — source of truth for the `stories` Firestore collection.
// The client mirror derives from these exports (same shapes, same constants).
//
// Per Option C architecture: `stories` is the canonical post-submission store.
// The `dammaStoryBriefs` collection is deprecated and must not be referenced here.
//
// Timestamps are stored as `number` (ms since epoch) throughout — this keeps the
// type compatible with both Firestore (which stores numbers) and localStorage.
// No Firestore Timestamp objects are used in this file.

import type { AgeRange, StoryBrief, StoryType } from "@/models/storyBrief.model";
import type { Agent1Result } from "@/agent1/types";

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
  brief: StoryBrief;
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
];

export function isTransitionAllowed(
  from: StoryStatus,
  to: StoryStatus,
): boolean {
  return ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to,
  );
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a Story document ready to be written to Firestore when a generation
 * is triggered. The brief snapshot is locked at submission time.
 */
export function createStoryForGeneration(params: {
  id: string;
  ownerUid: string;
  brief: StoryBrief;
  parentStoryId?: string;
  title?: string;
}): Story {
  const now = Date.now();
  return {
    id: params.id,
    ownerUid: params.ownerUid,
    parentStoryId: params.parentStoryId ?? null,

    title: params.title ?? "Untitled story",
    storyType: params.brief.storyType,
    ageRange: params.brief.ageAndScope?.ageRange ?? null,
    tags: [],

    status: "generating",
    briefStatus: "submitted",

    brief: params.brief,
    agent1Result: null,
    agent1Versions: [],
    currentDraft: null,
    editHistory: [
      {
        id: crypto.randomUUID(),
        at: now,
        byUid: params.ownerUid,
        event: { kind: "brief_submitted" },
      },
    ],

    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    submittedAt: now,
    approvedAt: null,
  };
}
