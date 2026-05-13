/** @jest-environment node */

import type { DocumentReference } from "firebase-admin/firestore";
import { cascadeAfterReject } from "@/illustration/orchestrator/cascadeAfterReject";
import {
  generateImage,
  markImageGenerationFailedOnStory,
} from "@/illustration/orchestrator/generateImage";
import { openWorkspace } from "@/illustration/orchestrator/openWorkspace";
import { regenerateScenePlan } from "@/illustration/orchestrator/regenerateScenePlan";
import { regenerateVisualBible } from "@/illustration/orchestrator/regenerateVisualBible";
import { handlers } from "../handlers";

jest.mock("@/illustration/orchestrator/generateImage", () => ({
  generateImage: jest.fn(),
  markImageGenerationFailedOnStory: jest.fn(async () => undefined),
}));

jest.mock("@/illustration/orchestrator/openWorkspace", () => ({
  openWorkspace: jest.fn(),
}));

jest.mock("@/illustration/orchestrator/regenerateScenePlan", () => ({
  regenerateScenePlan: jest.fn(),
}));

jest.mock("@/illustration/orchestrator/cascadeAfterReject", () => ({
  cascadeAfterReject: jest.fn(),
}));

jest.mock("@/illustration/orchestrator/regenerateVisualBible", () => ({
  regenerateVisualBible: jest.fn(),
}));

const generateImageMock = generateImage as jest.MockedFunction<typeof generateImage>;
const markFailedMock = markImageGenerationFailedOnStory as jest.MockedFunction<
  typeof markImageGenerationFailedOnStory
>;
const regenerateScenePlanMock = regenerateScenePlan as jest.MockedFunction<
  typeof regenerateScenePlan
>;
const cascadeAfterRejectMock = cascadeAfterReject as jest.MockedFunction<typeof cascadeAfterReject>;
const regenerateVisualBibleMock = regenerateVisualBible as jest.MockedFunction<
  typeof regenerateVisualBible
>;

describe("illustration worker handlers — image_generation", () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    markFailedMock.mockReset();
    markFailedMock.mockResolvedValue(undefined);
    regenerateScenePlanMock.mockReset();
    cascadeAfterRejectMock.mockReset();
    regenerateVisualBibleMock.mockReset();
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

describe("illustration worker handlers — scene_plan_regen", () => {
  beforeEach(() => {
    regenerateScenePlanMock.mockReset();
    regenerateScenePlanMock.mockResolvedValue({ scenePlanId: "sp-new", version: 2 });
  });

  test("marks job succeeded", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-sp",
      storyId: "s1",
      type: "scene_plan_regen" as const,
      pageNumber: 2,
      enqueuedBy: "uid",
      enqueuedAt: 1,
      startedAt: null,
      completedAt: null,
      lastHeartbeatAt: null,
      status: "running" as const,
      attempt: 1,
      idempotencyKey: "k",
      inputRefs: { feedbackNote: "note" },
      outputRefs: {},
      error: null,
    };
    await handlers.scene_plan_regen(job, jobRef);
    expect(regenerateScenePlanMock).toHaveBeenCalledWith({
      storyId: "s1",
      pageNumber: 2,
      uid: "uid",
      feedbackNote: "note",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        outputRefs: expect.objectContaining({ scenePlanId: "sp-new", version: "2" }),
      }),
    );
  });
});

describe("illustration worker handlers — image_regen", () => {
  beforeEach(() => {
    cascadeAfterRejectMock.mockReset();
    markFailedMock.mockReset();
    markFailedMock.mockResolvedValue(undefined);
  });

  test("marks job succeeded", async () => {
    cascadeAfterRejectMock.mockResolvedValue({
      imageId: "img-2",
      storagePath: "p",
      publicUrl: "https://x",
    });
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-rg",
      storyId: "s1",
      type: "image_regen" as const,
      pageNumber: 1,
      enqueuedBy: "uid",
      enqueuedAt: 1,
      startedAt: null,
      completedAt: null,
      lastHeartbeatAt: null,
      status: "running" as const,
      attempt: 1,
      idempotencyKey: "k",
      inputRefs: { feedbackNote: "fix it" },
      outputRefs: {},
      error: null,
    };
    await handlers.image_regen(job, jobRef);
    expect(cascadeAfterRejectMock).toHaveBeenCalledWith({
      storyId: "s1",
      pageNumber: 1,
      uid: "uid",
      feedbackNote: "fix it",
      expectedPendingJobId: "job-rg",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        outputRefs: expect.objectContaining({ imageId: "img-2" }),
      }),
    );
  });

  test("failure invokes markImageGenerationFailedOnStory", async () => {
    cascadeAfterRejectMock.mockRejectedValue(new Error("fail"));
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-rg2",
      storyId: "s1",
      type: "image_regen" as const,
      pageNumber: 3,
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
    await expect(handlers.image_regen(job, jobRef)).rejects.toThrow("fail");
    expect(markFailedMock).toHaveBeenCalledWith({
      storyId: "s1",
      pageNumber: 3,
      jobId: "job-rg2",
      message: "fail",
    });
  });
});

describe("illustration worker handlers — visual_bible_regen", () => {
  beforeEach(() => {
    regenerateVisualBibleMock.mockReset();
    regenerateVisualBibleMock.mockResolvedValue({ vbId: "vb-x", version: 3 });
  });

  test("marks job succeeded", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const jobRef = { update } as unknown as DocumentReference;
    const job = {
      id: "job-vb",
      storyId: "s1",
      type: "visual_bible_regen" as const,
      pageNumber: null,
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
    await handlers.visual_bible_regen(job, jobRef);
    expect(regenerateVisualBibleMock).toHaveBeenCalledWith({ storyId: "s1", uid: "uid" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        outputRefs: expect.objectContaining({ vbId: "vb-x", version: "3" }),
      }),
    );
  });
});
