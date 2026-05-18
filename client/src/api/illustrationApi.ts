import { API_BASE, getAuthHeaders } from "./api";
import type {
  ImageArtefact,
  ScenePlanArtefact,
  VisualBibleArtefact,
} from "../types/illustration";

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

export async function regeneratePageImage(
  storyId: string,
  pageNumber: number,
): Promise<{ jobId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/regenerate-image`,
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
  if (!body.jobId) throw new Error("Invalid server response for image regeneration");
  return { jobId: body.jobId };
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
): Promise<{ jobId: string; status: "pending" }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/image/reject`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackNote: feedbackNote ?? "" }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    jobId?: string;
    status?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  if (!body.jobId || body.status !== "pending") {
    throw new Error("Invalid server response for reject illustration");
  }
  return { jobId: body.jobId, status: "pending" };
}

export async function regenerateScenePlan(
  storyId: string,
  pageNumber: number,
  feedbackNote?: string,
): Promise<{ jobId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/scene-plan/regenerate`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        feedbackNote: feedbackNote !== undefined ? feedbackNote : "",
      }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    jobId?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  if (!body.jobId) throw new Error("Invalid server response for scene plan regen");
  return { jobId: body.jobId };
}

export async function fetchPageIllustrationHistory(
  storyId: string,
  pageNumber: number,
): Promise<{ scenePlans: ScenePlanArtefact[]; images: ImageArtefact[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/history`,
    { headers },
  );
  const body = (await res.json().catch(() => ({}))) as {
    scenePlans?: ScenePlanArtefact[];
    images?: ImageArtefact[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  return {
    scenePlans: body.scenePlans ?? [],
    images: body.images ?? [],
  };
}

export type VisualBiblePatchFields = Partial<
  Pick<
    VisualBibleArtefact,
    | "characterAnchor"
    | "characterSheet"
    | "styleGuide"
    | "palette"
    | "consistencyAnchors"
    | "avoidList"
    | "environmentRegistry"
  >
>;

export async function fetchVisualBible(
  storyId: string,
): Promise<{ artefact: VisualBibleArtefact; version: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/visual-bible`,
    { headers },
  );
  const body = (await res.json().catch(() => ({}))) as {
    artefact?: VisualBibleArtefact;
    version?: number;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  if (!body.artefact || body.version === undefined) {
    throw new Error("Invalid server response for Visual Bible");
  }
  return { artefact: body.artefact, version: body.version };
}

export async function fetchVisualBibleVersions(
  storyId: string,
): Promise<{ versions: VisualBibleArtefact[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/visual-bible/versions`,
    { headers },
  );
  const body = (await res.json().catch(() => ({}))) as {
    versions?: VisualBibleArtefact[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  return { versions: body.versions ?? [] };
}

export async function patchVisualBible(
  storyId: string,
  fields: VisualBiblePatchFields,
): Promise<{ artefact: VisualBibleArtefact; version: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${encodeURIComponent(storyId)}/visual-bible`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const body = (await res.json().catch(() => ({}))) as {
    artefact?: VisualBibleArtefact;
    version?: number;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  if (!body.artefact || body.version === undefined) {
    throw new Error("Invalid server response for Visual Bible patch");
  }
  return { artefact: body.artefact, version: body.version };
}

export async function regenerateVisualBible(storyId: string): Promise<{ jobId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/visual-bible/regenerate`,
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
  if (!body.jobId) throw new Error("Invalid server response for Visual Bible regenerate");
  return { jobId: body.jobId };
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

export interface PublishStoryRequestBody {
  shortDescriptionHe?: string;
  shortDescriptionAr?: string;
  displayTopicHe?: string;
  displayTopicAr?: string;
}

export async function publishStoryToLibrary(
  storyId: string,
  body: PublishStoryRequestBody,
): Promise<{ templateId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${encodeURIComponent(storyId)}/publish`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    templateId?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  if (!json.templateId) throw new Error("Invalid publish response");
  return { templateId: json.templateId };
}

export async function cancelIllustrationJob(
  storyId: string,
  jobId: string,
): Promise<{ ok: true; status: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST", headers },
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    status?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  if (!json.ok || typeof json.status !== "string") {
    throw new Error("Invalid cancel response");
  }
  return { ok: true, status: json.status };
}

export async function fetchIllustrationJob(
  storyId: string,
  jobId: string,
): Promise<{ job: import("../types/illustration").IllustrationJob }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(storyId)}/jobs/${encodeURIComponent(jobId)}`,
    { headers },
  );
  const json = (await res.json().catch(() => ({}))) as {
    job?: import("../types/illustration").IllustrationJob;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  if (!json.job) throw new Error("Invalid job response");
  return { job: json.job };
}
