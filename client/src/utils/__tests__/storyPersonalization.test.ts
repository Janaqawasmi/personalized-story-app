import {
  applyPreviewOverridesToReaderPages,
  buildPersonalizedReaderPages,
  pickTextTemplateVariant,
  resolveTemplatePageText,
  personalizeStoryTemplateString,
  PREVIEW_SPREAD_LIMIT,
} from "../storyPersonalization";

describe("pickTextTemplateVariant", () => {
  it("selects feminine variant", () => {
    const t = { masculine: "He ran", feminine: "She ran" };
    expect(pickTextTemplateVariant(t, "female")).toBe("She ran");
    expect(pickTextTemplateVariant(t, "male")).toBe("He ran");
  });

  it("falls back to single filled variant", () => {
    const t = { masculine: "", feminine: "Only she" };
    expect(pickTextTemplateVariant(t, "male")).toBe("Only she");
  });

  it("supports male/female keys", () => {
    const t = { male: "Boy text", female: "Girl text" };
    expect(pickTextTemplateVariant(t, "female")).toBe("Girl text");
  });
});

describe("resolveTemplatePageText", () => {
  it("uses legacy textVariants", () => {
    const page = { textVariants: { male: "Boy {{CHILD_NAME}}", female: "Girl {{CHILD_NAME}}" } };
    expect(resolveTemplatePageText(page, "male")).toBe("Boy {{CHILD_NAME}}");
  });

  it("uses previewSpread text fallback", () => {
    const page = { textTemplate: { masculine: "", feminine: "" } };
    expect(resolveTemplatePageText(page, "male", "Spread fallback")).toBe("Spread fallback");
  });

  it("uses plain page.text", () => {
    expect(resolveTemplatePageText({ text: "Plain story" }, "male")).toBe("Plain story");
  });
});

describe("buildPersonalizedReaderPages", () => {
  const pages = [{ pageNumber: 1, textTemplate: { masculine: "{{CHILD_NAME}}", feminine: "{{CHILD_NAME}}" } }];

  it("personalizes name from empty textTemplate via spread fallback", () => {
    const emptyPages = [{ pageNumber: 1, textTemplate: { masculine: "", feminine: "" } }];
    const built = buildPersonalizedReaderPages(emptyPages, {
      gender: "male",
      childDisplayName: "Noa",
      language: "he",
      spreadTextFallbacks: ["Hello {{CHILD_NAME}}"],
      fallbackImageUrl: () => "/placeholder.jpg",
      previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
    });
    expect(built[0].textTemplate).toBe("Hello Noa");
  });

  it("prefers child photo over catalog spread image", () => {
    const built = buildPersonalizedReaderPages(pages, {
      gender: "male",
      childDisplayName: "Noa",
      language: "he",
      photoPreviewUrl: "blob:child-photo",
      spreadImageFallbacks: ["https://catalog.example/page1.jpg"],
      fallbackImageUrl: () => "/placeholder.jpg",
      previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
    });
    expect(built[0].imageUrl).toBe("blob:child-photo");
    expect(built[0].imageFallbackUrl).toBe("https://catalog.example/page1.jpg");
  });

  it("uses catalog spread when no child photo", () => {
    const built = buildPersonalizedReaderPages(pages, {
      gender: "male",
      childDisplayName: "Noa",
      language: "he",
      spreadImageFallbacks: ["https://catalog.example/page1.jpg"],
      fallbackImageUrl: () => "/placeholder.jpg",
      previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
    });
    expect(built[0].imageUrl).toBe("https://catalog.example/page1.jpg");
  });
});

describe("applyPreviewOverridesToReaderPages", () => {
  it("replaces text with personalizedText from preview doc", () => {
    const built = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: "Template {{CHILD_NAME}}" }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        fallbackImageUrl: () => "/p.jpg",
      }
    );
    const merged = applyPreviewOverridesToReaderPages(built, [
      { pageNumber: 1, personalizedText: "Server finalized text" },
    ]);
    expect(merged[0].textTemplate).toBe("Server finalized text");
  });

  it("keeps generated image when override provides imageUrl", () => {
    const built = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: "Hi" }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        photoPreviewUrl: "blob:photo",
        fallbackImageUrl: () => "/p.jpg",
        previewSpreadLimit: PREVIEW_SPREAD_LIMIT,
      }
    );
    const merged = applyPreviewOverridesToReaderPages(built, [
      { pageNumber: 1, imageUrl: "https://storage.example/ai-page1.jpg" },
    ]);
    expect(merged[0].imageUrl).toBe("https://storage.example/ai-page1.jpg");
    expect(merged[0].imageFallbackUrl).toBe("blob:photo");
  });

  it("skips empty overrides", () => {
    const built = buildPersonalizedReaderPages(
      [{ pageNumber: 1, textTemplate: "Hi" }],
      {
        gender: "male",
        childDisplayName: "Noa",
        language: "he",
        fallbackImageUrl: () => "/p.jpg",
      }
    );
    const merged = applyPreviewOverridesToReaderPages(built, [{ pageNumber: 1 }]);
    expect(merged[0].imageUrl).toBe("/p.jpg");
  });
});

describe("personalizeStoryTemplateString", () => {
  it("substitutes child name and pronouns", () => {
    const out = personalizeStoryTemplateString(
      "{{CHILD_NAME}} — {{PRONOUN_SUBJECT}}",
      "דני",
      "male",
      "he"
    );
    expect(out).toContain("דני");
    expect(out).toContain("הוא");
  });
});
