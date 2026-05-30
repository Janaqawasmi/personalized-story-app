import { createEmptyBrief, omitUiOnlyBriefFields } from "../storyBrief";
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
});
