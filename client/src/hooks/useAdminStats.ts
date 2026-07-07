import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { getPurchasesTimeseries } from "../api/adminAnalytics";
import { tryCount, usePreviewFunnelCounts } from "./useAdminCounts";

export interface AdminStats {
  totalPersonalizations: number;
  totalCaregivers: number;
  totalPurchases: number;
  allTimeRevenueCents: number;
  activeAlerts: Alert[];
  recentActivity: ActivityItem[];
  loading: boolean;
  error: string | null;
}

export interface Alert {
  id: string;
  type: "danger" | "warn" | "info";
  message: string;
  timestamp: Date;
  source: string;
}

export interface ActivityItem {
  id: string;
  type: "purchase" | "personalization";
  message: string;
  timestamp: Date;
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  return new Date();
}

/**
 * Real recent activity, built from the most recent storyPreviews documents
 * rather than reading `admin_activity_log` — nothing in the codebase ever
 * writes to that collection, so it was always empty. (This previously also
 * merged in "pending review" story_templates, but nothing ever writes that
 * status either — see AdminStoriesPage's removed pending-review queue.)
 */
async function loadRecentActivity(): Promise<ActivityItem[]> {
  try {
    const previewsSnap = await getDocs(
      query(collection(db, "storyPreviews"), orderBy("createdAt", "desc"), limit(10)),
    );

    return previewsSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      const childName = typeof data.childFirstName === "string" ? data.childFirstName : "";
      const title = typeof data.templateTitle === "string" ? data.templateTitle : "";
      const isPurchased = data.status === "purchased";
      return {
        id: docSnap.id,
        type: isPurchased ? "purchase" : "personalization",
        message: childName
          ? `${childName} — ${title || "personalized story"}`
          : title || "New personalization",
        timestamp: toDate(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Real operational alerts computed from actual counts (failed generations)
 * instead of reading `admin_alerts` — nothing in the codebase ever writes to
 * that collection either. (Previously also alerted on a "pending review
 * backlog" of story_templates, but nothing ever sets that status — removed
 * along with AdminStoriesPage's dead pending-review queue.)
 */
async function loadActiveAlerts(): Promise<Alert[]> {
  try {
    const failedCount = await tryCount(
      query(collection(db, "storyPreviews"), where("generationStatus", "==", "failed")),
    );

    const alerts: Alert[] = [];
    if (failedCount > 0) {
      alerts.push({
        id: "failed-generations",
        type: "danger",
        message: `${failedCount} personalization${failedCount === 1 ? "" : "s"} failed to generate`,
        timestamp: new Date(),
        source: "storyPreviews",
      });
    }
    return alerts;
  } catch {
    return [];
  }
}

export function useAdminStats(): AdminStats {
  const [state, setState] = useState<Omit<AdminStats, "totalPersonalizations" | "totalPurchases" | "loading"> & { loading: boolean }>({
    totalCaregivers: 0,
    allTimeRevenueCents: 0,
    activeAlerts: [],
    recentActivity: [],
    loading: true,
    error: null,
  });
  const funnel = usePreviewFunnelCounts();

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const totalCaregivers = await tryCount(collection(db, "caregivers"));
        if (cancelled) return;

        const [activeAlerts, recentActivity, revenueSummary] = await Promise.all([
          loadActiveAlerts(),
          loadRecentActivity(),
          getPurchasesTimeseries(90).catch(() => null),
        ]);

        if (cancelled) return;

        setState({
          totalCaregivers,
          allTimeRevenueCents: revenueSummary?.allTimeRevenueCents ?? 0,
          activeAlerts,
          recentActivity,
          loading: false,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to load stats",
          }));
        }
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    totalPersonalizations: funnel.totalPreviews,
    totalPurchases: funnel.purchasedPreviews,
    loading: state.loading || funnel.loading,
  };
}
