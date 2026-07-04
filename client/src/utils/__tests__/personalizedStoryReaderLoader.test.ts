import {
  loadPersonalizedStoryForReader,
  PersonalizedStoryNotAccessibleError,
} from "../personalizedStoryReaderLoader";
import { getPersonalizedStory } from "../../api/caregiverApi";
import { resolveStorageDownloadUrl } from "../readerPreviewLoader";

jest.mock("../../api/caregiverApi", () => ({
  getPersonalizedStory: jest.fn(),
}));

jest.mock("../readerPreviewLoader", () => ({
  resolveStorageDownloadUrl: jest.fn(),
}));

const mockGetPersonalizedStory = getPersonalizedStory as jest.Mock;
const mockResolveStorageDownloadUrl = resolveStorageDownloadUrl as jest.Mock;

function fallbackImageUrl(pageNumber: number): string {
  return `/story-images/placeholders/${pageNumber}.jpg`;
}

describe("loadPersonalizedStoryForReader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds fully unlocked reader pages from an accessible personalized story (Bug 4 fix)", async () => {
    mockGetPersonalizedStory.mockResolvedValue({
      storyId: "story-1",
      templateTitle: "The Brave Little Fox",
      language: "he",
      coverImageUrl: "https://example.com/cover.jpg",
      childFirstName: "Noa",
      isAccessible: true,
      pages: [
        {
          pageNumber: 2,
          personalizedText: "Page two text",
          imagePromptUsed: "",
          generatedImagePath: "generated-illustrations/uid/story-1/page-2.png",
          fromPreview: false,
        },
        {
          pageNumber: 1,
          personalizedText: "Page one text",
          imagePromptUsed: "",
          generatedImagePath: "generated-illustrations/uid/story-1/page-1.png",
          fromPreview: true,
        },
      ],
    });
    mockResolveStorageDownloadUrl.mockImplementation((path: string) =>
      Promise.resolve(`https://cdn.example.com/${path}`)
    );

    const result = await loadPersonalizedStoryForReader("story-1", fallbackImageUrl);

    expect(result.id).toBe("story-1");
    expect(result.title).toBe("The Brave Little Fox");
    expect(result.childName).toBe("Noa");
    // Pages are sorted and every page is included — nothing is locked behind a preview limit.
    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2]);
    expect(result.pages[0].textTemplate).toBe("Page one text");
    expect(result.pages[0].imageUrl).toBe(
      "https://cdn.example.com/generated-illustrations/uid/story-1/page-1.png"
    );
  });

  it("falls back to the placeholder image when a page has no generated image yet", async () => {
    mockGetPersonalizedStory.mockResolvedValue({
      storyId: "story-1",
      templateTitle: "Story",
      language: "ar",
      coverImageUrl: null,
      childFirstName: "Sami",
      isAccessible: true,
      pages: [
        {
          pageNumber: 1,
          personalizedText: "Text",
          imagePromptUsed: "",
          generatedImagePath: null,
          fromPreview: false,
        },
      ],
    });
    mockResolveStorageDownloadUrl.mockResolvedValue(undefined);

    const result = await loadPersonalizedStoryForReader("story-1", fallbackImageUrl);

    expect(result.pages[0].imageUrl).toBe("/story-images/placeholders/1.jpg");
  });

  it("throws PersonalizedStoryNotAccessibleError when the story isn't accessible yet", async () => {
    mockGetPersonalizedStory.mockResolvedValue({
      storyId: "story-1",
      templateTitle: "Story",
      language: "he",
      coverImageUrl: null,
      childFirstName: "Noa",
      isAccessible: false,
      pages: [],
    });

    await expect(loadPersonalizedStoryForReader("story-1", fallbackImageUrl)).rejects.toThrow(
      PersonalizedStoryNotAccessibleError
    );
  });
});
