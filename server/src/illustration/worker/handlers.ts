import type { DocumentReference } from "firebase-admin/firestore";
import { generateImage, markImageGenerationFailedOnStory } from "@/illustration/orchestrator/generateImage";
import { openWorkspace } from "@/illustration/orchestrator/openWorkspace";
import type { IllustrationJob, IllustrationJobType } from "@/illustration/types";

export class UnsupportedJobTypeError extends Error {
  constructor(type: string) {
    super(`Unsupported illustration job type: ${type}`);
    this.name = "UnsupportedJobTypeError";
  }
}

export type JobHandler = (job: IllustrationJob, jobRef: DocumentReference) => Promise<void>;

async function handleWorkspaceOpen(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  const result = await openWorkspace({ storyId: job.storyId, uid: job.enqueuedBy });
  await jobRef.update({
    status: "succeeded",
    completedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    outputRefs: {
      vbId: result.vbId,
      scenePlanIds: JSON.stringify(result.scenePlanIds),
      skipped: String(result.skipped),
    },
    error: null,
  });
}

async function handleImageGeneration(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  const pageNumber = job.pageNumber;
  if (pageNumber === null || pageNumber === undefined) {
    throw new Error("image_generation job missing pageNumber");
  }
  try {
    const result = await generateImage({
      storyId: job.storyId,
      pageNumber,
      uid: job.enqueuedBy,
    });
    await jobRef.update({
      status: "succeeded",
      completedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      outputRefs: {
        imageId: result.imageId,
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markImageGenerationFailedOnStory({
      storyId: job.storyId,
      pageNumber,
      jobId: job.id,
      message,
    }).catch((e) => console.warn("[illustration/worker] markImageGenerationFailedOnStory", e));
    throw err;
  }
}

export const handlers: Record<IllustrationJobType, JobHandler> = {
  workspace_open: handleWorkspaceOpen,
  scene_plan_regen: async () => {
    throw new UnsupportedJobTypeError("scene_plan_regen");
  },
  image_generation: handleImageGeneration,
  image_regen: async () => {
    throw new UnsupportedJobTypeError("image_regen");
  },
};
