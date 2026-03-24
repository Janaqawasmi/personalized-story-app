import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const PERSONALIZED_STORIES_COLLECTION = "personalizedStories";

export interface StoryProgress {
  storyId: string;
  generationStatus: string;
  totalPages: number;
  pagesCompleted: number;
  pagesFromPreview: number;
  pagesFailedIndexes: number[];
  isAccessible: boolean;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
}

interface UseStoryProgressResult {
  progress: StoryProgress | null;
  loading: boolean;
  error: string | null;
}

/**
 * Real-time onSnapshot listener on a single personalizedStory document.
 * Shows generation progress after payment.
 * Auth required — verifies ownership client-side.
 */
export function useStoryProgress(storyId: string | null): UseStoryProgressResult {
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storyId) {
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

    const docRef = doc(db, PERSONALIZED_STORIES_COLLECTION, storyId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProgress(null);
          setError("Story not found");
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
          storyId: snapshot.id,
          generationStatus: data.generationStatus as string,
          totalPages: data.totalPages as number,
          pagesCompleted: data.pagesCompleted as number,
          pagesFromPreview: data.pagesFromPreview as number,
          pagesFailedIndexes: (data.pagesFailedIndexes as number[]) || [],
          isAccessible: data.isAccessible as boolean,
          generationStartedAt: data.generationStartedAt as string | null,
          generationCompletedAt: data.generationCompletedAt as string | null,
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Story progress snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [storyId]);

  return { progress, loading, error };
}
