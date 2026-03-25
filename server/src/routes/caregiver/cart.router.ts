import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { cartItemConverter } from "../../shared/firestore/converters";

const router = Router();

/**
 * GET /api/caregiver/cart
 *
 * Returns all cart items for the authenticated caregiver.
 */
router.get(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;

      const snapshot = await db
        .collection(COLLECTIONS.cart(caregiverUid))
        .withConverter(cartItemConverter)
        .orderBy("addedAt", "desc")
        .get();

      const items = snapshot.docs.map((doc) => doc.data());

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve cart",
      });
    }
  }
);

/**
 * POST /api/caregiver/cart
 *
 * Adds a preview to the caregiver's cart.
 * Validates that the preview belongs to the caregiver and is in "ready" status.
 *
 * Input: { previewId: string }
 */
router.post(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { previewId } = req.body as { previewId?: string };

      if (!previewId) {
        res.status(400).json({
          success: false,
          error: "previewId is required",
        });
        return;
      }

      // Load preview and verify ownership + status
      const previewDoc = await db
        .collection(COLLECTIONS.STORY_PREVIEWS)
        .doc(previewId)
        .get();

      if (!previewDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Preview not found",
        });
        return;
      }

      const preview = previewDoc.data()!;

      if (preview.caregiverUid !== caregiverUid) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }

      if (preview.status !== "ready") {
        res.status(400).json({
          success: false,
          error: `Preview is not ready for cart. Current status: ${preview.status}`,
        });
        return;
      }

      // Check if already in cart
      const existingCartItem = await db
        .collection(COLLECTIONS.cart(caregiverUid))
        .where("previewId", "==", previewId)
        .limit(1)
        .get();

      if (!existingCartItem.empty) {
        const existing = existingCartItem.docs[0]!;
        res.status(200).json({
          success: true,
          data: { cartItemId: existing.id, ...existing.data() },
          message: "Preview already in cart",
        });
        return;
      }

      // Load template for pricing
      const templateDoc = await db
        .collection(COLLECTIONS.STORY_TEMPLATES)
        .doc(preview.templateId as string)
        .get();

      const templateData = templateDoc.exists ? templateDoc.data() : null;
      const priceCents = (templateData?.priceCents as number) ?? 2999; // Default price
      const currency = (templateData?.currency as string) ?? "ILS";

      // Create cart item
      const cartRef = db
        .collection(COLLECTIONS.cart(caregiverUid))
        .doc();

      const cartItemData = {
        caregiverUid,
        previewId,
        templateId: preview.templateId as string,
        templateTitle: preview.templateTitle as string,
        childFirstName: preview.childFirstName as string,
        coverImageUrl: (preview.coverImageUrl as string) || null,
        priceCents,
        currency,
        language: preview.language as "ar" | "he",
        addedAt: admin.firestore.Timestamp.now(),
      };

      await cartRef.set(cartItemData);

      // Update preview status
      await previewDoc.ref.update({
        status: "added_to_cart",
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(201).json({
        success: true,
        data: {
          cartItemId: cartRef.id,
          ...cartItemData,
        },
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add to cart",
      });
    }
  }
);

/**
 * DELETE /api/caregiver/cart/:cartItemId
 *
 * Removes an item from the cart. Reverts the preview status to "ready".
 */
router.delete(
  "/:cartItemId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { cartItemId } = req.params;

      const cartRef = db
        .collection(COLLECTIONS.cart(caregiverUid))
        .doc(cartItemId!);
      const cartDoc = await cartRef.get();

      if (!cartDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Cart item not found",
        });
        return;
      }

      const cartData = cartDoc.data()!;

      // Revert preview status to "ready"
      const previewId = cartData.previewId as string;
      if (previewId) {
        try {
          await db
            .collection(COLLECTIONS.STORY_PREVIEWS)
            .doc(previewId)
            .update({
              status: "ready",
              updatedAt: admin.firestore.Timestamp.now(),
            });
        } catch {
          // Non-critical
          console.warn(`Failed to revert preview status for ${previewId}`);
        }
      }

      await cartRef.delete();

      res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove from cart",
      });
    }
  }
);

export default router;
