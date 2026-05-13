import type { DocumentReference } from "firebase-admin/firestore";
import { cascadeAfterReject } from "@/illustration/orchestrator/cascadeAfterReject";
import {
  generateImage,
  markImageGenerationFailedOnStory,
} from "@/illustration/orchestrator/generateImage";
import { openWorkspace } from "@/illustration/orchestrator/openWorkspace";
import { regenerateScenePlan } from "@/illustration/orchestrator/regenerateScenePlan";
import { regenerateVisualBible } from "@/illustration/orchestrator/regenerateVisualBible";
import { appendIllustrationEvent } from "@/illustration/shared/history-events";
import type { IllustrationJob, IllustrationJobType } from "@/illustration/types";
import { JobCancelledError } from "@/illustration/worker/cancellation";

export class UnsupportedJobTypeError extends Error {
  constructor(type: string) {
    super(`Unsupported illustration job type: ${type}`);
    this.name = "UnsupportedJobTypeError";
  }
}

export type JobHandler = (job: IllustrationJob, jobRef: DocumentReference) => Promise<void>;

function requirePageNumber(job: IllustrationJob): number {
  const pageNumber = job.pageNumber;
  if (pageNumber === null || pageNumber === undefined) {
    throw new Error(`${job.type} job missing pageNumber`);
  }
  return pageNumber;
}

async function markJobCancelled(
  jobRef: DocumentReference,
  job: IllustrationJob,
): Promise<void> {
  const now = Date.now();
  await jobRef.update({
    status: "cancelled",
    completedAt: now,
    lastHeartbeatAt: now,
    cancelledAt: now,
    error: null,
  });
  await appendIllustrationEvent(
    job.storyId,
    { kind: "job_cancelled", jobId: job.id, jobType: job.type },
    job.enqueuedBy,
  );
}

async function handleWorkspaceOpen(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  try {
    const result = await openWorkspace({
      storyId: job.storyId,
      uid: job.enqueuedBy,
      jobRef,
    });
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
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await markJobCancelled(jobRef, job);
      return;
    }
    throw err;
  }
}

async function handleImageGeneration(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  const pageNumber = requirePageNumber(job);
  try {
    const result = await generateImage({
      storyId: job.storyId,
      pageNumber,
      uid: job.enqueuedBy,
      jobRef,
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
    if (err instanceof JobCancelledError) {
      await markImageGenerationFailedOnStory({
        storyId: job.storyId,
        pageNumber,
        jobId: job.id,
        message: "Cancelled",
      }).catch((e) => console.warn("[illustration/worker] markImageGenerationFailedOnStory", e));
      await markJobCancelled(jobRef, job);
      return;
    }
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

async function handleScenePlanRegen(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  const pageNumber = requirePageNumber(job);
  try {
    const rawNote = job.inputRefs.feedbackNote;
    const feedbackNote =
      typeof rawNote === "string" && rawNote.trim().length > 0 ? rawNote.trim() : null;
    const result = await regenerateScenePlan({
      storyId: job.storyId,
      pageNumber,
      uid: job.enqueuedBy,
      feedbackNote,
      jobRef,
    });
    await jobRef.update({
      status: "succeeded",
      completedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      outputRefs: { scenePlanId: result.scenePlanId, version: String(result.version) },
      error: null,
    });
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await markJobCancelled(jobRef, job);
      return;
    }
    throw err;
  }
}

async function handleImageRegen(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  const pageNumber = requirePageNumber(job);
  const rawNote = job.inputRefs.feedbackNote;
  const feedbackNote =
    typeof rawNote === "string" && rawNote.trim().length > 0 ? rawNote.trim() : null;
  try {
    const result = await cascadeAfterReject({
      storyId: job.storyId,
      pageNumber,
      uid: job.enqueuedBy,
      feedbackNote,
      expectedPendingJobId: job.id,
      jobRef,
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
    if (err instanceof JobCancelledError) {
      await markImageGenerationFailedOnStory({
        storyId: job.storyId,
        pageNumber,
        jobId: job.id,
        message: "Cancelled",
      }).catch((e) => console.warn("[illustration/worker] markImageGenerationFailedOnStory", e));
      await markJobCancelled(jobRef, job);
      return;
    }
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

async function handleVisualBibleRegen(
  job: IllustrationJob,
  jobRef: DocumentReference,
): Promise<void> {
  try {
    const result = await regenerateVisualBible({
      storyId: job.storyId,
      uid: job.enqueuedBy,
      jobRef,
    });
    await jobRef.update({
      status: "succeeded",
      completedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      outputRefs: { vbId: result.vbId, version: String(result.version) },
      error: null,
    });
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await markJobCancelled(jobRef, job);
      return;
    }
    throw err;
  }
}

export const handlers: Record<IllustrationJobType, JobHandler> = {
  workspace_open: handleWorkspaceOpen,
  scene_plan_regen: handleScenePlanRegen,
  image_generation: handleImageGeneration,
  image_regen: handleImageRegen,
  visual_bible_regen: handleVisualBibleRegen,
};
