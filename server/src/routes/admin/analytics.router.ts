import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import type { Purchase } from "../../shared/types/purchase";

const router = Router();

function toDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * GET /api/admin/analytics/purchases-timeseries?days=30
 *
 * Real daily purchase count + revenue for the last N days, computed from
 * every caregiver's `purchases` subcollection via collectionGroup (Admin SDK
 * bypasses the owner-only Firestore rule on that subcollection — the client
 * SDK cannot read this data directly, even as an admin). No where/orderBy
 * chained onto the collectionGroup query, so no composite index is needed;
 * bucketing happens in memory.
 */
router.get(
  "/purchases-timeseries",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
      cutoff.setUTCHours(0, 0, 0, 0);

      const snap = await db.collectionGroup("purchases").get();

      const byDay = new Map<string, { count: number; revenueCents: number }>();
      let totalRevenueCents = 0;
      let totalCount = 0;
      let paidCount = 0;
      // All-time totals, computed from the same fetch (no extra query cost)
      // so KPIs that want a true all-time figure (e.g. Overview's Revenue
      // card) don't have to re-fetch the whole collectionGroup themselves.
      let allTimeRevenueCents = 0;
      let allTimePaidPurchases = 0;

      for (const doc of snap.docs) {
        const data = doc.data() as Purchase;
        const createdAt = toDate(data.createdAt);
        const isPaid = data.status !== "pending" && data.status !== "failed";

        if (isPaid) {
          allTimePaidPurchases += 1;
          allTimeRevenueCents += data.amountCents ?? 0;
        }

        if (!createdAt || createdAt < cutoff) continue;

        totalCount += 1;
        if (isPaid) {
          paidCount += 1;
          totalRevenueCents += data.amountCents ?? 0;
        }

        const key = dayKey(createdAt);
        const bucket = byDay.get(key) ?? { count: 0, revenueCents: 0 };
        if (isPaid) {
          bucket.count += 1;
          bucket.revenueCents += data.amountCents ?? 0;
        }
        byDay.set(key, bucket);
      }

      // Fill every day in range (including zero-purchase days) so the chart
      // never has gaps.
      const series: { date: string; count: number; revenueCents: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(cutoff);
        d.setUTCDate(d.getUTCDate() + i);
        const key = dayKey(d);
        const bucket = byDay.get(key) ?? { count: 0, revenueCents: 0 };
        series.push({ date: key, count: bucket.count, revenueCents: bucket.revenueCents });
      }

      res.status(200).json({
        success: true,
        data: {
          series,
          totalRevenueCents,
          totalPaidPurchases: paidCount,
          totalPurchaseAttempts: totalCount,
          allTimeRevenueCents,
          allTimePaidPurchases,
        },
      });
    } catch (error) {
      console.error("[admin/analytics] purchases-timeseries error:", error);
      res.status(500).json({
        success: false,
        error: { code: "ANALYTICS_TIMESERIES_FAILED", message: "Failed to load purchase analytics" },
      });
    }
  },
);

export default router;
