// Shared per-story derived display data for the My Stories list — consumed
// by both the desktop table row (StoryRow) and the narrow-screen card
// (StoryCard) so the two layouts never drift out of sync.
import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
import type { StoryBriefUi } from "../../i18n/storyBriefUi";
import { formatListEventTimeMs } from "../../i18n/specialistRelativeTime";
import type { StoryType } from "../../types/storyBrief";
import type { EditHistoryEvent, Story, StoryStatus } from "../../types/story";
import {
  getPipelineListLabelTranslated,
  getPipelineListStepIndex,
  normalizeStoryStatusForDisplay,
} from "./storyPipeline";
import { getRowActionLabel, getRowActionTarget } from "./rowAction";
import { STATUS_CHIP_COLORS, type StatusColor } from "../components/statusColors";

function editEventVerb(event: EditHistoryEvent, desk: SpecialistDeskUi): string {
  switch (event.kind) {
    case "draft_created":
      return desk.editEventCreated;
    case "draft_edited":
      return desk.editEventStoryEdited;
    case "status_changed":
      return desk.editEventUpdated;
    case "brief_submitted":
      return desk.editEventSubmitted;
    case "agent1_generated":
      return event.succeeded
        ? desk.editEventDraftGenerated
        : desk.editEventGenerationFailed;
    case "regeneration_requested":
      return desk.editEventRegenerationRequested;
    case "archived":
      return desk.editEventArchived;
    case "restored":
      return desk.editEventRestored;
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
      return "Illustration workspace opened";
    case "illustration_ready_marked":
      return "Illustration ready marked";
    case "published":
      return "Published to library";
    case "job_cancelled":
      return "Illustration job cancelled";
    default: {
      const _u: never = event;
      void _u;
      return desk.editEventUpdated;
    }
  }
}

function lastEventLines(
  story: Story,
  desk: SpecialistDeskUi,
  dateLocale: string,
): { what: string; when: string } {
  const hist = story.editHistory;
  const last = hist && hist.length > 0 ? hist[hist.length - 1] : undefined;
  if (!last) {
    return {
      what: desk.editEventCreated,
      when: formatListEventTimeMs(story.createdAt, desk, dateLocale),
    };
  }
  return {
    what: editEventVerb(last.event, desk),
    when: formatListEventTimeMs(last.at, desk, dateLocale),
  };
}

export interface StoryRowViewModel {
  storyPath: string;
  displayTitle: string | null;
  briefRevBadge: string | null;
  isArchived: boolean;
  isAttention: boolean;
  isGenerating: boolean;

  statusForUi: StoryStatus;
  statusColor: StatusColor;
  statusLabel: string;

  progressText: string;
  pipelineStepIndex: number | null;

  topicLabel: string | null;
  ageLabel: string | null;

  lastEventWhat: string;
  lastEventWhen: string;

  actionLabel: string;
  actionHref: string;
  actionExternal: boolean;
}

export function buildStoryRowViewModel(
  story: Story,
  desk: SpecialistDeskUi,
  briefUi: Pick<StoryBriefUi, "STORY_TYPE_LABELS" | "AGE_RANGE_LABELS">,
  dateLocale: string,
  lang: string,
): StoryRowViewModel {
  const statusForUi = normalizeStoryStatusForDisplay(story.status);
  const pipelineLabel = getPipelineListLabelTranslated(story.status, desk);
  const pipelineStepIndex = getPipelineListStepIndex(story.status);
  const progressText =
    pipelineStepIndex === null
      ? pipelineLabel
      : desk.formatStepProgress(
          pipelineStepIndex + 1,
          desk.pipelineSteps.length,
          pipelineLabel,
        );

  const evt = lastEventLines(story, desk, dateLocale);

  const actionLabel = getRowActionLabel(statusForUi, desk);
  const actionTarget = getRowActionTarget(
    { id: story.id, status: statusForUi, publishedTemplateId: story.publishedTemplateId },
    lang,
  );

  return {
    storyPath: `/${lang}/specialist/stories/${story.id}`,
    displayTitle: story.title.trim() === "" ? null : story.title,
    briefRevBadge:
      story.parentStoryId || /revision/i.test(story.title ?? "")
        ? desk.revisionBadge
        : null,
    isArchived: story.status === "archived",
    isAttention: story.status === "awaiting_review",
    isGenerating: story.status === "generating",

    statusForUi,
    statusColor: STATUS_CHIP_COLORS[statusForUi],
    statusLabel: desk.statusLabels[statusForUi],

    progressText,
    pipelineStepIndex,

    topicLabel: story.storyType
      ? briefUi.STORY_TYPE_LABELS[story.storyType as StoryType] ?? story.storyType
      : null,
    ageLabel: story.ageRange ? briefUi.AGE_RANGE_LABELS[story.ageRange] : null,

    lastEventWhat: evt.what,
    lastEventWhen: evt.when,

    actionLabel,
    actionHref: actionTarget.href,
    actionExternal: actionTarget.external,
  };
}
