/** @jest-environment node */

/**
 * Unit tests for classifyTextVariantFailure — the single place that decides
 * WHY text-variant generation failed and whether it can self-heal on retry.
 * Every failure reason the reliability fix must tell apart is covered here.
 */

import { classifyTextVariantFailure } from "../textVariantFailure";

/** Error carrying an HTTP `status`, as thrown by the provider SDK. */
function withStatus(status: number, message = "provider error"): Error {
  return Object.assign(new Error(message), { status });
}
/** Error with a specific `name` (e.g. SDK error classes / our typed errors). */
function withName(name: string, message = "err"): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}
/** Error carrying a node `code` (e.g. ECONNRESET). */
function withCode(code: string, message = "err"): Error {
  return Object.assign(new Error(message), { code });
}
/** Our TextVariantError shape: a named error with a `code`. */
function textVariantError(code: string, message: string): Error {
  return Object.assign(withName("TextVariantError", message), { code });
}

describe("classifyTextVariantFailure", () => {
  test("placeholder validation failure → placeholder_validation, retryable", () => {
    const e = textVariantError(
      "VALIDATION_FAILED",
      "Page 1 masculine variant is missing required placeholder(s): {{CHILD_NAME}}.",
    );
    expect(classifyTextVariantFailure(e)).toMatchObject({
      reason: "placeholder_validation",
      retryable: true,
    });
  });

  test("invalid JSON body → json_parse_error, retryable", () => {
    const e = textVariantError("GENERATION_FAILED", "LLM response was not valid JSON.");
    expect(classifyTextVariantFailure(e)).toMatchObject({
      reason: "json_parse_error",
      retryable: true,
    });
  });

  test("missing pages / wrong shape → invalid_model_response, retryable", () => {
    const e = textVariantError("GENERATION_FAILED", "LLM response missing pages: 2.");
    expect(classifyTextVariantFailure(e)).toMatchObject({
      reason: "invalid_model_response",
      retryable: true,
    });
  });

  test("NoTextBlockError → invalid_model_response, retryable", () => {
    expect(classifyTextVariantFailure(withName("NoTextBlockError", "no text block"))).toMatchObject({
      reason: "invalid_model_response",
      retryable: true,
    });
  });

  test("HTTP 429 → rate_limited, retryable", () => {
    expect(classifyTextVariantFailure(withStatus(429))).toMatchObject({
      reason: "rate_limited",
      retryable: true,
    });
  });

  test("HTTP 408 → timeout, retryable", () => {
    expect(classifyTextVariantFailure(withStatus(408))).toMatchObject({
      reason: "timeout",
      retryable: true,
    });
  });

  test("HTTP 5xx → provider_error, retryable", () => {
    expect(classifyTextVariantFailure(withStatus(503))).toMatchObject({
      reason: "provider_error",
      retryable: true,
    });
    expect(classifyTextVariantFailure(withStatus(529))).toMatchObject({
      reason: "provider_error",
      retryable: true,
    });
  });

  test("HTTP 401/403 → missing_api_config, NOT retryable", () => {
    expect(classifyTextVariantFailure(withStatus(401))).toMatchObject({
      reason: "missing_api_config",
      retryable: false,
    });
    expect(classifyTextVariantFailure(withStatus(403))).toMatchObject({
      reason: "missing_api_config",
      retryable: false,
    });
  });

  test("other 4xx (400) → provider_error, NOT retryable", () => {
    expect(classifyTextVariantFailure(withStatus(400))).toMatchObject({
      reason: "provider_error",
      retryable: false,
    });
  });

  test("missing credentials message with no status → missing_api_config, NOT retryable", () => {
    const e = new Error(
      "Could not resolve authentication method. Expected ANTHROPIC_API_KEY to be set.",
    );
    expect(classifyTextVariantFailure(e)).toMatchObject({
      reason: "missing_api_config",
      retryable: false,
    });
  });

  test("SDK timeout (by name/message, no status) → timeout, retryable", () => {
    expect(
      classifyTextVariantFailure(withName("APIConnectionTimeoutError", "Request timed out")),
    ).toMatchObject({ reason: "timeout", retryable: true });
    expect(classifyTextVariantFailure(withCode("ETIMEDOUT", "op timed out"))).toMatchObject({
      reason: "timeout",
      retryable: true,
    });
  });

  test("network / connection error → network_error, retryable", () => {
    expect(classifyTextVariantFailure(withCode("ECONNRESET", "socket hang up"))).toMatchObject({
      reason: "network_error",
      retryable: true,
    });
    expect(
      classifyTextVariantFailure(withName("APIConnectionError", "fetch failed")),
    ).toMatchObject({ reason: "network_error", retryable: true });
  });

  test("unknown error → internal_error, NOT retryable", () => {
    expect(classifyTextVariantFailure(new Error("something unexpected"))).toMatchObject({
      reason: "internal_error",
      retryable: false,
    });
  });

  test("always carries a non-empty technical detail (for logs, never user-facing)", () => {
    expect(classifyTextVariantFailure(new Error("boom")).detail).toContain("boom");
    expect(classifyTextVariantFailure(withStatus(500, "kaboom")).detail).toContain("kaboom");
  });
});
