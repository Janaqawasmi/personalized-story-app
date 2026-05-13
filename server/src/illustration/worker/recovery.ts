import { firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";

const STALE_MS = 60_000;
const MAX_ATTEMPTS = 3;

export async function reclaimStaleJobs(): Promise<void> {
  const now = Date.now();
  const threshold = now - STALE_MS;
  const snap = await firestore
    .collectionGroup(COLLECTIONS.STORY_ILLUSTRATION_JOBS)
    .where("status", "==", "running")
    .where("lastHeartbeatAt", "<", threshold)
    .get();

  for (const doc of snap.docs) {
    try {
      await firestore.runTransaction(async (tx) => {
        const s = await tx.get(doc.ref);
        if (!s.exists) return;
        const data = s.data();
        if (data?.["status"] !== "running") return;
        const hb = data["lastHeartbeatAt"];
        if (typeof hb !== "number" || hb >= threshold) return;
        const attempt = Number(data["attempt"] ?? 1);
        if (attempt >= MAX_ATTEMPTS) {
          tx.update(doc.ref, {
            status: "failed",
            completedAt: now,
            error: "max attempts exceeded",
          });
        } else {
          tx.update(doc.ref, {
            status: "pending",
            startedAt: null,
            lastHeartbeatAt: null,
            attempt: attempt + 1,
          });
        }
      });
    } catch (err) {
      console.error("[illustration/worker] reclaimStaleJobs doc", doc.id, err);
    }
  }
}
