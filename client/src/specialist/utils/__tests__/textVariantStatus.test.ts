import { deriveTextVariantStatus } from "../textVariantStatus";

describe("deriveTextVariantStatus", () => {
  test("returns 'not_personalizable' when personalizationEnabled is false, regardless of other fields", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: false,
        textVariantStatus: "generating",
        textPersonalizationReady: true,
      }),
    ).toBe("not_personalizable");
  });

  test("returns 'ready' once textPersonalizationReady is true, even if textVariantStatus was reset to 'none'", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: true,
      }),
    ).toBe("ready");
  });

  test("returns 'generating' while a generation call is in flight", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "generating",
        textPersonalizationReady: false,
      }),
    ).toBe("generating");
  });

  test("returns 'not_started' when personalizable but nothing has been generated yet", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: false,
      }),
    ).toBe("not_started");
  });

  test("returns 'not_started' (no intermediate review state) even right after a generation failure resets status to 'none'", () => {
    expect(
      deriveTextVariantStatus({
        personalizationEnabled: true,
        textVariantStatus: "none",
        textPersonalizationReady: false,
      }),
    ).toBe("not_started");
  });
});
