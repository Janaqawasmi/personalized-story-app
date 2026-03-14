import { admin, db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";

const ORPHAN_UPLOAD_HOURS = 24;

interface CleanupResult {
  deleted: number;
  errors: number;
}

/**
 * Cleans up expired child photos and orphaned uploads.
 * Intended to be called by a scheduled Cloud Function.
 *
 * Two cleanup passes:
 * 1. Photos with status "preview_used" where photoRetainUntil has passed
 * 2. Orphaned uploads: status "uploaded" with photoUploadedAt > 24h ago
 *
 * @returns count of deleted photos and errors
 */
export async function cleanupExpiredPhotos(): Promise<CleanupResult> {
  let deleted = 0;
  let errors = 0;
  const now = new Date().toISOString();
  const bucket = admin.storage().bucket();

  // Pass 1: Expired preview_used photos
  const caregiversSnapshot = await db.collection(COLLECTIONS.CAREGIVERS).get();

  for (const caregiverDoc of caregiversSnapshot.docs) {
    const caregiverUid = caregiverDoc.id;

    // Query children with preview_used status and expired retention
    const expiredChildren = await db
      .collection(COLLECTIONS.children(caregiverUid))
      .where("photoStatus", "==", "preview_used")
      .where("photoRetainUntil", "<", now)
      .get();

    for (const childDoc of expiredChildren.docs) {
      try {
        const childData = childDoc.data();
        const photoPath = childData.photoPath as string | null;

        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
        }

        await childDoc.ref.update({
          photoStatus: "expired",
          photoPath: null,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        deleted++;
      } catch (error) {
        console.error(
          `Failed to cleanup photo for child ${childDoc.id} (caregiver ${caregiverUid}):`,
          error
        );
        errors++;
      }
    }

    // Pass 2: Orphaned uploads (uploaded but never used, older than 24h)
    const orphanCutoff = new Date(
      Date.now() - ORPHAN_UPLOAD_HOURS * 60 * 60 * 1000
    ).toISOString();

    const orphanedChildren = await db
      .collection(COLLECTIONS.children(caregiverUid))
      .where("photoStatus", "==", "uploaded")
      .where("photoUploadedAt", "<", orphanCutoff)
      .get();

    for (const childDoc of orphanedChildren.docs) {
      try {
        const childData = childDoc.data();
        const photoPath = childData.photoPath as string | null;

        if (photoPath) {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
        }

        await childDoc.ref.update({
          photoStatus: "expired",
          photoPath: null,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        deleted++;
      } catch (error) {
        console.error(
          `Failed to cleanup orphaned photo for child ${childDoc.id} (caregiver ${caregiverUid}):`,
          error
        );
        errors++;
      }
    }
  }

  console.log(`Photo cleanup completed: ${deleted} deleted, ${errors} errors`);
  return { deleted, errors };
}
