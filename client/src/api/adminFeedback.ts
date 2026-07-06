import { API_BASE, getAuthHeaders } from "./api";

export interface AdminFeedbackItem {
  feedbackId: string;
  storyTemplateId: string;
  storyTitle: string;
  personalizedStoryId: string;
  childName: string;
  rating: number | null;
  emotionalShift: { before: number; after: number } | null;
  reviewText: string | null;
  isFeatured: boolean;
  featuredDisplayName: string | null;
  createdAt: string | null;
}

async function handleAdminResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message?: string } | string;
  };

  if (!res.ok || !data.success) {
    const message =
      (typeof data.error === "object" && data.error?.message) ||
      (typeof data.error === "string" && data.error) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data.data as T;
}

export async function listAdminFeedback(storyTemplateId?: string): Promise<AdminFeedbackItem[]> {
  const headers = await getAuthHeaders();
  const url = storyTemplateId
    ? `${API_BASE}/api/admin/feedback?storyTemplateId=${encodeURIComponent(storyTemplateId)}`
    : `${API_BASE}/api/admin/feedback`;
  const res = await fetch(url, { headers });
  return handleAdminResponse<AdminFeedbackItem[]>(res);
}

export async function updateAdminFeedbackFeature(input: {
  feedbackId: string;
  isFeatured: boolean;
  featuredDisplayName: string | null;
}): Promise<{ feedbackId: string; isFeatured: boolean; featuredDisplayName: string | null }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/feedback/${encodeURIComponent(input.feedbackId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      isFeatured: input.isFeatured,
      featuredDisplayName: input.featuredDisplayName,
    }),
  });
  return handleAdminResponse<{
    feedbackId: string;
    isFeatured: boolean;
    featuredDisplayName: string | null;
  }>(res);
}
