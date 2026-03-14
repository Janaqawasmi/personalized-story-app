import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { generatePreview } from "../../services/preview.service";

const router = Router();

/**
 * POST /api/caregiver/previews/generate
 *
 * Initiates preview generation for a child + template combination.
 * Returns immediately with 202 — generation continues asynchronously.
 *
 * Idempotency: If a non-expired, non-converted preview already exists
 * for the same child + template, returns the existing previewId.
 */
router.post(
  "/generate",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { templateId, childId } = req.body as {
        templateId?: string;
        childId?: string;
      };

      if (!templateId || !childId) {
        res.status(400).json({
          success: false,
          error: "templateId and childId are required",
        });
        return;
      }

      const previewId = await generatePreview(caregiverUid, templateId, childId);

      res.status(202).json({
        success: true,
        data: {
          previewId,
          status: "generating",
        },
      });
    } catch (error) {
      console.error("Preview generation error:", error);
      const message = error instanceof Error ? error.message : "Preview generation failed";

      const statusCode = message.includes("limit reached")
        ? 429
        : message.includes("not found")
          ? 404
          : message.includes("required")
            ? 400
            : 500;

      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/caregiver/previews/:previewId
 *
 * Returns a single preview document. Verifies ownership.
 */
router.get(
  "/:previewId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { previewId } = req.params;

      const previewDoc = await db
        .collection(COLLECTIONS.STORY_PREVIEWS)
        .doc(previewId!)
        .get();

      if (!previewDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Preview not found",
        });
        return;
      }

      const data = previewDoc.data()!;

      if (data.caregiverUid !== caregiverUid) {
        res.status(403).json({
          success: false,
          error: "Access denied",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { ...data, previewId: previewDoc.id },
      });
    } catch (error) {
      console.error("Get preview error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve preview",
      });
    }
  }
);

export default router;
