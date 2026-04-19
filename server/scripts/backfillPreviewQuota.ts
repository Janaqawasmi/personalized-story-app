import { db } from "../src/config/firebase";
import { COLLECTIONS } from "../src/shared/firestore/paths";
import * as admin from "firebase-admin";

/**
 * One-time migration. For every caregiver who has any storyPreviews doc,
 * mark their quota as used and link to their OLDEST preview.
 *
 * Run: npx ts-node server/scripts/backfillPreviewQuota.ts
 */
async function backfillPreviewQuota() {
  console.log("Starting backfill...");
  const previewsSnap = await db.collection(COLLECTIONS.STORY_PREVIEWS).get();

  const oldestByCaregiver = new Map<
    string,
    { previewId: string; createdAt: admin.firestore.Timestamp; status: string }
  >();

  for (const doc of previewsSnap.docs) {
    const d = doc.data();
    if (!d.caregiverUid) continue;
    const createdAt = d.createdAt as admin.firestore.Timestamp | undefined;
    if (!createdAt) continue;
    const existing = oldestByCaregiver.get(d.caregiverUid as string);
    if (!existing || createdAt.toMillis() < existing.createdAt.toMillis()) {
      oldestByCaregiver.set(d.caregiverUid as string, {
        previewId: doc.id,
        createdAt,
        status: (d.status as string) ?? "created",
      });
    }
  }

  console.log(`Found ${oldestByCaregiver.size} caregivers with previews.`);

  let updated = 0;
  for (const [uid, { previewId, createdAt, status }] of oldestByCaregiver) {
    const freePreviewStatus =
      status === "ready" || status === "added_to_cart" || status === "purchased" || status === "converted"
        ? "ready"
        : status === "failed"
          ? "failed"
          : "claimed";

    await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).set(
      {
        freePreviewUsed: true,
        freePreviewId: previewId,
        freePreviewUsedAt: createdAt,
        freePreviewStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    updated++;
    if (updated % 50 === 0) console.log(`  ...${updated} caregivers updated`);
  }

  console.log(`Backfill complete. ${updated} caregivers updated.`);
  process.exit(0);
}

backfillPreviewQuota().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
