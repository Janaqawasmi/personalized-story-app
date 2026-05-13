// Maps StoryStatus → coarse pipeline stages
// (Brief → Generate → Review → Approved → Illustration → Publish)
// shared by StoryPipelineStepper and the stories list column.

import type { SpecialistDeskUi } from "../../i18n/specialistDeskUi.types";
import { STORY_STATUSES, type StoryStatus } from "../../types/story";

export const PIPELINE_STEP_LABELS = [
  "Brief",
  "Generate",
  "Review",
  "Approved",
  "Illustration",
  "Publish",
] as const;

export type PipelineStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface StoryPipelineActive {
  kind: "active";
  /** Steps shown as completed (0–6). */
  stepsCompleted: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Step that receives emphasis when stepsCompleted < 6. */
  emphasisStepIndex: PipelineStepIndex;
  nextHint: string;
}

export interface StoryPipelineArchived {
  kind: "archived";
}

export type StoryPipelineUiState = StoryPipelineActive | StoryPipelineArchived;

/** v1 illustration statuses still present on some Firestore docs; map to v2 workspace UX. */
const LEGACY_ILLUSTRATION_STATUSES = new Set([
  "prompt_review",
  "illustrating",
  "illustration_review",
]);

/** True when Firestore still has a v1 illustration macro-status (removed from `StoryStatus`). */
export function isLegacyIllustrationStoryStatus(status: string | undefined): boolean {
  return status !== undefined && LEGACY_ILLUSTRATION_STATUSES.has(status);
}

/** Map runtime / legacy `status` strings to a known `StoryStatus` for labels and chips. */
export function normalizeStoryStatusForDisplay(status: string | undefined): StoryStatus {
  if (status === undefined || status === "") return "draft_brief";
  if (LEGACY_ILLUSTRATION_STATUSES.has(status)) return "illustration_workspace";
  if ((STORY_STATUSES as readonly string[]).includes(status)) return status as StoryStatus;
  return "draft_brief";
}

function nextHintForStatus(status: StoryStatus): string {
  switch (status) {
    case "draft_brief":
      return "Complete the clinical brief and submit it to start AI generation.";
    case "generating":
      return "Generation usually finishes in under a minute. You can stay on the Brief tab while it runs.";
    case "needs_revision":
      return "The story is regenerating from your feedback—check back shortly.";
    case "awaiting_review":
      return "Open the Story tab to read the generated text and complete your review.";
    case "in_review":
      return "Finish reviewing the generated story, then approve, edit, or request changes.";
    case "approved":
      return "This story is approved. Open the illustration workspace to generate a Visual Bible and per-page scene plans.";
    case "illustration_workspace":
      return "Generate illustrations for each page, then mark ready when all pages are approved.";
    case "illustration_ready":
      return "All illustrations are approved. Publish when you are ready.";
    case "published":
      return "This story has been published.";
    default:
      return "";
  }
}

/**
 * Runtime strings may include legacy statuses or bad data; never return undefined
 * (StoryRow / stepper read `.kind`).
 */
export function getStoryPipelineUiState(status: StoryStatus | string | undefined): StoryPipelineUiState {
  if (status === "archived") {
    return { kind: "archived" };
  }
  if (status === undefined || status === "") {
    const nextHint = "";
    return {
      kind: "active",
      stepsCompleted: 0,
      emphasisStepIndex: 0,
      nextHint,
    };
  }
  if (LEGACY_ILLUSTRATION_STATUSES.has(status)) {
    const nextHint = nextHintForStatus("illustration_workspace");
    return {
      kind: "active",
      stepsCompleted: 4,
      emphasisStepIndex: 4,
      nextHint,
    };
  }
  const nextHint = nextHintForStatus(status as StoryStatus);
  switch (status as StoryStatus) {
    case "draft_brief":
      return {
        kind: "active",
        stepsCompleted: 0,
        emphasisStepIndex: 0,
        nextHint,
      };
    case "generating":
    case "needs_revision":
      return {
        kind: "active",
        stepsCompleted: 1,
        emphasisStepIndex: 1,
        nextHint,
      };
    case "awaiting_review":
    case "in_review":
      return {
        kind: "active",
        stepsCompleted: 2,
        emphasisStepIndex: 2,
        nextHint,
      };
    case "approved":
      return {
        kind: "active",
        stepsCompleted: 3,
        emphasisStepIndex: 3,
        nextHint,
      };
    case "illustration_workspace":
      return {
        kind: "active",
        stepsCompleted: 4,
        emphasisStepIndex: 4,
        nextHint,
      };
    case "illustration_ready":
      return {
        kind: "active",
        stepsCompleted: 5,
        emphasisStepIndex: 5,
        nextHint,
      };
    case "published":
      return {
        kind: "active",
        stepsCompleted: 6,
        emphasisStepIndex: 5,
        nextHint,
      };
    default:
      return {
        kind: "active",
        stepsCompleted: 0,
        emphasisStepIndex: 0,
        nextHint: "",
      };
  }
}

/** Short label for the list column — matches pipeline step names. */
export function getPipelineListLabel(status: StoryStatus | string | undefined): string {
  if (status === "archived") return "Archived";
  const s = getStoryPipelineUiState(status);
  if (s.kind === "archived") return "Archived";
  if (s.stepsCompleted === 6) return "Publish";
  return PIPELINE_STEP_LABELS[s.emphasisStepIndex];
}

/** Localized short label for the stories table “Stage” column. */
export function getPipelineListLabelTranslated(
  status: StoryStatus | string | undefined,
  desk: Pick<
    SpecialistDeskUi,
    "pipelineSteps" | "pipelineListPublish" | "pipelineListArchived"
  >,
): string {
  if (status === "archived") return desk.pipelineListArchived;
  const s = getStoryPipelineUiState(status);
  if (s.kind === "archived") return desk.pipelineListArchived;
  if (s.stepsCompleted === 6) return desk.pipelineListPublish;
  return desk.pipelineSteps[s.emphasisStepIndex];
}

/** Which pipeline step (0–5) the list icon should reflect. */
export function getPipelineListStepIndex(
  status: StoryStatus | string | undefined,
): PipelineStepIndex | null {
  if (status === "archived") return null;
  const s = getStoryPipelineUiState(status);
  if (s.kind === "archived") return null;
  if (s.stepsCompleted === 6) return 5;
  return s.emphasisStepIndex;
}
