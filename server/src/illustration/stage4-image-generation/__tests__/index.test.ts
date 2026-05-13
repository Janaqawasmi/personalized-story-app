/** @jest-environment node */

import { runImageGeneration } from "../index";

const mockGenerateImage = jest.fn();

jest.mock("@/services/preview.service", () => ({
  requireImageProvider: () => ({
    providerId: "testprov",
    modelId: "testmodel",
    generateImage: mockGenerateImage,
  }),
}));

jest.mock("../storage", () => ({
  uploadImageToStorage: jest.fn(async () => ({
    storagePath: "specialist-illustrations/s1/p1-v1.png",
    publicUrl: "https://storage.example.com/x",
    bytes: 4,
    mimeType: "image/png",
  })),
}));

describe("runImageGeneration", () => {
  beforeEach(() => {
    mockGenerateImage.mockReset();
    mockGenerateImage.mockResolvedValue({
      imageBuffer: Buffer.from([0, 1, 2, 3]),
      mimeType: "image/png",
      providerId: "testprov",
      modelId: "testmodel",
      latencyMs: 12,
      seed: 99,
    });
  });

  test("calls provider without referenceImage", async () => {
    const img = await runImageGeneration({
      storyId: "s1",
      finalPrompt: {
        id: "fp1",
        storyId: "s1",
        pageNumber: 1,
        version: 1,
        createdAt: 0,
        parentScenePlanVersion: 1,
        parentVisualBibleVersion: 1,
        finalPromptString: "prompt text",
        promptOrder: [],
        charCount: 10,
        warnings: [],
      },
      imageVersion: 1,
    });
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    const arg = mockGenerateImage.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg).not.toHaveProperty("referenceImage");
    expect(typeof arg["seed"]).toBe("number");
    expect(arg["textPrompt"]).toBe("prompt text");
    expect(img.reviewStatus).toBe("awaiting_review");
    expect(img.publicUrl).toContain("https://");
    expect(img.safetyFlags).toEqual([]);
  });
});
