const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

// ---------- Existing APIs ----------

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/test-firestore`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}

export interface StoryBriefInput {
  createdBy: string;
  therapeuticFocus: {
    primaryTopic: string;
    specificSituation: string;
  };
  childProfile: {
    ageGroup: "0_3" | "3_6" | "6_9" | "9_12";
    emotionalSensitivity: "low" | "medium" | "high";
  };
  therapeuticIntent: {
    emotionalGoals: string[];
    keyMessage?: string;
  };
  languageTone: {
    complexity: "very_simple" | "simple" | "moderate";
    emotionalTone: "very_gentle" | "calm" | "encouraging";
  };
  safetyConstraints: {
    exclusions: string[];
  };
  storyPreferences: {
    caregiverPresence: "included" | "self_guided";
    endingStyle: "calm_resolution" | "open_ended" | "empowering";
  };
}

export interface StoryBriefResponse {
  success: boolean;
  id?: string;
  data?: {
    id: string;
    topicKey: string;
    targetAgeGroup: string;
    topicTags: string[];
    therapeuticIntent: string[];
    constraints?: {
      avoidMetaphors?: string[];
      avoidLanguage?: string[];
    };
    status: "draft" | "generated" | "reviewed" | "approved";
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
  error?: string;
}

export async function createStoryBrief(data: StoryBriefInput): Promise<StoryBriefResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/story-briefs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      const errorMessage = errorData.details || errorData.error || `Failed to create story brief (${res.status})`;
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Make sure the backend is running on http://localhost:5000');
    }
    throw err;
  }
}

// ---------- Specialist Review APIs ----------

export interface StoryDraftPage {
  pageNumber: number;
  text: string;
  emotionalTone?: string;
  imagePrompt?: string;
}

export interface StoryDraft {
  id: string;
  title?: string;
  topicKey?: string;
  targetAgeGroup?: string;
  language?: string;
  status?: string;
  pages: StoryDraftPage[];
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export async function fetchDraftsForReview(): Promise<StoryDraftView[]> {
  try {
    const res = await fetch(`${API_BASE}/api/story-drafts`);
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
  imagePrompt?: string;
  emotionalTone?: string;
}

export async function fetchDraftById(draftId: string): Promise<StoryDraftView> {
  try {
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}`);
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
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/cancel-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/api/story-drafts/${draftId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

// ---------- Story Brief APIs ----------

export interface StoryBrief {
  id: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  createdBy: string;
  status: "created" | "draft_generating" | "draft_generated" | "archived";
  version: number;
  therapeuticFocus: {
    primaryTopic: string;
    specificSituation: string;
  };
  childProfile: {
    ageGroup: "0_3" | "3_6" | "6_9" | "9_12";
    emotionalSensitivity: "low" | "medium" | "high";
  };
  therapeuticIntent: {
    emotionalGoals: string[];
    keyMessage?: string;
  };
  languageTone: {
    complexity: "very_simple" | "simple" | "moderate";
    emotionalTone: "very_gentle" | "calm" | "encouraging";
  };
  safetyConstraints: {
    enforced: {
      noThreateningImagery: true;
      noShameLanguage: true;
      noMoralizing: true;
      validateEmotions: true;
      externalizeProblem: true;
    };
    exclusions: string[];
  };
  storyPreferences: {
    caregiverPresence: "included" | "self_guided";
    endingStyle: "calm_resolution" | "open_ended" | "empowering";
  };
  lockedAt?: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  lockedByDraftId?: string;
}

export async function fetchStoryBriefs(): Promise<StoryBrief[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/story-briefs`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load story briefs (${res.status})`);
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

export async function generateDraftFromBrief(
  briefId: string,
  options?: { length?: "short" | "medium" | "long"; tone?: string; emphasis?: string }
): Promise<{ success: boolean; draftId: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/story-briefs/${briefId}/generate-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      length: options?.length || "medium",
      tone: options?.tone || "calm",
      emphasis: options?.emphasis,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to generate draft (${res.status})`);
  }
  return res.json();
}

// ---------- Story Prompt Preview API ----------

export interface PromptPreviewResponse {
  promptPreview: string;
  ragSources: string[];
}

export async function fetchPromptPreview(briefId: string): Promise<PromptPreviewResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/specialist/story-briefs/${briefId}/prompt-preview`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load prompt preview (${res.status})`);
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

// ---------- Review Session APIs ----------

export interface ReviewSession {
  id: string;
  draftId: string;
  specialistId: string;
  revisionCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  proposals?: Proposal[];
}

export interface Message {
  id: string;
  role: 'specialist' | 'assistant';
  content: string;
  specialistId?: string;
  proposalId?: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  messageId: string;
  basedOnRevisionCount: number;
  proposedPages: StoryDraftPage[];
  summary: string;
  safetyNotes: string;
  applied?: boolean;
  appliedAt?: string;
  appliedBy?: string;
  createdAt: string;
}

export async function createReviewSession(draftId: string, specialistId: string): Promise<{ success: boolean; sessionId: string; revisionCount: number }> {
  const res = await fetch(`${API_BASE}/api/specialist/reviews/drafts/${draftId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialistId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to create review session (${res.status})`);
  }
  return res.json();
}

export async function getReviewSession(sessionId: string): Promise<ReviewSession> {
  const res = await fetch(`${API_BASE}/api/specialist/reviews/sessions/${sessionId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to fetch review session (${res.status})`);
  }
  const data = await res.json();
  return data.session;
}

export async function sendMessage(sessionId: string, content: string, specialistId: string): Promise<{ success: boolean; messageId: string; proposalId: string; proposal: Proposal }> {
  const res = await fetch(`${API_BASE}/api/specialist/reviews/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, specialistId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to send message (${res.status})`);
  }
  return res.json();
}

export async function applyProposal(sessionId: string, proposalId: string, specialistId: string): Promise<{ success: boolean; revisionCount: number }> {
  const res = await fetch(`${API_BASE}/api/specialist/reviews/sessions/${sessionId}/proposals/${proposalId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialistId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to apply proposal (${res.status})`);
  }
  return res.json();
}

// ---------- Topic Tags API ----------

export async function fetchTopicTags(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/specialist/reviews/topic-tags`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
      throw new Error(errorData.error || errorData.details || `Failed to load topic tags (${res.status})`);
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

