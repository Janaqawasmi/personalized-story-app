import { getReaderErrorReference } from "../readerErrorReference";

describe("getReaderErrorReference", () => {
  it("prefers the personalizedStoryId when present (purchased-story reader open)", () => {
    expect(
      getReaderErrorReference({
        personalizedStoryId: "story-123",
        previewId: "preview-456",
        storyId: "template-789",
      }),
    ).toEqual({ key: "pages.bookReader.errorReferencePersonalizedStory", id: "story-123" });
  });

  it("falls back to previewId when there is no personalizedStoryId (free-preview reader open)", () => {
    expect(
      getReaderErrorReference({ personalizedStoryId: null, previewId: "preview-456", storyId: "template-789" }),
    ).toEqual({ key: "pages.bookReader.errorReferencePreview", id: "preview-456" });
  });

  it("falls back to the template storyId when neither purchased nor preview ids are present", () => {
    expect(
      getReaderErrorReference({ personalizedStoryId: null, previewId: null, storyId: "template-789" }),
    ).toEqual({ key: "pages.bookReader.errorReferenceTemplate", id: "template-789" });
  });

  it("returns null when no identifier is available at all", () => {
    expect(getReaderErrorReference({ personalizedStoryId: null, previewId: null, storyId: null })).toBeNull();
  });

  it("treats an empty-string id the same as missing for each field", () => {
    expect(
      getReaderErrorReference({ personalizedStoryId: "", previewId: "preview-456", storyId: "template-789" }),
    ).toEqual({ key: "pages.bookReader.errorReferencePreview", id: "preview-456" });

    expect(
      getReaderErrorReference({ personalizedStoryId: "", previewId: "", storyId: "template-789" }),
    ).toEqual({ key: "pages.bookReader.errorReferenceTemplate", id: "template-789" });

    expect(getReaderErrorReference({ personalizedStoryId: "", previewId: "", storyId: "" })).toBeNull();
  });
});
