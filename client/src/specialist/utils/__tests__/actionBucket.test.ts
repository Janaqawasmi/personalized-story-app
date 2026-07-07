import {
  ACTION_BUCKETS,
  ACTION_BUCKET_STATUSES,
  countByBucket,
  getActionBucket,
} from "../actionBucket";
import { STORY_STATUSES, type StoryStatus } from "../../../types/story";

describe("actionBucket", () => {
  test("every StoryStatus is assigned to exactly one bucket", () => {
    for (const status of STORY_STATUSES) {
      const bucket = getActionBucket(status);
      expect(ACTION_BUCKETS).toContain(bucket);
      expect(ACTION_BUCKET_STATUSES[bucket]).toContain(status);
    }
  });

  test("no status appears in more than one bucket", () => {
    const seen = new Map<StoryStatus, string>();
    for (const bucket of ACTION_BUCKETS) {
      for (const status of ACTION_BUCKET_STATUSES[bucket]) {
        expect(seen.has(status)).toBe(false);
        seen.set(status, bucket);
      }
    }
  });

  test("approved and published are never in the same bucket", () => {
    expect(getActionBucket("approved")).not.toBe(getActionBucket("published"));
  });

  test("needs_revision is treated as in-progress (an automatic regeneration), not needs_action", () => {
    // The specialist has already submitted feedback by the time a story is
    // needs_revision — the app immediately triggers an Agent 1 rerun, so
    // there's nothing left for them to do but wait (see DraftTabB, which
    // renders the same GeneratingState for "generating" and "needs_revision").
    expect(getActionBucket("needs_revision")).toBe("in_progress");
  });

  test("countByBucket matches a manual filter for a mixed status list", () => {
    const statuses: StoryStatus[] = [
      "draft_brief",
      "awaiting_review",
      "approved",
      "generating",
      "in_review",
      "illustration_ready",
      "published",
      "published",
      "archived",
    ];
    expect(countByBucket(statuses, "needs_action")).toBe(3); // draft_brief, awaiting_review, approved
    expect(countByBucket(statuses, "in_progress")).toBe(2); // generating, in_review
    expect(countByBucket(statuses, "ready_to_publish")).toBe(1);
    expect(countByBucket(statuses, "published")).toBe(2);
    expect(countByBucket(statuses, "archived")).toBe(1);
  });

  test("regression: the summary stat and the primary filter now read from the same bucket, so an 'approved' story never inflates a 'published' count or vice versa", () => {
    const statuses: StoryStatus[] = ["approved", "published"];
    // Before this fix, one stat counted approved+published together while
    // the filter chip counted "approved" alone — same label, different
    // numbers. Bucketing them into distinct buckets means any single count
    // (summary stat or filter) always reflects the same underlying set.
    expect(countByBucket(statuses, "needs_action")).toBe(1);
    expect(countByBucket(statuses, "published")).toBe(1);
  });
});
