import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPurchasesTimeseries } from "../api/adminAnalytics";

async function tryCount(q: ReturnType<typeof query> | ReturnType<typeof collection>): Promise<number> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

export interface AdminStats {
  totalPersonalizations: number;
  totalCaregivers: number;
  totalPurchases: number;
  totalTemplates: number;
  pendingTemplates: number;
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
  type: "purchase" | "personalization" | "template_submitted" | "error" | "voice";
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
 * Real recent activity, built from actual Firestore documents (most recent
 * previews + most recently submitted templates) rather than reading
 * `admin_activity_log` — nothing in the codebase ever writes to that
 * collection, so it was always empty.
 */
async function loadRecentActivity(): Promise<ActivityItem[]> {
  try {
    const [previewsSnap, templatesSnap] = await Promise.all([
      getDocs(query(collection(db, "storyPreviews"), orderBy("createdAt", "desc"), limit(8))),
      getDocs(
        query(
          collection(db, "story_templates"),
          where("status", "==", "pending_review"),
          limit(8),
        ),
      ),
    ]);

    const previewItems: ActivityItem[] = previewsSnap.docs.map((docSnap) => {
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

    const templateItems: ActivityItem[] = templatesSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: "template_submitted",
        message: `${data.title ?? "Untitled story"} — submitted for review`,
        timestamp: toDate(data.submittedAt ?? data.createdAt),
      };
    });

    return [...previewItems, ...templateItems]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Real operational alerts computed from actual counts (pending review
 * backlog, failed generations) instead of reading `admin_alerts` — nothing
 * in the codebase ever writes to that collection either.
 */
async function loadActiveAlerts(): Promise<Alert[]> {
  try {
    const [pendingCount, failedCount] = await Promise.all([
      tryCount(query(collection(db, "story_templates"), where("status", "==", "pending_review"))),
      tryCount(query(collection(db, "storyPreviews"), where("generationStatus", "==", "failed"))),
    ]);

    const alerts: Alert[] = [];
    const now = new Date();

    if (failedCount > 0) {
      alerts.push({
        id: "failed-generations",
        type: "danger",
        message: `${failedCount} personalization${failedCount === 1 ? "" : "s"} failed to generate`,
        timestamp: now,
        source: "storyPreviews",
      });
    }
    if (pendingCount > 5) {
      alerts.push({
        id: "pending-backlog",
        type: "warn",
        message: `${pendingCount} stories waiting for review`,
        timestamp: now,
        source: "story_templates",
      });
    } else if (pendingCount > 0) {
      alerts.push({
        id: "pending-backlog",
        type: "info",
        message: `${pendingCount} stor${pendingCount === 1 ? "y" : "ies"} waiting for review`,
        timestamp: now,
        source: "story_templates",
      });
    }

    return alerts;
  } catch {
    return [];
  }
}

export function useAdminStats(): AdminStats {
  const [state, setState] = useState<AdminStats>({
    totalPersonalizations: 0,
    totalCaregivers: 0,
    totalPurchases: 0,
    totalTemplates: 0,
    pendingTemplates: 0,
    allTimeRevenueCents: 0,
    activeAlerts: [],
    recentActivity: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [
          totalPersonalizations,
          totalCaregivers,
          totalPurchases,
          totalTemplates,
          pendingTemplates,
        ] = await Promise.all([
          tryCount(collection(db, "storyPreviews")),
          tryCount(collection(db, "caregivers")),
          tryCount(
            query(collection(db, "storyPreviews"), where("status", "==", "purchased"))
          ),
          tryCount(
            query(collection(db, "story_templates"), where("status", "==", "approved"))
          ),
          tryCount(
            query(
              collection(db, "story_templates"),
              where("status", "==", "pending_review")
            )
          ),
        ]);

        if (cancelled) return;

        const [activeAlerts, recentActivity, revenueSummary] = await Promise.all([
          loadActiveAlerts(),
          loadRecentActivity(),
          getPurchasesTimeseries(90).catch(() => null),
        ]);

        if (cancelled) return;

        setState({
          totalPersonalizations,
          totalCaregivers,
          totalPurchases,
          totalTemplates,
          pendingTemplates,
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

  return state;
}
