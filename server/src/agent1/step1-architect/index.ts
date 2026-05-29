import { createHash } from 'crypto';

import type { StoryBrief } from '@/models/storyBrief.model';
import {
  Step1IncoherentError,
  type GenerateOptions,
  type LLMCallRecord,
  type PreCheckResult,
  type Step1Output,
} from '@/agent1/types';
import { callLLM } from '@/agent1/shared/llm-client';

import { buildStep1Prompt } from './prompt-builder';
import { parseStep1Response } from './output-parser';

// Default model for this step. Callers may override per-version (multi-model
// generation) by passing `model`; the model id registry lives in
// @/agent1/shared/models.
const STEP1_MODEL = 'claude-sonnet-4-6';
const STEP1_MAX_TOKENS = 4096;

type ExampleBankStatus =
  | 'examples_used'
  | 'cross_bucket_retrieval'
  | 'cold_start_no_examples';

export async function runStoryArchitect(
  brief: StoryBrief,
  preCheckResult: PreCheckResult,
  options?: GenerateOptions,
  model: string = STEP1_MODEL,
): Promise<{
  step1Output: Step1Output;
  exampleBankStatus: ExampleBankStatus;
}> {
  const { prompt, exampleBankStatus } = buildStep1Prompt(
    brief,
    preCheckResult,
    options,
  );
  const promptHash = createHash('sha256').update(prompt).digest('hex');

  const attempt1 = await callLLM({
    model,
    prompt,
    maxTokens: STEP1_MAX_TOKENS,
    step: 'step1_architect',
    attempt: 1,
  });

  const record1: LLMCallRecord = {
    step: 'step1_architect',
    model,
    inputTokens: attempt1.inputTokens,
    outputTokens: attempt1.outputTokens,
    latencyMs: attempt1.latencyMs,
    attempt: 1,
    promptHash,
  };

  try {
    const step1Output = parseStep1Response(attempt1.text, record1, promptHash);
    return { step1Output, exampleBankStatus };
  } catch {
    // Fall through to one retry — the initial response was incoherent
    // (e.g. missing the required emotional truth section). Transient
    // LLM errors (429/5xx) are handled inside callLLM itself.
  }

  const attempt2 = await callLLM({
    model,
    prompt,
    maxTokens: STEP1_MAX_TOKENS,
    step: 'step1_architect',
    attempt: 2,
  });

  const record2: LLMCallRecord = {
    step: 'step1_architect',
    model,
    inputTokens: attempt2.inputTokens,
    outputTokens: attempt2.outputTokens,
    latencyMs: attempt2.latencyMs,
    attempt: 2,
    promptHash,
  };

  try {
    const step1Output = parseStep1Response(attempt2.text, record2, promptHash);
    return { step1Output, exampleBankStatus };
  } catch {
    throw new Step1IncoherentError(2, attempt2.text);
  }
}
