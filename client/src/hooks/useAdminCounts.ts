import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Runs a Firestore count aggregation query, swallowing errors as 0. Shared
 * across admin components instead of each one re-declaring the same
 * try/catch wrapper (AdminLayout sidebar badges, useAdminStats KPIs).
 */
export async function tryCount(
  q: Parameters<typeof getCountFromServer>[0]
): Promise<number> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

interface PreviewFunnelCounts {
  totalPreviews: number;
  purchasedPreviews: number;
  loading: boolean;
}

let previewFunnelCache: { totalPreviews: number; purchasedPreviews: number } | null = null;
let previewFunnelInflight: Promise<{ totalPreviews: number; purchasedPreviews: number }> | null = null;

function fetchPreviewFunnelCounts(): Promise<{ totalPreviews: number; purchasedPreviews: number }> {
  if (previewFunnelCache) return Promise.resolve(previewFunnelCache);
  if (!previewFunnelInflight) {
    previewFunnelInflight = Promise.all([
      tryCount(collection(db, "storyPreviews")),
      tryCount(query(collection(db, "storyPreviews"), where("status", "==", "purchased"))),
    ]).then(([totalPreviews, purchasedPreviews]) => {
      previewFunnelCache = { totalPreviews, purchasedPreviews };
      previewFunnelInflight = null;
      return previewFunnelCache;
    });
  }
  return previewFunnelInflight;
}

/**
 * The (totalPreviews, purchasedPreviews) pair was previously queried
 * independently by useAdminStats, AdminFunnelChart, and AdminAnalyticsPage —
 * three separate round trips for the same two numbers. This hook shares one
 * in-flight request/cache across all mounted consumers for the session.
 */
export function usePreviewFunnelCounts(): PreviewFunnelCounts {
  const [state, setState] = useState<PreviewFunnelCounts>({
    totalPreviews: previewFunnelCache?.totalPreviews ?? 0,
    purchasedPreviews: previewFunnelCache?.purchasedPreviews ?? 0,
    loading: !previewFunnelCache,
  });

  useEffect(() => {
    if (previewFunnelCache) return;
    let cancelled = false;
    fetchPreviewFunnelCounts().then((counts) => {
      if (!cancelled) setState({ ...counts, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
