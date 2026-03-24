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

const PERSONALIZED_STORIES_COLLECTION = "personalizedStories";

export interface StoryLibraryItem {
  storyId: string;
  templateTitle: string;
  coverImageUrl: string;
  childFirstName: string;
  childGender: "male" | "female";
  language: "ar" | "he";
  totalPages: number;
  createdAt: unknown;
}

interface UseMyStoriesResult {
  stories: StoryLibraryItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Queries personalizedStories for the current caregiver's completed,
 * accessible stories. Uses field mask for library view efficiency.
 * Auth required.
 */
export function useMyStories(): UseMyStoriesResult {
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
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
      collection(db, PERSONALIZED_STORIES_COLLECTION),
      where("caregiverUid", "==", user.uid),
      where("generationStatus", "==", "completed"),
      where("isAccessible", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StoryLibraryItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            storyId: doc.id,
            templateTitle: data.templateTitle as string,
            coverImageUrl: data.coverImageUrl as string,
            childFirstName: data.childFirstName as string,
            childGender: data.childGender as "male" | "female",
            language: data.language as "ar" | "he",
            totalPages: data.totalPages as number,
            createdAt: data.createdAt,
          };
        });
        setStories(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Stories snapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { stories, loading, error };
}
