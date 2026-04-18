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

export async function executePipeline(
  briefId: string,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  // TODO: When rerun feedback is provided, the Step 1 prompt builder
  // should inject a rerun block with previous output and feedback.
  // For v1.0, reruns re-run the full pipeline with the same brief.

  // Step 1: Load and assert the brief
  const doc = await firestore.collection(BRIEF_COLLECTION).doc(briefId).get();

  if (!doc.exists) {
    throw new BriefNotReadyError("not_found");
  }

  const brief = doc.data() as StoryBrief;

  if (brief.status !== "submitted") {
    throw new BriefNotReadyError(brief.status);
  }

  if (brief.storyType !== "fear_anxiety") {
    throw new UnsupportedStoryTypeError(brief.storyType);
  }

  if (
    brief.therapeuticArchitecture.typeSpecificField.fieldType !==
    "somatic_expression"
  ) {
    throw new TypeMismatchError(
      brief.therapeuticArchitecture.typeSpecificField.fieldType,
    );
  }

  // Step 2: Run pre-check (never throws)
  const preCheckResult = runPreCheck(brief);

  // Step 3: Run Step 1 — Story Architect
  const { step1Output, exampleBankStatus: step1ExampleStatus } =
    await runStoryArchitect(brief, preCheckResult);

  // Step 4: Run Step 2 — Author
  const { step2Output, exampleBankStatus: step2ExampleStatus } =
    await runAuthor(brief, step1Output);

  // Step 5: Run Step 3 — Post-Validation (soft-fails internally)
  const postValidationResult = await runPostValidation(
    step2Output,
    brief,
    step1Output.approachInstruction,
  );

  // Step 6: Assemble Agent1Result
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
