import { hasValidTextTemplates, isTextPersonalizationReady } from "../textPersonalizationReadiness";

const VALID = (suffix = "") => ({
  textTemplate: {
    masculine: `{{CHILD_NAME}} felt afraid${suffix}.`,
    feminine: `{{CHILD_NAME}} felt scared${suffix}.`,
  },
});

const SCENE_SETTING_PAGE = {
  textTemplate: {
    masculine: "The kindergarten teacher set small jars on the table.",
    feminine: "The kindergarten teacher set small jars on the table.",
  },
};

describe("hasValidTextTemplates", () => {
  it("returns false for undefined/null/empty", () => {
    expect(hasValidTextTemplates(undefined)).toBe(false);
    expect(hasValidTextTemplates(null)).toBe(false);
    expect(hasValidTextTemplates([])).toBe(false);
  });

  it("returns true when every page contains {{CHILD_NAME}}", () => {
    expect(hasValidTextTemplates([VALID("1"), VALID("2")])).toBe(true);
  });

  it("returns false when any page is missing {{CHILD_NAME}}", () => {
    expect(hasValidTextTemplates([VALID(), SCENE_SETTING_PAGE])).toBe(false);
  });
});

describe("isTextPersonalizationReady — the public readiness gate", () => {
  it("trusts textPersonalizationReady=true even when a page legitimately has no {{CHILD_NAME}}", () => {
    // Regression: this is exactly the shape of a story where the specialist
    // approved every page (including a child-name-free scene-setting page)
    // and clicked "Activate text personalization".
    expect(
      isTextPersonalizationReady({
        textPersonalizationReady: true,
        pages: [VALID("1"), SCENE_SETTING_PAGE, VALID("2")],
      }),
    ).toBe(true);
  });

  it("returns false when textPersonalizationReady=false and the blanket check also fails", () => {
    expect(
      isTextPersonalizationReady({
        textPersonalizationReady: false,
        pages: [VALID("1"), SCENE_SETTING_PAGE, VALID("2")],
      }),
    ).toBe(false);
  });

  it("falls back to the blanket check when textPersonalizationReady is false but every page is valid (legacy-patched template)", () => {
    expect(
      isTextPersonalizationReady({
        textPersonalizationReady: false,
        pages: [VALID("1"), VALID("2")],
      }),
    ).toBe(true);
  });

  it("returns false when pages is missing entirely and the flag is false", () => {
    expect(isTextPersonalizationReady({ textPersonalizationReady: false })).toBe(false);
  });
});
