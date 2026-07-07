// Per-status "what do I do next" mapping for the My Stories table's action
// column. Kept separate from storyPipeline.ts (which describes *progress*)
// because this describes the *next step*, worded as a verb.
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
import type { Story, StoryStatus } from "../../types/story";

export type RowActionLabelKey =
  | "rowActionContinueBrief"
  | "rowActionViewProgress"
  | "rowActionStartReview"
  | "rowActionContinueReview"
  | "rowActionStartIllustrations"
  | "rowActionContinueIllustrations"
  | "rowActionReviewIllustrations"
  | "rowActionViewPublicPage"
  | "rowActionViewDetails";

// `needs_revision` reads as "View progress", not "Fix revision": by the time
// a story lands in this status the specialist has already submitted their
// feedback and the app has kicked off an Agent 1 rerun automatically — there
// is nothing left to fix, only progress to watch (see DraftTabB.tsx, which
// renders the same GeneratingState for "generating" and "needs_revision").
const ROW_ACTION_KEY: Record<StoryStatus, RowActionLabelKey> = {
  draft_brief: "rowActionContinueBrief",
  generating: "rowActionViewProgress",
  awaiting_review: "rowActionStartReview",
  in_review: "rowActionContinueReview",
  needs_revision: "rowActionViewProgress",
  approved: "rowActionStartIllustrations",
  illustration_workspace: "rowActionContinueIllustrations",
  illustration_ready: "rowActionReviewIllustrations",
  published: "rowActionViewPublicPage",
  archived: "rowActionViewDetails",
};

export function getRowActionLabel(
  status: StoryStatus,
  desk: Pick<SpecialistDeskUi, RowActionLabelKey>,
): string {
  return desk[ROW_ACTION_KEY[status]];
}

export interface RowActionTarget {
  href: string;
  /** True when the action leaves the specialist dashboard (opens the public site). */
  external: boolean;
}

/** Where the row's primary action button should go. Row/title clicks always
 *  go to the internal workspace; only the dedicated action button offers the
 *  external public-page shortcut for published stories. */
export function getRowActionTarget(
  story: Pick<Story, "id" | "status" | "publishedTemplateId">,
  lang: string,
): RowActionTarget {
  if (story.status === "published" && story.publishedTemplateId) {
    return {
      href: `/${lang}/stories/${encodeURIComponent(story.publishedTemplateId)}`,
      external: true,
    };
  }
  return {
    href: `/${lang}/specialist/stories/${story.id}`,
    external: false,
  };
}
