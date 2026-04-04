import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../../../firebase";
import type { StoryDetailVM } from "../types/story";
import { mapFirestoreToStoryDetailVM } from "./mapFirestoreToVM";

export function useStoryDetail() {
  const { storyId } = useParams<{ storyId: string }>();
  const [story, setStory] = useState<StoryDetailVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storyId) {
      setLoading(false);
      setStory(null);
      setError(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    getDoc(doc(db, "story_templates", storyId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setError(true);
          setStory(null);
          return;
        }
        const data = snap.data();
        setStory(mapFirestoreToStoryDetailVM(snap.id, data));
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setStory(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return { story, loading, error, storyId: storyId ?? "" };
}
