import type { EditHistoryEvent, Story, StoryStatus } from "../../types/story";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Short past-tense label for status_changed → `to` (table cell). */
const STATUS_TO_ACTIVITY_VERB: Record<StoryStatus, string> = {
  draft_brief: "Brief in progress",
  generating: "Started generating",
  awaiting_review: "Ready",
  in_review: "Review started",
  needs_revision: "Needs revision",
  approved: "Approved",
  illustration_ready: "Illustration ready",
  illustration_workspace: "Illustration workspace opened",
  published: "Published",
  archived: "Archived",
};

function verbFromEvent(event: EditHistoryEvent): string {
  switch (event.kind) {
    case "draft_created":
      return "Created";
    case "draft_edited":
      return "Edited";
    case "brief_submitted":
      return "Submitted";
    case "agent1_generated":
      return event.succeeded ? "Generated" : "Generation failed";
    case "regeneration_requested":
      return "Revision requested";
    case "archived":
      return "Archived";
    case "restored":
      return "Restored";
    case "status_changed":
      return STATUS_TO_ACTIVITY_VERB[event.to] ?? "Updated";
    case "visual_bible_generated":
      return "Visual Bible generated";
    case "visual_bible_edited":
      return "Visual Bible edited";
    case "visual_bible_regenerated":
      return "Visual Bible regenerated";
    case "scene_plan_generated":
      return "Scene plan generated";
    case "image_generated":
      return "Image generated";
    case "image_approved":
      return "Image approved";
    case "image_rejected":
      return "Image rejected";
    case "illustration_workspace_opened":
      return "Workspace opened";
    case "illustration_ready_marked":
      return "Illustration ready marked";
    case "published":
      return "Published to library";
    case "job_cancelled":
      return "Illustration job cancelled";
    default: {
      const _e: never = event;
      void _e;
      return "Updated";
    }
  }
}

function formatCompactRelativeAgo(ms: number): string {
  const now = Date.now();
  const diffMs = now - ms;
  const min = Math.floor(diffMs / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
}

function formatShortCalendarDate(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  if (d.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${d.getFullYear()}`;
}

/** Relative time for recent activity, calendar date when older than 7 days. */
function formatActivityWhen(ms: number): string {
  const diffMs = Date.now() - ms;
  if (diffMs < 60_000) return "just now";
  if (diffMs < SEVEN_DAYS_MS) return formatCompactRelativeAgo(ms);
  return formatShortCalendarDate(ms);
}

function getLatestHistoryEntry(story: Story): { at: number; event: EditHistoryEvent } | null {
  const { editHistory } = story;
  if (!editHistory?.length) return null;
  let best = editHistory[0]!;
  for (let i = 1; i < editHistory.length; i++) {
    const e = editHistory[i]!;
    if (e.at > best.at) best = e;
  }
  return { at: best.at, event: best.event };
}

/**
 * One-line summary for the stories table: what happened last + when.
 * Uses the most recent `editHistory` entry; falls back to `createdAt` + "Created".
 */
export function formatLastActivitySummary(story: Story): string {
  const latest = getLatestHistoryEntry(story);
  if (!latest) {
    return `Created ${formatActivityWhen(story.createdAt)}`;
  }
  const verb = verbFromEvent(latest.event);
  return `${verb} ${formatActivityWhen(latest.at)}`;
}
