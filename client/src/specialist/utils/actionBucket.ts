// Coarse "what needs my attention" buckets, derived from StoryStatus.
//
// This is the single source of truth for both the top summary stat counts
// and the primary filter nav on the My Stories dashboard — they must always
// agree, so both read from `getActionBucket` / `ACTION_BUCKET_STATUSES`
// rather than each re-deriving their own status lists.
//
// Bucket semantics (start vs. continue vs. done):
//   needs_action     — the specialist has not yet started the next step
//                       (finish/submit the brief, start reviewing, kick off
//                       illustrations once approved).
//   in_progress      — work already under way, by the AI or the specialist
//                       (generating, an active review, illustration work).
//   ready_to_publish — everything is approved; only publishing is left.
//   published        — live in the public catalog.
//   archived         — soft-deleted, out of the active workflow.
import type { StoryStatus } from "../../types/story";

export const ACTION_BUCKETS = [
  "needs_action",
  "in_progress",
  "ready_to_publish",
  "published",
  "archived",
] as const;

export type ActionBucket = (typeof ACTION_BUCKETS)[number];

export const ACTION_BUCKET_STATUSES: Record<ActionBucket, StoryStatus[]> = {
  needs_action: ["draft_brief", "awaiting_review", "approved"],
  in_progress: ["generating", "in_review", "needs_revision", "illustration_workspace"],
  ready_to_publish: ["illustration_ready"],
  published: ["published"],
  archived: ["archived"],
};

const STATUS_TO_BUCKET: Record<StoryStatus, ActionBucket> = (() => {
  const map = {} as Record<StoryStatus, ActionBucket>;
  for (const bucket of ACTION_BUCKETS) {
    for (const status of ACTION_BUCKET_STATUSES[bucket]) {
      map[status] = bucket;
    }
  }
  return map;
})();

export function getActionBucket(status: StoryStatus): ActionBucket {
  return STATUS_TO_BUCKET[status] ?? "needs_action";
}

export function countByBucket(
  statuses: StoryStatus[],
  bucket: ActionBucket,
): number {
  return statuses.filter((s) => getActionBucket(s) === bucket).length;
}
