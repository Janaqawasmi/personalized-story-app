// Mirrored from server/src/agent1/types/index.ts
// Keep in sync manually until a shared types package exists.

export type BlueprintPoint = {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

export type InferredIntention = {
  feel: string;
  because: string;
  reason: string;
};

export type CompressionMetadata = {
  fullyIncluded: string[];
  compressed: Array<{ obligation: string; how: string }>;
  omitted: Array<{ obligation: string; why: string }>;
};

export type ContradictionFlag = {
  contradictedField: string;
  contradictingPhrase: string;
  resolution: string;
};

export type PreCheckWarning = {
  code: string;
  message: string;
  severity: "info" | "warn";
};

export type PostValidationFlag = {
  checkType:
    | "must_never"
    | "shame_handling"
    | "coping_tool"
    | "age_appropriateness";
  constraintIdOrIndex: string | number;
  passage: string;
  reasoning: string;
  severity: "likely_violation" | "borderline_specialist_review";
};

export type LLMCallRecord = {
  step: "step1_architect" | "step2_author" | "step3_post_validation";
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  attempt: number;
  promptHash: string;
};

/** Which AI model authored a version. Mirrors server ModelChoice. */
export type ModelChoice = "sonnet" | "gpt" | "opus";

export type Agent1Result = {
  generationId: string;
  // Which AI model authored this version. Optional for versions generated
  // before multi-model support.
  modelChoice?: ModelChoice;
  modelLabel?: string;
  // Step 1
  emotionalTruth: string;
  blueprint: BlueprintPoint[];
  copingToolPlacement: string;
  approachInstruction: string;
  inferredIntention?: InferredIntention;
  compressionMetadata?: CompressionMetadata;
  characterNotesContradictions?: ContradictionFlag[];
  // Step 2
  title: string;
  story: string;
  wordCount: number;
  targetWordRange: readonly [number, number];
  wordCountDrift: "within_range" | "under" | "over";
  // Step 3
  alignmentNote: string;
  postValidationFlags: PostValidationFlag[];
  // Pre-check (passed through for the UI)
  preCheckWarnings: PreCheckWarning[];
  // Few-shot status per v3.2 §13
  exampleBankStatus:
    | "examples_used"
    | "cross_bucket_retrieval"
    | "cold_start_no_examples";
  // Rerun context
  rerunCount: number;
  rerunOf?: string;
  // Telemetry
  totalLatencyMs: number;
  llmCalls: LLMCallRecord[];
  generatedAt: string;
};
