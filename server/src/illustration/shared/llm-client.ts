import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic({ maxRetries: 0 });

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AnthropicHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicHttpError";
    this.status = status;
  }
}

export class AnthropicClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicClientError";
    this.status = status;
  }
}

export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonParseError";
  }
}

function getErrorStatus(err: unknown): number | undefined {
  if (err !== null && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

function isRetryableStatus(status: number | undefined): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 529;
}

function stripJsonFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export type IllustrationModelId =
  | "claude-sonnet-4-5-20250929"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

export interface CallClaudeInput {
  model: IllustrationModelId;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  expectJson: boolean;
  retries?: number;
}

export interface CallClaudeResult {
  text: string;
  jsonParsed: unknown | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
}

export async function callClaude(input: CallClaudeInput): Promise<CallClaudeResult> {
  const retries = input.retries ?? 1;
  const userPrompt = input.expectJson
    ? `${input.userPrompt}\n\nReturn only JSON, no prose.`
    : input.userPrompt;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const start = Date.now();
    try {
      const response = await client.messages.create({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const latencyMs = Date.now() - start;
      let text: string | undefined;
      for (const block of response.content) {
        if (block.type === "text") {
          text = block.text;
          break;
        }
      }
      if (text === undefined) {
        throw new Error("LLM response contained no text block");
      }

      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;

      if (inputTokens > 5000 || outputTokens > 3000) {
        console.warn(
          `[illustration/llm] High token usage model=${input.model} in=${inputTokens} out=${outputTokens}`,
        );
      }

      let jsonParsed: unknown | null = null;
      if (input.expectJson) {
        const trimmed = stripJsonFences(text);
        try {
          jsonParsed = JSON.parse(trimmed);
        } catch {
          lastErr = new JsonParseError("Expected JSON in LLM response");
          const status = getErrorStatus(lastErr);
          if (attempt < retries) {
            await delay(400 * (attempt + 1));
            continue;
          }
          throw lastErr;
        }
      }

      return {
        text,
        jsonParsed,
        inputTokens,
        outputTokens,
        latencyMs,
        model: response.model ?? input.model,
      };
    } catch (err) {
      lastErr = err;
      const status = getErrorStatus(err);
      if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
        throw new AnthropicClientError(
          err instanceof Error ? err.message : String(err),
          status,
        );
      }
      if (status !== undefined && status >= 500) {
        if (attempt < retries && isRetryableStatus(status)) {
          await delay(500 * (attempt + 1));
          continue;
        }
        throw new AnthropicHttpError(
          err instanceof Error ? err.message : String(err),
          status,
        );
      }
      if (err instanceof JsonParseError && attempt < retries) {
        await delay(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
