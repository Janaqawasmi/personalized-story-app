import type { LLMCallRecord } from "@/illustration/types";
import type { CallClaudeResult } from "./llm-client";

function composePrompt(systemPrompt: string, userPrompt: string): string {
  return `--- SYSTEM ---\n${systemPrompt}\n\n--- USER ---\n${userPrompt}`;
}

export function buildLLMCallRecord(
  call: CallClaudeResult & { systemPrompt: string; userPrompt: string },
  success: boolean,
  error?: string | null,
): LLMCallRecord {
  return {
    model: call.model,
    prompt: composePrompt(call.systemPrompt, call.userPrompt),
    response: call.text,
    inputTokens: call.inputTokens,
    outputTokens: call.outputTokens,
    latencyMs: call.latencyMs,
    success,
    error: error ?? null,
  };
}
