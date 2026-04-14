// client/src/api/api.ts
import { getAuth } from "firebase/auth";

// ============================================================================
// Configuration
// ============================================================================

export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

// ============================================================================
// Auth Helper
// ============================================================================

/**
 * Gets the current user's ID token for API authentication.
 * Returns headers object with Authorization bearer token.
 * Throws if user is not authenticated.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated. Please log in.");
  }

  const token = await user.getIdToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ---------- Existing APIs ----------

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/test-firestore`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}

// ---------- Story Search API ----------

export interface StorySearchResult {
  id: string;
  title?: string;
  shortDescription?: string;
  coverImage?: string;
  ageGroup?: string;
  targetAgeGroup?: string;
  generationConfig?: {
    targetAgeGroup?: string;
  };
  primaryTopic?: string;
  specificSituation?: string;
  category?: string;
  topicKey?: string;
  language?: string;
  status?: string;
  [key: string]: any; // Allow other fields
}

export interface StorySearchResponse {
  results: StorySearchResult[];
  matchedAgeGroup: string | null;
}

export async function searchStories(query: string): Promise<StorySearchResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/stories/search?q=${encodeURIComponent(query)}`);
    
    // Defensive: Check if response is JSON, not HTML
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await res.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error(
          "API returned HTML instead of JSON. " +
          "This usually means the backend route /api/stories/search doesn't exist " +
          "or the proxy isn't working. Make sure the backend server is running on port 5000."
        );
      }
      throw new Error(`API did not return JSON. Content-Type: ${contentType}`);
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to search stories (${res.status})`);
    }
    
    return res.json();
      } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

