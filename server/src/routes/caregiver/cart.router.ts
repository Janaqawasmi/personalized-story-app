import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { cartItemConverter } from "../../shared/firestore/converters";
import {
  normalizePurchaseFormat,
  PurchasePricingError,
  resolveTemplatePurchasePricing,
} from "../../services/purchasePricing.service";

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
 * Input: { previewId: string, purchaseFormat: "digital" | "print" }
 */
router.post(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { previewId, purchaseFormat: rawPurchaseFormat } = req.body as {
        previewId?: string;
        purchaseFormat?: string;
      };
      const purchaseFormat = normalizePurchaseFormat(rawPurchaseFormat);

      if (!previewId) {
        res.status(400).json({
          success: false,
          error: "previewId is required",
        });
        return;
      }

      if (!purchaseFormat) {
        res.status(400).json({
          success: false,
          error: "purchaseFormat must be 'digital' or 'print'",
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

      if (preview.status !== "ready" && preview.status !== "added_to_cart") {
        res.status(400).json({
          success: false,
          error: `Preview is not ready for cart. Current status: ${preview.status}`,
        });
        return;
      }

      // Load template for pricing
      const templateDoc = await db
        .collection(COLLECTIONS.STORY_TEMPLATES)
        .doc(preview.templateId as string)
        .get();

      if (!templateDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Story template not found",
        });
        return;
      }

      let priceCents: number;
      let currency: string;

      try {
        const pricing = resolveTemplatePurchasePricing(
          templateDoc.data() as Record<string, unknown>,
          purchaseFormat,
        );
        priceCents = pricing.priceCents;
        currency = pricing.currency;
      } catch (error) {
        if (
          error instanceof PurchasePricingError &&
          error.code === "PRINT_NOT_AVAILABLE"
        ) {
          res.status(400).json({
            success: false,
            error: "Print version coming soon",
          });
          return;
        }

        throw error;
      }

      // Check if already in cart. If so, refresh the item to the newest format/pricing.
      const existingCartItem = await db
        .collection(COLLECTIONS.cart(caregiverUid))
        .where("previewId", "==", previewId)
        .limit(1)
        .get();

      if (!existingCartItem.empty) {
        const existing = existingCartItem.docs[0]!;
        const existingData = existing.data();
        const refreshedItem = {
          ...existingData,
          purchaseFormat,
          priceCents,
          currency,
          addedAt: admin.firestore.Timestamp.now(),
        };

        await existing.ref.update(refreshedItem);

        res.status(200).json({
          success: true,
          data: { cartItemId: existing.id, ...refreshedItem },
          message: "Preview already in cart",
        });
        return;
      }

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
        purchaseFormat,
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
