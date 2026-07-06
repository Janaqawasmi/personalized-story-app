import type { TextVariantsResponse } from "../../api/specialistTemplatesApi";

export type TextVariantOverallStatus =
  | "not_personalizable"
  | "not_started"
  | "generating"
  | "pending_review"
  | "ready";

/**
 * Derives a single, display-friendly status from the raw text-variant
 * review payload (server/src/services/textVariants.service.ts:getTextVariants).
 *
 * `textVariantStatus` alone can't distinguish "never generated" from
 * "already finalized" — finalizeTextVariants() clears it back to "none" once
 * done, so `textPersonalizationReady` is checked first to catch that case.
 */
export function deriveTextVariantStatus(
  data: Pick<
    TextVariantsResponse,
    "personalizationEnabled" | "textVariantStatus" | "textPersonalizationReady" | "variants"
  >,
): TextVariantOverallStatus {
  if (!data.personalizationEnabled) return "not_personalizable";
  if (data.textPersonalizationReady) return "ready";
  if (data.textVariantStatus === "generating") return "generating";
  if (data.textVariantStatus === "pending_review" || data.variants.length > 0) {
    return "pending_review";
  }
  return "not_started";
}
