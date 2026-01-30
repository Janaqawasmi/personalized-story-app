// client/src/services/referenceData.service.ts
// Use same API_BASE as main API to ensure consistent behavior
import { API_BASE } from "../api/api";

export interface ReferenceDataItem {
  key: string;
  label_en: string;
  label_ar: string;
  label_he: string;
  active: boolean;
}

export interface SituationReferenceItem extends ReferenceDataItem {
  topicKey: string;
}

/**
 * Load reference items from a category
 */
export async function loadReferenceItems(
  category: "topics" | "emotionalGoals" | "exclusions"
): Promise<ReferenceDataItem[]> {
  // Guard: Return empty array if backend is not configured (empty string in production)
  if (!API_BASE) {
    return [];
  }

  try {
    const res = await fetch(`${API_BASE}/api/reference-data/${category}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load ${category} (${res.status})`);
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
 * Load situations filtered by topic key
 */
export async function loadSituationsByTopic(topicKey: string): Promise<SituationReferenceItem[]> {
  // Guard: Return empty array if backend is not configured (empty string in production)
  if (!API_BASE) {
    return [];
  }

  try {
    const res = await fetch(`${API_BASE}/api/reference-data/situations?topicKey=${encodeURIComponent(topicKey)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load situations (${res.status})`);
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

