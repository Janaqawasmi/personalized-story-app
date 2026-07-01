import { admin, db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";

interface CleanupReport {
  photosDeleted: number;
  previewsDeleted: number;
  errors: number;
}

function storagePrefixForPreview(caregiverUid: string, previewId: string): string {
  return `preview-illustrations/${caregiverUid}/${previewId}/`;
}

export async function cleanupPreviews(): Promise<CleanupReport> {
  const report: CleanupReport = { photosDeleted: 0, previewsDeleted: 0, errors: 0 };
  const bucket = admin.storage().bucket();

  const now = new Date();
  const nowIso = now.toISOString();

  const cutoffPhotoOrphanIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoffConvertedTs = admin.firestore.Timestamp.fromMillis(
    Date.now() - 48 * 60 * 60 * 1000
  );
  const cutoffAbandonedTs = admin.firestore.Timestamp.fromMillis(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  const cutoffStuckTs = admin.firestore.Timestamp.fromMillis(
    Date.now() - 72 * 60 * 60 * 1000
  );

  // ---------------------------------------------------------------
  // JOB 1: Delete expired preview_used photos (48h passed since preview_used)
  // ---------------------------------------------------------------
  try {
    const expiredPhotos = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("photoStatus", "==", "preview_used")
      .where("photoRetainUntil", "<", nowIso)
      .get();

    for (const doc of expiredPhotos.docs) {
      const data = doc.data() as any;
      const photoPath = data.photoPath as string | null;

      try {
        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        await doc.ref.update({
          photoPath: null,
          photoStatus: "deleted",
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } catch (e) {
        report.errors += 1;
        console.error(`Job1: Failed to delete expired photo for ${doc.id}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job1 failed:", e);
  }

  // ---------------------------------------------------------------
  // JOB 2: Delete orphaned uploads (uploaded but generation never completed)
  // ---------------------------------------------------------------
  try {
    const orphanedUploads = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("photoStatus", "==", "uploaded")
      .where("photoUploadedAt", "<", cutoffPhotoOrphanIso)
      .get();

    for (const doc of orphanedUploads.docs) {
      const data = doc.data() as any;
      const photoPath = data.photoPath as string | null;

      try {
        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        await doc.ref.update({
          photoPath: null,
          photoStatus: "deleted",
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } catch (e) {
        report.errors += 1;
        console.error(`Job2: Failed to delete orphan upload photo for ${doc.id}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job2 failed:", e);
  }

  // ---------------------------------------------------------------
  // JOB 3: Delete converted previews (full story exists + safety buffer passed)
  // ---------------------------------------------------------------
  try {
    const convertedPreviews = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("status", "==", "converted")
      .where("updatedAt", "<", cutoffConvertedTs)
      .get();

    for (const doc of convertedPreviews.docs) {
      const data = doc.data() as any;
      const caregiverUid = data.caregiverUid as string;
      const previewId = doc.id;
      const photoPath = (data.photoPath as string | null) ?? null;
      const illustrationPrefix = storagePrefixForPreview(caregiverUid, previewId);

      try {
        // Delete preview illustrations
        const [files] = await bucket.getFiles({ prefix: illustrationPrefix });
        for (const f of files) {
          await f.delete();
        }

        // Safety: delete photo if still present
        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        await doc.ref.delete();
        report.previewsDeleted += 1;
      } catch (e) {
        report.errors += 1;
        console.error(`Job3: Failed to delete converted preview ${previewId}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job3 failed:", e);
  }

  // ---------------------------------------------------------------
  // JOB 4: Delete abandoned previews (never added to cart, 30 days old)
  // ---------------------------------------------------------------
  try {
    const abandonedPreviews = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("status", "==", "ready")
      .where("createdAt", "<", cutoffAbandonedTs)
      .get();

    for (const doc of abandonedPreviews.docs) {
      const data = doc.data() as any;
      const caregiverUid = data.caregiverUid as string;
      const previewId = doc.id;
      const photoPath = (data.photoPath as string | null) ?? null;
      const illustrationPrefix = storagePrefixForPreview(caregiverUid, previewId);

      try {
        const [files] = await bucket.getFiles({ prefix: illustrationPrefix });
        for (const f of files) {
          await f.delete();
        }

        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        await doc.ref.delete();
        report.previewsDeleted += 1;
      } catch (e) {
        report.errors += 1;
        console.error(`Job4: Failed to delete abandoned preview ${previewId}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job4 failed:", e);
  }

  // ---------------------------------------------------------------
  // JOB 5: Delete stuck/failed previews (72h old)
  // ---------------------------------------------------------------
  try {
    const stuckPreviews = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("status", "in", ["created", "generating", "failed"])
      .where("createdAt", "<", cutoffStuckTs)
      .get();

    for (const doc of stuckPreviews.docs) {
      const data = doc.data() as any;
      const caregiverUid = data.caregiverUid as string;
      const previewId = doc.id;
      const photoPath = (data.photoPath as string | null) ?? null;
      const illustrationPrefix = storagePrefixForPreview(caregiverUid, previewId);

      try {
        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        const [files] = await bucket.getFiles({ prefix: illustrationPrefix });
        for (const f of files) {
          await f.delete();
        }

        await doc.ref.delete();
        report.previewsDeleted += 1;
      } catch (e) {
        report.errors += 1;
        console.error(`Job5: Failed to delete stuck preview ${previewId}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job5 failed:", e);
  }

  // ---------------------------------------------------------------
  // JOB 6: Delete generation_partially_failed previews after the support
  //         window (30 days since the preview was last updated).
  //
  //         These previews were NOT marked "converted" so Job 3 left them
  //         alone. After 30 days the support/retry window has passed;
  //         clean up the preview document and any preview illustrations.
  //
  //         The raw child photo is already handled by Job 1 (it keeps
  //         photoStatus === "preview_used" and is deleted after photoRetainUntil,
  //         which is typically 24–48 h after generation started — long before
  //         the 30-day window here).
  // ---------------------------------------------------------------
  const cutoffPartiallyFailedTs = admin.firestore.Timestamp.fromMillis(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  try {
    const partiallyFailedPreviews = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("status", "==", "generation_partially_failed")
      .where("updatedAt", "<", cutoffPartiallyFailedTs)
      .get();

    for (const doc of partiallyFailedPreviews.docs) {
      const data = doc.data() as any;
      const caregiverUid = data.caregiverUid as string;
      const previewId = doc.id;
      const photoPath = (data.photoPath as string | null) ?? null;
      const illustrationPrefix = storagePrefixForPreview(caregiverUid, previewId);

      try {
        const [files] = await bucket.getFiles({ prefix: illustrationPrefix });
        for (const f of files) {
          await f.delete();
        }

        // Safety: delete raw photo if still present (Job 1 should have done this,
        // but handle stragglers so biometric data is never retained past 30 days).
        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            report.photosDeleted += 1;
          }
        }

        await doc.ref.delete();
        report.previewsDeleted += 1;
      } catch (e) {
        report.errors += 1;
        console.error(`Job6: Failed to delete generation_partially_failed preview ${previewId}:`, e);
      }
    }
  } catch (e) {
    report.errors += 1;
    console.error("Job6 failed:", e);
  }

  return report;
}

