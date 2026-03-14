import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS, STORAGE_PATHS } from "../../shared/firestore/paths";
import multer from "multer";

const router = Router();

// Multer config: memory storage, 10MB max, image types only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

/**
 * POST /api/caregiver/photos/upload
 *
 * Upload a child's photo for personalization.
 * - Auth: Firebase ID token required, must be caregiver role
 * - Input: multipart/form-data with `childId` field and `photo` file
 * - Validation: JPEG/PNG/WebP only, max 10MB
 * - Writes to Storage via Admin SDK (not direct browser upload)
 * - Updates child profile with photoPath and photoStatus
 */
router.post(
  "/upload",
  requireCaregiverAuth,
  upload.single("photo"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { childId } = req.body as { childId?: string };

      if (!childId) {
        res.status(400).json({
          success: false,
          error: "childId is required",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "Photo file is required",
        });
        return;
      }

      // Verify child belongs to this caregiver
      const childRef = db
        .collection(COLLECTIONS.children(caregiverUid))
        .doc(childId);
      const childDoc = await childRef.get();

      if (!childDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Child profile not found",
        });
        return;
      }

      // Determine file extension from mimetype
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[req.file.mimetype] ?? "jpg";
      const timestamp = Date.now();
      const filename = `${timestamp}.${ext}`;

      // Upload to Storage via Admin SDK
      const storagePath = STORAGE_PATHS.childPhoto(caregiverUid, childId, filename);
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Delete old photo if exists
      const oldPhotoPath = childDoc.data()?.photoPath as string | undefined;
      if (oldPhotoPath) {
        try {
          const oldFile = bucket.file(oldPhotoPath);
          const [exists] = await oldFile.exists();
          if (exists) {
            await oldFile.delete();
          }
        } catch {
          // Non-critical — old file cleanup failure is logged but not blocking
          console.warn(`Failed to delete old photo: ${oldPhotoPath}`);
        }
      }

      // Update child profile
      const now = new Date().toISOString();
      await childRef.update({
        photoPath: storagePath,
        photoStatus: "uploaded",
        photoUploadedAt: now,
        photoRetainUntil: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(200).json({
        success: true,
        data: {
          photoPath: storagePath,
          photoStatus: "uploaded",
          photoUploadedAt: now,
        },
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      const message = error instanceof Error ? error.message : "Upload failed";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
