import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireAuth } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

/**
 * POST /api/caregiver/feedback
 * body: { storyTemplateId, personalizedStoryId, childName, rating (1-5),
 *         emotionalShift: { before, after } (0-10 each), reviewText? }
 */
router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const uid = req.user!.uid;
      const {
        storyTemplateId,
        personalizedStoryId,
        childName,
        rating,
        emotionalShift,
        reviewText,
      } = req.body as {
        storyTemplateId?: string;
        personalizedStoryId?: string;
        childName?: string;
        rating?: number;
        emotionalShift?: { before?: number; after?: number };
        reviewText?: string;
      };

      if (!storyTemplateId?.trim() || !personalizedStoryId?.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "storyTemplateId and personalizedStoryId are required.",
          },
        });
        return;
      }

      if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_RATING", message: "rating must be an integer from 1 to 5." },
        });
        return;
      }

      const before = emotionalShift?.before;
      const after = emotionalShift?.after;
      const hasEmotionalShift = before != null && after != null;
      if (
        hasEmotionalShift &&
        (!Number.isFinite(before) || before! < 0 || before! > 10 ||
          !Number.isFinite(after) || after! < 0 || after! > 10)
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_EMOTIONAL_SHIFT",
            message: "emotionalShift.before and .after must each be 0-10.",
          },
        });
        return;
      }

      const feedbackRef = db.collection(COLLECTIONS.STORY_FEEDBACK).doc();
      await feedbackRef.set({
        caregiverUid: uid,
        storyTemplateId: storyTemplateId.trim(),
        personalizedStoryId: personalizedStoryId.trim(),
        childName: typeof childName === "string" ? childName.trim() : "",
        rating,
        emotionalShift: hasEmotionalShift ? { before, after } : null,
        reviewText: typeof reviewText === "string" && reviewText.trim() ? reviewText.trim() : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db
        .collection(COLLECTIONS.PERSONALIZED_STORIES)
        .doc(personalizedStoryId.trim())
        .set({ feedbackSubmitted: true }, { merge: true });

      res.status(200).json({ success: true, data: { feedbackId: feedbackRef.id } });
    } catch (error) {
      console.error("[feedback] submit error:", error);
      res.status(502).json({
        success: false,
        error: {
          code: "FEEDBACK_SUBMIT_FAILED",
          message: error instanceof Error ? error.message : "Failed to submit feedback",
        },
      });
    }
  },
);

export default router;
