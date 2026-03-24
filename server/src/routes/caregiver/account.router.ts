import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * DELETE /api/caregiver/account
 *
 * Initiates async account deletion for the authenticated caregiver.
 * Immediately marks the account as deletion pending and disables Firebase Auth.
 * The actual data cleanup runs asynchronously.
 */
router.delete(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;

      // Mark caregiver as pending deletion
      const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
      const caregiverDoc = await caregiverRef.get();

      if (!caregiverDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Caregiver account not found",
        });
        return;
      }

      // Check if already pending deletion
      if (caregiverDoc.data()?.deletionStatus === "pending") {
        res.status(200).json({
          success: true,
          data: { status: "deletion_already_pending" },
        });
        return;
      }

      // Set deletion status
      await caregiverRef.update({
        deletionStatus: "pending",
        deletionRequestedAt: new Date().toISOString(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Disable Firebase Auth account immediately
      await admin.auth().updateUser(caregiverUid, { disabled: true });

      // Trigger async deletion
      performAccountDeletion(caregiverUid).catch((error) => {
        console.error(`Account deletion failed for ${caregiverUid}:`, error);
      });

      res.status(200).json({
        success: true,
        data: {
          status: "deletion_pending",
          message: "Your account is being deleted. This may take a few minutes.",
        },
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initiate account deletion",
      });
    }
  }
);

/**
 * Performs the actual account deletion asynchronously.
 * Deletes all user data across Firestore, Storage, and Firebase Auth.
 */
async function performAccountDeletion(caregiverUid: string): Promise<void> {
  const bucket = admin.storage().bucket();

  try {
    // 1. Delete children subcollection
    const childrenSnapshot = await db
      .collection(COLLECTIONS.children(caregiverUid))
      .get();

    for (const childDoc of childrenSnapshot.docs) {
      const photoPath = childDoc.data().photoPath as string | undefined;
      if (photoPath) {
        try {
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
        } catch {
          // Continue deletion even if photo cleanup fails
        }
      }
      await childDoc.ref.delete();
    }

    // 2. Delete cart subcollection
    const cartSnapshot = await db
      .collection(COLLECTIONS.cart(caregiverUid))
      .get();
    for (const doc of cartSnapshot.docs) {
      await doc.ref.delete();
    }

    // 3. Delete purchases subcollection
    const purchasesSnapshot = await db
      .collection(COLLECTIONS.purchases(caregiverUid))
      .get();
    for (const doc of purchasesSnapshot.docs) {
      await doc.ref.delete();
    }

    // 4. Delete storyPreviews where caregiverUid matches
    const previewsSnapshot = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .where("caregiverUid", "==", caregiverUid)
      .get();
    for (const doc of previewsSnapshot.docs) {
      await doc.ref.delete();
    }

    // 5. Delete personalizedStories where caregiverUid matches
    const storiesSnapshot = await db
      .collection(COLLECTIONS.PERSONALIZED_STORIES)
      .where("caregiverUid", "==", caregiverUid)
      .get();
    for (const doc of storiesSnapshot.docs) {
      await doc.ref.delete();
    }

    // 6. Delete Storage directories
    const storagePrefixes = [
      `child-photos/${caregiverUid}/`,
      `preview-illustrations/${caregiverUid}/`,
      `generated-illustrations/${caregiverUid}/`,
    ];

    for (const prefix of storagePrefixes) {
      try {
        const [files] = await bucket.getFiles({ prefix });
        for (const file of files) {
          await file.delete();
        }
      } catch {
        console.warn(`Failed to delete storage prefix: ${prefix}`);
      }
    }

    // 7. Delete caregiver document
    await db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid).delete();

    // 8. Delete Firebase Auth account
    await admin.auth().deleteUser(caregiverUid);

    console.log(`Account deletion completed for caregiver ${caregiverUid}`);
  } catch (error) {
    console.error(`Account deletion error for ${caregiverUid}:`, error);

    // Mark as failed
    try {
      await db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid).update({
        deletionStatus: "failed",
        deletionError: error instanceof Error ? error.message : "Unknown error",
        updatedAt: admin.firestore.Timestamp.now(),
      });
    } catch {
      // If the document is already gone, that's fine
    }
  }
}

export default router;
