// client/src/services/storyFeedback.service.ts
import { API_BASE, getAuthHeaders } from "../api/api";

export interface StoryFeedbackPayload {
  storyTemplateId: string;
  personalizedStoryId: string;
  childName: string;
  rating: number;
  emotionalShift: {
    before: number;
    after: number;
  };
  reviewText?: string;
}

export async function submitStoryFeedback(payload: StoryFeedbackPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/caregiver/feedback`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.error?.message || body?.error || body?.details || "Failed to submit feedback";
    throw new Error(typeof message === "string" ? message : "Failed to submit feedback");
  }
}
