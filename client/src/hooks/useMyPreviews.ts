import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const STORY_PREVIEWS_COLLECTION = "storyPreviews";

export interface PreviewListItem {
  previewId: string;
  caregiverUid: string;
  childId: string;
  templateId: string;
  childFirstName: string;
  childGender: "male" | "female";
  templateTitle: string;
  language: "ar" | "he";
  previewPageCount: number;
  coverImageUrl: string | null;
  generationStatus: string;
  pagesCompleted: number;
  status: string;
  expiresAt: string | null;
  createdAt: unknown;
}

interface UseMyPreviewsResult {
  previews: PreviewListItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Real-time listener on the caregiver's story previews.
 * Excludes previews with status "expired" or "converted".
 * Auth required.
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

    const q = query(
      collection(db, STORY_PREVIEWS_COLLECTION),
      where("caregiverUid", "==", user.uid),
      where("status", "not-in", ["expired", "converted"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PreviewListItem[] = snapshot.docs.map((doc) => ({
          previewId: doc.id,
          ...(doc.data() as Omit<PreviewListItem, "previewId">),
        }));
        setPreviews(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Preview snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { previews, loading, error };
}
