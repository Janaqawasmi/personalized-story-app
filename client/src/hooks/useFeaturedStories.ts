import { useState, useEffect } from "react";
import { fetchStoriesWithFilters } from "../api/stories";
import type { Story } from "../api/stories";
import type { StoryTopic } from "../constants/topicColors";

export interface FeaturedStory {
  id: string;
  title: string;
  ageRange: string;
  topic: StoryTopic;
  description: string;
  price: number;
  isNew: boolean;
  coverImage: string | null;
  coverGradient: string;
}

const TOPIC_GRADIENTS: Record<string, string> = {
  fear: "linear-gradient(145deg, #2d1b69, #0f2847, #0a1628)",
  anxiety: "linear-gradient(145deg, #1a3a2a, #0f4020, #061a0a)",
  confidence: "linear-gradient(145deg, #4a1c2a, #1f0a10, #100508)",
  grief: "linear-gradient(145deg, #1a1040, #280a28, #0a0618)",
  change: "linear-gradient(145deg, #2a1a08, #3d2010, #1a0c04)",
  anger: "linear-gradient(145deg, #3d0a0a, #1a0404, #0a0202)",
};

const VALID_TOPICS: StoryTopic[] = [
  "fear",
  "anxiety",
  "confidence",
  "grief",
  "change",
  "anger",
];

function resolveTopic(story: Story): StoryTopic {
  const raw = String(
    story.topicKey ||
      (story as Story & { primaryTopic?: string }).primaryTopic ||
      (story as Story & { specificSituation?: string }).specificSituation ||
      ""
  )
    .toLowerCase()
    .trim();
  return VALID_TOPICS.find((t) => raw.includes(t)) ?? "fear";
}

export function useFeaturedStories() {
  const [stories, setStories] = useState<FeaturedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const results = await fetchStoriesWithFilters({});

        if (cancelled) return;

        const mapped: FeaturedStory[] = results.slice(0, 6).map((story) => {
          const topic = resolveTopic(story);
          const coverImage = story.coverImage?.trim() || null;
          const ext = story as Story & {
            price?: number;
            isNew?: boolean;
            ageGroup?: string;
          };
          return {
            id: story.id,
            title: story.title,
            ageRange: story.targetAgeGroup || ext.ageGroup || "",
            topic,
            description: story.shortDescription || "",
            price: story.pricing?.digital ?? ext.price ?? 29,
            isNew: Boolean(ext.isNew),
            coverImage,
            coverGradient: TOPIC_GRADIENTS[topic] ?? TOPIC_GRADIENTS.fear,
          };
        });

        setStories(mapped);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          console.error("useFeaturedStories:", e);
          setError("Failed to load stories");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stories, loading, error };
}
