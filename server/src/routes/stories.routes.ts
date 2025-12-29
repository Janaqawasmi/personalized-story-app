import { Router } from "express";
import { db } from "../config/firebase";
import { parseAgeGroupIdFromQuery } from "../data/categories";

const router = Router();

/**
 * GET /api/stories/search?q=...
 * Search stories by:
 * - Age group (parses "0-3", "0_3", "0 – 3", etc. to "0_3")
 * - Title keywords
 * - Category/topic keywords
 */
router.get("/search", async (req, res) => {
  try {
    const qRaw = String(req.query.q ?? "").trim();
    const ageGroupId = parseAgeGroupIdFromQuery(qRaw);

    // If user typed an age, filter by ageGroup (check multiple field locations)
    if (ageGroupId) {
      // Fetch all approved stories and filter by ageGroup in memory
      // (since ageGroup might be in ageGroup, targetAgeGroup, or generationConfig.targetAgeGroup)
      const snap = await db
        .collection("story_templates")
        .where("status", "==", "approved")
        .get();

      const results = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((s: any) => {
          return (
            s.ageGroup === ageGroupId ||
            s.targetAgeGroup === ageGroupId ||
            s.generationConfig?.targetAgeGroup === ageGroupId
          );
        });

      return res.json({ results, matchedAgeGroup: ageGroupId });
    }

    // Otherwise do keyword search (title/category/topic) in memory
    // Firestore doesn't support "contains" like SQL, so we do a small dataset scan
    const snap = await db
      .collection("story_templates")
      .where("status", "==", "approved")
      .get();

    const q = qRaw.toLowerCase();

    const results = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        if (!q) return true; // if empty query show all or trending

        const title = String(s.title ?? "").toLowerCase();
        const topic = String(s.primaryTopic ?? "").toLowerCase();
        const category = String(s.category ?? "").toLowerCase();
        const situation = String(s.specificSituation ?? "").toLowerCase();
        const topicKey = String(s.topicKey ?? "").toLowerCase();

        return (
          title.includes(q) ||
          topic.includes(q) ||
          category.includes(q) ||
          situation.includes(q) ||
          topicKey.includes(q)
        );
      });

    return res.json({ results, matchedAgeGroup: null });
  } catch (err: any) {
    console.error("[stories/search] Error:", err);
    return res.status(500).json({ error: "Search failed", details: err.message });
  }
});

export default router;

