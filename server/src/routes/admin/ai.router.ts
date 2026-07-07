import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { STORIES_COLLECTION } from "@/models/story.model";

const router = Router();

// A story stuck in "generating" past this long with no agent1Result is
// counted as a failed generation — there is no explicit failure flag on the
// Story model (Agent 1 either completes and transitions the story forward,
// or the request throws before ever persisting a status change), so this is
// the closest honest proxy available today.
const STUCK_GENERATING_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * GET /api/admin/ai/stats
 * Aggregates real Agent 1 telemetry (server/src/agent1/types/index.ts —
 * Agent1Result.totalLatencyMs/llmCalls/rerunCount/exampleBankStatus) across
 * every story that has generated at least once. Projects only the fields
 * needed via .select() rather than pulling full agent1Result payloads
 * (which include full prompt/response text) for every story.
 */
router.get("/stats", requireAuth, requireRole("admin"), async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await db
      .collection(STORIES_COLLECTION)
      .select(
        "status",
        "updatedAt",
        "agent1Result.totalLatencyMs",
        "agent1Result.llmCalls",
        "agent1Result.rerunCount",
        "agent1Result.exampleBankStatus",
      )
      .get();

    let totalGenerations = 0;
    let latencySum = 0;
    let llmCallsSum = 0;
    let rerunSum = 0;
    let attemptedCount = 0;
    let stuckGenerating = 0;
    const exampleBankBreakdown: Record<string, number> = {
      examples_used: 0,
      cross_bucket_retrieval: 0,
      cold_start_no_examples: 0,
    };

    const now = Date.now();
    for (const doc of snap.docs) {
      const data = doc.data();
      const status = data.status as string | undefined;
      const updatedAt = data.updatedAt as number | undefined;
      const agent1Result = data.agent1Result as
        | { totalLatencyMs?: number; llmCalls?: unknown[]; rerunCount?: number; exampleBankStatus?: string }
        | undefined;

      if (status && status !== "draft_brief") attemptedCount += 1;

      if (agent1Result?.totalLatencyMs != null) {
        totalGenerations += 1;
        latencySum += agent1Result.totalLatencyMs;
        llmCallsSum += agent1Result.llmCalls?.length ?? 0;
        rerunSum += agent1Result.rerunCount ?? 0;
        const exampleBankKey = agent1Result.exampleBankStatus;
        if (exampleBankKey && exampleBankKey in exampleBankBreakdown) {
          exampleBankBreakdown[exampleBankKey] = (exampleBankBreakdown[exampleBankKey] ?? 0) + 1;
        }
      } else if (status === "generating" && updatedAt != null && now - updatedAt > STUCK_GENERATING_THRESHOLD_MS) {
        stuckGenerating += 1;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalGenerations,
        avgLatencyMs: totalGenerations > 0 ? Math.round(latencySum / totalGenerations) : 0,
        avgLlmCallsPerStory: totalGenerations > 0 ? Math.round((llmCallsSum / totalGenerations) * 10) / 10 : 0,
        avgReruns: totalGenerations > 0 ? Math.round((rerunSum / totalGenerations) * 100) / 100 : 0,
        stuckGenerating,
        failureRatePct: attemptedCount > 0 ? Math.round((stuckGenerating / attemptedCount) * 1000) / 10 : 0,
        exampleBankBreakdown,
      },
    });
  } catch (error) {
    console.error("[admin/ai] stats error:", error);
    res.status(500).json({
      success: false,
      error: { code: "AI_STATS_FAILED", message: "Failed to load AI stats" },
    });
  }
});

export default router;
