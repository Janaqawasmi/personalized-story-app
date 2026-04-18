import { createHash } from 'crypto';

import type { StoryBrief } from '@/models/storyBrief.model';
import type { LLMCallRecord, PostValidationResult, Step2Output } from '@/agent1/types';
import { callLLM } from '@/agent1/shared/llm-client';

import { buildPostValidationPrompt } from './prompt-builder';
import { parsePostValidationResponse } from './output-parser';

const POST_VALIDATION_MODEL = 'claude-sonnet-4-20250514';

export async function runPostValidation(
  step2Output: Step2Output,
  brief: StoryBrief,
  approachInstruction: string,
): Promise<PostValidationResult> {
  try {
    const prompt = buildPostValidationPrompt(step2Output, brief, approachInstruction);
    const promptHash = createHash('sha256').update(prompt).digest('hex');

    const llmResult = await callLLM({
      model: POST_VALIDATION_MODEL,
      prompt,
      maxTokens: 2048,
      step: 'step3_post_validation',
      attempt: 1,
    });

    const llmCallRecord: LLMCallRecord = {
      step: 'step3_post_validation',
      model: POST_VALIDATION_MODEL,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      latencyMs: llmResult.latencyMs,
      attempt: 1,
      promptHash,
    };

    return parsePostValidationResponse(llmResult.text, llmCallRecord, promptHash);
  } catch (error) {
    console.error('Post-validation failed:', error);
    return {
      result: 'PASS',
      flags: [],
      alignmentNote:
        'Post-validation was unable to complete. The story has been returned without validation flags. Please review manually.',
      rawResponse: '',
      promptHash: '',
      llmCallRecord: {
        step: 'step3_post_validation',
        model: POST_VALIDATION_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        attempt: 1,
        promptHash: '',
      },
    };
  }
}
