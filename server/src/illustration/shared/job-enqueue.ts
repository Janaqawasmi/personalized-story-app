import { firestore } from "@/config/firebase";
import type { IllustrationJob, IllustrationJobType } from "@/illustration/types";
import { COLLECTIONS } from "@/shared/firestore/paths";

export interface EnqueueJobInput {
  storyId: string;
  type: IllustrationJobType;
  pageNumber: number | null;
  enqueuedBy: string;
  inputRefs: Record<string, string>;
  idempotencyKey: string;
}

export async function enqueueJob(input: EnqueueJobInput): Promise<string> {
  const jobsCol = firestore
    .collection(COLLECTIONS.STORIES)
    .doc(input.storyId)
    .collection(COLLECTIONS.STORY_ILLUSTRATION_JOBS);

  const existing = await jobsCol
    .where("idempotencyKey", "==", input.idempotencyKey)
    .where("status", "in", ["pending", "running"])
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    if (doc) return doc.id;
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const job: IllustrationJob = {
    id,
    storyId: input.storyId,
    type: input.type,
    pageNumber: input.pageNumber,
    enqueuedBy: input.enqueuedBy,
    enqueuedAt: now,
    startedAt: null,
    completedAt: null,
    lastHeartbeatAt: null,
    status: "pending",
    attempt: 1,
    idempotencyKey: input.idempotencyKey,
    inputRefs: input.inputRefs,
    outputRefs: {},
    error: null,
  };

  await jobsCol.doc(id).set(job);
  return id;
}
