import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * GET /api/public/banners
 * No auth — homepage promo banners. Only ever returns isActive=true docs,
 * sorted for display order. Explicit field-by-field construction so a future
 * admin-only field can never leak here by accident.
 */
router.get("/banners", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Sort in memory rather than chaining .orderBy("sortOrder") onto the
    // where() clause — combining an equality filter with orderBy on a
    // different field requires a composite Firestore index; this collection
    // is small (a handful of promo banners), so an in-memory sort is simpler
    // and needs no index deployment.
    const snap = await db.collection(COLLECTIONS.BANNERS).where("isActive", "==", true).get();

    const banners = snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          imageUrl: (data.imageUrl as string | undefined) ?? "",
          title: data.title ?? {},
          description: data.description ?? {},
          buttonText: data.buttonText ?? {},
          buttonLink: (data.buttonLink as string | undefined) ?? "",
          sortOrder: (data.sortOrder as number | undefined) ?? 0,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...rest }) => rest);

    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("[public/banners] list error:", error);
    res.status(500).json({
      success: false,
      error: { code: "BANNERS_LIST_FAILED", message: "Failed to load banners" },
    });
  }
});

export default router;
