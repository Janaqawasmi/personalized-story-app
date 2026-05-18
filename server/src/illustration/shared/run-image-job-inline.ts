import { firestore } from "@/config/firebase";
import {
  generateImage,
  markImageGenerationFailedOnStory,
} from "@/illustration/orchestrator/generateImage";
import { COLLECTIONS } from "@/shared/firestore/paths";

/**
 * Run image_generation in-process (dev). Use when the background worker cannot
 * poll Firestore (e.g. broken IPv6 to Google) or to guarantee local Stage 3 code runs.
 */
export async function runImageGenerationJobInline(params: {
  storyId: string;
  pageNumber: number;
  jobId: string;
  uid: string;
}): Promise<{ imageId: string; storagePath: string; publicUrl: string }> {
  const { storyId, pageNumber, jobId, uid } = params;
  const jobRef = firestore
    .collection(COLLECTIONS.STORIES)
    .doc(storyId)
    .collection(COLLECTIONS.STORY_ILLUSTRATION_JOBS)
    .doc(jobId);

  const now = Date.now();
  await jobRef.update({
    status: "running",
    startedAt: now,
    lastHeartbeatAt: now,
  });

  try {
    const result = await generateImage({
      storyId,
      pageNumber,
      uid,
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
    console.log(
      `[illustration] inline image job completed story=${storyId} page=${pageNumber} jobId=${jobId}`,
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markImageGenerationFailedOnStory({
      storyId,
      pageNumber,
      jobId,
      message,
    }).catch(() => undefined);
    await jobRef
      .update({
        status: "failed",
        completedAt: Date.now(),
        lastHeartbeatAt: Date.now(),
        error: message,
      })
      .catch(() => undefined);
    console.error(
      `[illustration] inline image job failed story=${storyId} page=${pageNumber} jobId=${jobId}`,
      err,
    );
    throw err;
  }
}

export function isIllustrationDevInlineJobsEnabled(): boolean {
  return process.env.ILLUSTRATION_DEV_INLINE_JOBS === "true";
}
