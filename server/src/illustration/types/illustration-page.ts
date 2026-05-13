export type IllustrationPageStatus =
  | "plan_only"
  | "generating_image"
  | "awaiting_review"
  | "approved"
  | "needs_revision";

export interface IllustrationPage {
  pageNumber: number;
  text: string;
  currentScenePlanVersion: number | null;
  currentImageVersion: number | null;
  status: IllustrationPageStatus;
  pendingJobId: string | null;
  lastError: string | null;
}
