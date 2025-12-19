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
  topicKey: string;
  targetAgeGroup: string;
  therapeuticMessages: string[];
  shortDescription?: string;
  createdBy: string;
}

export interface StoryBriefResponse {
  success: boolean;
  id?: string;
  data?: {
    id: string;
    topicKey: string;
    targetAgeGroup: string;
    therapeuticMessages: string[];
    shortDescription?: string;
    status: string;
    createdAt: string;
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
      throw new Error(errorData.error || `Failed to create story brief (${res.status})`);
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

export async function fetchDraftsForReview(): Promise<StoryDraft[]> {
  const res = await fetch(`${API_BASE}/api/specialist/drafts`);
  if (!res.ok) {
    throw new Error(`Failed to load drafts (${res.status})`);
  }
  const data = await res.json();
  return data.drafts ?? [];
}

export async function fetchDraftById(draftId: string): Promise<StoryDraft> {
  const res = await fetch(`${API_BASE}/api/specialist/drafts/${draftId}`);
  if (!res.ok) {
    throw new Error(`Failed to load draft (${res.status})`);
  }
  const data = await res.json();
  return data.draft;
}

export async function updateDraftPages(draftId: string, pages: StoryDraftPage[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/specialist/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Failed to update draft (${res.status})`);
  }
}

export async function approveDraft(draftId: string, specialistId: string, sessionId?: string): Promise<{ success: boolean; templateId: string }> {
  const res = await fetch(`${API_BASE}/api/specialist/drafts/${draftId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialistId, sessionId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to approve draft (${res.status})`);
  }
  return res.json();
}

// ---------- Story Brief APIs ----------

export interface StoryBrief {
  id: string;
  topicKey: string;
  targetAgeGroup: string;
  therapeuticMessages: string[];
  shortDescription?: string;
  status: string;
  createdAt: string;
  createdBy: string;
  generatedDraftId?: string;
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

export async function generateDraftFromBrief(briefId: string): Promise<{ success: boolean; draftId: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/story-drafts/${briefId}/generate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to generate draft (${res.status})`);
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/api/specialist/drafts/${draftId}/sessions`, {
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
  const res = await fetch(`${API_BASE}/api/specialist/sessions/${sessionId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(errorData.error || errorData.details || `Failed to fetch review session (${res.status})`);
  }
  const data = await res.json();
  return data.session;
}

export async function sendMessage(sessionId: string, content: string, specialistId: string): Promise<{ success: boolean; messageId: string; proposalId: string; proposal: Proposal }> {
  const res = await fetch(`${API_BASE}/api/specialist/sessions/${sessionId}/messages`, {
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
  const res = await fetch(`${API_BASE}/api/specialist/sessions/${sessionId}/proposals/${proposalId}/apply`, {
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

