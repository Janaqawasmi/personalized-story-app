// client/src/services/referenceData.service.ts
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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

