/** Client mirror of server/src/illustration/types — keep field names and unions aligned. */

export interface LLMCallRecord {
  model: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error: string | null;
}

export interface StructuredPrompt {
  setting: string;
  character: string;
  focalPoint: string;
  composition: string;
  lighting: string;
}

export interface EnvironmentEntry {
  atmosphere: string;
  spatialLayout: string;
}

export type VisualBibleCreatedBy =
  | { kind: "system" }
  | { kind: "specialist"; uid: string };

export interface VisualBibleArtefact {
  id: string;
  storyId: string;
  version: number;
  createdAt: number;
  createdBy: VisualBibleCreatedBy;
  parentVersion: number | null;
  source: "llm_generated" | "specialist_edited";
  llmCall: LLMCallRecord | null;
  characterSheet: string;
  characterAnchor: string;
  styleGuide: string;
  consistencyAnchors: string[];
  environmentRegistry: Record<string, EnvironmentEntry>;
  palette: string;
  avoidList: string[];
}

export interface SceneDirection {
  moment: string;
  cameraSpec: string;
  lightingChoice: string;
  visualHook: string;
  keyPhysicalDetail: string;
}

export interface ScenePlanArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentVersion: number | null;
  llmCall: LLMCallRecord;
  visualBibleVersion: number;
  feedbackNote: string | null;
  title: string;
  prose: string;
  emotionalIntent: string;
  keyVisibleDetail: string;
  director: SceneDirection;
  structuredPrompt: StructuredPrompt | null;
  /** Populated after Stage 2 (Prompt Engineer) runs on this scene plan version. */
  stage2LLMCall?: LLMCallRecord | null;
}

export interface FinalPromptArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentScenePlanVersion: number;
  parentVisualBibleVersion: number;
  finalPromptString: string;
  promptOrder: string[];
  charCount: number;
  warnings: string[];
}

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
  /** Phase 6 stub — empty until v3 classifier. */
  safetyFlags?: string[];
}

export type IllustrationJobType =
  | "workspace_open"
  | "scene_plan_regen"
  | "image_generation"
  | "image_regen"
  | "visual_bible_regen";

export type IllustrationJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface IllustrationJob {
  id: string;
  storyId: string;
  type: IllustrationJobType;
  pageNumber: number | null;
  enqueuedBy: string;
  enqueuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  lastHeartbeatAt?: number | null;
  cancelRequested?: boolean;
  cancelledAt?: number | null;
  status: IllustrationJobStatus;
  attempt: number;
  idempotencyKey: string;
  inputRefs: Record<string, string>;
  outputRefs: Record<string, string>;
  error: string | null;
}

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
