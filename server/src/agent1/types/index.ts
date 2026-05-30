import type { CrossFieldValidation, StoryBrief } from "@/models/storyBrief.model";
import type { ModelChoice } from "@/agent1/shared/models";

// Caller input
export type ApprovedPart =
  | "emotionalTruth"
  | "blueprint"
  | "approachInstruction"
  | "story";

export type RetryPolicy = {
  step1IncoherentRetries: number;
  step2WordCountRetries: 0;
};

export type RerunFeedback = {
  rerunOf: string;
  approvedParts: ApprovedPart[];
  feedbackText: string;
  previousOutput: Agent1Result;
};

export type GenerateOptions = {
  retryPolicy?: RetryPolicy;
  feedback?: RerunFeedback;
  /** Which AI model authors this version. Defaults to Sonnet when omitted. */
  modelChoice?: ModelChoice;
};

// Inter-step types
export type PreCheckResult = {
  qualityGate: QualityGateResult;
  vagueIntention: VagueIntentionResult;
  complexityBudget: ComplexityBudgetResult;
  warnings: PreCheckWarning[];
};

export type QualityGateResult = {
  triggerThin: boolean;
  intentionThin: boolean;
};

export type VagueIntentionResult = {
  isVague: boolean;
  matchedPattern?: string;
};

export type ComplexityBudgetResult = {
  totalPageCost: number;
  availablePageRange: readonly [number, number];
  state: "green" | "yellow" | "red";
  contributions: Array<{ obligation: string; cost: number }>;
  complexityStatusText?: string;
};

export type PreCheckWarning = {
  code: string;
  message: string;
  severity: "info" | "warn";
};

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

export type Step1Output = {
  emotionalTruth: string;
  blueprint: BlueprintPoint[];
  copingToolPlacement: string;
  approachInstruction: string;
  inferredIntention?: InferredIntention;
  compressionMetadata?: CompressionMetadata;
  characterNotesContradictions?: ContradictionFlag[];
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
};

// A single page as emitted by the Step 2 Author.
// Illustration-specific fields (scene, emotionalTone, etc.) are added later
// when the page is extended for the Story model and illustration pipeline.
export type StoryPage = {
  pageNumber: number;
  text: string;
  wordCount: number;
};

export type PageCountDrift = "within_range" | "under" | "over";

export type Step2Output = {
  title: string;
  // Legacy single-string story body — kept for backward compat.
  // Derived from joining pages[].text once pages are populated.
  story: string;
  wordCount: number;
  targetWordRange: readonly [number, number];
  wordCountDrift: "within_range" | "under" | "over";
  // Structured page output — populated by the JSON-format parser (Step 0.4).
  // Optional until the parser is updated; required thereafter.
  pages?: StoryPage[];
  pageCount?: number;
  targetPageRange?: readonly [number, number];
  pageCountDrift?: PageCountDrift;
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
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
  // Which page the flag concerns. null = whole-story flag. Undefined when
  // the validator ran against a legacy single-string story (no page data).
  pageNumber?: number | null;
};

export type PostValidationResult = {
  result: "PASS" | "FLAGS";
  flags: PostValidationFlag[];
  alignmentNote: string;
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
};

// Public output
export type Agent1Result = {
  generationId: string;
  // Which AI model authored this version. Optional for backward compatibility
  // with versions generated before multi-model support.
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
  // Legacy single-string body — derived from joining pages[].text.
  story: string;
  wordCount: number;
  targetWordRange: readonly [number, number];
  wordCountDrift: "within_range" | "under" | "over";
  // Structured page output
  pages?: StoryPage[];
  pageCount?: number;
  targetPageRange?: readonly [number, number];
  pageCountDrift?: PageCountDrift;
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

// Shared types
export type LLMCallRecord = {
  step: "step1_architect" | "step2_author" | "step3_post_validation";
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  attempt: number;
  promptHash: string;
};

// Errors
export class BriefNotReadyError extends Error {
  constructor(public readonly status: string) {
    super(`Brief is not ready for generation. Current status: ${status}`);
    this.name = "BriefNotReadyError";
  }
}

export class UnsupportedStoryTypeError extends Error {
  constructor(public readonly storyType: string) {
    super(
      `Story type "${storyType}" is not supported in pilot v1.0. Only fear_anxiety is supported.`,
    );
    this.name = "UnsupportedStoryTypeError";
  }
}

export class TypeMismatchError extends Error {
  constructor(public readonly fieldType: string) {
    super(
      `Expected typeSpecificField.fieldType "somatic_expression", got "${fieldType}".`,
    );
    this.name = "TypeMismatchError";
  }
}

export class Step1IncoherentError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastRawResponse: string,
  ) {
    super(`Step 1 produced incoherent output after ${attempts} attempts.`);
    this.name = "Step1IncoherentError";
  }
}
