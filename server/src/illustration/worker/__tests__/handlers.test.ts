/** @jest-environment node */

import type { DocumentReference } from "firebase-admin/firestore";
import { generateImage, markImageGenerationFailedOnStory } from "@/illustration/orchestrator/generateImage";
import { handlers } from "../handlers";

jest.mock("@/illustration/orchestrator/generateImage", () => ({
  generateImage: jest.fn(),
  markImageGenerationFailedOnStory: jest.fn(async () => undefined),
}));

jest.mock("@/illustration/orchestrator/openWorkspace", () => ({
  openWorkspace: jest.fn(),
}));

const generateImageMock = generateImage as jest.MockedFunction<typeof generateImage>;
const markFailedMock = markImageGenerationFailedOnStory as jest.MockedFunction<
  typeof markImageGenerationFailedOnStory
>;

describe("illustration worker handlers — image_generation", () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    markFailedMock.mockReset();
    markFailedMock.mockResolvedValue(undefined);
  });

  test("marks job succeeded with output refs", async () => {
    generateImageMock.mockResolvedValue({
      imageId: "img-1",
      storagePath: "path/x",
      publicUrl: "https://u",
    });
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-1",
      storyId: "s1",
      type: "image_generation" as const,
      pageNumber: 2,
      enqueuedBy: "uid",
      enqueuedAt: 1,
      startedAt: null,
      completedAt: null,
      lastHeartbeatAt: null,
      status: "running" as const,
      attempt: 1,
      idempotencyKey: "k",
      inputRefs: {},
      outputRefs: {},
      error: null,
    };
    await handlers.image_generation(job, jobRef);
    expect(generateImageMock).toHaveBeenCalledWith({
      storyId: "s1",
      pageNumber: 2,
      uid: "uid",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        outputRefs: expect.objectContaining({
          imageId: "img-1",
          publicUrl: "https://u",
        }),
        error: null,
      }),
    );
  });

  test("failure invokes markImageGenerationFailedOnStory then throws", async () => {
    generateImageMock.mockRejectedValue(new Error("boom"));
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-2",
      storyId: "s1",
      type: "image_generation" as const,
      pageNumber: 1,
      enqueuedBy: "uid",
      enqueuedAt: 1,
      startedAt: null,
      completedAt: null,
      lastHeartbeatAt: null,
      status: "running" as const,
      attempt: 1,
      idempotencyKey: "k2",
      inputRefs: {},
      outputRefs: {},
      error: null,
    };
    await expect(handlers.image_generation(job, jobRef)).rejects.toThrow("boom");
    expect(markFailedMock).toHaveBeenCalledWith({
      storyId: "s1",
      pageNumber: 1,
      jobId: "job-2",
      message: "boom",
    });
  });
});
