import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS, STORAGE_PATHS } from "../../shared/firestore/paths";
import {
  createDirectPurchasePreview,
  generatePreview,
  PreviewQuotaError,
} from "../../services/preview.service";
import { isValidIllustrationStyleId } from "../../shared/types/visualStyles";
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

    console.log("[upload] incoming file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
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
    requireCaregiverAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const uid = req.caregiverUser!.uid;
        await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).set(
          {
            freePreviewUsed: false,
            freePreviewUsedAt: null,
            freePreviewId: null,
            freePreviewStatus: null,
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
 * GET /api/caregiver/previews/quota
 */
router.get("/quota", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const snap = await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).get();
    const c = snap.data() ?? {};

    let existingTemplateId: string | null = null;
    if (c.freePreviewId) {
      const previewSnap = await db
        .collection(COLLECTIONS.STORY_PREVIEWS)
        .doc(String(c.freePreviewId))
        .get();
      if (previewSnap.exists) {
        existingTemplateId = (previewSnap.data()?.templateId as string | undefined) ?? null;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        hasUsedPreview: c.freePreviewUsed === true && c.unlimitedPreviews !== true,
        existingPreviewId: (c.freePreviewId as string | undefined) ?? null,
        existingTemplateId,
        status: (c.freePreviewStatus as string | undefined) ?? null,
        unlimited: c.unlimitedPreviews === true,
      },
    });
  } catch (err) {
    console.error("[previews.quota] error", err);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL", message: "Failed to fetch quota." },
    });
  }
});

/**
 * POST /api/caregiver/previews/generate
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
          error: { code: "INVALID_UPLOAD", message },
        });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.user!.uid;
      const { templateId, childFirstName, childGender, childAgeGroup, dedicationName, selectedIllustrationStyle } = req.body as {
        templateId?: string;
        childFirstName?: string;
        childGender?: string;
        childAgeGroup?: string;
        dedicationName?: string;
        selectedIllustrationStyle?: string;
      };

      if (!templateId || !childFirstName || !childGender || !childAgeGroup) {
        res.status(400).json({
          success: false,
          error: { code: "MISSING_FIELDS", message: "Required fields are missing." },
        });
        return;
      }

      if (!VALID_GENDERS.includes(childGender as (typeof VALID_GENDERS)[number])) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_GENDER", message: "Invalid gender." },
        });
        return;
      }

      if (!VALID_AGE_GROUPS.includes(childAgeGroup as (typeof VALID_AGE_GROUPS)[number])) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_AGE_GROUP", message: "Invalid age group." },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: "MISSING_PHOTO", message: "Child photo is required." },
        });
        return;
      }

      if (selectedIllustrationStyle !== undefined && !isValidIllustrationStyleId(selectedIllustrationStyle)) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_ILLUSTRATION_STYLE", message: "Invalid illustration style." },
        });
        return;
      }

      const result = await generatePreview({
        caregiverUid,
        templateId,
        childFirstName,
        childGender: childGender as "male" | "female",
        childAgeGroup: childAgeGroup as "0_3" | "3_6" | "6_9" | "9_12",
        ...(dedicationName ? { dedicationName: String(dedicationName) } : {}),
        photoBuffer: req.file.buffer,
        photoMimeType: req.file.mimetype,
        ...(selectedIllustrationStyle !== undefined ? { selectedIllustrationStyle } : {}),
      });

      res.status(202).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof PreviewQuotaError) {
        if (err.code === "FREE_PREVIEW_ALREADY_USED") {
          res.status(403).json({
            success: false,
            error: {
              code: err.code,
              message: err.message,
              existingPreviewId: err.existingPreviewId,
            },
          });
          return;
        }
        if (err.code === "TEMPLATE_NOT_FOUND" || err.code === "TEMPLATE_INACTIVE") {
          res.status(404).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
        if (
          err.code === "PERSONALIZATION_DISABLED" ||
          err.code === "TEXT_PERSONALIZATION_NOT_READY" ||
          err.code === "VISUAL_PERSONALIZATION_NOT_READY"
        ) {
          res.status(422).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
        if (err.code === "INVALID_ILLUSTRATION_STYLE") {
          res.status(400).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
      }
      console.error("[previews.generate] unexpected error", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Failed to generate preview." },
      });
    }
  }
);

/**
 * POST /api/caregiver/previews/direct-purchase
 *
 * Creates a ready-only preview (no AI pages) for purchase after free preview quota is used.
 */
router.post(
  "/direct-purchase",
  requireAuth,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Invalid upload";
        console.error("[upload] multer error:", message);
        res.status(400).json({
          success: false,
          error: { code: "INVALID_UPLOAD", message },
        });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.user!.uid;
      const { templateId, childFirstName, childGender, childAgeGroup, dedicationName, selectedIllustrationStyle } = req.body as {
        templateId?: string;
        childFirstName?: string;
        childGender?: string;
        childAgeGroup?: string;
        dedicationName?: string;
        selectedIllustrationStyle?: string;
      };

      if (!templateId || !childFirstName || !childGender || !childAgeGroup) {
        res.status(400).json({
          success: false,
          error: { code: "MISSING_FIELDS", message: "Required fields are missing." },
        });
        return;
      }

      if (!VALID_GENDERS.includes(childGender as (typeof VALID_GENDERS)[number])) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_GENDER", message: "Invalid gender." },
        });
        return;
      }

      if (!VALID_AGE_GROUPS.includes(childAgeGroup as (typeof VALID_AGE_GROUPS)[number])) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_AGE_GROUP", message: "Invalid age group." },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: "MISSING_PHOTO", message: "Child photo is required." },
        });
        return;
      }

      if (selectedIllustrationStyle !== undefined && !isValidIllustrationStyleId(selectedIllustrationStyle)) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_ILLUSTRATION_STYLE", message: "Invalid illustration style." },
        });
        return;
      }

      const result = await createDirectPurchasePreview({
        caregiverUid,
        templateId,
        childFirstName,
        childGender: childGender as "male" | "female",
        childAgeGroup: childAgeGroup as "0_3" | "3_6" | "6_9" | "9_12",
        ...(dedicationName ? { dedicationName: String(dedicationName) } : {}),
        photoBuffer: req.file.buffer,
        photoMimeType: req.file.mimetype,
        ...(selectedIllustrationStyle !== undefined ? { selectedIllustrationStyle } : {}),
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof PreviewQuotaError) {
        if (err.code === "TEMPLATE_NOT_FOUND" || err.code === "TEMPLATE_INACTIVE") {
          res.status(404).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
        if (
          err.code === "PERSONALIZATION_DISABLED" ||
          err.code === "TEXT_PERSONALIZATION_NOT_READY" ||
          err.code === "VISUAL_PERSONALIZATION_NOT_READY"
        ) {
          res.status(422).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
        if (err.code === "INVALID_ILLUSTRATION_STYLE") {
          res.status(400).json({
            success: false,
            error: { code: err.code, message: err.message },
          });
          return;
        }
      }
      console.error("[previews.direct-purchase] error", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Failed to create purchase preview." },
      });
    }
  }
);

/**
 * GET /api/caregiver/previews/:previewId/personalization
 *
 * Returns saved child fields for restoring local storage before opening the reader.
 * Must be registered before GET /:previewId.
 */
router.get(
  "/:previewId/personalization",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { previewId } = req.params;
      const snap = await db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId!).get();

      if (!snap.exists) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Preview not found." },
        });
        return;
      }

      const p = snap.data()!;
      if (p.caregiverUid !== req.user!.uid) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Not your preview." },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          templateId: p.templateId,
          childFirstName: p.childFirstName,
          childGender: p.childGender,
          childAgeGroup: p.childAgeGroup,
          dedicationName: p.dedicationName ?? null,
        },
      });
    } catch (err) {
      console.error("[previews.personalization] error", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Failed to fetch personalization." },
      });
    }
  }
);

/**
 * POST /api/caregiver/previews/:previewId/reupload-photo
 */
router.post(
  "/:previewId/reupload-photo",
  requireCaregiverAuth,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Invalid upload";
        res.status(400).json({ success: false, error: message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
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

      const preview = previewDoc.data() as Record<string, unknown>;
      if (preview.caregiverUid !== caregiverUid) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      const allowedStatuses = ["ready", "added_to_cart"];
      if (!allowedStatuses.includes(preview.status as string)) {
        res.status(400).json({
          success: false,
          error: `Preview is not in a re-uploadable state. Current status: ${preview.status}`,
        });
        return;
      }

      const allowedPhotoStatuses = ["deleted", "expired"];
      if (!allowedPhotoStatuses.includes(preview.photoStatus as string)) {
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
 * Same auth model as POST /generate: any signed-in user may read a preview they own.
 */
router.get(
  "/:previewId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ownerUid = req.user!.uid;
      const { previewId } = req.params;

      const previewDoc = await db.collection(COLLECTIONS.STORY_PREVIEWS).doc(previewId!).get();

      if (!previewDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Preview not found",
        });
        return;
      }

      const data = previewDoc.data()!;

      if (data.caregiverUid !== ownerUid) {
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
