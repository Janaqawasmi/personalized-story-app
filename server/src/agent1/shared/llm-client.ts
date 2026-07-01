import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import * as fs from "fs";
import * as path from "path";
import {
  OPENAI_REASONING_RETRY_COMPLETION_TOKENS,
  openAICompletionTokenBudget,
} from "./models";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const client = new Anthropic({ maxRetries: 0 });

// OpenAI is lazily constructed so that Anthropic-only runs (and tests) never
// require OPENAI_API_KEY to be set. Only story versions authored by a GPT model
// touch this client.
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ maxRetries: 0 });
  }
  return openaiClient;
}

/** Provider is inferred from the model id: anything starting with "gpt" is OpenAI. */
function isOpenAIModel(model: string): boolean {
  return model.startsWith("gpt");
}

interface ProviderCallResult {
  text: string | undefined;
  inputTokens: number;
  outputTokens: number;
  finishReason: string | undefined;
}

async function callAnthropic(
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<ProviderCallResult> {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  let text: string | undefined;
  for (const block of response.content) {
    if (block.type === "text") {
      text = block.text;
      break;
    }
  }

  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    finishReason: undefined,
  };
}

/** Normalize OpenAI message.content (string or structured parts) to plain text. */
export function extractOpenAIMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined,
): string | undefined {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? content : undefined;
  }
  if (!Array.isArray(content)) {
    return undefined;
  }
  const parts: string[] = [];
  for (const part of content) {
    if (part?.type === "text" && typeof part.text === "string" && part.text.length > 0) {
      parts.push(part.text);
    }
  }
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : undefined;
}

async function callOpenAI(
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<ProviderCallResult> {
  const maxCompletionTokens = openAICompletionTokenBudget(model, maxTokens);

  const messages: ChatCompletionMessageParam[] = [{ role: "user", content: prompt }];

  const response = await getOpenAI().chat.completions.create({
    model,
    max_completion_tokens: maxCompletionTokens,
    messages,
    // GPT-5: lower reasoning burn so completion budget remains for visible output.
    ...(model.includes("gpt-5") ? { reasoning_effort: "low" as const } : {}),
  });

  const choice = response.choices[0];
  const text = extractOpenAIMessageText(choice?.message?.content);

  return {
    text,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    finishReason: choice?.finish_reason ?? undefined,
  };
}

const LOG_PATH = path.resolve(process.cwd(), "logs", "agent1-calls.jsonl");

interface CallLogEntry {
  timestamp: string;
  step: string;
  model: string;
  attempt: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  /** Raw text returned by the LLM (first text block). */
  rawText?: string;
}

function appendLogLine(entry: CallLogEntry): void {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write story-generation LLM call log:", err);
  }
}

function getErrorStatus(err: unknown): number | undefined {
  if (err !== null && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

function isTransientStatus(status: number | undefined): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 529
  );
}

function errorMessageFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export class NoTextBlockError extends Error {
  readonly finishReason: string | undefined;

  constructor(finishReason: string | undefined = undefined) {
    const detail =
      finishReason === "length"
        ? "LLM hit the completion token limit before producing visible output"
        : "LLM response contained no text block";
    super(detail);
    this.name = "NoTextBlockError";
    this.finishReason = finishReason;
  }
}

export interface LLMCallInput {
  model: string;
  prompt: string;
  maxTokens: number;
  /** Which pipeline step is making this call. Used for logging. */
  step: "step1_architect" | "step2_author" | "step3_post_validation" | "text_variant_generation";
  /** Attempt number (1 = first try, 2 = retry). Passed through to logs. */
  attempt: number;
}

export interface LLMCallOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export async function callLLM(input: LLMCallInput): Promise<LLMCallOutput> {
  const startTime = Date.now();

  try {
    const { text, inputTokens, outputTokens, finishReason } = isOpenAIModel(input.model)
      ? await callOpenAI(input.model, input.prompt, input.maxTokens)
      : await callAnthropic(input.model, input.prompt, input.maxTokens);

    const latencyMs = Date.now() - startTime;

    if (text === undefined) {
      appendLogLine({
        timestamp: new Date().toISOString(),
        step: input.step,
        model: input.model,
        attempt: input.attempt,
        inputTokens,
        outputTokens,
        latencyMs,
        success: false,
        errorMessage: finishReason
          ? `LLM response contained no text block (finish_reason=${finishReason})`
          : "LLM response contained no text block",
      });

      if (
        isOpenAIModel(input.model) &&
        input.attempt === 1 &&
        openAICompletionTokenBudget(input.model, input.maxTokens) <
          OPENAI_REASONING_RETRY_COMPLETION_TOKENS
      ) {
        await delay(1000);
        return callLLM({
          ...input,
          maxTokens: OPENAI_REASONING_RETRY_COMPLETION_TOKENS,
          attempt: 2,
        });
      }

      throw new NoTextBlockError(finishReason);
    }

    appendLogLine({
      timestamp: new Date().toISOString(),
      step: input.step,
      model: input.model,
      attempt: input.attempt,
      inputTokens,
      outputTokens,
      latencyMs,
      success: true,
      rawText: text,
    });

    return { text, inputTokens, outputTokens, latencyMs };
  } catch (err) {
    if (err instanceof NoTextBlockError) {
      throw err;
    }

    const latencyMs = Date.now() - startTime;
    const status = getErrorStatus(err);
    const msg = errorMessageFrom(err);

    appendLogLine({
      timestamp: new Date().toISOString(),
      step: input.step,
      model: input.model,
      attempt: input.attempt,
      latencyMs,
      success: false,
      errorMessage: msg,
    });

    if (isTransientStatus(status) && input.attempt === 1) {
      await delay(2000);
      return callLLM({ ...input, attempt: 2 });
    }

    throw err;
  }
}
