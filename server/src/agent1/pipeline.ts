import { v4 as uuidv4 } from "uuid";

import { firestore } from "@/config/firebase";
import type { StoryBrief } from "@/models/storyBrief.model";
import type {
  Agent1Result,
  PreCheckResult,
  Step1Output,
  Step2Output,
  PostValidationResult,
  LLMCallRecord,
  GenerateOptions,
  RerunFeedback,
} from "@/agent1/types";
import {
  BriefNotReadyError,
  UnsupportedStoryTypeError,
  TypeMismatchError,
} from "@/agent1/types";
import { runPreCheck } from "@/agent1/pre-check";
import { runStoryArchitect } from "@/agent1/step1-architect";
import { runAuthor } from "@/agent1/step2-author";
import { runPostValidation } from "@/agent1/step3-post-validation";

const BRIEF_COLLECTION = "dammaStoryBriefs";

function resolveExampleBankStatus(
  step1Status: Agent1Result["exampleBankStatus"],
  step2Status: Agent1Result["exampleBankStatus"],
): Agent1Result["exampleBankStatus"] {
  const priority: Agent1Result["exampleBankStatus"][] = [
    "cold_start_no_examples",
    "cross_bucket_retrieval",
    "examples_used",
  ];
  const s1 = priority.indexOf(step1Status);
  const s2 = priority.indexOf(step2Status);
  return priority[Math.min(s1, s2)]!;
}

export async function executePipelineWithBrief(
  brief: StoryBrief,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  if (brief.status !== "submitted") {
    throw new BriefNotReadyError(brief.status);
  }

  if (brief.storyType !== "fear_anxiety") {
    throw new UnsupportedStoryTypeError(brief.storyType);
  }

  const fieldType =
    brief.therapeuticArchitecture?.typeSpecificField?.fieldType ?? "missing";
  if (fieldType !== "somatic_expression") {
    throw new TypeMismatchError(fieldType);
  }

  const preCheckResult = runPreCheck(brief);

  const { step1Output, exampleBankStatus: step1ExampleStatus } =
    await runStoryArchitect(brief, preCheckResult);

  const { step2Output, exampleBankStatus: step2ExampleStatus } =
    await runAuthor(brief, step1Output);

  const postValidationResult = await runPostValidation(
    step2Output,
    brief,
    step1Output.approachInstruction,
  );

  const generationId = uuidv4();

  const llmCalls: LLMCallRecord[] = [
    step1Output.llmCallRecord,
    step2Output.llmCallRecord,
    postValidationResult.llmCallRecord,
  ];

  const totalLatencyMs = llmCalls.reduce((sum, r) => sum + r.latencyMs, 0);

  const exampleBankStatus = resolveExampleBankStatus(
    step1ExampleStatus,
    step2ExampleStatus,
  );

  const rerunCount = options?.feedback
    ? options.feedback.previousOutput.rerunCount + 1
    : 0;

  const result: Agent1Result = {
    generationId,

    // Step 1
    emotionalTruth: step1Output.emotionalTruth,
    blueprint: step1Output.blueprint,
    copingToolPlacement: step1Output.copingToolPlacement,
    approachInstruction: step1Output.approachInstruction,
    ...(step1Output.inferredIntention !== undefined
      ? { inferredIntention: step1Output.inferredIntention }
      : {}),
    ...(step1Output.compressionMetadata !== undefined
      ? { compressionMetadata: step1Output.compressionMetadata }
      : {}),
    ...(step1Output.characterNotesContradictions !== undefined
      ? { characterNotesContradictions: step1Output.characterNotesContradictions }
      : {}),

    // Step 2
    title: step2Output.title,
    story: step2Output.story,
    wordCount: step2Output.wordCount,
    targetWordRange: step2Output.targetWordRange,
    wordCountDrift: step2Output.wordCountDrift,
    ...(step2Output.pages !== undefined ? { pages: step2Output.pages } : {}),
    ...(step2Output.pageCount !== undefined ? { pageCount: step2Output.pageCount } : {}),
    ...(step2Output.targetPageRange !== undefined ? { targetPageRange: step2Output.targetPageRange } : {}),
    ...(step2Output.pageCountDrift !== undefined ? { pageCountDrift: step2Output.pageCountDrift } : {}),

    // Step 3
    alignmentNote: postValidationResult.alignmentNote,
    postValidationFlags: postValidationResult.flags,

    // Pre-check
    preCheckWarnings: preCheckResult.warnings,

    // Few-shot
    exampleBankStatus,

    // Rerun
    rerunCount,
    ...(options?.feedback ? { rerunOf: options.feedback.rerunOf } : {}),

    // Telemetry
    totalLatencyMs,
    llmCalls,
    generatedAt: new Date().toISOString(),
  };

  return result;
}

export async function executePipeline(
  briefId: string,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  const doc = await firestore.collection(BRIEF_COLLECTION).doc(briefId).get();

  if (!doc.exists) {
    throw new BriefNotReadyError("not_found");
  }

  const brief = doc.data() as StoryBrief;
  return executePipelineWithBrief(brief, options);
}
