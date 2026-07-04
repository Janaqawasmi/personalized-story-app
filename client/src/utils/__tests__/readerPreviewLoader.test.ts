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

import { resolveStorageDownloadUrl } from "../readerPreviewLoader";

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
