import { Router, Request, Response } from "express";
import multer from "multer";
import { admin, db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS, STORAGE_PATHS } from "../../shared/firestore/paths";
import type { Banner, BannerLocalizedString } from "../../shared/types/banner";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes((file.mimetype || "").toLowerCase())) {
      cb(new Error(`Unsupported image format: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

function uploadMiddleware(req: Request, res: Response, next: () => void) {
  upload.single("image")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ success: false, error: { code: "INVALID_UPLOAD", message } });
      return;
    }
    next();
  });
}

function localizedStringFromBody(body: Record<string, unknown>, prefix: string): BannerLocalizedString {
  const result: BannerLocalizedString = {};
  for (const lang of ["en", "he", "ar"] as const) {
    const key = `${prefix}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      result[lang] = value.trim();
    }
  }
  return result;
}

function toIsoString(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

async function uploadBannerImage(bannerId: string, file: Express.Multer.File): Promise<string> {
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[file.mimetype.toLowerCase()] ?? "jpg";
  const storagePath = STORAGE_PATHS.bannerImage(bannerId, `${Date.now()}.${ext}`);
  const bucket = admin.storage().bucket();
  const storageFile = bucket.file(storagePath);
  await storageFile.save(file.buffer, { metadata: { contentType: file.mimetype } });
  await storageFile.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * GET /api/admin/banners
 * Full list, every banner regardless of isActive — for the admin management table.
 */
router.get("/", requireAuth, requireRole("admin"), async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db.collection(COLLECTIONS.BANNERS).orderBy("sortOrder", "asc").get();
    const rows: Banner[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrl: data.imageUrl ?? "",
        title: data.title ?? {},
        description: data.description ?? {},
        buttonText: data.buttonText ?? {},
        buttonLink: data.buttonLink ?? "",
        isActive: data.isActive === true,
        sortOrder: data.sortOrder ?? 0,
        createdAt: toIsoString(data.createdAt) ?? "",
        updatedAt: toIsoString(data.updatedAt) ?? "",
      };
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("[admin/banners] list error:", error);
    res.status(500).json({
      success: false,
      error: { code: "BANNERS_LIST_FAILED", message: "Failed to load banners" },
    });
  }
});

/**
 * POST /api/admin/banners
 * multipart/form-data: image (file, required), titleEn/titleHe/titleAr,
 * descriptionEn/descriptionHe/descriptionAr, buttonTextEn/buttonTextHe/buttonTextAr,
 * buttonLink, isActive ("true"/"false"), sortOrder (numeric string).
 */
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  uploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: "IMAGE_REQUIRED", message: "A banner image is required." },
        });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const bannerRef = db.collection(COLLECTIONS.BANNERS).doc();
      const imageUrl = await uploadBannerImage(bannerRef.id, req.file);

      const now = admin.firestore.FieldValue.serverTimestamp();
      await bannerRef.set({
        imageUrl,
        title: localizedStringFromBody(body, "title"),
        description: localizedStringFromBody(body, "description"),
        buttonText: localizedStringFromBody(body, "buttonText"),
        buttonLink: typeof body.buttonLink === "string" ? body.buttonLink.trim() : "",
        isActive: body.isActive === "true",
        sortOrder: Number(body.sortOrder ?? 0) || 0,
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({ success: true, data: { id: bannerRef.id } });
    } catch (error) {
      console.error("[admin/banners] create error:", error);
      res.status(500).json({
        success: false,
        error: { code: "BANNER_CREATE_FAILED", message: "Failed to create banner" },
      });
    }
  },
);

/**
 * PATCH /api/admin/banners/:id
 * Same fields as POST, all optional. image is optional — if provided, replaces
 * the existing image (old file is left in place; harmless orphan, avoids a
 * race with any in-flight reads of the old URL).
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  uploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: { code: "INVALID_BODY", message: "id is required." } });
        return;
      }

      const bannerRef = db.collection(COLLECTIONS.BANNERS).doc(id);
      const snap = await bannerRef.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Banner not found." } });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const update: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (req.file) {
        update.imageUrl = await uploadBannerImage(id, req.file);
      }
      if ("titleEn" in body || "titleHe" in body || "titleAr" in body) {
        update.title = localizedStringFromBody(body, "title");
      }
      if ("descriptionEn" in body || "descriptionHe" in body || "descriptionAr" in body) {
        update.description = localizedStringFromBody(body, "description");
      }
      if ("buttonTextEn" in body || "buttonTextHe" in body || "buttonTextAr" in body) {
        update.buttonText = localizedStringFromBody(body, "buttonText");
      }
      if (typeof body.buttonLink === "string") {
        update.buttonLink = body.buttonLink.trim();
      }
      if (typeof body.isActive === "string") {
        update.isActive = body.isActive === "true";
      }
      if (typeof body.sortOrder === "string") {
        update.sortOrder = Number(body.sortOrder) || 0;
      }

      await bannerRef.set(update, { merge: true });
      res.status(200).json({ success: true, data: { id } });
    } catch (error) {
      console.error("[admin/banners] update error:", error);
      res.status(500).json({
        success: false,
        error: { code: "BANNER_UPDATE_FAILED", message: "Failed to update banner" },
      });
    }
  },
);

/**
 * DELETE /api/admin/banners/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: { code: "INVALID_BODY", message: "id is required." } });
        return;
      }
      const bannerRef = db.collection(COLLECTIONS.BANNERS).doc(id);
      const snap = await bannerRef.get();
      if (!snap.exists) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Banner not found." } });
        return;
      }
      await bannerRef.delete();
      res.status(200).json({ success: true, data: { id } });
    } catch (error) {
      console.error("[admin/banners] delete error:", error);
      res.status(500).json({
        success: false,
        error: { code: "BANNER_DELETE_FAILED", message: "Failed to delete banner" },
      });
    }
  },
);

export default router;
