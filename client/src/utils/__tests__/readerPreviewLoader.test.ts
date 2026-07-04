/**
 * Unit tests for resolveStorageDownloadUrl()'s absolute-URL pass-through.
 *
 * Fixed (non-personalizable) "Buy Story" pages store the specialist-approved
 * sample image as an already-public https URL (see createFixedStoryPreview /
 * publishStory.ts's `sampleImageUrl`), not a Storage ref path. The reader
 * must use that URL as-is instead of feeding it into the Storage SDK, which
 * expects a bucket-relative path.
 */

const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn();

jest.mock("firebase/storage", () => ({
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  ref: (...args: unknown[]) => mockRef(...args),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock("../../firebase", () => ({
  db: {},
  storage: {},
}));

import { resolveStorageDownloadUrl, resolveActivePreviewId } from "../readerPreviewLoader";

describe("resolveStorageDownloadUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined for empty/missing paths without calling the Storage SDK", async () => {
    expect(await resolveStorageDownloadUrl(undefined)).toBeUndefined();
    expect(await resolveStorageDownloadUrl(null)).toBeUndefined();
    expect(await resolveStorageDownloadUrl("  ")).toBeUndefined();
    expect(mockRef).not.toHaveBeenCalled();
  });

  it("passes an already-public https URL through unchanged (fixed-story sample image)", async () => {
    const sampleUrl = "https://specialist.example.com/page-1.jpg";

    const result = await resolveStorageDownloadUrl(sampleUrl);

    expect(result).toBe(sampleUrl);
    expect(mockRef).not.toHaveBeenCalled();
    expect(mockGetDownloadURL).not.toHaveBeenCalled();
  });

  it("resolves a Storage ref path via getDownloadURL", async () => {
    mockGetDownloadURL.mockResolvedValue("https://cdn.example.com/resolved.jpg");

    const result = await resolveStorageDownloadUrl("preview-illustrations/uid/preview-1/page-1.webp");

    expect(result).toBe("https://cdn.example.com/resolved.jpg");
    expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
  });
});

describe("resolveActivePreviewId", () => {
  it("returns null when reading a full purchase, even if a previewId query param is present", () => {
    expect(
      resolveActivePreviewId({
        personalizedStoryId: "story-1",
        previewIdFromQuery: "preview-1",
        storedPreviewId: "preview-2",
      })
    ).toBeNull();
  });

  it("returns null for a full purchase even with a stale localStorage preview id for the same template", () => {
    // Regression test: opening "Read Story" for a fully purchased (personalized
    // or fixed) story must never merge in an unrelated preview's images/text
    // via the storyPreviews live-update listener, even if the caregiver
    // previously previewed/personalized the same template and left a stale
    // `dammah.preview.{templateId}` entry in localStorage.
    expect(
      resolveActivePreviewId({
        personalizedStoryId: "story-1",
        previewIdFromQuery: null,
        storedPreviewId: "stale-preview-from-earlier-session",
      })
    ).toBeNull();
  });

  it("falls back to the query param when not reading a full purchase", () => {
    expect(
      resolveActivePreviewId({
        personalizedStoryId: null,
        previewIdFromQuery: "preview-1",
        storedPreviewId: "preview-2",
      })
    ).toBe("preview-1");
  });

  it("falls back to the stored preview id when there is no query param and no full purchase", () => {
    expect(
      resolveActivePreviewId({
        personalizedStoryId: null,
        previewIdFromQuery: null,
        storedPreviewId: "preview-2",
      })
    ).toBe("preview-2");
  });

  it("returns null when nothing is available", () => {
    expect(
      resolveActivePreviewId({
        personalizedStoryId: null,
        previewIdFromQuery: null,
        storedPreviewId: null,
      })
    ).toBeNull();
  });
});
