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
