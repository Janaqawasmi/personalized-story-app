// client/src/api/specialistStories.ts
//
// Client for the six specialist story REST endpoints at
// /api/specialist/stories/. Pure HTTP — no localStorage, no retry.

import type { CompleteBrief } from "../types/storyBrief";
import type { Story, StoryStatus } from "../types/story";
import type { ModelChoice } from "../types/agent1Result";
import { normalizeStoryFromApi } from "../utils/storyBriefFromApi";
import { API_BASE, getAuthHeaders } from "./api";

const BASE = `${API_BASE}/api/specialist/stories`;

/** Subset of Agent 1 approved-part tokens for reruns (matches server `ApprovedPart`). */
export type Agent1ApprovedPartToken =
  | "emotionalTruth"
  | "blueprint"
  | "approachInstruction"
  | "story";

export type Agent1RegenerationPayload = {
  feedbackText: string;
  approvedParts: Agent1ApprovedPartToken[];
};

const NETWORK_ERROR =
  "Unable to reach the server. Check your connection and that the API is running.";

function errorMessage(
  data: { error?: string; details?: string; message?: string },
  fallback: string,
): string {
  const { error, details, message } = data;
  const reason = details || message;
  if (error && reason) return `${error}: ${reason}`;
  return error || reason || fallback;
}

async function handleResponse<T>(
  res: Response,
  fallbackKey?: "story" | "stories" | "pages" | "page",
): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    story?: T;
    stories?: T;
    pages?: T;
    page?: T;
    message?: string;
    error?: string;
    details?: string;
  };

  if (!res.ok) {
    throw new Error(errorMessage(body, `Request failed (${res.status})`));
  }

  // Primary envelope: { success, data }
  if (body.data !== undefined && (body.success === undefined || body.success)) {
    return body.data;
  }

  // Backward-compatible envelope used by specialist stories routes:
  // { story } or { stories }
  if (fallbackKey && body[fallbackKey] !== undefined) {
    return body[fallbackKey] as T;
  }

  if (!body.success || body.data === undefined) {
    throw new Error(errorMessage(body, "Invalid server response"));
  }

  return body.data;
}

function wrapNetworkError(err: unknown): never {
  if (err instanceof TypeError && err.message.includes("fetch")) {
    throw new Error(NETWORK_ERROR);
  }
  throw err;
}

// ============================================================================
// Endpoints
// ============================================================================

/** POST /api/specialist/stories/:storyId/generate — submit brief and run story generation (or rerun from needs_revision with agent1Rerun). */
export async function generateStory(
  storyId: string,
  brief: CompleteBrief,
  parentStoryId?: string,
  agent1Rerun?: Agent1RegenerationPayload,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const storyPayload: { brief: CompleteBrief; parentStoryId?: string } = { brief };
    if (parentStoryId !== undefined) {
      storyPayload.parentStoryId = parentStoryId;
    }
    const requestBody: {
      story: typeof storyPayload;
      agent1Rerun?: Agent1RegenerationPayload;
    } = { story: storyPayload };
    if (agent1Rerun !== undefined) {
      requestBody.agent1Rerun = agent1Rerun;
    }
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/generate`,
      { method: "POST", headers, body: JSON.stringify(requestBody) },
    );
    const json = (await res.json().catch(() => ({}))) as {
      story?: Story;
      error?: string;
      details?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(errorMessage(json, `Request failed (${res.status})`));
    }
    if (!json.story) {
      throw new Error(errorMessage(json, "Invalid server response"));
    }
    return normalizeStoryFromApi(json.story);
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** POST /api/specialist/stories/:storyId/generate-variant — generate an additional version with a different AI model. */
export async function generateVariant(
  storyId: string,
  modelChoice: ModelChoice,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/generate-variant`,
      { method: "POST", headers, body: JSON.stringify({ modelChoice }) },
    );
    return normalizeStoryFromApi(await handleResponse<Story>(res, "story"));
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** GET /api/specialist/stories — list stories for the current specialist. */
export async function listStories(
  params?: { status?: StoryStatus; sortBy?: string; limit?: number },
): Promise<Story[]> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(BASE);
    if (params?.status !== undefined) url.searchParams.set("status", params.status);
    if (params?.sortBy !== undefined) url.searchParams.set("sortBy", params.sortBy);
    if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { headers });
    const stories = await handleResponse<Story[]>(res, "stories");
    return stories.map(normalizeStoryFromApi);
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** GET /api/specialist/stories/:storyId — fetch a single story (bumps lastOpenedAt server-side). */
export async function getStory(storyId: string): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}`,
      { headers },
    );
    return normalizeStoryFromApi(await handleResponse<Story>(res, "story"));
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** PATCH /api/specialist/stories/:storyId — update PATCH-able fields only. */
export async function updateStory(
  storyId: string,
  patch: Partial<Pick<Story, "title" | "tags" | "lastOpenedAt" | "currentDraft">>,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}`,
      { method: "PATCH", headers, body: JSON.stringify({ patch }) },
    );
    return normalizeStoryFromApi(await handleResponse<Story>(res, "story"));
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** PUT /api/specialist/stories/:storyId/brief — replace the brief while briefStatus is draft. */
export async function updateBrief(
  storyId: string,
  brief: CompleteBrief,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/brief`,
      { method: "PUT", headers, body: JSON.stringify({ brief }) },
    );
    return normalizeStoryFromApi(await handleResponse<Story>(res, "story"));
  } catch (err) {
    return wrapNetworkError(err);
  }
}

// v1 illustration API client (listPages, reviewPrompt, listIllustrations,
// reviewIllustration) is removed in cleanup PR 1 of the v2 redesign.
// Phase 1 of v2 (see docs/illustration/spec.md §14) introduces the new
// per-stage endpoints (visual-bible, scene-plan, image, transitions).

/** POST /api/specialist/stories/:storyId/transitions — change status via the state machine. */
export async function transitionStory(
  storyId: string,
  to: StoryStatus,
  metadata?: Record<string, unknown>,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/transitions`,
      { method: "POST", headers, body: JSON.stringify({ to, ...metadata }) },
    );
    return normalizeStoryFromApi(await handleResponse<Story>(res, "story"));
  } catch (err) {
    return wrapNetworkError(err);
  }
}
