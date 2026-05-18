import type { DocumentReference } from "firebase-admin/firestore";
import { firestore } from "@/config/firebase";

export class JobCancelledError extends Error {
  constructor() {
    super("ILLUSTRATION_JOB_CANCELLED");
    this.name = "JobCancelledError";
  }
}

/**
 * Returns true if the job document requests cancellation.
 * Used at orchestrator stage boundaries (running jobs).
 */
export async function isJobCancellationRequested(
  jobRef: DocumentReference,
): Promise<boolean> {
  const snap = await jobRef.get();
  if (!snap.exists) return false;
  const data = snap.data();
  return data?.["cancelRequested"] === true;
}

/** Throws {@link JobCancelledError} when cancellation was requested. */
export async function assertJobNotCancelled(jobRef: DocumentReference): Promise<void> {
  if (await isJobCancellationRequested(jobRef)) {
    throw new JobCancelledError();
  }
}
