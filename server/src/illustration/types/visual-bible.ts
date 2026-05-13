import type { LLMCallRecord } from "./llm-call";

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
