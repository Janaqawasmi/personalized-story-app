import type { DocumentReference } from "firebase-admin/firestore";
import { firestore } from "@/config/firebase";
import type { IllustrationJob } from "@/illustration/types";
import { COLLECTIONS } from "@/shared/firestore/paths";
import { claimJob } from "./claim";
import { handlers, UnsupportedJobTypeError } from "./handlers";
import { reclaimStaleJobs } from "./recovery";

export interface IllustrationWorkerConfig {
  pollIntervalMs: number;
  concurrency: number;
  recoveryIntervalMs: number;
}

const DEFAULTS: IllustrationWorkerConfig = {
  pollIntervalMs: 2000,
  concurrency: 3,
  recoveryIntervalMs: 60_000,
};

let started = false;
let stopRequested = false;

function touchHeartbeat(jobRef: DocumentReference): void {
  void (async () => {
    try {
      await jobRef.update({ lastHeartbeatAt: Date.now() });
    } catch (err) {
      console.warn("[illustration/worker] heartbeat update failed", err);
    }
  })();
}

async function runJob(
  jobSnap: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<void> {
  const jobRef = jobSnap.ref;
  const job = jobSnap.data() as IllustrationJob;
  const claimed = await claimJob(jobRef);
  if (!claimed) return;

  const hb = setInterval(() => {
    touchHeartbeat(jobRef);
  }, 10_000);

  try {
    const handler = handlers[job.type];
    await handler(job, jobRef);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "unknown error";
    await jobRef
      .update({
        status: "failed",
        completedAt: Date.now(),
        error: message,
      })
      .catch(() => undefined);
    if (!(err instanceof UnsupportedJobTypeError)) {
      console.error("[illustration/worker] job failed", job.id, err);
    }
  } finally {
    clearInterval(hb);
  }
}

export function startIllustrationWorker(
  config: Partial<IllustrationWorkerConfig> = {},
): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") {
    return;
  }
  if (process.env.ILLUSTRATION_WORKER_ENABLED === "false") {
    console.log("[illustration/worker] disabled via ILLUSTRATION_WORKER_ENABLED=false");
    return;
  }

  started = true;
  stopRequested = false;
  const cfg = { ...DEFAULTS, ...config };
  const inFlight = new Set<string>();

  const scheduleRecovery = (): void => {
    if (stopRequested) return;
    reclaimStaleJobs().catch((e) => console.error("[illustration/worker] recovery", e));
    setTimeout(scheduleRecovery, cfg.recoveryIntervalMs).unref?.();
  };
  scheduleRecovery();

  const poll = async (): Promise<void> => {
    if (stopRequested) return;
    try {
      const capacity = Math.max(0, cfg.concurrency - inFlight.size);
      if (capacity === 0) {
        setTimeout(poll, cfg.pollIntervalMs).unref?.();
        return;
      }

      const pending = await firestore
        .collectionGroup(COLLECTIONS.STORY_ILLUSTRATION_JOBS)
        .where("status", "==", "pending")
        .orderBy("enqueuedAt", "asc")
        .limit(capacity)
        .get();

      for (const doc of pending.docs) {
        if (inFlight.has(doc.id)) continue;
        inFlight.add(doc.id);
        void runJob(doc)
          .catch((e) => console.error("[illustration/worker] runJob", e))
          .finally(() => {
            inFlight.delete(doc.id);
          });
      }
    } catch (err) {
      console.error("[illustration/worker] pollLoop", err);
    }
    setTimeout(poll, cfg.pollIntervalMs).unref?.();
  };

  void poll();
}

export function __resetIllustrationWorkerForTests(): void {
  started = false;
  stopRequested = true;
}
