import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

const STORY_TEMPLATES_COLLECTION = "story_templates";

export interface StoryTemplateDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: { ar?: string; he?: string };
  coverImageUrl: string;
  displayTopic: { ar?: string; he?: string };
  primaryTopic: string;
  specificSituation: string;
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
  pages: Array<{
    pageNumber: number;
    textTemplate: { masculine: string; feminine: string };
    imagePromptTemplate: string;
    emotionalTone: string;
  }>;
}

interface UseStoryTemplateResult {
  template: StoryTemplateDetail | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a single story template by slug or ID.
 * Works WITHOUT authentication (anonymous reads).
 *
 * @param slugOrId - The template's slug or Firestore document ID
 */
export function useStoryTemplate(slugOrId: string | null): UseStoryTemplateResult {
  const [template, setTemplate] = useState<StoryTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrId) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchTemplate() {
      setLoading(true);
      setError(null);

      try {
        // Try by document ID first
        const docRef = doc(db, STORY_TEMPLATES_COLLECTION, slugOrId!);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPublished && data.isActive) {
            if (!cancelled) {
              setTemplate({
                id: docSnap.id,
                ...(data as Omit<StoryTemplateDetail, "id">),
              });
            }
            return;
          }
        }

        // Try by slug
        const q = query(
          collection(db, STORY_TEMPLATES_COLLECTION),
          where("slug", "==", slugOrId),
          where("isPublished", "==", true),
          where("isActive", "==", true),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (!cancelled) {
          if (!snapshot.empty) {
            const firstDoc = snapshot.docs[0]!;
            setTemplate({
              id: firstDoc.id,
              ...(firstDoc.data() as Omit<StoryTemplateDetail, "id">),
            });
          } else {
            setTemplate(null);
            setError("Template not found");
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch story template:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch template");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTemplate();

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  return { template, loading, error };
}
