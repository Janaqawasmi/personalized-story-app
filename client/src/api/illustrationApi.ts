import { API_BASE, getAuthHeaders } from "./api";

const BASE = `${API_BASE}/api/specialist/stories`;

export interface OpenIllustrationWorkspaceResponse {
  jobId: string;
  status: "pending";
}

export async function openIllustrationWorkspace(
  storyId: string,
): Promise<OpenIllustrationWorkspaceResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/transitions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ to: "illustration_workspace" }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    jobId?: string;
    status?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg = body.message || body.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  if (!body.jobId || body.status !== "pending") {
    throw new Error("Invalid server response for illustration workspace transition");
  }
  return { jobId: body.jobId, status: "pending" };
}

export async function generatePageImage(
  storyId: string,
  pageNumber: number,
): Promise<{ jobId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/image`,
    { method: "POST", headers },
  );
  const body = (await res.json().catch(() => ({}))) as {
    jobId?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  if (!body.jobId) throw new Error("Invalid server response for image job");
  return { jobId: body.jobId };
}

export async function approvePageImage(storyId: string, pageNumber: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/image/approve`,
    { method: "POST", headers },
  );
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
}

export async function rejectPageImage(
  storyId: string,
  pageNumber: number,
  feedbackNote?: string,
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/image/reject`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackNote: feedbackNote ?? "" }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
}

export async function markIllustrationReadyToPublish(storyId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/transitions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ to: "illustration_ready" }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
}
