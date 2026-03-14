import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

const STORY_TEMPLATES_COLLECTION = "story_templates";

export interface StoryTemplateListItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: { ar?: string; he?: string };
  coverImageUrl: string;
  displayTopic: { ar?: string; he?: string };
  primaryTopic: string;
  ageGroup: string;
  generationConfig: {
    language: "ar" | "he";
    targetAgeGroup: string;
    length: string;
    tone: string;
    emphasis: string;
  };
  purchaseCount: number;
  publishedAt: unknown;
  previewPageCount: number;
  totalPageCount: number;
}

export interface UseStoryTemplatesOptions {
  ageGroup?: string;
  language?: "ar" | "he";
  primaryTopic?: string;
  sortBy?: "publishedAt" | "purchaseCount";
}

interface UseStoryTemplatesResult {
  templates: StoryTemplateListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches published and active story templates from Firestore.
 * Works WITHOUT authentication (anonymous reads).
 *
 * Supports filtering by ageGroup, language, primaryTopic
 * and sorting by publishedAt (newest) or purchaseCount (popular).
 */
export function useStoryTemplates(
  options: UseStoryTemplatesOptions = {}
): UseStoryTemplatesResult {
  const [templates, setTemplates] = useState<StoryTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  const { ageGroup, language, primaryTopic, sortBy = "publishedAt" } = options;

  const stableKey = useMemo(
    () => JSON.stringify({ ageGroup, language, primaryTopic, sortBy }),
    [ageGroup, language, primaryTopic, sortBy]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchTemplates() {
      setLoading(true);
      setError(null);

      try {
        const constraints: QueryConstraint[] = [
          where("isPublished", "==", true),
          where("isActive", "==", true),
        ];

        if (ageGroup) {
          constraints.push(where("ageGroup", "==", ageGroup));
        }

        if (language) {
          constraints.push(where("generationConfig.language", "==", language));
        }

        if (primaryTopic) {
          constraints.push(where("primaryTopic", "==", primaryTopic));
        }

        if (sortBy === "purchaseCount") {
          constraints.push(orderBy("purchaseCount", "desc"));
        } else {
          constraints.push(orderBy("publishedAt", "desc"));
        }

        const q = query(
          collection(db, STORY_TEMPLATES_COLLECTION),
          ...constraints
        );

        const snapshot = await getDocs(q);

        if (!cancelled) {
          const items: StoryTemplateListItem[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<StoryTemplateListItem, "id">),
          }));
          setTemplates(items);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch story templates:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch templates");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, [stableKey, refetchCounter]);

  const refetch = () => setRefetchCounter((c) => c + 1);

  return { templates, loading, error, refetch };
}
