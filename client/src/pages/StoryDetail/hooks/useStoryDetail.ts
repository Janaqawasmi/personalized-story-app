import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../../../firebase";
import { useLanguage } from "../../../i18n/context/useLanguage";
import type { StoryDetailVM } from "../types/story";
import { mapFirestoreToStoryDetailVM } from "./mapFirestoreToVM";

type RawStoryDoc = { id: string; data: Record<string, any> };

export function useStoryDetail() {
  const { storyId } = useParams<{ storyId: string }>();
  const { language } = useLanguage();
  const [raw, setRaw] = useState<RawStoryDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storyId) {
      setLoading(false);
      setRaw(null);
      setError(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setRaw(null);

    getDoc(doc(db, "story_templates", storyId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setError(true);
          setRaw(null);
          return;
        }
        setRaw({ id: snap.id, data: snap.data() as Record<string, any> });
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setRaw(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const story = useMemo<StoryDetailVM | null>(
    () => (raw ? mapFirestoreToStoryDetailVM(raw.id, raw.data, language) : null),
    [raw, language],
  );

  return { story, loading, error, storyId: storyId ?? "" };
}
