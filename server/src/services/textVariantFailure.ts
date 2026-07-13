/**
 * Failure classifier for text-variant generation.
 *
 * Turns whatever error the LLM path threw (our own TextVariantError, the LLM
 * client's NoTextBlockError, an Anthropic/OpenAI SDK HTTP error, a raw socket
 * error, or a missing-credentials error) into a single {@link TextVariantFailureReason}
 * plus a `retryable` flag. This is the one place that decides whether a
 * failure self-heals on retry (timeout, rate limit, provider blip, a bad model
 * sample) or needs a human (missing API config, an unexpected internal bug).
 *
 * It classifies structurally (by `name` / `code` / `status` / message) rather
 * than importing TextVariantError, so it stays free of a circular dependency
 * with textVariants.service.ts.
 */

import type { TextVariantFailureReason } from "@/shared/types/textVariant";

export interface ClassifiedFailure {
  reason: TextVariantFailureReason;
  /** True when a fresh attempt has a real chance of succeeding. */
  retryable: boolean;
  /** Technical detail for logs/diagnostics only — never shown to end users. */
  detail: string;
}

function readString(err: unknown, key: "name" | "code"): string | undefined {
  if (err && typeof err === "object" && key in err) {
    const v = (err as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function readStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function readMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Classify a text-variant generation error. Order matters: our own typed
 * errors and explicit HTTP status codes are the most reliable signals, so they
 * are checked before falling back to message/name heuristics.
 */
export function classifyTextVariantFailure(err: unknown): ClassifiedFailure {
  const name = readString(err, "name") ?? "";
  const code = readString(err, "code");
  const status = readStatus(err);
  const message = readMessage(err);
  const lower = message.toLowerCase();

  // 1. Our own TextVariantError, thrown by the parse/validate stages.
  if (name === "TextVariantError") {
    if (code === "VALIDATION_FAILED") {
      // A dropped placeholder is a bad model sample — a fresh sample may keep it.
      return { reason: "placeholder_validation", retryable: true, detail: message };
    }
    if (code === "GENERATION_FAILED") {
      if (lower.includes("not valid json") || lower.includes("not a json array")) {
        return { reason: "json_parse_error", retryable: true, detail: message };
      }
      // Missing pages / wrong-typed fields / other structural response problems.
      return { reason: "invalid_model_response", retryable: true, detail: message };
    }
    // NOT_PERSONALIZABLE / TEMPLATE_NOT_FOUND are precondition errors, not
    // generation failures — retrying cannot help.
    return { reason: "internal_error", retryable: false, detail: message };
  }

  // 2. LLM produced no usable text block (often a length-capped/empty
  // response) — the LLM client throws NoTextBlockError, matched by name so this
  // module stays free of the LLM client's import graph.
  if (name === "NoTextBlockError") {
    return { reason: "invalid_model_response", retryable: true, detail: message };
  }

  // 3. HTTP status from the provider SDK — the most precise signal available.
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return { reason: "missing_api_config", retryable: false, detail: `HTTP ${status}: ${message}` };
    }
    if (status === 408) {
      return { reason: "timeout", retryable: true, detail: `HTTP ${status}: ${message}` };
    }
    if (status === 429) {
      return { reason: "rate_limited", retryable: true, detail: `HTTP ${status}: ${message}` };
    }
    if (status >= 500) {
      return { reason: "provider_error", retryable: true, detail: `HTTP ${status}: ${message}` };
    }
    // Other 4xx (400/404/422 …) — a malformed request; retrying won't help.
    return { reason: "provider_error", retryable: false, detail: `HTTP ${status}: ${message}` };
  }

  // 4. Missing / unresolved credentials (thrown before any HTTP round-trip).
  if (
    lower.includes("could not resolve authentication") ||
    lower.includes("api key") ||
    lower.includes("apikey") ||
    lower.includes("api_key") ||
    lower.includes("anthropic_api_key") ||
    lower.includes("openai_api_key") ||
    lower.includes("unauthorized")
  ) {
    return { reason: "missing_api_config", retryable: false, detail: message };
  }

  // 5. Timeouts with no HTTP status (SDK/socket level).
  if (
    name.toLowerCase().includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT"
  ) {
    return { reason: "timeout", retryable: true, detail: message };
  }

  // 6. Network / connection errors that never reached the provider.
  if (
    name.toLowerCase().includes("connection") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("socket hang up") ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return { reason: "network_error", retryable: true, detail: message };
  }

  // 7. Anything else — surface it as an internal error for investigation.
  return { reason: "internal_error", retryable: false, detail: message };
}
