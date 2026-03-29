// client/src/services/referenceData.service.ts
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

/** Base shape returned by GET /api/reference-data/:category */
export interface ReferenceDataItem {
  key: string;
  label_en: string;
  label_ar: string;
  label_he: string;
  active: boolean;
  order?: number;
  /** Coping tools only — UI grouping key */
  group?: string;
  /** Therapeutic mechanisms only — coping tool document IDs */
  recommendedCopingTools?: string[];
  /** Coping tools only — typical age range */
  suggestedAgeMin?: number;
  suggestedAgeMax?: number;
  /** Optional English description (emotional arcs, etc.) */
  description_en?: string;
  /** Optional Arabic description */
  description_ar?: string;
  /** Optional Hebrew description */
  description_he?: string;
}

/** referenceData/copingTools/items */
export type CopingToolReferenceItem = Omit<
  ReferenceDataItem,
  "recommendedCopingTools" | "group"
> & {
  group?: string;
};

/** referenceData/therapeuticMechanisms/items */
export type TherapeuticMechanismReferenceItem = Omit<
  ReferenceDataItem,
  "group" | "recommendedCopingTools"
> & {
  recommendedCopingTools?: string[];
};

/** referenceData/copingToolGroups/items */
export type CopingToolGroupReferenceItem = Omit<
  ReferenceDataItem,
  "group" | "recommendedCopingTools"
>;

export interface SituationReferenceItem extends ReferenceDataItem {
  topicKey: string;
}

export interface ReferencePlatformConfig {
  platformMinAge?: number;
  platformMaxAge?: number;
}

export type ReferenceDataCategory =
  | "topics"
  | "emotionalGoals"
  | "exclusions"
  | "therapeuticMechanisms"
  | "copingTools"
  | "copingToolGroups"
  | "emotionalArcs"
  | "contentExclusions"
  | "languageComplexities"
  | "emotionalTones"
  | "topicSensitivities"
  | "endingStyles"
  | "protagonistTypes"
  | "protagonistAgeRelations"
  | "protagonistGenders"
  | "caregiverRoles"
  | "peakIntensities";

/**
 * Load reference items from a category (includes `group` / `recommendedCopingTools` when present in JSON).
 */
export async function loadReferenceItems(category: "copingTools"): Promise<CopingToolReferenceItem[]>;
export async function loadReferenceItems(
  category: "therapeuticMechanisms",
): Promise<TherapeuticMechanismReferenceItem[]>;
export async function loadReferenceItems(
  category: "copingToolGroups",
): Promise<CopingToolGroupReferenceItem[]>;
export async function loadReferenceItems(category: ReferenceDataCategory): Promise<ReferenceDataItem[]>;
export async function loadReferenceItems(category: ReferenceDataCategory): Promise<ReferenceDataItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/reference-data/${category}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load ${category} (${res.status})`);
    }
    const data = await res.json();
    return (data.data ?? []) as ReferenceDataItem[];
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Load situations filtered by a parent key.
 * @param parentKey - The key value to filter by (e.g. topicKey or generalSituationKey)
 * @param collection - The collection to load from (default: "situations" for backward compat)
 * @param filterField - The field name to filter on (default: "topicKey")
 */
export async function loadSituationsByTopic(
  parentKey: string,
  collection: "situations" | "generalSituations" | "specificSituations" = "situations",
  filterField: string = "topicKey",
): Promise<SituationReferenceItem[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/reference-data/${collection}?${filterField}=${encodeURIComponent(parentKey)}`
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load ${collection} (${res.status})`);
    }
    const data = await res.json();
    return data.data ?? [];
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Load platform-level reference config.
 */
export async function loadReferenceConfig(): Promise<ReferencePlatformConfig> {
  try {
    const res = await fetch(`${API_BASE}/api/reference-data/config`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load config (${res.status})`);
    }
    const data = await res.json();
    return data.data ?? {};
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

