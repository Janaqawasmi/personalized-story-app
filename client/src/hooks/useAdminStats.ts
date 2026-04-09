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
  type Query,
  type CollectionReference,
} from "firebase/firestore";
import { db } from "../firebase";

async function tryCount(q: Query | CollectionReference): Promise<number> {
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
  pendingPsychologists: number;
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

async function safeAlerts(): Promise<Alert[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "admin_alerts"), where("resolved", "==", false), limit(20))
    );
    const rows = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: (data.type as Alert["type"]) ?? "info",
        message: String(data.message ?? ""),
        source: String(data.source ?? ""),
        timestamp: toDate(data.timestamp),
      };
    });
    rows.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return rows.slice(0, 5);
  } catch {
    return [];
  }
}

async function safeRecentActivity(): Promise<ActivityItem[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "admin_activity_log"), orderBy("timestamp", "desc"), limit(10))
    );
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: (data.type as ActivityItem["type"]) ?? "personalization",
        message: String(data.message ?? ""),
        timestamp: toDate(data.timestamp),
      };
    });
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
    pendingPsychologists: 0,
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
          pendingPsychologists,
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
          tryCount(
            query(collection(db, "psychologists"), where("status", "==", "pending"))
          ),
        ]);

        if (cancelled) return;

        const [activeAlerts, recentActivity] = await Promise.all([
          safeAlerts(),
          safeRecentActivity(),
        ]);

        if (cancelled) return;

        setState({
          totalPersonalizations,
          totalCaregivers,
          totalPurchases,
          totalTemplates,
          pendingTemplates,
          pendingPsychologists,
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
