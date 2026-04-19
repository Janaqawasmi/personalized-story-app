import { useEffect, useState, useCallback } from "react";
import { getPreviewQuota, type PreviewQuota } from "../api/caregiverApi";
import { useAuth } from "../contexts/AuthContext";

export function usePreviewQuota() {
  const { currentUser } = useAuth();
  const [quota, setQuota] = useState<PreviewQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setQuota(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPreviewQuota()
      .then((q) => {
        if (!cancelled) {
          setQuota(q);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const refetch = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = await getPreviewQuota();
      setQuota(q);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  return { quota, loading, error, refetch };
}
