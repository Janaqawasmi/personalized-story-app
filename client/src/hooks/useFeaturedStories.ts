import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import type { FeaturedStory } from "../data/featuredStories";

/**
 * Fetch featured story templates from Firestore when the collection supports it.
 * Not wired into the homepage yet — use FEATURED_STORIES as fallback until shapes align.
 */
export function useFeaturedStories() {
  const [stories, setStories] = useState<FeaturedStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const q = query(
          collection(db, "story_templates"),
          where("featured", "==", true),
          orderBy("createdAt", "desc"),
          limit(6)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as unknown as FeaturedStory
        );
        setStories(data);
      } catch (e) {
        console.error("Failed to fetch featured stories", e);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return { stories, loading };
}
