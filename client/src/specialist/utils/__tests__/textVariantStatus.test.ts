import { deriveTextVariantStatus } from "../textVariantStatus";
import type { TextVariantDoc } from "../../../api/specialistTemplatesApi";

function variant(reviewStatus: "pending" | "approved"): TextVariantDoc {
  return {
    pageNumber: 1,
    originalText: "{{CHILD_NAME}} text",
    masculine: "{{CHILD_NAME}} his text",
    feminine: "{{CHILD_NAME}} her text",
    reviewStatus,
    generatedAt: 1,
  };
}

describe("deriveTextVariantStatus", () => {
  test("returns 'not_personalizable' when personalizationEnabled is false, regardless of other fields", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: false,
        textVariantStatus: "pending_review",
        textPersonalizationReady: true,
        variants: [variant("approved")],
      }),
    ).toBe("not_personalizable");
  });

  test("returns 'ready' once textPersonalizationReady is true, even if textVariantStatus was reset to 'none'", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: true,
        variants: [],
      }),
    ).toBe("ready");
  });

  test("returns 'generating' while a generation call is in flight", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "generating",
        textPersonalizationReady: false,
        variants: [],
      }),
    ).toBe("generating");
  });

  test("returns 'pending_review' when textVariantStatus is 'pending_review'", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "pending_review",
        textPersonalizationReady: false,
        variants: [variant("pending"), variant("approved")],
      }),
    ).toBe("pending_review");
  });

  test("returns 'pending_review' when variants exist even if textVariantStatus lags behind", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: false,
        variants: [variant("pending")],
      }),
    ).toBe("pending_review");
  });

  test("returns 'not_started' when personalizable but nothing has been generated yet", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: false,
        variants: [],
      }),
    ).toBe("not_started");
  });
});
