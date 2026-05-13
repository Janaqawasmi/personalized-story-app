import type { DocumentReference } from "firebase-admin/firestore";
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

export const handlers: Record<IllustrationJobType, JobHandler> = {
  workspace_open: handleWorkspaceOpen,
  scene_plan_regen: async () => {
    throw new UnsupportedJobTypeError("scene_plan_regen");
  },
  image_generation: async () => {
    throw new UnsupportedJobTypeError("image_generation");
  },
  image_regen: async () => {
    throw new UnsupportedJobTypeError("image_regen");
  },
};
