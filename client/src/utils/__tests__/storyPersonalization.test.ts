import {
  applyPreviewOverridesToReaderPages,
  buildPersonalizedReaderPages,
  resolveTemplatePageText,
} from "../storyPersonalization";

describe("resolveTemplatePageText", () => {
  it("reads masculine/feminine textTemplate", () => {
    expect(
      resolveTemplatePageText(
        { textTemplate: { masculine: "He went", feminine: "She went" } },
        "male",
      ),
    ).toBe("He went");
  });

  it("reads textTemplate with only one variant filled", () => {
    expect(
      resolveTemplatePageText({ textTemplate: { masculine: "Shared line", feminine: "" } }, "female"),
    ).toBe("Shared line");
  });

  it("reads legacy textVariants", () => {
    expect(
      resolveTemplatePageText(
        { textVariants: { male: "Boy text", female: "Girl text" } },
        "female",
      ),
    ).toBe("Girl text");
  });

  it("falls back to previewSpread text", () => {
    expect(resolveTemplatePageText({}, "male", "Spread fallback")).toBe("Spread fallback");
  });
});

describe("buildPersonalizedReaderPages + preview overrides", () => {
  it("uses spread fallback when page textTemplate is empty", () => {
    const pages = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: {} }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        spreadTextFallbacks: ["Hello {{CHILD_NAME}}"],
        fallbackImageUrl: () => "/placeholder.jpg",
        previewSpreadLimit: 2,
      },
    );
    expect(pages[0].textTemplate).toContain("Noa");
  });

  it("prefers child photo over catalog previewSpread image on preview spreads", () => {
    const pages = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: "Hi" }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        photoPreviewUrl: "blob:child-photo",
        spreadImageFallbacks: ["https://example.com/catalog.jpg"],
        fallbackImageUrl: () => "/placeholder.jpg",
        previewSpreadLimit: 2,
      },
    );
    expect(pages[0].imageUrl).toBe("blob:child-photo");
  });

  it("applies preview personalizedText over built pages", () => {
    const built = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: { masculine: "x", feminine: "x" } }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        fallbackImageUrl: () => "/placeholder.jpg",
      },
    );
    const merged = applyPreviewOverridesToReaderPages(built, [
      { pageNumber: 1, personalizedText: "Ready preview line." },
    ]);
    expect(merged[0].textTemplate).toBe("Ready preview line.");
  });
});
