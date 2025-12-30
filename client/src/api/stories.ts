import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Normalize age group value for comparison
 * Converts "0-3", "0–3", "0_3" etc. to "0_3" format
 */
function normalizeAgeGroup(value?: string): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // remove spaces
    .replace(/[–-]/g, "_"); // dash or en-dash → underscore
}

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
  // Try both top-level and nested ageGroup fields
  const q1 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("ageGroup", "==", ageGroup)
  );

  const q2 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("targetAgeGroup", "==", ageGroup)
  );

  const q3 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("generationConfig.targetAgeGroup", "==", ageGroup)
  );

  const [snap1, snap2, snap3] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
    getDocs(q3),
  ]);

  // Combine results and remove duplicates
  const allDocs = [...snap1.docs, ...snap2.docs, ...snap3.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs.map((doc) => ({
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
  // Try both primaryTopic and topicKey fields
  const q1 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("primaryTopic", "==", categoryId)
  );

  const q2 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("topicKey", "==", categoryId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Combine results and remove duplicates
  const allDocs = [...snap1.docs, ...snap2.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Story, "id">),
  }));
}

/**
 * Fetch stories by topic (situation)
 */
export async function fetchStoriesByTopic(topicId: string): Promise<Story[]> {
  // Try both specificSituation and topicKey fields
  const q1 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("specificSituation", "==", topicId)
  );

  const q2 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("topicKey", "==", topicId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Combine results and remove duplicates
  const allDocs = [...snap1.docs, ...snap2.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs.map((doc) => ({
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
  // Base query with status filter
  let q = query(
    collection(db, "story_templates"),
    where("status", "==", "approved")
  );

  if (filters.ageGroup) {
    // Try multiple ageGroup field locations
    // Note: Firestore doesn't support OR queries easily, so we'll fetch and filter client-side
    const baseQ = query(
      collection(db, "story_templates"),
      where("status", "==", "approved")
    );
    const snapshot = await getDocs(baseQ);
    let allStories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    // Filter by ageGroup in any location (normalize both sides for comparison)
    const normalizedFilterAge = normalizeAgeGroup(filters.ageGroup);
    allStories = allStories.filter((story) => {
      const storyAge = story.ageGroup || story.targetAgeGroup || story.generationConfig?.targetAgeGroup;
      const normalizedStoryAge = normalizeAgeGroup(storyAge);
      return normalizedStoryAge === normalizedFilterAge;
    });

    // Apply topic/situation filters if needed
    if (filters.topicId) {
      allStories = allStories.filter(
        (story) =>
          story.specificSituation === filters.topicId ||
          story.topicKey === filters.topicId
      );
    } else if (filters.situationIds && filters.situationIds.length > 0) {
      allStories = allStories.filter(
        (story) =>
          story.specificSituation &&
          filters.situationIds?.includes(story.specificSituation)
      );
    } else if (filters.categoryId) {
      allStories = allStories.filter(
        (story) =>
          story.primaryTopic === filters.categoryId ||
          story.topicKey === filters.categoryId
      );
    }

    return allStories;
  }

  // If no ageGroup filter, use Firestore queries
  if (filters.topicId) {
    // Filter by specific topic (situation)
    const q1 = query(
      collection(db, "story_templates"),
      where("status", "==", "approved"),
      where("specificSituation", "==", filters.topicId)
    );
    const q2 = query(
      collection(db, "story_templates"),
      where("status", "==", "approved"),
      where("topicKey", "==", filters.topicId)
    );
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const allDocs = [...snap1.docs, ...snap2.docs];
    const uniqueDocs = Array.from(
      new Map(allDocs.map((doc) => [doc.id, doc])).values()
    );
    return uniqueDocs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Story, "id">),
    }));
  } else if (filters.situationIds && filters.situationIds.length > 0) {
    // Filter by category - get stories for all situations in that category
    // Firestore 'in' query supports up to 10 items
    if (filters.situationIds.length <= 10) {
      const q1 = query(
        collection(db, "story_templates"),
        where("status", "==", "approved"),
        where("specificSituation", "in", filters.situationIds)
      );
      const snapshot = await getDocs(q1);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Story, "id">),
      }));
    } else {
      // If more than 10, fetch all and filter client-side
      const baseQ = query(
        collection(db, "story_templates"),
        where("status", "==", "approved")
      );
      const snapshot = await getDocs(baseQ);
      const allStories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      return allStories.filter(
        (story) =>
          story.specificSituation &&
          filters.situationIds?.includes(story.specificSituation)
      );
    }
  } else if (filters.categoryId) {
    // Filter by category (primaryTopic)
    const q1 = query(
      collection(db, "story_templates"),
      where("status", "==", "approved"),
      where("primaryTopic", "==", filters.categoryId)
    );
    const q2 = query(
      collection(db, "story_templates"),
      where("status", "==", "approved"),
      where("topicKey", "==", filters.categoryId)
    );
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const allDocs = [...snap1.docs, ...snap2.docs];
    const uniqueDocs = Array.from(
      new Map(allDocs.map((doc) => [doc.id, doc])).values()
    );
    return uniqueDocs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Story, "id">),
    }));
  }

  // No filters - return all approved stories
  const baseQ = query(
    collection(db, "story_templates"),
    where("status", "==", "approved")
  );
  const snapshot = await getDocs(baseQ);
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

  // Try multiple field combinations
  const q1 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("ageGroup", "==", ageGroup)
  );
  const q2 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("targetAgeGroup", "==", ageGroup)
  );
  const q3 = query(
    collection(db, "story_templates"),
    where("status", "==", "approved"),
    where("generationConfig.targetAgeGroup", "==", ageGroup)
  );

  const [snap1, snap2, snap3] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
    getDocs(q3),
  ]);

  // Combine and filter by topicKeys
  const allDocs = [...snap1.docs, ...snap2.docs, ...snap3.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs
    .filter((doc) => {
      const data = doc.data();
      return (
        topicKeys.includes(data.topicKey) ||
        topicKeys.includes(data.primaryTopic) ||
        topicKeys.includes(data.specificSituation)
      );
    })
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
}
