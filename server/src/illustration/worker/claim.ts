import type { DocumentReference } from "firebase-admin/firestore";
import { firestore } from "@/config/firebase";

export async function claimJob(jobRef: DocumentReference): Promise<boolean> {
  try {
    return await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(jobRef);
      if (!snap.exists) return false;
      const data = snap.data();
      if (data?.["status"] !== "pending") return false;
      const now = Date.now();
      tx.update(jobRef, {
        status: "running",
        startedAt: now,
        lastHeartbeatAt: now,
      });
      return true;
    });
  } catch {
    return false;
  }
}
