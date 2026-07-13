/**
 * Shared text-personalization failure types.
 *
 * Kept in `shared/types` (not in the service) so both the persisted document
 * shape (`StoryTemplate.textVariantFailure`) and the service/classifier can
 * import the same definitions without a `shared → services` dependency.
 *
 * These describe WHY text-variant generation failed, so we can tell apart a
 * transient blip (timeout, rate limit, provider hiccup) that self-heals on
 * retry from a real configuration/data problem that needs a human — without
 * ever surfacing the raw provider/model detail to a specialist or caregiver.
 */

export type TextVariantFailureReason =
  /** Request did not complete in time (SDK-level or socket-level timeout). */
  | "timeout"
  /** Provider returned HTTP 429 — too many requests. */
  | "rate_limited"
  /** Provider returned a 5xx / overloaded / server-side error. */
  | "provider_error"
  /** Could not reach the provider at all (DNS, connection reset, offline). */
  | "network_error"
  /** No / invalid API credentials — an environment configuration problem. */
  | "missing_api_config"
  /** Response arrived but was unusable (empty, truncated, wrong shape/pages). */
  | "invalid_model_response"
  /** Response body was not valid JSON. */
  | "json_parse_error"
  /** A generated variant dropped a placeholder its source text required. */
  | "placeholder_validation"
  /** Anything else — an unexpected internal error worth investigating. */
  | "internal_error";

/**
 * Durable, queryable record of the last text-variant generation failure,
 * written onto the template document so a failed publish is never silent and
 * can be found + retried by the repair job / manual retry endpoint.
 *
 * `detail` is a TECHNICAL string for logs/diagnostics only — it must never be
 * shown to a specialist or caregiver.
 */
export interface TextVariantFailureInfo {
  reason: TextVariantFailureReason;
  /** Whether this reason is the kind that a fresh attempt could recover from. */
  retryable: boolean;
  /** How many attempts were made before giving up. */
  attempts: number;
  /** Technical detail for diagnostics (server-side only, never user-facing). */
  detail: string;
  /** Epoch milliseconds when the final attempt failed. */
  failedAt: number;
}

/**
 * Neutral, user-safe message for any surface a specialist or caregiver can
 * see. Intentionally free of provider/model/parse wording.
 */
export const TEXT_VARIANT_UNAVAILABLE_MESSAGE =
  "Text personalization is temporarily unavailable and will be retried automatically.";
