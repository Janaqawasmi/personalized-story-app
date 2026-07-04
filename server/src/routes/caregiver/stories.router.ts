import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * GET /api/caregiver/stories/purchased
 *
 * Returns ALL of the caregiver's personalized story records (any generation
 * status) for the "My Stories → Purchased" tab. The client uses `generationStatus`
 * and `isAccessible` to render different states:
 *   - completed + isAccessible=true → show "Read" button
 *   - in_progress / generating     → "Being prepared..."
 *   - partially_failed              → "Needs support"
 *   - failed                        → "Generation failed"
 *
 * No purchase validation is done here — the caller is the authenticated owner.
 * Full pages are excluded (field mask).
 */
router.get(
  "/purchased",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;

      const snapshot = await db
        .collection(COLLECTIONS.PERSONALIZED_STORIES)
        .where("caregiverUid", "==", caregiverUid)
        .orderBy("createdAt", "desc")
        .select(
          "storyId",
          "purchaseId",
          "templateTitle",
          "coverImageUrl",
          "childFirstName",
          "childGender",
          "language",
          "totalPages",
          "pagesCompleted",
          "generationStatus",
          "isAccessible",
          "createdAt",
          "templateId",
          "itemType"
        )
        .get();

      const purchasesSnapshot = await db
        .collection(COLLECTIONS.purchases(caregiverUid))
        .select("purchaseId", "purchaseFormat", "printOrder")
        .get();

      const purchasesById = new Map(
        purchasesSnapshot.docs.map((doc) => {
          const data = doc.data();
          const purchaseId =
            typeof data.purchaseId === "string" && data.purchaseId.trim()
              ? data.purchaseId
              : doc.id;

          return [purchaseId, data];
        })
      );

      const stories = snapshot.docs.map((doc) => {
        const data = doc.data();
        const purchaseId =
          typeof data.purchaseId === "string" && data.purchaseId.trim()
            ? data.purchaseId
            : "";
        const purchaseData = purchasesById.get(purchaseId);

        return {
          storyId: doc.id,
          ...data,
          purchaseId,
          purchaseFormat:
            typeof purchaseData?.purchaseFormat === "string"
              ? purchaseData.purchaseFormat
              : "digital",
          printOrderStatus:
            purchaseData?.printOrder &&
            typeof purchaseData.printOrder === "object" &&
            typeof (purchaseData.printOrder as { status?: unknown }).status === "string"
              ? (purchaseData.printOrder as { status: string }).status
              : null,
          printOrder:
            purchaseData?.printOrder && typeof purchaseData.printOrder === "object"
              ? purchaseData.printOrder
              : null,
        };
      });

      res.status(200).json({ success: true, data: stories });
    } catch (error) {
      console.error("Get purchased stories error:", error);
      res.status(500).json({ success: false, error: "Failed to retrieve purchased stories" });
    }
  }
);

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

      // Verify purchase exists and is valid. `purchaseId` must always be set
      // by both the personalized (fullStoryGeneration.service.ts) and fixed
      // (finalizeFixedStoryPurchase) creation paths — guard explicitly instead
      // of letting a missing field reach `.where(..., undefined)`, which
      // throws synchronously and used to surface as a generic 500 with no
      // indication of what was actually wrong.
      const purchaseId = typeof data.purchaseId === "string" ? data.purchaseId : null;
      if (!purchaseId) {
        console.error(
          `Story ${storyDoc.id} is missing purchaseId — cannot verify purchase.`
        );
        res.status(500).json({
          success: false,
          error: "This story record is missing its purchase reference (purchaseId). Please contact support.",
        });
        return;
      }

      // Uses a collectionGroup query (not a single-caregiver subcollection
      // query) because that is the query shape `purchaseId` already has a
      // deployed index for (see firestore.indexes.json fieldOverrides).
      const purchasesSnapshot = await db
        .collectionGroup("purchases")
        .where("purchaseId", "==", purchaseId)
        .limit(1)
        .get();

      if (purchasesSnapshot.empty) {
        res.status(403).json({
          success: false,
          error: `Valid purchase not found for this story (purchaseId: ${purchaseId})`,
        });
        return;
      }

      const purchaseDoc = purchasesSnapshot.docs[0]!;
      const purchaseData = purchaseDoc.data();

      // Defense in depth: the collectionGroup query above spans every
      // caregiver's purchases subcollection, so confirm this purchase
      // actually belongs to the requesting caregiver before trusting it.
      if (purchaseData.caregiverUid !== caregiverUid) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }

      if (purchaseData.status !== "completed" && purchaseData.status !== "paid") {
        res.status(403).json({
          success: false,
          error: `Purchase is not in a valid state (status: ${purchaseData.status ?? "unknown"})`,
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
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: `Failed to retrieve story: ${message}`,
      });
    }
  }
);

export default router;
