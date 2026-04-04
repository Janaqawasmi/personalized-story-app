import { useState, useEffect } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { resolveLocalizedField } from "../../../api/stories";
import type { RelatedStoryCardVM } from "../types/story";

/**
 * Matches existing catalog queries: `status === approved`, `isActive === true`.
 */
export function useRelatedStories(primaryTopic: string | undefined, currentId: string | undefined) {
  const [related, setRelated] = useState<RelatedStoryCardVM[]>([]);

  useEffect(() => {
    if (!primaryTopic || !currentId) {
      setRelated([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const q1 = query(
          collection(db, "story_templates"),
          where("status", "==", "approved"),
          where("isActive", "==", true),
          where("primaryTopic", "==", primaryTopic),
          limit(8),
        );
        const snap = await getDocs(q1);
        const rows: RelatedStoryCardVM[] = snap.docs
          .filter((d) => d.id !== currentId)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: resolveLocalizedField(data.title) || data.title || "",
              shortDescription: resolveLocalizedField(data.shortDescription),
              coverImage: data.coverImage || data.coverImageUrl,
              targetAgeGroup: data.targetAgeGroup || data.ageGroup || data.generationConfig?.targetAgeGroup,
              topicKey: data.topicKey || data.primaryTopic,
            };
          })
          .slice(0, 3);

        if (!cancelled) setRelated(rows);
      } catch {
        if (!cancelled) setRelated([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [primaryTopic, currentId]);

  return related;
}
