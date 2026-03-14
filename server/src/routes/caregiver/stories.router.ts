import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * GET /api/caregiver/stories/library
 *
 * Returns the caregiver's library of completed personalized stories.
 * Uses a field mask for the list view (no full page data).
 */
router.get(
  "/library",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;

      const snapshot = await db
        .collection(COLLECTIONS.PERSONALIZED_STORIES)
        .where("caregiverUid", "==", caregiverUid)
        .where("generationStatus", "==", "completed")
        .where("isAccessible", "==", true)
        .orderBy("createdAt", "desc")
        .select(
          "storyId",
          "templateTitle",
          "coverImageUrl",
          "childFirstName",
          "childGender",
          "language",
          "totalPages",
          "createdAt"
        )
        .get();

      const stories = snapshot.docs.map((doc) => ({
        storyId: doc.id,
        ...doc.data(),
      }));

      res.status(200).json({
        success: true,
        data: stories,
      });
    } catch (error) {
      console.error("Get story library error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve story library",
      });
    }
  }
);

/**
 * GET /api/caregiver/stories/:storyId
 *
 * Returns a full personalized story with all pages.
 * Verifies ownership and purchase status.
 */
router.get(
  "/:storyId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { storyId } = req.params;

      const storyDoc = await db
        .collection(COLLECTIONS.PERSONALIZED_STORIES)
        .doc(storyId!)
        .get();

      if (!storyDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Story not found",
        });
        return;
      }

      const data = storyDoc.data()!;

      // Ownership check
      if (data.caregiverUid !== caregiverUid) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }

      // Accessibility check
      if (!data.isAccessible) {
        res.status(403).json({
          success: false,
          error: "Story is not yet accessible. Generation may still be in progress.",
        });
        return;
      }

      // Verify purchase exists and is valid
      const purchaseId = data.purchaseId as string;
      const purchasesSnapshot = await db
        .collection(COLLECTIONS.purchases(caregiverUid))
        .where("purchaseId", "==", purchaseId)
        .limit(1)
        .get();

      if (purchasesSnapshot.empty) {
        res.status(403).json({
          success: false,
          error: "Valid purchase not found for this story",
        });
        return;
      }

      const purchaseData = purchasesSnapshot.docs[0]!.data();
      if (purchaseData.status !== "completed" && purchaseData.status !== "paid") {
        res.status(403).json({
          success: false,
          error: "Purchase is not in a valid state",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          storyId: storyDoc.id,
          ...data,
        },
      });
    } catch (error) {
      console.error("Get story error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve story",
      });
    }
  }
);

export default router;
