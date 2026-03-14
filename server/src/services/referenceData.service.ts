// src/services/referenceData.service.ts
import { db } from "../config/firebase";

/**
 * Reference data subcollection types
 */
export type ReferenceDataCategory = "topics" | "situations" | "emotionalGoals" | "exclusions";

/**
 * Base reference data item structure
 */
export interface ReferenceDataItem {
  /** Document ID (enum key) */
  key: string;
  /** English label */
  label_en: string;
  /** Arabic label */
  label_ar: string;
  /** Hebrew label */
  label_he: string;
  /** Whether this item is active */
  active: boolean;
}

/**
 * Situation-specific reference data item (includes topicKey)
 */
export interface SituationReferenceItem extends ReferenceDataItem {
  /** Topic key this situation belongs to */
  topicKey: string;
}

/**
 * Load active reference items from a subcollection
 * 
 * @param category - The subcollection category (topics, situations, emotionalGoals, exclusions)
 * @returns Array of active reference data items with their document IDs
 */
export async function loadReferenceItems(
  category: ReferenceDataCategory
): Promise<ReferenceDataItem[]> {
  try {
    const snapshot = await db
      .collection("referenceData")
      .doc(category)
      .collection("items")
      .where("active", "==", true)
      .get();

    const items: ReferenceDataItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        key: doc.id,
        label_en: data.label_en || "",
        label_ar: data.label_ar || "",
        label_he: data.label_he || "",
        active: data.active === true,
      };
    });

    return items;
  } catch (error: any) {
    console.error(`Error loading reference items for category "${category}":`, error);
    throw new Error(`Failed to load ${category}: ${error.message}`);
  }
}

/**
 * Load active situation reference items (includes topicKey)
 * 
 * @returns Array of active situation items with topicKey
 */
export async function loadSituations(): Promise<SituationReferenceItem[]> {
  try {
    const snapshot = await db
      .collection("referenceData")
      .doc("situations")
      .collection("items")
      .where("active", "==", true)
      .get();

    const items: SituationReferenceItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        key: doc.id,
        label_en: data.label_en || "",
        label_ar: data.label_ar || "",
        label_he: data.label_he || "",
        active: data.active === true,
        topicKey: data.topicKey || "",
      };
    });

    return items;
  } catch (error: any) {
    console.error("Error loading situations:", error);
    throw new Error(`Failed to load situations: ${error.message}`);
  }
}

/**
 * Load situations filtered by topic key
 * 
 * @param topicKey - The topic key to filter by
 * @returns Array of active situations for the specified topic
 */
export async function loadSituationsByTopic(
  topicKey: string
): Promise<SituationReferenceItem[]> {
  try {
    const snapshot = await db
      .collection("referenceData")
      .doc("situations")
      .collection("items")
      .where("active", "==", true)
      .where("topicKey", "==", topicKey)
      .get();

    const items: SituationReferenceItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        key: doc.id,
        label_en: data.label_en || "",
        label_ar: data.label_ar || "",
        label_he: data.label_he || "",
        active: data.active === true,
        topicKey: data.topicKey || "",
      };
    });

    return items;
  } catch (error: any) {
    console.error(`Error loading situations for topic "${topicKey}":`, error);
    throw new Error(`Failed to load situations for topic ${topicKey}: ${error.message}`);
  }
}

/**
 * Load all reference data categories at once
 * 
 * @returns Object containing all reference data categories
 */
export async function loadAllReferenceData() {
  try {
    const [topics, situations, emotionalGoals, exclusions] = await Promise.all([
      loadReferenceItems("topics"),
      loadSituations(),
      loadReferenceItems("emotionalGoals"),
      loadReferenceItems("exclusions"),
    ]);

    return {
      topics,
      situations,
      emotionalGoals,
      exclusions,
    };
  } catch (error: any) {
    console.error("Error loading all reference data:", error);
    throw new Error(`Failed to load reference data: ${error.message}`);
  }
}

/**
 * Check if a reference data item exists and is active
 * 
 * @param category - The subcollection category
 * @param key - The document ID (key) to check
 * @param firestore - Optional Firestore instance (defaults to db)
 * @returns Object with exists and active status
 */
export async function checkReferenceItem(
  category: ReferenceDataCategory,
  key: string,
  firestore?: FirebaseFirestore.Firestore
): Promise<{ exists: boolean; active: boolean }> {
  const fs = firestore || db;
  try {
    const doc = await fs
      .collection("referenceData")
      .doc(category)
      .collection("items")
      .doc(key)
      .get();

    if (!doc.exists) {
      return { exists: false, active: false };
    }

    const data = doc.data();
    return {
      exists: true,
      active: data?.active === true,
    };
  } catch (error: any) {
    console.error(`Error checking reference item "${category}/${key}":`, error);
    throw new Error(`Failed to check ${category}/${key}: ${error.message}`);
  }
}

/**
 * Get a situation item with its topicKey
 * 
 * @param situationKey - The situation document ID (key)
 * @param firestore - Optional Firestore instance (defaults to db)
 * @returns Situation item with topicKey, or null if not found
 */
export async function getSituationItem(
  situationKey: string,
  firestore?: FirebaseFirestore.Firestore
): Promise<SituationReferenceItem | null> {
  const fs = firestore || db;
  try {
    const doc = await fs
      .collection("referenceData")
      .doc("situations")
      .collection("items")
      .doc(situationKey)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      key: doc.id,
      label_en: data?.label_en || "",
      label_ar: data?.label_ar || "",
      label_he: data?.label_he || "",
      active: data?.active === true,
      topicKey: data?.topicKey || "",
    };
  } catch (error: any) {
    console.error(`Error getting situation "${situationKey}":`, error);
    throw new Error(`Failed to get situation ${situationKey}: ${error.message}`);
  }
}
