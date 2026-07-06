import type { TextVariantsResponse } from "../../api/specialistTemplatesApi";

export type TextVariantOverallStatus =
  | "not_personalizable"
  | "not_started"
  | "generating"
  | "ready";

/**
 * Derives a single, display-friendly status from the raw text-variant
 * payload (server/src/services/textVariants.service.ts:getTextVariants).
 * Generation itself is the readiness signal — there is no specialist
 * review/approval step in between "generating" and "ready".
 */
export function deriveTextVariantStatus(
  data: Pick<
    TextVariantsResponse,
    "personalizationEnabled" | "textVariantStatus" | "textPersonalizationReady"
  >,
): TextVariantOverallStatus {
  if (!data.personalizationEnabled) return "not_personalizable";
  if (data.textPersonalizationReady) return "ready";
  if (data.textVariantStatus === "generating") return "generating";
  return "not_started";
}
