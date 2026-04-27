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

export const STORY_STATUSES = [
  "draft_brief",
  "generating",
  "awaiting_review",
  "in_review",
  "needs_revision",
  "approved",
  "prompt_review",        // specialist reviews AI-generated image prompts before Seedream
  "illustrating",         // Seedream generating page illustrations (async)
  "illustration_review",  // specialist reviews generated illustrations per page
  "illustration_ready",   // all illustrations approved; ready to publish
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
// ILLUSTRATION TYPES
// ============================================================================

/** Lifecycle of a single page's AI-generated image prompt through Gate 1 review. */
export type PromptStatus = "pending" | "approved" | "rejected";

/** Lifecycle of a single page's Seedream-generated illustration through Gate 2 review. */
export type IllustrationStatus = "pending" | "generating" | "done" | "failed";

/**
 * Extends StoryPage with image prompt and illustration fields.
 * `pages` on Story becomes PageIllustration[] once the illustration pipeline starts.
 */
export interface PageIllustration extends StoryPage {
  /** Claude-generated Seedream prompt text. Null until prompts are generated. */
  imagePrompt: string | null;
  /** Gate 1 specialist review decision. */
  promptStatus: PromptStatus;
  /** Specialist note when rejecting a prompt (feeds into regeneration). */
  promptRejectionNote: string | null;
  /** Firebase Storage URL of the generated illustration. Null until done. */
  illustrationUrl: string | null;
  /** Gate 2 specialist review decision. */
  illustrationStatus: IllustrationStatus;
  /** Specialist note when failing an illustration (feeds into re-generation). */
  illustrationRejectionNote: string | null;
}

/**
 * One-time Claude artifact that anchors visual consistency across all pages.
 * Generated once per story before any page prompts are created.
 */
export interface VisualBible {
  /** Physical description of the protagonist for all pages. */
  protagonist: string;
  /** Art style directive (medium, palette, line quality). */
  styleGuide: string;
  /** Environment/setting descriptions keyed by scene label. */
  environmentRegistry: Record<string, string>;
  /** Hex palette or colour name list, comma-separated. */
  palette: string;
  /** ms since epoch */
  generatedAt: number;
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
  // Structured pages — null until first generation.
  // Upgraded to PageIllustration[] when the illustration pipeline starts.
  pages: PageIllustration[] | null;
  editHistory: EditHistoryEntry[];

  // Illustration pipeline
  /** Visual Bible generated once before page prompts. Null until prompt_review. */
  visualBible: VisualBible | null;
  /** Fixed seed passed to Seedream for every page so style is reproducible. */
  illustrationSeed: number | null;

  // Timestamps (ms since epoch for Firestore compatibility)
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  submittedAt: number | null;
  approvedAt: number | null;
  /** When all page image prompts were generated (prompt_review entered). */
  promptsGeneratedAt: number | null;
  /** When all page prompts passed Gate 1 specialist review. */
  promptsApprovedAt: number | null;
  /** When Seedream finished generating all page illustrations. */
  illustrationCompletedAt: number | null;
  /** When all illustrations passed Gate 2 specialist review. */
  illustrationReadyAt: number | null;
}

// ============================================================================
// STATE MACHINE
// ============================================================================

interface Transition {
  from: StoryStatus;
  to: StoryStatus;
}

export const ALLOWED_TRANSITIONS: readonly Transition[] = [
  { from: "draft_brief",          to: "generating" },
  { from: "draft_brief",          to: "archived" },
  { from: "generating",           to: "awaiting_review" },
  { from: "generating",           to: "draft_brief" },
  { from: "awaiting_review",      to: "in_review" },
  { from: "in_review",            to: "needs_revision" },
  { from: "in_review",            to: "approved" },
  { from: "in_review",            to: "archived" },
  { from: "needs_revision",       to: "awaiting_review" },
  { from: "needs_revision",       to: "in_review" },
  // approved → prompt_review is specialist-triggered; direct publish removed.
  { from: "approved",             to: "prompt_review" },
  { from: "approved",             to: "in_review" },
  { from: "approved",             to: "archived" },
  // Illustration pipeline
  { from: "prompt_review",        to: "illustrating" },
  { from: "prompt_review",        to: "archived" },
  { from: "illustrating",         to: "illustration_review" },
  { from: "illustrating",         to: "prompt_review" },  // catastrophic failure fallback
  { from: "illustration_review",  to: "illustrating" },   // re-trigger failed pages
  { from: "illustration_review",  to: "illustration_ready" },
  { from: "illustration_review",  to: "archived" },
  { from: "illustration_ready",   to: "published" },
  { from: "illustration_ready",   to: "illustration_review" },  // reopen review
  { from: "illustration_ready",   to: "archived" },
  { from: "published",            to: "archived" },
  { from: "archived",             to: "draft_brief" },
  { from: "archived",             to: "in_review" },
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
// HELPERS
// ============================================================================

/**
 * Upgrades a plain StoryPage array (from Agent 1 output) to PageIllustration[]
 * by adding default illustration fields. Call this when persisting agent1Result.pages
 * to Story.pages so the types stay in sync.
 */
export function toPageIllustrations(pages: StoryPage[]): PageIllustration[] {
  return pages.map((p) => ({
    ...p,
    imagePrompt: null,
    promptStatus: "pending" as PromptStatus,
    promptRejectionNote: null,
    illustrationUrl: null,
    illustrationStatus: "pending" as IllustrationStatus,
    illustrationRejectionNote: null,
  }));
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

    visualBible: null,
    illustrationSeed: null,

    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    submittedAt: now,
    approvedAt: null,
    promptsGeneratedAt: null,
    promptsApprovedAt: null,
    illustrationCompletedAt: null,
    illustrationReadyAt: null,
  };
}
