import { getPreviewSubtitleKey } from "../previewSubtitle";

describe("getPreviewSubtitleKey", () => {
  it("returns the personalized-for key with the child's name when present", () => {
    expect(getPreviewSubtitleKey("Noa")).toEqual({
      key: "pages.myStories.previews.personalizedFor",
      params: { name: "Noa" },
    });
  });

  it("returns the original-story key for a fixed (non-personalizable) purchase with no name", () => {
    expect(getPreviewSubtitleKey("")).toEqual({ key: "pages.myStories.previews.originalStoryLabel" });
  });

  it("treats a whitespace-only name the same as no name", () => {
    expect(getPreviewSubtitleKey("   ")).toEqual({ key: "pages.myStories.previews.originalStoryLabel" });
  });

  it("treats missing/undefined/null name as no name", () => {
    expect(getPreviewSubtitleKey(undefined)).toEqual({ key: "pages.myStories.previews.originalStoryLabel" });
    expect(getPreviewSubtitleKey(null)).toEqual({ key: "pages.myStories.previews.originalStoryLabel" });
  });
});
