// client/src/specialist/storage/DraftStore.ts
//
// The DraftStore interface — the single abstraction every dashboard consumer
// imports. No consumer ever touches localStorage or the API client directly.
//
// Implementations (LocalDraftStore, HybridDraftStore, FirestoreDraftStore)
// live alongside this file. Swapping them is a one-line change in index.ts.

import type { Story, StoryStatus } from "../../types/story";
import type { CompleteBrief } from "../../types/storyBrief";
import type { Agent1RegenerationPayload } from "../../api/specialistStories";

// ============================================================================
// Filter
// ============================================================================

export interface ListStoriesFilter {
  /** Which statuses to include. Empty/undefined = all except 'archived'. */
  statuses?: StoryStatus[];
  /** Case-insensitive substring match on title, tags, section2 population, section2 trigger. */
  searchQuery?: string;
  sortBy?: "lastOpenedAt" | "createdAt" | "title";
  sortDir?: "asc" | "desc";
  limit?: number;
}

// ============================================================================
// Interface
// ============================================================================

export interface DraftStore {
  // ─── Story CRUD ───────────────────────────────────────────────────────────

  /** Create a new Story in `draft_brief` status with an empty brief. */
  createStory(initial?: { title?: string }): Promise<Story>;

  /** Fetch a single Story by ID. Returns `null` if not found. */
  getStory(storyId: string): Promise<Story | null>;

  /** List Stories owned by the current specialist. */
  listStories(filter?: ListStoriesFilter): Promise<Story[]>;

  /**
   * Patch any subset of Story fields. Updates `updatedAt`.
   *
   * **Throws** `Error("Direct status updates are not allowed. Use
   * transitionStatus() instead.")` if `patch` contains the `status` key.
   * Use `transitionStatus()` for all status changes.
   */
  updateStory(storyId: string, patch: Partial<Story>): Promise<Story>;

  /**
   * Hard delete. Only used by admin tools; never called from the dashboard UI.
   */
  deleteStory(storyId: string): Promise<void>;

  // ─── Brief sub-resource ───────────────────────────────────────────────────

  /**
   * Replace the brief on a Story.
   *
   * **Only allowed when `briefStatus === 'draft'`.**
   * Throws if the story is in any other brief status.
   */
  updateBrief(storyId: string, brief: CompleteBrief): Promise<Story>;

  /**
   * Submit the brief for generation (Option C handoff).
   * Sends the brief to the server and receives the Story back with
   * `agent1Result` populated.
   */
  submitBrief(storyId: string): Promise<Story>;

  /**
   * After transitioning to `needs_revision` with feedback, invokes Agent 1 again
   * (`POST .../generate` with `agent1Rerun`). Server-backed stories only.
   */
  runAgent1Regeneration(
    storyId: string,
    payload: Agent1RegenerationPayload,
  ): Promise<Story>;

  // ─── Status transitions ───────────────────────────────────────────────────

  /**
   * Request a status transition. Throws if the transition is not allowed per
   * `isTransitionAllowed` (see `../../types/story`).
   *
   * @param metadata - Optional payload forwarded to the server (e.g. `{ feedback }` for
   *   `needs_revision` transitions). Ignored for localStorage stories except when
   *   `to === 'needs_revision'` and `metadata.feedback` is present, in which case a
   *   `regeneration_requested` event is appended to `editHistory`.
   */
  transitionStatus(
    storyId: string,
    to: StoryStatus,
    metadata?: Record<string, unknown>,
  ): Promise<Story>;

  // ─── Subscriptions ────────────────────────────────────────────────────────

  /**
   * Subscribe to real-time changes on a single Story.
   * @returns An unsubscribe function. Call it to stop receiving updates.
   */
  subscribeToStory(storyId: string, callback: (story: Story) => void): () => void;

  /**
   * Subscribe to real-time changes on the current specialist's story list.
   * @returns An unsubscribe function. Call it to stop receiving updates.
   */
  subscribeToList(callback: (stories: Story[]) => void): () => void;
}
