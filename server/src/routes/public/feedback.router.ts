import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * GET /api/public/featured-reviews
 * No auth — public homepage data. Only ever returns docs the admin has
 * explicitly flagged isFeatured=true, and only the 4 fields below.
 * Never returns caregiverUid, personalizedStoryId, real childName, or
 * storyTemplateId — those stay internal to /api/admin/feedback.
 */
router.get("/featured-reviews", async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db
      .collection(COLLECTIONS.STORY_FEEDBACK)
      .where("isFeatured", "==", true)
      .get();

    const templateIds = Array.from(
      new Set(
        snap.docs
          .map((d) => d.data().storyTemplateId as string | undefined)
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
      ),
    );

    const templateEntries = await Promise.all(
      templateIds.map(async (id) => {
        const templateSnap = await db.collection(COLLECTIONS.STORY_TEMPLATES).doc(id).get();
        const title = (templateSnap.data()?.title as string | undefined) ?? "";
        return [id, title] as const;
      }),
    );
    const titleByTemplateId = new Map(templateEntries);

    // Explicit field-by-field construction — never spread `data` — so a
    // future field added to storyFeedback can never leak here by accident.
    const reviews = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        rating: (data.rating as number | undefined) ?? null,
        reviewText: (data.reviewText as string | undefined) ?? null,
        featuredDisplayName: (data.featuredDisplayName as string | undefined) ?? null,
        storyTitle: titleByTemplateId.get(data.storyTemplateId as string) ?? "",
      };
    });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("[public/feedback] featured-reviews error:", error);
    res.status(500).json({
      success: false,
      error: { code: "FEATURED_REVIEWS_FAILED", message: "Failed to load featured reviews" },
    });
  }
});

/**
 * GET /api/public/review-stats
 * No auth — platform-wide aggregate, precomputed by onStoryFeedbackCreate
 * onto platformStats/reviewSummary (never computed here by scanning
 * story_templates or storyFeedback client-side).
 */
router.get("/review-stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db.collection(COLLECTIONS.PLATFORM_STATS).doc("reviewSummary").get();
    const data = snap.data();

    res.status(200).json({
      success: true,
      data: {
        totalReviews: (data?.totalRatings as number | undefined) ?? 0,
        avgRating: (data?.avgRating as number | undefined) ?? 0,
      },
    });
  } catch (error) {
    console.error("[public/feedback] review-stats error:", error);
    res.status(500).json({
      success: false,
      error: { code: "REVIEW_STATS_FAILED", message: "Failed to load review stats" },
    });
  }
});

export default router;
