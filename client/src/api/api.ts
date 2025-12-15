const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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

