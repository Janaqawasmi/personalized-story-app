import type { LLMCallRecord } from "./llm-call";
import type { StructuredPrompt } from "./structured-prompt";

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
