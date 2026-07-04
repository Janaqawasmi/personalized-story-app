import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getMyPreviews, type SavedPreviewItem } from "../api/caregiverApi";

export type PreviewListItem = SavedPreviewItem;

interface UseMyPreviewsResult {
  previews: PreviewListItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads the user's saved previews through the caregiver API.
 * Using the server route avoids fragile client-side composite-index requirements.
 */
export function useMyPreviews(): UseMyPreviewsResult {
  const [previews, setPreviews] = useState<PreviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    let cancelled = false;

    getMyPreviews()
      .then((items) => {
        if (!cancelled) {
          setPreviews(items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        console.error("Preview list error:", err);
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Failed to load previews";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { previews, loading, error };
}
