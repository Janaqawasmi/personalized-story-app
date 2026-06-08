import { useState, useEffect } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { resolveLocalizedField } from "../../../api/stories";
import { useLanguage } from "../../../i18n/context/useLanguage";
import type { RelatedStoryCardVM, StoryDetailVM } from "../types/story";

/** Extra client filter after Firestore query (query already enforces approved + isActive per rules). */
function passesClientFilters(data: Record<string, unknown>): boolean {
  if (data.isPublished === false) return false;
  return true;
}

function formatAgeDisplay(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/_/g, "–").replace(/-/g, "–");
}

function mapDocToRelatedCard(id: string, data: Record<string, unknown>, lang: string): RelatedStoryCardVM {
  const rawAge =
    (data.targetAgeGroup as string | undefined) ||
    (data.ageGroup as string | undefined) ||
    (data as { generationConfig?: { targetAgeGroup?: string } }).generationConfig?.targetAgeGroup;

  return {
    id,
    title: resolveLocalizedField(data.title, lang) || (typeof data.title === "string" ? data.title : "") || "",
    shortDescription: resolveLocalizedField(data.shortDescription, lang),
    coverImage: (data.coverImage as string | undefined) || (data.coverImageUrl as string | undefined),
    targetAgeGroup: formatAgeDisplay(rawAge),
    topicKey: (data.topicKey as string | undefined) || (data.primaryTopic as string | undefined) || undefined,
    topicLabel:
      resolveLocalizedField(data.displayTopic, lang) ||
      (typeof data.primaryTopic === "string"
        ? data.primaryTopic.replace(/_/g, " ")
        : typeof data.topicKey === "string"
          ? data.topicKey.replace(/_/g, " ")
          : undefined),
  };
}

function scoreRelated(data: Record<string, unknown>, story: StoryDetailVM): number {
  let s = 0;
  const pt = story.primaryTopic;
  const tk = story.topicKey;
  const raw = story.ageGroupRaw;

  if (pt && data.primaryTopic === pt) s += 4;
  if (tk && data.topicKey === tk) s += 3;
  if (tk && data.primaryTopic === tk) s += 2;
  if (pt && data.topicKey === pt) s += 2;

  if (raw) {
    if (data.ageGroup === raw || data.targetAgeGroup === raw) s += 2;
    const gc = (data as { generationConfig?: { targetAgeGroup?: string } }).generationConfig;
    if (gc?.targetAgeGroup === raw) s += 1;
  }
  return s;
}

/**
 * Query must match `firestore.rules` for `story_templates` (approved + isActive == true).
 * Related ranking (topic / age) is done client-side to avoid composite indexes on primaryTopic.
 */
export function useRelatedStories(story: StoryDetailVM | null) {
  const { language } = useLanguage();
  const [related, setRelated] = useState<RelatedStoryCardVM[]>([]);

  useEffect(() => {
    const currentId = story?.id;

    if (!currentId) {
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
          limit(200),
        );
        const snap = await getDocs(q1);
        if (cancelled) return;

        const scored = snap.docs
          .filter((d) => d.id !== currentId)
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            if (!passesClientFilters(data)) return null;
            return { d, score: scoreRelated(data, story!) };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => b.score - a.score);

        const rows: RelatedStoryCardVM[] = scored
          .slice(0, 3)
          .map(({ d }) => mapDocToRelatedCard(d.id, d.data() as Record<string, unknown>, language));

        if (!cancelled) setRelated(rows);
      } catch (e) {
        console.error("[useRelatedStories] fetch failed:", e);
        if (!cancelled) setRelated([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [story, language]);

  return related;
}
