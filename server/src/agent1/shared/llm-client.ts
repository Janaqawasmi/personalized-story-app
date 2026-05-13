import { Anthropic } from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const client = new Anthropic({ maxRetries: 0 });

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

class NoTextBlockError extends Error {
  constructor() {
    super("LLM response contained no text block");
    this.name = "NoTextBlockError";
  }
}

export interface LLMCallInput {
  model: string;
  prompt: string;
  maxTokens: number;
  /** Which pipeline step is making this call. Used for logging. */
  step: "step1_architect" | "step2_author" | "step3_post_validation";
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
    const response = await client.messages.create({
      model: input.model,
      max_tokens: input.maxTokens,
      messages: [{ role: "user", content: input.prompt }],
    });

    const latencyMs = Date.now() - startTime;

    let text: string | undefined;
    for (const block of response.content) {
      if (block.type === "text") {
        text = block.text;
        break;
      }
    }

    if (text === undefined) {
      appendLogLine({
        timestamp: new Date().toISOString(),
        step: input.step,
        model: input.model,
        attempt: input.attempt,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        latencyMs,
        success: false,
        errorMessage: "LLM response contained no text block",
      });
      throw new NoTextBlockError();
    }

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

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
