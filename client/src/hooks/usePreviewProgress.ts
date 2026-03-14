import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const STORY_PREVIEWS_COLLECTION = "storyPreviews";

export interface PreviewProgress {
  previewId: string;
  generationStatus: string;
  pagesCompleted: number;
  previewPageCount: number;
  status: string;
  failureReason: string | null;
  pages: Array<{
    pageNumber: number;
    personalizedText: string;
    generatedImagePath: string | null;
  }>;
}

interface UsePreviewProgressResult {
  progress: PreviewProgress | null;
  loading: boolean;
  error: string | null;
}

/**
 * Real-time onSnapshot listener on a single preview document.
 * Used to show generation progress (pagesCompleted / previewPageCount).
 * Auth required — verifies ownership client-side.
 */
export function usePreviewProgress(previewId: string | null): UsePreviewProgressResult {
  const [progress, setProgress] = useState<PreviewProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    const docRef = doc(db, STORY_PREVIEWS_COLLECTION, previewId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProgress(null);
          setError("Preview not found");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        // Client-side ownership check (Firestore rules also enforce this)
        if (data.caregiverUid !== user.uid) {
          setError("Access denied");
          setLoading(false);
          return;
        }

        setProgress({
          previewId: snapshot.id,
          generationStatus: data.generationStatus as string,
          pagesCompleted: data.pagesCompleted as number,
          previewPageCount: data.previewPageCount as number,
          status: data.status as string,
          failureReason: data.failureReason as string | null,
          pages: (data.pages as PreviewProgress["pages"]) || [],
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Preview progress snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [previewId]);

  return { progress, loading, error };
}
