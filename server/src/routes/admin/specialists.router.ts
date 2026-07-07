import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { AuditTrail } from "../../services/auditTrail.service";

const router = Router();

interface TemplateAgg {
  storyCount: number;
  totalPurchases: number;
  templateIds: string[];
}

interface RatingAgg {
  sum: number;
  count: number;
}

interface ResolvedSpecialist {
  id: string;
  displayName: string;
  email: string | null;
  status: "active" | "disabled";
  joinedAt: string | null;
  /** false when specialistId didn't resolve to a real Firebase Auth account (legacy/system-authored templates). */
  isRealAccount: boolean;
}

/**
 * Resolves a story_templates.specialistId to a profile.
 *
 * IMPORTANT: specialistId is NOT reliably tied to the "specialist" custom
 * claim in this dataset — both real content-creator accounts on file are
 * tagged role:"admin", not role:"specialist" (people who both write and
 * approve stories). So the specialist directory must be derived from who has
 * actually published templates (distinct specialistId values), not from a
 * role claim. Some legacy templates carry a synthetic id like
 * "system_specialist" that isn't a real Auth uid — those are surfaced as a
 * non-clickable "system" entry rather than dropped silently.
 */
async function resolveSpecialistProfile(specialistId: string): Promise<ResolvedSpecialist> {
  try {
    const user = await admin.auth().getUser(specialistId);
    return {
      id: user.uid,
      displayName: user.displayName ?? user.email ?? user.uid,
      email: user.email ?? null,
      status: user.disabled ? "disabled" : "active",
      joinedAt: user.metadata.creationTime,
      isRealAccount: true,
    };
  } catch {
    return {
      id: specialistId,
      displayName: specialistId,
      email: null,
      status: "active",
      joinedAt: null,
      isRealAccount: false,
    };
  }
}

/** Groups story_templates by specialistId, projecting only the fields needed to aggregate. */
async function aggregateTemplatesBySpecialist(): Promise<Map<string, TemplateAgg>> {
  const snap = await db
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .select("specialistId", "purchaseCount")
    .get();

  const bySpecialist = new Map<string, TemplateAgg>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const specialistId = data.specialistId as string | undefined;
    if (!specialistId) continue;
    const agg = bySpecialist.get(specialistId) ?? { storyCount: 0, totalPurchases: 0, templateIds: [] };
    agg.storyCount += 1;
    agg.totalPurchases += Number(data.purchaseCount ?? 0);
    agg.templateIds.push(doc.id);
    bySpecialist.set(specialistId, agg);
  }
  return bySpecialist;
}

/** Maps storyTemplateId -> {sum, count} of storyFeedback ratings, for a given set of template ids. */
async function aggregateRatingsByTemplateId(
  templateIds: string[],
): Promise<Map<string, RatingAgg>> {
  const byTemplateId = new Map<string, RatingAgg>();
  if (templateIds.length === 0) return byTemplateId;

  // Firestore "in" queries cap at 30 values — chunk to stay under that limit.
  const chunks: string[][] = [];
  for (let i = 0; i < templateIds.length; i += 30) {
    chunks.push(templateIds.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db
        .collection(COLLECTIONS.STORY_FEEDBACK)
        .where("storyTemplateId", "in", chunk)
        .select("storyTemplateId", "rating")
        .get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const templateId = data.storyTemplateId as string;
        const rating = data.rating as number | undefined;
        if (typeof rating !== "number") continue;
        const agg = byTemplateId.get(templateId) ?? { sum: 0, count: 0 };
        agg.sum += rating;
        agg.count += 1;
        byTemplateId.set(templateId, agg);
      }
    }),
  );
  return byTemplateId;
}

function avgRatingForTemplateIds(
  templateIds: string[],
  ratingsByTemplateId: Map<string, RatingAgg>,
): number | null {
  let sum = 0;
  let count = 0;
  for (const id of templateIds) {
    const agg = ratingsByTemplateId.get(id);
    if (!agg) continue;
    sum += agg.sum;
    count += agg.count;
  }
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

/**
 * GET /api/admin/specialists
 * Real-data leaderboard: the specialist directory is derived from who has
 * actually published story_templates (distinct specialistId values), each
 * resolved to a Firebase Auth profile where possible. Story/purchase counts
 * come from story_templates, rating from storyFeedback. Replaces the old
 * client-side read of the "psychologists" Firestore collection, which
 * nothing in the codebase ever writes to.
 */
router.get("/", requireAuth, requireRole("admin"), async (_req: Request, res: Response): Promise<void> => {
  try {
    const templateAggBySpecialist = await aggregateTemplatesBySpecialist();
    const allTemplateIds = Array.from(templateAggBySpecialist.values()).flatMap((a) => a.templateIds);
    const ratingsByTemplateId = await aggregateRatingsByTemplateId(allTemplateIds);

    const rows = await Promise.all(
      Array.from(templateAggBySpecialist.entries()).map(async ([specialistId, agg]) => {
        const profile = await resolveSpecialistProfile(specialistId);
        return {
          ...profile,
          storyCount: agg.storyCount,
          totalPurchases: agg.totalPurchases,
          avgRating: avgRatingForTemplateIds(agg.templateIds, ratingsByTemplateId),
        };
      }),
    );

    rows.sort((a, b) => b.totalPurchases - a.totalPurchases);

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("[admin/specialists] list error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SPECIALISTS_LIST_FAILED", message: "Failed to load specialists" },
    });
  }
});

/**
 * GET /api/admin/specialists/:specialistId
 * Profile + every story_template they published, each with its own
 * purchaseCount and avgRating.
 */
router.get(
  "/:specialistId",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { specialistId } = req.params;
      if (!specialistId) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "specialistId is required." },
        });
        return;
      }

      const templatesSnap = await db
        .collection(COLLECTIONS.STORY_TEMPLATES)
        .where("specialistId", "==", specialistId)
        .get();

      if (templatesSnap.empty) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Specialist not found." },
        });
        return;
      }

      const profile = await resolveSpecialistProfile(specialistId);
      const templateIds = templatesSnap.docs.map((d) => d.id);
      const ratingsByTemplateId = await aggregateRatingsByTemplateId(templateIds);

      const stories = templatesSnap.docs.map((doc) => {
        const data = doc.data();
        const rating = ratingsByTemplateId.get(doc.id);
        return {
          id: doc.id,
          title: data.title ?? "",
          status: data.status ?? "approved",
          ageGroup: data.ageGroup ?? null,
          primaryTopic: data.primaryTopic ?? "",
          language: data.generationConfig?.language ?? null,
          purchaseCount: data.purchaseCount ?? 0,
          avgRating: rating && rating.count > 0 ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
          reviewCount: rating?.count ?? 0,
          publishedAt: data.publishedAt?.toDate?.().toISOString() ?? null,
          approvedAt: data.approvedAt ?? null,
        };
      });

      const totalPurchases = stories.reduce((sum, s) => sum + (s.purchaseCount ?? 0), 0);
      const avgRating = avgRatingForTemplateIds(templateIds, ratingsByTemplateId);

      res.status(200).json({
        success: true,
        data: {
          specialist: profile,
          stats: {
            storyCount: stories.length,
            totalPurchases,
            avgRating,
          },
          stories,
        },
      });
    } catch (error) {
      console.error("[admin/specialists] detail error:", error);
      res.status(500).json({
        success: false,
        error: { code: "SPECIALIST_DETAIL_FAILED", message: "Failed to load specialist" },
      });
    }
  },
);

/**
 * PATCH /api/admin/specialists/:specialistId/disabled
 * Disables/enables a specialist's Firebase Auth account. Only valid for real
 * accounts (isRealAccount: true) — synthetic/legacy ids like
 * "system_specialist" aren't real Auth users and can't be disabled. Does NOT
 * touch role/claims — see the equivalent users.router.ts endpoint for why.
 */
router.patch(
  "/:specialistId/disabled",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { specialistId } = req.params;
      const { disabled } = req.body as { disabled?: boolean };
      if (!specialistId || typeof disabled !== "boolean") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "specialistId and boolean disabled are required." },
        });
        return;
      }

      const profile = await resolveSpecialistProfile(specialistId);
      if (!profile.isRealAccount) {
        res.status(400).json({
          success: false,
          error: { code: "NOT_REAL_ACCOUNT", message: "This specialist has no real Firebase Auth account to disable." },
        });
        return;
      }

      await admin.auth().updateUser(specialistId, { disabled });
      await AuditTrail.log({
        action: disabled ? "specialist.disabled" : "specialist.enabled",
        actor: AuditTrail.actorFromRequest(req.user!),
        resourceType: "specialist",
        resourceId: specialistId,
      });

      res.status(200).json({ success: true, data: { id: specialistId, disabled } });
    } catch (error) {
      console.error("[admin/specialists] disable error:", error);
      res.status(500).json({
        success: false,
        error: { code: "SPECIALIST_DISABLE_FAILED", message: "Failed to update specialist account status" },
      });
    }
  },
);

export default router;
