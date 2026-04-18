jest.mock("@/config/firebase", () => {
  const get = jest.fn();
  const doc = jest.fn(() => ({ get }));
  const collection = jest.fn(() => ({ doc }));
  return { firestore: { collection } };
});

jest.mock("@/agent1/pre-check", () => ({
  runPreCheck: jest.fn(),
}));

jest.mock("@/agent1/step1-architect", () => ({
  runStoryArchitect: jest.fn(),
}));

jest.mock("@/agent1/step2-author", () => ({
  runAuthor: jest.fn(),
}));

jest.mock("@/agent1/step3-post-validation", () => ({
  runPostValidation: jest.fn(),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "00000000-0000-4000-a000-000000000001"),
}));

import { firestore } from "@/config/firebase";
import { runPreCheck } from "@/agent1/pre-check";
import { runStoryArchitect } from "@/agent1/step1-architect";
import { runAuthor } from "@/agent1/step2-author";
import { runPostValidation } from "@/agent1/step3-post-validation";
import {
  BriefNotReadyError,
  UnsupportedStoryTypeError,
  TypeMismatchError,
  Step1IncoherentError,
  type Agent1Result,
  type PreCheckResult,
  type Step1Output,
  type Step2Output,
  type PostValidationResult,
  type LLMCallRecord,
  type GenerateOptions,
} from "@/agent1/types";

import { executePipeline, executePipelineWithBrief } from "@/agent1/pipeline";
import { generateStoryDraft, generateStoryDraftFromBrief } from "@/agent1/index";

const mockRunPreCheck = runPreCheck as jest.MockedFunction<typeof runPreCheck>;
const mockRunStoryArchitect = runStoryArchitect as jest.MockedFunction<
  typeof runStoryArchitect
>;
const mockRunAuthor = runAuthor as jest.MockedFunction<typeof runAuthor>;
const mockRunPostValidation = runPostValidation as jest.MockedFunction<
  typeof runPostValidation
>;

const mockGet = (firestore.collection as jest.Mock)("x").doc("x")
  .get as jest.Mock;

function makeBriefDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      status: "submitted",
      storyType: "fear_anxiety",
      createdAt: { seconds: 0, nanoseconds: 0 },
      updatedAt: { seconds: 0, nanoseconds: 0 },
      createdBy: "uid-1",
      version: 1,
      ageAndScope: {
        ageRange: "5-7",
        peakIntensity: "moderate",
        storyLength: "standard",
      },
      clinicalFoundation: {
        population: "p",
        trigger: "t",
        therapeuticIntention: { feel: "safe", because: "reason" },
        creativeVision: "v",
      },
      therapeuticArchitecture: {
        primaryApproach: "graduated_exposure",
        shameDimension: "not_significant",
        typeSpecificField: {
          fieldType: "somatic_expression",
          selections: ["restless_fidgety"],
        },
        copingTool: "counting",
        resolutionCompleteness: "partial",
        mustNeverList: ["Never minimize fear"],
      },
      storyWorld: {
        personalization: false,
        protagonistGender: "girl",
        protagonistType: "child",
        protagonistAge: "same_age",
        caregiverPresence: "present_and_comforting",
        narrativeDistance: "direct",
      },
      personalizationConfig: {},
      ...overrides,
    }),
  };
}

function makePreCheckResult(): PreCheckResult {
  return {
    qualityGate: { triggerThin: false, intentionThin: false },
    vagueIntention: { isVague: false },
    complexityBudget: {
      totalPageCost: 5,
      availablePageRange: [8, 12] as const,
      state: "green",
      contributions: [],
    },
    warnings: [{ code: "test_warn", message: "Test warning", severity: "info" }],
  };
}

function makeLLMCallRecord(
  step: LLMCallRecord["step"],
  latencyMs: number,
): LLMCallRecord {
  return {
    step,
    model: "claude-sonnet-4-6",
    inputTokens: 100,
    outputTokens: 50,
    latencyMs,
    attempt: 1,
    promptHash: "a".repeat(64),
  };
}

function makeStep1Output(): Step1Output {
  return {
    emotionalTruth: "The child feels scared.",
    blueprint: [
      { index: 1, text: "Opening" },
      { index: 2, text: "Build" },
      { index: 3, text: "Peak" },
      { index: 4, text: "Coping" },
      { index: 5, text: "Resolution" },
      { index: 6, text: "Close" },
    ],
    copingToolPlacement: "Scene 4",
    approachInstruction: "Use graduated exposure.",
    rawResponse: "raw-step1",
    promptHash: "a".repeat(64),
    llmCallRecord: makeLLMCallRecord("step1_architect", 1000),
  };
}

function makeStep2Output(): Step2Output {
  return {
    title: "The Brave Little Fox",
    story: "Once upon a time...",
    wordCount: 350,
    targetWordRange: [300, 450] as const,
    wordCountDrift: "within_range",
    rawResponse: "raw-step2",
    promptHash: "b".repeat(64),
    llmCallRecord: makeLLMCallRecord("step2_author", 2000),
  };
}

function makePostValidationResult(): PostValidationResult {
  return {
    result: "PASS",
    flags: [],
    alignmentNote: "Story aligns well with the brief.",
    rawResponse: "raw-step3",
    promptHash: "c".repeat(64),
    llmCallRecord: makeLLMCallRecord("step3_post_validation", 500),
  };
}

function setupHappyPath(
  step1ExampleStatus: Agent1Result["exampleBankStatus"] = "examples_used",
  step2ExampleStatus: Agent1Result["exampleBankStatus"] = "examples_used",
) {
  mockGet.mockResolvedValue(makeBriefDoc());
  mockRunPreCheck.mockReturnValue(makePreCheckResult());
  mockRunStoryArchitect.mockResolvedValue({
    step1Output: makeStep1Output(),
    exampleBankStatus: step1ExampleStatus,
  });
  mockRunAuthor.mockResolvedValue({
    step2Output: makeStep2Output(),
    exampleBankStatus: step2ExampleStatus,
  });
  mockRunPostValidation.mockResolvedValue(makePostValidationResult());
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Test group 1: Happy path ─────────────────────────────────────────────

describe("Happy path", () => {
  beforeEach(() => setupHappyPath());

  it("test 1: executePipeline resolves with an Agent1Result", async () => {
    const result = await executePipeline("brief-123");
    expect(result).toBeDefined();
    expect(typeof result.generationId).toBe("string");
  });

  it("test 2: result has the mocked UUID as generationId", async () => {
    const result = await executePipeline("brief-123");
    expect(result.generationId).toBe("00000000-0000-4000-a000-000000000001");
  });

  it("test 3: result has emotionalTruth, blueprint, title, story from mocked sub-modules", async () => {
    const result = await executePipeline("brief-123");
    expect(result.emotionalTruth).toBe("The child feels scared.");
    expect(result.blueprint).toHaveLength(6);
    expect(result.title).toBe("The Brave Little Fox");
    expect(result.story).toBe("Once upon a time...");
  });

  it("test 4: result has alignmentNote and postValidationFlags from post-validation", async () => {
    const result = await executePipeline("brief-123");
    expect(result.alignmentNote).toBe("Story aligns well with the brief.");
    expect(result.postValidationFlags).toEqual([]);
  });

  it("test 5: result has preCheckWarnings from pre-check", async () => {
    const result = await executePipeline("brief-123");
    expect(result.preCheckWarnings).toEqual([
      { code: "test_warn", message: "Test warning", severity: "info" },
    ]);
  });

  it("test 6: llmCalls has length 3", async () => {
    const result = await executePipeline("brief-123");
    expect(result.llmCalls).toHaveLength(3);
    expect(result.llmCalls[0]!.step).toBe("step1_architect");
    expect(result.llmCalls[1]!.step).toBe("step2_author");
    expect(result.llmCalls[2]!.step).toBe("step3_post_validation");
  });

  it("test 7: totalLatencyMs equals the sum of three call records", async () => {
    const result = await executePipeline("brief-123");
    expect(result.totalLatencyMs).toBe(1000 + 2000 + 500);
  });

  it("test 8: rerunCount is 0 when no feedback", async () => {
    const result = await executePipeline("brief-123");
    expect(result.rerunCount).toBe(0);
  });

  it("test 9: generatedAt is a valid ISO timestamp string", async () => {
    const result = await executePipeline("brief-123");
    expect(typeof result.generatedAt).toBe("string");
    const parsed = Date.parse(result.generatedAt);
    expect(Number.isNaN(parsed)).toBe(false);
  });
});

// ─── Test group 2: Brief assertions ──────────────────────────────────────

describe("Brief assertions", () => {
  it("test 10: brief not found → throws BriefNotReadyError", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    await expect(executePipeline("missing")).rejects.toThrow(BriefNotReadyError);
  });

  it("test 11: brief status is draft → throws BriefNotReadyError", async () => {
    mockGet.mockResolvedValue(makeBriefDoc({ status: "draft" }));
    await expect(executePipeline("brief-123")).rejects.toThrow(
      BriefNotReadyError,
    );
  });

  it("test 12: brief storyType is big_emotions → throws UnsupportedStoryTypeError", async () => {
    mockGet.mockResolvedValue(makeBriefDoc({ storyType: "big_emotions" }));
    await expect(executePipeline("brief-123")).rejects.toThrow(
      UnsupportedStoryTypeError,
    );
  });

  it("test 13: brief fieldType is emotion_appearance → throws TypeMismatchError", async () => {
    mockGet.mockResolvedValue(
      makeBriefDoc({
        therapeuticArchitecture: {
          primaryApproach: "graduated_exposure",
          shameDimension: "not_significant",
          typeSpecificField: {
            fieldType: "emotion_appearance",
            text: "Angry face",
          },
          copingTool: "counting",
          resolutionCompleteness: "partial",
          mustNeverList: ["x"],
        },
      }),
    );
    await expect(executePipeline("brief-123")).rejects.toThrow(
      TypeMismatchError,
    );
  });
});

// ─── Test group 3: Rerun handling ─────────────────────────────────────────

describe("Rerun handling", () => {
  beforeEach(() => setupHappyPath());

  function makeRerunResult(): Agent1Result {
    return {
      generationId: "prev-gen-id",
      emotionalTruth: "",
      blueprint: [],
      copingToolPlacement: "",
      approachInstruction: "",
      title: "",
      story: "",
      wordCount: 0,
      targetWordRange: [0, 0] as const,
      wordCountDrift: "within_range",
      alignmentNote: "",
      postValidationFlags: [],
      preCheckWarnings: [],
      exampleBankStatus: "examples_used",
      rerunCount: 1,
      totalLatencyMs: 0,
      llmCalls: [],
      generatedAt: new Date().toISOString(),
    };
  }

  it("test 14: with feedback → rerunCount is previousOutput.rerunCount + 1", async () => {
    const options: GenerateOptions = {
      feedback: {
        rerunOf: "prev-gen-id",
        approvedParts: ["emotionalTruth"],
        feedbackText: "Make the story shorter.",
        previousOutput: makeRerunResult(),
      },
    };
    const result = await executePipeline("brief-123", options);
    expect(result.rerunCount).toBe(2);
  });

  it("test 15: with feedback → rerunOf is set to feedback.rerunOf", async () => {
    const options: GenerateOptions = {
      feedback: {
        rerunOf: "prev-gen-id",
        approvedParts: ["emotionalTruth"],
        feedbackText: "Make the story shorter.",
        previousOutput: makeRerunResult(),
      },
    };
    const result = await executePipeline("brief-123", options);
    expect(result.rerunOf).toBe("prev-gen-id");
  });

  it("test 16: without feedback → rerunOf is absent from the result", async () => {
    const result = await executePipeline("brief-123");
    expect("rerunOf" in result).toBe(false);
  });
});

// ─── Test group 4: Example bank status resolution ─────────────────────────

describe("Example bank status resolution", () => {
  it("test 17: both steps examples_used → examples_used", async () => {
    setupHappyPath("examples_used", "examples_used");
    const result = await executePipeline("brief-123");
    expect(result.exampleBankStatus).toBe("examples_used");
  });

  it("test 18: step1 cross_bucket, step2 examples_used → cross_bucket_retrieval", async () => {
    setupHappyPath("cross_bucket_retrieval", "examples_used");
    const result = await executePipeline("brief-123");
    expect(result.exampleBankStatus).toBe("cross_bucket_retrieval");
  });

  it("test 19: step1 examples_used, step2 cold_start → cold_start_no_examples", async () => {
    setupHappyPath("examples_used", "cold_start_no_examples");
    const result = await executePipeline("brief-123");
    expect(result.exampleBankStatus).toBe("cold_start_no_examples");
  });
});

// ─── Test group 5: Error propagation ──────────────────────────────────────

describe("Error propagation", () => {
  it("test 20: runStoryArchitect throws Step1IncoherentError → pipeline rejects", async () => {
    mockGet.mockResolvedValue(makeBriefDoc());
    mockRunPreCheck.mockReturnValue(makePreCheckResult());
    mockRunStoryArchitect.mockRejectedValue(
      new Step1IncoherentError(2, "garbled"),
    );

    await expect(executePipeline("brief-123")).rejects.toThrow(
      Step1IncoherentError,
    );
  });

  it("test 21: post-validation soft-fail result does not break the pipeline", async () => {
    setupHappyPath();
    mockRunPostValidation.mockResolvedValue({
      result: "PASS",
      flags: [],
      alignmentNote:
        "Post-validation was unable to complete. The story has been returned without validation flags. Please review manually.",
      rawResponse: "",
      promptHash: "",
      llmCallRecord: {
        step: "step3_post_validation",
        model: "claude-sonnet-4-6",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        attempt: 1,
        promptHash: "",
      },
    });

    const result = await executePipeline("brief-123");
    expect(result.alignmentNote).toContain("unable to complete");
    expect(result.postValidationFlags).toEqual([]);
  });
});

// ─── Test group 6: Public API ─────────────────────────────────────────────

describe("Public API", () => {
  it("test 22: generateStoryDraft delegates to executePipeline", async () => {
    setupHappyPath();
    const result = await generateStoryDraft("brief-123");
    expect(result).toBeDefined();
    expect(result.generationId).toBe("00000000-0000-4000-a000-000000000001");
  });
});

// ─── Test group 7: executePipelineWithBrief ────────────────────────────────

function makeBrief(overrides: Record<string, unknown> = {}) {
  return makeBriefDoc(overrides).data();
}

describe("executePipelineWithBrief", () => {
  it("test 23: resolves with an Agent1Result when given a valid brief", async () => {
    setupHappyPath();
    const brief = makeBrief();
    const result = await executePipelineWithBrief(brief as any);
    expect(result).toBeDefined();
    expect(typeof result.generationId).toBe("string");
    expect(result.title).toBe("The Brave Little Fox");
    expect(result.story).toBe("Once upon a time...");
  });

  it("test 24: throws BriefNotReadyError when status !== 'submitted'", async () => {
    const brief = makeBrief({ status: "draft" });
    await expect(executePipelineWithBrief(brief as any)).rejects.toThrow(
      BriefNotReadyError,
    );
  });

  it("test 25: throws UnsupportedStoryTypeError when storyType !== 'fear_anxiety'", async () => {
    const brief = makeBrief({ storyType: "big_emotions" });
    await expect(executePipelineWithBrief(brief as any)).rejects.toThrow(
      UnsupportedStoryTypeError,
    );
  });

  it("test 26: throws TypeMismatchError when fieldType !== 'somatic_expression'", async () => {
    const brief = makeBrief({
      therapeuticArchitecture: {
        primaryApproach: "graduated_exposure",
        shameDimension: "not_significant",
        typeSpecificField: {
          fieldType: "emotion_appearance",
          text: "Angry face",
        },
        copingTool: "counting",
        resolutionCompleteness: "partial",
        mustNeverList: ["x"],
      },
    });
    await expect(executePipelineWithBrief(brief as any)).rejects.toThrow(
      TypeMismatchError,
    );
  });
});

// ─── Test group 8: generateStoryDraftFromBrief public API ──────────────────

describe("generateStoryDraftFromBrief", () => {
  it("test 27: delegates to executePipelineWithBrief and returns Agent1Result", async () => {
    setupHappyPath();
    const brief = makeBrief();
    const result = await generateStoryDraftFromBrief(brief as any);
    expect(result).toBeDefined();
    expect(result.generationId).toBe("00000000-0000-4000-a000-000000000001");
    expect(result.title).toBe("The Brave Little Fox");
  });
});

// ─── Test group 9: executePipeline backward compatibility ──────────────────

describe("executePipeline backward compatibility", () => {
  it("test 28: executePipeline still loads from Firestore and returns Agent1Result", async () => {
    setupHappyPath();
    const result = await executePipeline("brief-123");
    expect(result).toBeDefined();
    expect(result.generationId).toBe("00000000-0000-4000-a000-000000000001");
  });
});
