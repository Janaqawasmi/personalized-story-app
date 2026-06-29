import { createEmptyBrief, omitUiOnlyBriefFields, dashboardLanguageToBriefLanguage, dashboardLanguageToDefaultOutputLanguage, coerceStoryLanguage } from "../storyBrief";
import type { CompleteBrief } from "../storyBrief";

describe("brief language fields", () => {
  it("createEmptyBrief defaults both languages to English", () => {
    const brief = createEmptyBrief();
    expect(brief.briefLanguage).toBe("en");
    expect(brief.outputLanguage).toBe("en");
  });

  it("omitUiOnlyBriefFields preserves language fields", () => {
    const brief: CompleteBrief = {
      ...createEmptyBrief(),
      briefLanguage: "en",
      outputLanguage: "ar",
      savedAt: 123,
      highestSectionVisited: 3,
    };
    const stripped = omitUiOnlyBriefFields(brief);
    expect(stripped.briefLanguage).toBe("en");
    expect(stripped.outputLanguage).toBe("ar");
    // UI-only fields are removed
    expect(stripped).not.toHaveProperty("savedAt");
    expect(stripped).not.toHaveProperty("highestSectionVisited");
  });

  it("supports independent brief and output languages", () => {
    const brief: CompleteBrief = {
      ...createEmptyBrief(),
      briefLanguage: "en",
      outputLanguage: "ar",
    };
    expect(brief.briefLanguage).not.toBe(brief.outputLanguage);
  });

  it("maps dashboard UI language to brief and output defaults", () => {
    expect(dashboardLanguageToBriefLanguage("ar")).toBe("ar");
    expect(dashboardLanguageToBriefLanguage("he")).toBe("he");
    expect(dashboardLanguageToBriefLanguage("en")).toBe("en");
    expect(dashboardLanguageToDefaultOutputLanguage("ar")).toBe("ar");
    expect(dashboardLanguageToDefaultOutputLanguage("he")).toBe("he");
    expect(dashboardLanguageToDefaultOutputLanguage("en")).toBe("en");
  });

  it("coerces wire values to supported story languages", () => {
    expect(coerceStoryLanguage("he")).toBe("he");
    expect(coerceStoryLanguage("fr")).toBe("en");
  });
});
