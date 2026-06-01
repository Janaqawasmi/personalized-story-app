import {
  buildSpecialistBookPreviewModel,
  resolveManuscriptPages,
} from "../storyToReaderModel";
import type { ImageArtefact } from "../../../types/illustration";
import type { Story } from "../../../types/story";

function baseStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "s1",
    ownerUid: "u1",
    parentStoryId: null,
    title: "Test Story",
    storyType: "fear_anxiety",
    ageRange: "5-7",
    tags: [],
    status: "in_review",
    briefStatus: "submitted",
    brief: { outputLanguage: "he" } as Story["brief"],
    agent1Result: null,
    agent1Versions: [],
    currentDraft: null,
    pages: null,
    editHistory: [],
    illustrationPages: null,
    currentVisualBibleVersion: null,
    illustrationWorkspaceOpenedAt: null,
    publishedAt: null,
    publishedTemplateId: null,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: 1,
    submittedAt: 1,
    approvedAt: null,
    ...overrides,
  };
}

describe("resolveManuscriptPages", () => {
  it("splits draft body when structured pages are absent", () => {
    const story = baseStory({
      currentDraft: {
        title: "T",
        body: "Page one.\n\nPage two.",
        wordCount: 4,
        updatedAt: 1,
      },
    });
    const pages = resolveManuscriptPages(story);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.text).toBe("Page one.");
    expect(pages[1]?.text).toBe("Page two.");
  });
});

describe("buildSpecialistBookPreviewModel", () => {
  it("returns null when there is no manuscript", () => {
    expect(buildSpecialistBookPreviewModel(baseStory())).toBeNull();
  });

  it("includes latest image URLs without requiring approval", () => {
    const story = baseStory({
      status: "illustration_workspace",
      illustrationPages: [
        {
          pageNumber: 1,
          text: "Hello",
          currentScenePlanVersion: 1,
          currentImageVersion: 1,
          status: "awaiting_review",
          pendingJobId: null,
          lastError: null,
        },
      ],
    });
    const images: ImageArtefact[] = [
      {
        id: "1-1",
        storyId: "s1",
        pageNumber: 1,
        version: 1,
        createdAt: 1,
        parentVersion: null,
        scenePlanVersion: 1,
        finalPromptVersion: 1,
        providerId: "p",
        modelId: "m",
        modelParams: {},
        latencyMs: 1,
        storagePath: "path",
        publicUrl: "https://example.com/1.png",
        mimeType: "image/png",
        bytes: 1,
        reviewStatus: "awaiting_review",
        approvedAt: null,
        rejectionNote: null,
      },
    ];
    const model = buildSpecialistBookPreviewModel(story, images, {
      imagePolicy: "latest",
    });
    expect(model?.pages[0]?.imageUrl).toBe("https://example.com/1.png");
  });

  it("omits images with approved policy when not approved", () => {
    const story = baseStory({
      illustrationPages: [
        {
          pageNumber: 1,
          text: "Hello",
          currentScenePlanVersion: 1,
          currentImageVersion: 1,
          status: "awaiting_review",
          pendingJobId: null,
          lastError: null,
        },
      ],
    });
    const images: ImageArtefact[] = [
      {
        id: "1-1",
        storyId: "s1",
        pageNumber: 1,
        version: 1,
        createdAt: 1,
        parentVersion: null,
        scenePlanVersion: 1,
        finalPromptVersion: 1,
        providerId: "p",
        modelId: "m",
        modelParams: {},
        latencyMs: 1,
        storagePath: "path",
        publicUrl: "https://example.com/1.png",
        mimeType: "image/png",
        bytes: 1,
        reviewStatus: "awaiting_review",
        approvedAt: null,
        rejectionNote: null,
      },
    ];
    const model = buildSpecialistBookPreviewModel(story, images, {
      imagePolicy: "approved",
    });
    expect(model?.pages[0]?.imageUrl).toBeUndefined();
  });
});
