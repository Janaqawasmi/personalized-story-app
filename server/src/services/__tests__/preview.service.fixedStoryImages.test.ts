/** @jest-environment node */

/**
 * Regression tests for the "Buy Story" (non-personalizable) fixed-preview
 * image resolution.
 *
 * Root cause: several published templates predate every page carrying its
 * own `sampleImageUrl` — their `pages[]` only ever had
 * { pageNumber, textTemplate, imagePromptTemplate, emotionalTone }, no image
 * field at all. `createFixedStoryPreview` used `page.sampleImageUrl ?? null`
 * with no fallback, so every page's `generatedImagePath` was null for these
 * templates. The reader then fell back to the *generic, page-number-keyed*
 * local placeholder images (`/story-images/placeholders/{n}.jpg`) for every
 * page, which are identical across every story — hence "no matter what the
 * story is, I see the same pictures".
 */

import { resolveFixedStoryPageImage } from "../preview.service";
import type {
  StoryTemplatePage,
  StoryTemplate,
  StoryTemplatePreviewSpread,
} from "../../shared/types/storyTemplate";

function page(overrides: Partial<StoryTemplatePage> = {}): StoryTemplatePage {
  return {
    pageNumber: 1,
    textTemplate: { masculine: "text", feminine: "text" },
    imagePromptTemplate: "prompt",
    emotionalTone: "calm",
    ...overrides,
  };
}

type TemplateImageFields = Pick<StoryTemplate, "previewSpreads" | "coverImage" | "coverImageUrl">;

function template(overrides: Partial<TemplateImageFields> = {}): TemplateImageFields {
  return {
    coverImageUrl: "",
    ...overrides,
  };
}

describe("resolveFixedStoryPageImage", () => {
  it("uses the page's own sampleImageUrl when present (exact per-page image)", () => {
    const result = resolveFixedStoryPageImage(
      page({ sampleImageUrl: "https://cdn.example.com/p1.jpg" }),
      0,
      template({ coverImage: "https://cdn.example.com/cover.jpg" })
    );
    expect(result).toBe("https://cdn.example.com/p1.jpg");
  });

  it("falls back to the matching previewSpreads image for page index 0/1 when sampleImageUrl is missing", () => {
    const previewSpreads: [StoryTemplatePreviewSpread, StoryTemplatePreviewSpread] = [
      { imageUrl: "https://cdn.example.com/spread1.jpg", text: "..." },
      { imageUrl: "https://cdn.example.com/spread2.jpg", text: "..." },
    ];
    const tpl = template({
      previewSpreads,
      coverImage: "https://cdn.example.com/cover.jpg",
    });

    expect(resolveFixedStoryPageImage(page({ pageNumber: 1 }), 0, tpl)).toBe(
      "https://cdn.example.com/spread1.jpg"
    );
    expect(resolveFixedStoryPageImage(page({ pageNumber: 2 }), 1, tpl)).toBe(
      "https://cdn.example.com/spread2.jpg"
    );
  });

  it("falls back to the template's own cover image for pages beyond the preview spreads", () => {
    const previewSpreads: [StoryTemplatePreviewSpread, StoryTemplatePreviewSpread] = [
      { imageUrl: "https://cdn.example.com/spread1.jpg", text: "..." },
      { imageUrl: "https://cdn.example.com/spread2.jpg", text: "..." },
    ];
    const tpl = template({
      previewSpreads,
      coverImage: "https://cdn.example.com/cover.jpg",
    });

    const result = resolveFixedStoryPageImage(page({ pageNumber: 3 }), 2, tpl);
    expect(result).toBe("https://cdn.example.com/cover.jpg");
  });

  it("never returns a different template's image — cover fallback is always this template's own", () => {
    const tplA = template({ coverImage: "https://cdn.example.com/story-a-cover.jpg" });
    const tplB = template({ coverImage: "https://cdn.example.com/story-b-cover.jpg" });

    expect(resolveFixedStoryPageImage(page({ pageNumber: 5 }), 4, tplA)).toBe(
      "https://cdn.example.com/story-a-cover.jpg"
    );
    expect(resolveFixedStoryPageImage(page({ pageNumber: 5 }), 4, tplB)).toBe(
      "https://cdn.example.com/story-b-cover.jpg"
    );
  });

  it("falls back to legacy coverImageUrl when coverImage is absent", () => {
    const tpl = template({ coverImageUrl: "https://cdn.example.com/legacy-cover.jpg" });
    expect(resolveFixedStoryPageImage(page({ pageNumber: 3 }), 2, tpl)).toBe(
      "https://cdn.example.com/legacy-cover.jpg"
    );
  });

  it("returns null only when the template genuinely has no image anywhere", () => {
    const result = resolveFixedStoryPageImage(page({ pageNumber: 3 }), 2, template());
    expect(result).toBeNull();
  });
});
