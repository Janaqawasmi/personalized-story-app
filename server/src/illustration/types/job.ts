export type IllustrationJobType =
  | "workspace_open"
  | "scene_plan_regen"
  | "image_generation"
  | "image_regen";

export type IllustrationJobStatus = "pending" | "running" | "succeeded" | "failed";

export interface IllustrationJob {
  id: string;
  storyId: string;
  type: IllustrationJobType;
  pageNumber: number | null;
  enqueuedBy: string;
  enqueuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  status: IllustrationJobStatus;
  attempt: number;
  idempotencyKey: string;
  inputRefs: Record<string, string>;
  outputRefs: Record<string, string>;
  error: string | null;
}
