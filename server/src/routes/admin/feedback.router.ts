import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";

const router = Router();

function toIsoString(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

/**
 * GET /api/admin/feedback
 * query: ?storyTemplateId= (optional)
 *
 * Full, uncurated view of every storyFeedback doc for the admin dashboard —
 * unlike /api/public/*, nothing is stripped here. Joins story_templates for
 * a display title so the admin never has to cross-reference ids by hand.
 */
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const storyTemplateIdFilter =
        typeof req.query.storyTemplateId === "string" ? req.query.storyTemplateId.trim() : "";

      let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.STORY_FEEDBACK);
      if (storyTemplateIdFilter) {
        query = query.where("storyTemplateId", "==", storyTemplateIdFilter);
      }

      const feedbackSnap = await query.get();

      const templateIds = Array.from(
        new Set(
          feedbackSnap.docs
            .map((d) => d.data().storyTemplateId as string | undefined)
            .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
        ),
      );

      const templateEntries = await Promise.all(
        templateIds.map(async (id) => {
          const snap = await db.collection(COLLECTIONS.STORY_TEMPLATES).doc(id).get();
          const title = (snap.data()?.title as string | undefined) ?? "";
          return [id, title] as const;
        }),
      );
      const titleByTemplateId = new Map(templateEntries);

      const rows = feedbackSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          feedbackId: doc.id,
          storyTemplateId: data.storyTemplateId ?? "",
          storyTitle: titleByTemplateId.get(data.storyTemplateId) ?? "",
          personalizedStoryId: data.personalizedStoryId ?? "",
          childName: data.childName ?? "",
          rating: data.rating ?? null,
          emotionalShift: data.emotionalShift ?? null,
          reviewText: data.reviewText ?? null,
          isFeatured: data.isFeatured === true,
          featuredDisplayName: data.featuredDisplayName ?? null,
          createdAt: toIsoString(data.createdAt),
        };
      });

      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error("[admin/feedback] list error:", error);
      res.status(500).json({
        success: false,
        error: { code: "FEEDBACK_LIST_FAILED", message: "Failed to load feedback" },
      });
    }
  },
);

/**
 * PATCH /api/admin/feedback/:feedbackId
 * body: { isFeatured?: boolean, featuredDisplayName?: string | null }
 *
 * Curation-only endpoint. Never touches rating/reviewText/childName/etc —
 * those are the caregiver's own submitted data, immutable once written
 * (see firestore.rules: storyFeedback allows create only, never update).
 */
const PROTECTED_FIELDS = [
  "rating",
  "reviewText",
  "childName",
  "caregiverUid",
  "storyTemplateId",
  "personalizedStoryId",
  "emotionalShift",
  "createdAt",
] as const;

router.patch(
  "/:feedbackId",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;
      if (!feedbackId) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "feedbackId is required." },
        });
        return;
      }
      const body = req.body as Record<string, unknown>;

      const attemptedProtectedField = PROTECTED_FIELDS.find((field) => field in body);
      if (attemptedProtectedField) {
        res.status(400).json({
          success: false,
          error: {
            code: "FORBIDDEN_FIELD",
            message: `This route only updates isFeatured/featuredDisplayName. "${attemptedProtectedField}" is not editable here.`,
          },
        });
        return;
      }

      const update: Record<string, unknown> = {};

      if ("isFeatured" in body) {
        if (typeof body.isFeatured !== "boolean") {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_IS_FEATURED", message: "isFeatured must be a boolean." },
          });
          return;
        }
        update.isFeatured = body.isFeatured;
      }

      if ("featuredDisplayName" in body) {
        if (body.featuredDisplayName !== null && typeof body.featuredDisplayName !== "string") {
          res.status(400).json({
            success: false,
            error: {
              code: "INVALID_DISPLAY_NAME",
              message: "featuredDisplayName must be a string or null.",
            },
          });
          return;
        }
        update.featuredDisplayName =
          typeof body.featuredDisplayName === "string"
            ? body.featuredDisplayName.trim() || null
            : null;
      }

      if (Object.keys(update).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "EMPTY_UPDATE",
            message: "Provide at least one of isFeatured, featuredDisplayName.",
          },
        });
        return;
      }

      const feedbackRef = db.collection(COLLECTIONS.STORY_FEEDBACK).doc(feedbackId);
      const snap = await feedbackRef.get();
      if (!snap.exists) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Feedback doc not found." },
        });
        return;
      }

      await feedbackRef.set(update, { merge: true });

      res.status(200).json({ success: true, data: { feedbackId, ...update } });
    } catch (error) {
      console.error("[admin/feedback] patch error:", error);
      res.status(500).json({
        success: false,
        error: { code: "FEEDBACK_PATCH_FAILED", message: "Failed to update feedback" },
      });
    }
  },
);

export default router;
