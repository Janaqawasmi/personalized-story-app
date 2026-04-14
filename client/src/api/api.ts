// client/src/api/api.ts
//
// PHASE 1 CHANGES:
//   - All API calls now include Authorization header with Firebase ID token
//   - Added getAuthHeaders() helper for consistent auth header injection

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

// ---------- Specialist Review APIs ----------

export async function fetchDraftsForReview(): Promise<StoryDraftView[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts`, { headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load drafts (${res.status})`);
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

// Old endpoint (out of scope for current phase)
// export async function fetchDraftById(draftId: string): Promise<StoryDraft> {
//   const res = await fetch(`${API_BASE}/api/specialist/reviews/drafts/${draftId}`);
//   if (!res.ok) {
//     throw new Error(`Failed to load draft (${res.status})`);
//   }
//   const data = await res.json();
//   return data.draft;
// }

// Phase 2: READ-ONLY draft viewing + Edit/Approve flow
export interface StoryDraftView {
  id: string;
  briefId?: string;
  title?: string;
  status?: "generating" | "generated" | "failed" | "editing" | "approved";
  revisionCount?: number;
  approvedAt?: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  approvedBy?: string;
  generationConfig: {
    language: "ar" | "he";
    targetAgeGroup: string;
    length: "short" | "medium" | "long";
    tone: string;
    emphasis?: string;
  };
  pages?: Array<{
    pageNumber: number;
    text: string;
    imagePrompt: string;
    emotionalTone?: string;
  }>;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
}

export interface StoryDraftPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  emotionalTone?: string;
}

export async function fetchDraftById(draftId: string): Promise<StoryDraftView> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}`, { headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load draft (${res.status})`);
    }
    const data = await res.json();
    return data.data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Enter edit mode for a draft
 */
export async function enterEditMode(draftId: string): Promise<{ success: boolean; status: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/edit`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to enter edit mode (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Cancel edit mode for a draft (reset to generated)
 */
export async function cancelEditMode(draftId: string): Promise<{ success: boolean; status: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/cancel-edit`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to cancel edit mode (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Update a draft (save edits)
 */
export async function updateDraft(draftId: string, updates: { title?: string; pages: StoryDraftPage[] }): Promise<{ success: boolean; status: string; revisionCount: number }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to update draft (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Approve a draft (finalize and create template)
 */
export async function approveDraft(draftId: string): Promise<{ success: boolean; status: string; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/approve`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to approve draft (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
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
// ---------- Draft Suggestion APIs ----------

// Note: getAuthHeaders() is already defined above (line 27) using Firebase Auth
// The old implementation using getAuthToken() has been removed

export interface DraftSuggestion {
  id: string;
  draftId: string;
  briefId: string;
  pageNumber?: number;
  scope: "page" | "selection";
  instruction: string;
  originalText: string;
  suggestedText: string;
  rationale?: string;
  status: "proposed" | "accepted" | "rejected";
  createdAt: { seconds: number; nanoseconds: number } | string | Date;
  updatedAt: { seconds: number; nanoseconds: number } | string | Date;
  createdBy: string;
  acceptedAt?: { seconds: number; nanoseconds: number } | string | Date;
  rejectedAt?: { seconds: number; nanoseconds: number } | string | Date;
}

export interface CreateSuggestionInput {
  scope: "page" | "selection";
  pageNumber?: number;
  originalText: string;
  instruction: string;
}

/**
 * Create a new AI suggestion for a draft
 */
export async function createDraftSuggestion(
  draftId: string,
  input: CreateSuggestionInput
): Promise<{ success: boolean; data: { suggestionId: string; suggestedText: string; rationale?: string; status: string } }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to create suggestion (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * List suggestions for a draft
 */
export async function listDraftSuggestions(
  draftId: string,
  status?: "proposed" | "accepted" | "rejected"
): Promise<{ success: boolean; data: DraftSuggestion[] }> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_BASE}/api/story-drafts/${draftId}/suggestions`);
    if (status) {
      url.searchParams.set('status', status);
    }
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to list suggestions (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Accept a suggestion (apply it to the draft)
 */
export async function acceptDraftSuggestion(
  draftId: string,
  suggestionId: string
): Promise<{ success: boolean; data?: { draftId: string; title?: string; status: string; revisionCount: number; updatedAt: any } }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/suggestions/${suggestionId}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to accept suggestion (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Reject a suggestion
 */
export async function rejectDraftSuggestion(
  draftId: string,
  suggestionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/suggestions/${suggestionId}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to reject suggestion (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

/**
 * Generate an AI suggestion for aligning an image prompt with story text
 */
export async function generateImagePromptSuggestion(
  draftId: string,
  pageNumber: number,
  currentText: string,
  currentImagePrompt: string
): Promise<{ success: boolean; data: { suggestedImagePrompt: string; rationale?: string } }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/pages/${pageNumber}/image-prompt-suggestion`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        currentText,
        currentImagePrompt,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to generate image prompt suggestion (${res.status})`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

