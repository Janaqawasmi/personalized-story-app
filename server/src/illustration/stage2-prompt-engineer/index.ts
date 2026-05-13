import { PROMPT_ENGINEER_MODEL } from "@/illustration/constants";
import type { LLMCallRecord, ScenePlanArtefact, StructuredPrompt, VisualBibleArtefact } from "@/illustration/types";
import { buildLLMCallRecord } from "@/illustration/shared/llm-call-record";
import { callClaude } from "@/illustration/shared/llm-client";
import { buildPromptEngineerPrompt } from "./prompt-builder";
import { parsePromptEngineerOutput, PromptEngineerParseError } from "./output-parser";
import { validateStructuredPrompt } from "./validator";

export class PromptEngineerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptEngineerError";
  }
}

export interface PromptEngineerResult {
  structuredPrompt: StructuredPrompt;
  stage2LLMCall: LLMCallRecord;
}

export async function runPromptEngineer(input: {
  scenePlan: ScenePlanArtefact;
  visualBible: VisualBibleArtefact;
}): Promise<PromptEngineerResult> {
  const { systemPrompt, userPrompt } = buildPromptEngineerPrompt(input.scenePlan, input.visualBible);

  const runOnce = async (): Promise<PromptEngineerResult> => {
    const call = await callClaude({
      model: PROMPT_ENGINEER_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens: 600,
      expectJson: true,
      retries: 1,
    });
    let parsed: StructuredPrompt;
    try {
      if (call.jsonParsed && typeof call.jsonParsed === "object") {
        parsed = parsePromptEngineerOutput(JSON.stringify(call.jsonParsed));
      } else {
        parsed = parsePromptEngineerOutput(call.text);
      }
    } catch (e) {
      if (e instanceof PromptEngineerParseError) {
        throw new PromptEngineerError(e.message);
      }
      throw e;
    }
    const v = validateStructuredPrompt(parsed);
    if (!v.ok) {
      throw new PromptEngineerError(`Validation failed: ${v.reasons.join("; ")}`);
    }
    const stage2LLMCall = buildLLMCallRecord(
      { ...call, systemPrompt, userPrompt },
      true,
      null,
    );
    return { structuredPrompt: parsed, stage2LLMCall };
  };

  try {
    return await runOnce();
  } catch (first) {
    try {
      return await runOnce();
    } catch (second) {
      throw second instanceof Error ? second : new PromptEngineerError(String(second));
    }
  }
}

export { PromptEngineerParseError } from "./output-parser";
