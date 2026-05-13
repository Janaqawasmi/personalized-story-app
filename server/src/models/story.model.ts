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
import type { Agent1Result, StoryPage } from "@/agent1/types";
import type { IllustrationPage } from "@/illustration/types";

// Re-export so downstream modules can import StoryPage from here rather than
// reaching into agent1/types directly. Step 1.3 will extend this type with
// illustration-specific fields without changing the import path for consumers.
export type { StoryPage };

// ============================================================================
// COLLECTION CONSTANT
// ============================================================================

export const STORIES_COLLECTION = "stories";

// ============================================================================
// STATUS TYPES
// ============================================================================

// v2 illustration pipeline (docs/illustration/spec.md §9):
//   approved → illustration_workspace → illustration_ready → published
// v1's transient statuses (prompt_review, illustrating, illustration_review)
// are removed; v2 collapses the illustration phase into a single workspace
// state plus per-page sub-status.
export const STORY_STATUSES = [
  "draft_brief",
  "generating",
  "awaiting_review",
  "in_review",
  "needs_revision",
  "approved",
  "illustration_workspace", // v2 illustration workspace (Visual Bible + per-page plans)
  "illustration_ready",     // all illustrations approved; ready to publish
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
  | { kind: "restored" }
  | { kind: "visual_bible_generated"; version: number; source: "llm" | "edit" }
  | { kind: "scene_plan_generated"; pageNumber: number; version: number; withFeedback: boolean }
  | { kind: "image_generated"; pageNumber: number; version: number }
  | { kind: "image_approved"; pageNumber: number; version: number }
  | { kind: "image_rejected"; pageNumber: number; version: number; feedbackNote: string }
  | { kind: "illustration_workspace_opened" }
  | { kind: "illustration_ready_marked" };

export interface EditHistoryEntry {
  /** UUID */
  id: string;
  /** ms since epoch */
  at: number;
  byUid: string;
  event: EditHistoryEvent;
}

// ============================================================================
// ILLUSTRATION TYPES — v2 (Phase 1)
// ============================================================================
// The v1 illustration types (PromptStatus, IllustrationStatus, PageIllustration,
// VisualBible) are removed. v2 types live under server/src/illustration/types/
// and are introduced in Phase 1 per docs/illustration/spec.md §10.

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
  /** Structured manuscript pages — null until first generation. v2: pure manuscript;
   *  illustration state lives in a separate field added in Phase 1. */
  pages: StoryPage[] | null;
  editHistory: EditHistoryEntry[];

  // Timestamps (ms since epoch for Firestore compatibility)
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  submittedAt: number | null;
  approvedAt: number | null;

  // v2 illustration workspace (spec §10.6 / §10.7)
  /** Per-page illustration state; null until workspace opens. */
  illustrationPages: IllustrationPage[] | null;
  /** Monotonic Visual Bible version on Story; null until first artefact. */
  currentVisualBibleVersion: number | null;
  /** ms since epoch when specialist opened illustration workspace. */
  illustrationWorkspaceOpenedAt: number | null;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

interface Transition {
  from: StoryStatus;
  to: StoryStatus;
}

export const ALLOWED_TRANSITIONS: readonly Transition[] = [
  { from: "draft_brief",            to: "generating" },
  { from: "draft_brief",            to: "archived" },
  { from: "generating",             to: "awaiting_review" },
  { from: "generating",             to: "draft_brief" },
  { from: "awaiting_review",        to: "in_review" },
  { from: "in_review",              to: "needs_revision" },
  { from: "in_review",              to: "approved" },
  { from: "in_review",              to: "archived" },
  { from: "needs_revision",         to: "awaiting_review" },
  { from: "needs_revision",         to: "in_review" },
  { from: "approved",               to: "illustration_workspace" },
  { from: "approved",               to: "in_review" },
  { from: "approved",               to: "archived" },
  { from: "illustration_workspace", to: "illustration_ready" },
  { from: "illustration_workspace", to: "in_review" },
  { from: "illustration_workspace", to: "archived" },
  { from: "illustration_ready",     to: "illustration_workspace" },
  { from: "illustration_ready",     to: "published" },
  { from: "illustration_ready",     to: "archived" },
  { from: "published",              to: "archived" },
  { from: "archived",               to: "draft_brief" },
  { from: "archived",               to: "in_review" },
];

export function isTransitionAllowed(
  from: StoryStatus,
  to: StoryStatus,
): boolean {
  return ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to,
  );
}

/** Firestore docs created before v2 illustration fields may omit these keys. */
export function fillIllustrationV2DocDefaults(story: Story): void {
  const s = story as Story & {
    illustrationPages?: Story["illustrationPages"];
    currentVisualBibleVersion?: Story["currentVisualBibleVersion"];
    illustrationWorkspaceOpenedAt?: Story["illustrationWorkspaceOpenedAt"];
  };
  if (s.illustrationPages === undefined) s.illustrationPages = null;
  if (s.currentVisualBibleVersion === undefined) {
    s.currentVisualBibleVersion = null;
  }
  if (s.illustrationWorkspaceOpenedAt === undefined) {
    s.illustrationWorkspaceOpenedAt = null;
  }
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
    pages: null,
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

    illustrationPages: null,
    currentVisualBibleVersion: null,
    illustrationWorkspaceOpenedAt: null,
  };
}
