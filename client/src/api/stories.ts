import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export type Story = {
  id: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  targetAgeGroup?: string;
  topicKey?: string;
  isActive?: boolean;
};

/**
 * Fetch stories by age group
 */
export async function fetchStoriesByAge(ageGroup: string): Promise<Story[]> {
  const q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true),
    where("targetAgeGroup", "==", ageGroup)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Story, "id">),
  }));
}

/**
 * Fetch stories by category (topic)
 */
export async function fetchStoriesByCategory(
  categoryId: string
): Promise<Story[]> {
  const q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true),
    where("topicKey", "==", categoryId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Story, "id">),
  }));
}

/**
 * Fetch stories by topic (situation)
 */
export async function fetchStoriesByTopic(topicId: string): Promise<Story[]> {
  const q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true),
    where("topicKey", "==", topicId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Story, "id">),
  }));
}

/**
 * Fetch stories with multiple filters
 * Note: When filtering by categoryId, you should pass situationIds array
 * to properly filter stories that belong to situations within that category
 */
export async function fetchStoriesWithFilters(filters: {
  ageGroup?: string;
  categoryId?: string;
  topicId?: string;
  situationIds?: string[]; // For category filtering - all situation IDs in that category
}): Promise<Story[]> {
  let q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true)
  );

  if (filters.ageGroup) {
    q = query(q, where("targetAgeGroup", "==", filters.ageGroup));
  }

  if (filters.topicId) {
    // Filter by specific topic (situation)
    q = query(q, where("topicKey", "==", filters.topicId));
  } else if (filters.situationIds && filters.situationIds.length > 0) {
    // Filter by category - get stories for all situations in that category
    // Firestore 'in' query supports up to 10 items
    if (filters.situationIds.length <= 10) {
      q = query(q, where("topicKey", "in", filters.situationIds));
    } else {
      // If more than 10, we need to split into multiple queries
      // For now, fetch all and filter client-side (can be optimized later)
      const snapshot = await getDocs(q);
      const allStories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Story, "id">),
      }));
      return allStories.filter((story) =>
        story.topicKey && filters.situationIds?.includes(story.topicKey)
      );
    }
  } else if (filters.categoryId) {
    // Fallback: try direct match (in case stories have category ID as topicKey)
    q = query(q, where("topicKey", "==", filters.categoryId));
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Story, "id">),
  }));
}

// Legacy function for backward compatibility
export async function fetchStories(ageGroup: string, uiTopic: string) {
  const topicKeys = (await import("../constants/topicMap")).TOPIC_MAP[uiTopic];

  if (!topicKeys) {
    console.error("❌ No topic mapping found");
    return [];
  }

  const q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true),
    where("targetAgeGroup", "==", ageGroup),
    where("topicKey", "in", topicKeys)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
