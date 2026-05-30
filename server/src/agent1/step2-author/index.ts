import { createHash } from 'crypto';

import type { StoryBrief } from '@/models/storyBrief.model';
import type { Step1Output, Step2Output, LLMCallRecord } from '@/agent1/types';
import { callLLM } from '@/agent1/shared/llm-client';

import { buildStep2Prompt } from './prompt-builder';
import { parseStep2Response } from './output-parser';

// Default model for this step. Callers may override per-version (multi-model
// generation) by passing `model`; the model id registry lives in
// @/agent1/shared/models.
const STEP2_MODEL = 'claude-sonnet-4-6';

type ExampleBankStatus =
  | 'examples_used'
  | 'cross_bucket_retrieval'
  | 'cold_start_no_examples';

export async function runAuthor(
  brief: StoryBrief,
  step1Output: Step1Output,
  model: string = STEP2_MODEL,
): Promise<{ step2Output: Step2Output; exampleBankStatus: ExampleBankStatus }> {
  const { prompt, exampleBankStatus } = buildStep2Prompt(brief, step1Output);

  const promptHash = createHash('sha256').update(prompt).digest('hex');

  const llmResult = await callLLM({
    model,
    prompt,
    maxTokens: 8192,
    step: 'step2_author',
    attempt: 1,
  });

  const llmCallRecord: LLMCallRecord = {
    step: 'step2_author',
    model,
    inputTokens: llmResult.inputTokens,
    outputTokens: llmResult.outputTokens,
    latencyMs: llmResult.latencyMs,
    attempt: 1,
    promptHash,
  };

  const step2Output = parseStep2Response(
    llmResult.text,
    brief.ageAndScope.ageRange,
    brief.ageAndScope.storyLength,
    llmCallRecord,
    promptHash,
  );

  return { step2Output, exampleBankStatus };
}
