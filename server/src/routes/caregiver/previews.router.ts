import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireAuth } from "../../middleware/auth.middleware";
import { COLLECTIONS, STORAGE_PATHS } from "../../shared/firestore/paths";
import { generatePreview } from "../../services/preview.service";
import multer from "multer";

const router = Router();

// Multer config: memory storage, 10MB max, image types only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg", // some browsers report this
      "image/png",
      "image/webp",
    ];

    // Log the actual MIME to confirm what's coming in
    console.log("[upload] incoming file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      // Note: size is not always present here (depends on multer internals)
      size: (file as any).size,
    });

    const mimetype = (file.mimetype || "").toLowerCase();
    if (!allowed.includes(mimetype)) {
      return cb(
        new Error(
          `Unsupported image format: ${file.mimetype}. Please use JPEG, PNG, or WebP.`
        )
      );
    }

    cb(null, true);
  },
});

const VALID_AGE_GROUPS = ["0_3", "3_6", "6_9", "9_12"] as const;
const VALID_GENDERS = ["male", "female"] as const;

/** Dev-only: reset free-preview quota fields on caregivers/{uid} (non-production only). */
if (process.env.NODE_ENV !== "production") {
  router.post(
    "/dev/reset-quota",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const uid = req.user!.uid;
        await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).set(
          {
            freePreviewUsed: false,
            freePreviewUsedAt: null,
            freePreviewPreviewId: null,
          },
          { merge: true }
        );
        res.status(200).json({ success: true, data: { reset: true } });
      } catch (error) {
        console.error("[dev/reset-quota] error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Reset failed",
        });
      }
    }
  );
}

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
  requireAuth,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Invalid upload";
        console.error("[upload] multer error:", message);
        res.status(400).json({
          success: false,
          error: message,
          code: "INVALID_UPLOAD",
        });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.user!.uid;
      const { templateId, childFirstName, childGender, childAgeGroup, dedicationName } = req.body as {
        templateId?: string;
        childFirstName?: string;
        childGender?: string;
        childAgeGroup?: string;
        dedicationName?: string;
      };

      if (!templateId || !childFirstName || !childGender || !childAgeGroup) {
        res.status(400).json({
          success: false,
          error: "templateId, childFirstName, childGender, and childAgeGroup are required",
        });
        return;
      }

      if (!VALID_GENDERS.includes(childGender as (typeof VALID_GENDERS)[number])) {
        res.status(400).json({
          success: false,
          error: `Invalid childGender. Must be one of: ${VALID_GENDERS.join(", ")}`,
        });
        return;
      }

      if (!VALID_AGE_GROUPS.includes(childAgeGroup as (typeof VALID_AGE_GROUPS)[number])) {
        res.status(400).json({
          success: false,
          error: `Invalid childAgeGroup. Must be one of: ${VALID_AGE_GROUPS.join(", ")}`,
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "photo file is required",
        });
        return;
      }

      const previewId = await generatePreview({
        caregiverUid,
        templateId,
        childFirstName,
        childGender: childGender as "male" | "female",
        childAgeGroup: childAgeGroup as "0_3" | "3_6" | "6_9" | "9_12",
        ...(dedicationName ? { dedicationName: String(dedicationName) } : {}),
        photoBuffer: req.file.buffer,
        photoMimeType: req.file.mimetype,
      });

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
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as any).code)
          : undefined;

      if (code === "FREE_PREVIEW_ALREADY_USED") {
        res.status(403).json({
          success: false,
          error: message,
          code,
        });
        return;
      }

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
        ...(code ? { code } : {}),
      });
    }
  }
);

/**
 * POST /api/caregiver/previews/:previewId/reupload-photo
 *
 * Re-uploads photo when it has been deleted/expired, but keeps the preview/illustrations.
 */
router.post(
  "/:previewId/reupload-photo",
  requireAuth,
  upload.single("photo"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.user!.uid;
      const { previewId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: "photo file is required" });
        return;
      }

      const previewDoc = await db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId!).get();
      if (!previewDoc.exists) {
        res.status(404).json({ success: false, error: "Preview not found" });
        return;
      }

      const preview = previewDoc.data() as any;
      if (preview.caregiverUid !== caregiverUid) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      const allowedStatuses = ["ready", "added_to_cart"];
      if (!allowedStatuses.includes(preview.status)) {
        res.status(400).json({
          success: false,
          error: `Preview is not in a re-uploadable state. Current status: ${preview.status}`,
        });
        return;
      }

      const allowedPhotoStatuses = ["deleted", "expired"];
      if (!allowedPhotoStatuses.includes(preview.photoStatus)) {
        res.status(400).json({
          success: false,
          error: `Photo does not require re-upload. Current photoStatus: ${preview.photoStatus}`,
        });
        return;
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[req.file.mimetype] ?? "jpg";
      const filename = `${Date.now()}.${ext}`;
      const storagePath = STORAGE_PATHS.childPhoto(caregiverUid, previewId!, filename);

      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });

      const now = new Date().toISOString();
      const retainUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await previewDoc.ref.update({
        photoPath: storagePath,
        photoStatus: "uploaded",
        photoUploadedAt: now,
        photoRetainUntil: retainUntil,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(200).json({
        success: true,
        data: { previewId, photoStatus: "uploaded" },
      });
    } catch (error) {
      console.error("Re-upload photo error:", error);
      const message = error instanceof Error ? error.message : "Re-upload failed";
      res.status(500).json({ success: false, error: message });
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
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.user!.uid;
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
