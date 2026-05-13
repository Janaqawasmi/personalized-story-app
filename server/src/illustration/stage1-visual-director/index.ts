import { randomUUID } from "crypto";
import type { VisualBibleArtefact } from "@/illustration/types";
import { VISUAL_DIRECTOR_MODEL } from "@/illustration/constants";
import { callClaude } from "@/illustration/shared/llm-client";
import { buildLLMCallRecord } from "@/illustration/shared/llm-call-record";
import { nextVisualBibleVersion } from "@/illustration/shared/version-allocator";
import { buildVisualDirectorPrompt } from "./prompt-builder";
import { parseVisualDirectorOutput, VisualBibleParseError } from "./output-parser";
import { validateVisualBible } from "./validator";
import type { VisualDirectorInput } from "./types";

export class VisualBibleValidationError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`Visual Bible validation failed: ${reasons.join("; ")}`);
    this.name = "VisualBibleValidationError";
    this.reasons = reasons;
  }
}

export class VisualBibleGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisualBibleGenerationError";
  }
}

export async function runVisualDirector(
  input: VisualDirectorInput,
): Promise<VisualBibleArtefact> {
  const { systemPrompt, userPrompt } = buildVisualDirectorPrompt(input);
  let call;
  try {
    call = await callClaude({
      model: VISUAL_DIRECTOR_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens: 4000,
      expectJson: true,
      retries: 1,
    });
  } catch (e) {
    throw new VisualBibleGenerationError(
      e instanceof Error ? e.message : String(e),
    );
  }

  let parsed;
  try {
    parsed = parseVisualDirectorOutput(call.text);
  } catch (e) {
    if (e instanceof VisualBibleParseError) {
      throw new VisualBibleGenerationError(e.message);
    }
    throw e;
  }

  const v = validateVisualBible(parsed);
  if (!v.ok) {
    throw new VisualBibleValidationError(v.reasons);
  }

  const version = await nextVisualBibleVersion(input.story.id);
  const llmCall = buildLLMCallRecord(
    { ...call, systemPrompt, userPrompt },
    true,
    null,
  );

  const artefact: VisualBibleArtefact = {
    id: randomUUID(),
    storyId: input.story.id,
    version,
    createdAt: Date.now(),
    createdBy: { kind: "system" },
    parentVersion: null,
    source: "llm_generated",
    llmCall,
    ...parsed,
  };

  return artefact;
}

export { VisualBibleParseError } from "./output-parser";