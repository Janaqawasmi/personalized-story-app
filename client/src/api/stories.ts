import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

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

type UiLang = "en" | "he" | "ar";

function isUiLang(s: string): s is UiLang {
  return s === "en" || s === "he" || s === "ar";
}

/**
 * Resolves the active catalog UI language. Prefer the explicit `lang` argument
 * (from React i18n); otherwise read `<html lang>`; default English.
 */
export function effectiveCatalogLang(lang?: string): UiLang {
  if (lang && isUiLang(lang)) return lang;
  if (typeof document !== "undefined") {
    const raw = (document.documentElement.lang || "").toLowerCase();
    const two = raw.slice(0, 2);
    if (isUiLang(two)) return two;
  }
  return "en";
}

/**
 * Resolves a plain string, `{ en, he, ar }` map, or undefined to one display string.
 * Order: requested language → English → Hebrew → Arabic → first non-empty value.
 */
export function resolveLocalizedField(value: unknown, lang?: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, string>;
    const l = effectiveCatalogLang(lang);
    const pick = (key: string): string | undefined => {
      const v = obj[key];
      return typeof v === "string" && v.trim() ? v : undefined;
    };
    return (
      pick(l) ??
      pick("en") ??
      pick("he") ??
      pick("ar") ??
      (Object.values(obj).find((v) => typeof v === "string" && v.trim()) as string | undefined) ??
      undefined
    );
  }
  return undefined;
}

export type Story = {
  id: string;
  title: string;
  pricing?: {
    digital?: number;
    print?: number;
  };
  currency?: string;
  shortDescription?: string;
  coverImage?: string;
  targetAgeGroup?: string;
  topicKey?: string;
  isActive?: boolean;
};

/**
 * Maps raw Firestore document data to a Story object,
 * resolving localized fields to plain strings for the given UI language.
 */
function mapDocToStory(doc: { id: string; data: () => Record<string, any> }, lang: string): Story {
  const data = doc.data();
  const readAmount = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      value &&
      typeof value === "object" &&
      typeof (value as { current?: unknown }).current === "number" &&
      Number.isFinite((value as { current?: number }).current)
    ) {
      return (value as { current: number }).current;
    }
    return undefined;
  };

  const digital = readAmount(data.pricing?.digital);
  const print = readAmount(data.pricing?.print);

  return {
    id: doc.id,
    title: resolveLocalizedField(data.title, lang) || data.title || "",
    pricing: digital != null || print != null ? { digital, print } : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
    shortDescription: resolveLocalizedField(data.shortDescription, lang),
    coverImage: data.coverImage || data.coverImageUrl,
    targetAgeGroup: data.targetAgeGroup || data.ageGroup || data.generationConfig?.targetAgeGroup,
    topicKey: data.topicKey || data.primaryTopic,
    isActive: data.isActive,
  };
}

/**
 * Shared base constraints for all public story queries.
 * Firestore rules require BOTH status=="approved" AND isActive==true
 * in the query constraints for non-admin users (list operations).
 */
const PUBLIC_STORY_CONSTRAINTS = [
  where("status", "==", "approved"),
  where("isActive", "==", true),
] as const;

/**
 * Fetch stories by age group
 */
export async function fetchStoriesByAge(ageGroup: string, lang?: string): Promise<Story[]> {
  const uiLang = effectiveCatalogLang(lang);
  // Try both top-level and nested ageGroup fields
  const q1 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("ageGroup", "==", ageGroup)
  );

  const q2 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("targetAgeGroup", "==", ageGroup)
  );

  const q3 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
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

  return uniqueDocs.map((doc) => mapDocToStory(doc, uiLang));
}

/**
 * Fetch stories by category (topic)
 */
export async function fetchStoriesByCategory(categoryId: string, lang?: string): Promise<Story[]> {
  const uiLang = effectiveCatalogLang(lang);
  // Try both primaryTopic and topicKey fields
  const q1 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("primaryTopic", "==", categoryId)
  );

  const q2 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("topicKey", "==", categoryId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Combine results and remove duplicates
  const allDocs = [...snap1.docs, ...snap2.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs.map((doc) => mapDocToStory(doc, uiLang));
}

/**
 * Fetch stories by topic (situation)
 */
export async function fetchStoriesByTopic(topicId: string, lang?: string): Promise<Story[]> {
  const uiLang = effectiveCatalogLang(lang);
  // Try both specificSituation and topicKey fields
  const q1 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("specificSituation", "==", topicId)
  );

  const q2 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("topicKey", "==", topicId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Combine results and remove duplicates
  const allDocs = [...snap1.docs, ...snap2.docs];
  const uniqueDocs = Array.from(
    new Map(allDocs.map((doc) => [doc.id, doc])).values()
  );

  return uniqueDocs.map((doc) => mapDocToStory(doc, uiLang));
}

export interface StoryFilters {
  ageGroup?: string;
  categoryId?: string;
  topicId?: string;
  situationIds?: string[]; // For category filtering - all situation IDs in that category
}

/**
 * Client-side taxonomy match for a single story.
 *
 * Catalog stories are tagged by clinical DOMAIN: `primaryTopic` / `topicKey`
 * hold the brief `storyType` (e.g. "fear_anxiety"), which equals a
 * referenceData topic id. The brief has no structured "situation" field — its
 * trigger is free text stored in `specificSituation`. So:
 *
 *  - Selecting a specific topic/situation (`topicId`) matches on the
 *    situation/topic value.
 *  - Selecting a category matches on the DOMAIN (`primaryTopic`/`topicKey`)
 *    OR on an explicitly-tagged situation (`situationIds`). The OR is what
 *    fixes published stories not showing under category browse — previously
 *    only the situation-id path was used and domain-tagged stories never
 *    matched.
 */
function matchesTaxonomy(story: Story & Record<string, any>, filters: StoryFilters): boolean {
  if (filters.topicId) {
    return (
      story.specificSituation === filters.topicId ||
      story.topicKey === filters.topicId ||
      story.primaryTopic === filters.topicId
    );
  }

  const hasCategory = Boolean(filters.categoryId);
  const hasSituations = Boolean(filters.situationIds && filters.situationIds.length > 0);
  if (!hasCategory && !hasSituations) return true;

  const byDomain =
    hasCategory &&
    (story.primaryTopic === filters.categoryId || story.topicKey === filters.categoryId);
  const bySituation =
    hasSituations &&
    Boolean(story.specificSituation) &&
    filters.situationIds!.includes(story.specificSituation);
  return Boolean(byDomain || bySituation);
}

/**
 * Fetch stories with multiple filters.
 *
 * All public catalog reads go through the single approved+active query (which
 * Firestore rules require), then age + taxonomy filters are applied
 * client-side. This avoids Firestore's lack of cross-field OR queries and
 * keeps the matching rules in one place. The pilot catalog is small, so a
 * single read + in-memory filter is appropriate.
 */
export async function fetchStoriesWithFilters(
  filters: StoryFilters,
  lang?: string,
): Promise<Story[]> {
  const uiLang = effectiveCatalogLang(lang);
  console.log("[fetchStoriesWithFilters] auth:", {
    uid: auth.currentUser?.uid,
    email: auth.currentUser?.email,
  });
  console.log("[fetchStoriesWithFilters] filters:", filters);

  try {
    const baseQ = query(collection(db, "story_templates"), ...PUBLIC_STORY_CONSTRAINTS);
    const snapshot = await getDocs(baseQ);
    let stories: (Story & Record<string, any>)[] = snapshot.docs.map((doc) => ({
      ...doc.data(),
      ...mapDocToStory(doc, uiLang),
    }));

    if (filters.ageGroup) {
      const normalizedFilterAge = normalizeAgeGroup(filters.ageGroup);
      stories = stories.filter((story) => {
        const storyAge =
          story.ageGroup || story.targetAgeGroup || story.generationConfig?.targetAgeGroup;
        return normalizeAgeGroup(storyAge) === normalizedFilterAge;
      });
    }

    stories = stories.filter((story) => matchesTaxonomy(story, filters));

    return stories;
  } catch (err) {
    console.error("[fetchStoriesWithFilters] Firestore error:", err);
    throw err;
  }
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
    ...PUBLIC_STORY_CONSTRAINTS,
    where("ageGroup", "==", ageGroup)
  );
  const q2 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
    where("targetAgeGroup", "==", ageGroup)
  );
  const q3 = query(
    collection(db, "story_templates"),
    ...PUBLIC_STORY_CONSTRAINTS,
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
