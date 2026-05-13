export type ImageReviewStatus = "awaiting_review" | "approved" | "needs_revision";

export interface ImageArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentFinalPromptId: string;
  providerId: string;
  modelId: string;
  modelParams: Record<string, unknown>;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  bytes: number;
  reviewStatus: ImageReviewStatus;
  approvedAt: number | null;
  rejectionNote: string | null;
}
