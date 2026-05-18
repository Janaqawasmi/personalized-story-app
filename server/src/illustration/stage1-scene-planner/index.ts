import { randomUUID } from "crypto";
import type { ScenePlanArtefact } from "@/illustration/types";
import { SCENE_PLANNER_MODEL } from "@/illustration/constants";
import { callClaude } from "@/illustration/shared/llm-client";
import { buildLLMCallRecord } from "@/illustration/shared/llm-call-record";
import { mapWithConcurrency } from "@/illustration/shared/concurrency";
import { nextScenePlanVersion } from "@/illustration/shared/version-allocator";
import { buildScenePlannerPrompt, buildScenePlannerRegenPrompt } from "./prompt-builder";
import { parseScenePlanOutput, ScenePlanParseError } from "./output-parser";
import { validateScenePlan } from "./validator";
import type { ScenePlannerInput, ScenePlannerRegenInput } from "./types";

export class ScenePlanValidationError extends Error {
  readonly reasons: string[];
  readonly pageNumber: number;

  constructor(pageNumber: number, reasons: string[]) {
    super(`Scene plan validation failed (page ${pageNumber}): ${reasons.join("; ")}`);
    this.name = "ScenePlanValidationError";
    this.reasons = reasons;
    this.pageNumber = pageNumber;
  }
}

export class ScenePlanGenerationError extends Error {
  readonly pageNumber: number;

  constructor(pageNumber: number, message: string) {
    super(message);
    this.name = "ScenePlanGenerationError";
    this.pageNumber = pageNumber;
  }
}

export async function runScenePlannerForPage(
  input: ScenePlannerRegenInput,
): Promise<ScenePlanArtefact> {
  const pageNumber = input.pageNumber;
  const { systemPrompt, userPrompt } = buildScenePlannerRegenPrompt(input);
  let call;
  try {
    call = await callClaude({
      model: SCENE_PLANNER_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens: 2500,
      expectJson: true,
      retries: 1,
    });
  } catch (e) {
    throw new ScenePlanGenerationError(
      pageNumber,
      e instanceof Error ? e.message : String(e),
    );
  }

  let parsed;
  try {
    parsed = parseScenePlanOutput(call.text);
  } catch (e) {
    if (e instanceof ScenePlanParseError) {
      throw new ScenePlanGenerationError(pageNumber, e.message);
    }
    throw e;
  }

  const v = validateScenePlan(parsed);
  if (!v.ok) {
    throw new ScenePlanValidationError(pageNumber, v.reasons);
  }

  const version = await nextScenePlanVersion(input.story.id, pageNumber);
  const llmCall = buildLLMCallRecord(
    { ...call, systemPrompt, userPrompt },
    true,
    null,
  );

  const artefact: ScenePlanArtefact = {
    id: randomUUID(),
    storyId: input.story.id,
    pageNumber,
    version,
    createdAt: Date.now(),
    parentVersion: input.previousScenePlan.version,
    llmCall,
    visualBibleVersion: input.visualBible.version,
    feedbackNote: input.feedbackNote,
    structuredPrompt: null,
    ...parsed,
  };

  return artefact;
}

async function runOnePage(
  input: ScenePlannerInput,
  pageNumber: number,
): Promise<ScenePlanArtefact> {
  const { systemPrompt, userPrompt } = buildScenePlannerPrompt(input, pageNumber);
  let call;
  try {
    call = await callClaude({
      model: SCENE_PLANNER_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens: 2500,
      expectJson: true,
      retries: 1,
    });
  } catch (e) {
    throw new ScenePlanGenerationError(
      pageNumber,
      e instanceof Error ? e.message : String(e),
    );
  }

  let parsed;
  try {
    parsed = parseScenePlanOutput(call.text);
  } catch (e) {
    if (e instanceof ScenePlanParseError) {
      throw new ScenePlanGenerationError(pageNumber, e.message);
    }
    throw e;
  }

  const v = validateScenePlan(parsed);
  if (!v.ok) {
    throw new ScenePlanValidationError(pageNumber, v.reasons);
  }

  const version = await nextScenePlanVersion(input.story.id, pageNumber);
  const llmCall = buildLLMCallRecord(
    { ...call, systemPrompt, userPrompt },
    true,
    null,
  );

  const artefact: ScenePlanArtefact = {
    id: randomUUID(),
    storyId: input.story.id,
    pageNumber,
    version,
    createdAt: Date.now(),
    parentVersion: null,
    llmCall,
    visualBibleVersion: input.visualBible.version,
    feedbackNote: null,
    structuredPrompt: null,
    ...parsed,
  };

  return artefact;
}

export async function runScenePlanner(
  input: ScenePlannerInput,
): Promise<ScenePlanArtefact[]> {
  const pages = [...input.manuscriptPages].sort((a, b) => a.pageNumber - b.pageNumber);
  const results = await mapWithConcurrency(pages, 3, (p) => runOnePage(input, p.pageNumber));
  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}
