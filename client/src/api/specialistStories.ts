// client/src/api/specialistStories.ts
//
// Client for the six specialist story REST endpoints at
// /api/specialist/stories/. Pure HTTP — no localStorage, no retry.

import type { CompleteBrief } from "../types/storyBrief";
import type { Story, StoryStatus, PageIllustration } from "../types/story";
import { normalizeStoryFromApi } from "../utils/storyBriefFromApi";
import { API_BASE, getAuthHeaders } from "./api";

const BASE = `${API_BASE}/api/specialist/stories`;

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

/** POST /api/specialist/stories/:storyId/generate — submit brief and run story generation. */
export async function generateStory(
  storyId: string,
  brief: CompleteBrief,
  parentStoryId?: string,
): Promise<Story> {
  try {
    const headers = await getAuthHeaders();
    const storyPayload: { brief: CompleteBrief; parentStoryId?: string } = { brief };
    if (parentStoryId !== undefined) {
      storyPayload.parentStoryId = parentStoryId;
    }
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/generate`,
      { method: "POST", headers, body: JSON.stringify({ story: storyPayload }) },
    );
    const body = (await res.json().catch(() => ({}))) as {
      story?: Story;
      error?: string;
      details?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(errorMessage(body, `Request failed (${res.status})`));
    }
    if (!body.story) {
      throw new Error(errorMessage(body, "Invalid server response"));
    }
    return normalizeStoryFromApi(body.story);
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

/** GET /api/specialist/stories/:storyId/pages — list pages with image prompts (Gate 1). */
export async function listPages(storyId: string): Promise<PageIllustration[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/${encodeURIComponent(storyId)}/pages`, { headers });
    return handleResponse<PageIllustration[]>(res, "pages");
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** PATCH /api/specialist/stories/:storyId/pages/:pageNumber/prompt — approve or reject a prompt (Gate 1). */
export async function reviewPrompt(
  storyId: string,
  pageNumber: number,
  action: "approve" | "reject",
  rejectionNote?: string,
): Promise<PageIllustration> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/prompt`,
      { method: "PATCH", headers, body: JSON.stringify({ action, rejectionNote }) },
    );
    return handleResponse<PageIllustration>(res, "page");
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** GET /api/specialist/stories/:storyId/illustrations — list pages with illustration results (Gate 2). */
export async function listIllustrations(storyId: string): Promise<PageIllustration[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/${encodeURIComponent(storyId)}/illustrations`, { headers });
    return handleResponse<PageIllustration[]>(res, "pages");
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** PATCH /api/specialist/stories/:storyId/pages/:pageNumber/illustration — approve or reject an illustration (Gate 2). */
export async function reviewIllustration(
  storyId: string,
  pageNumber: number,
  action: "approve" | "reject",
  rejectionNote?: string,
): Promise<{ page: PageIllustration; allApproved: boolean; storyStatus: StoryStatus }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/illustration`,
      { method: "PATCH", headers, body: JSON.stringify({ action, rejectionNote }) },
    );
    const body = await res.json() as {
      page: PageIllustration;
      allIllustrationsApproved: boolean;
      storyStatus: StoryStatus;
    };
    if (!res.ok) throw new Error((body as any).message || `Request failed (${res.status})`);
    return { page: body.page, allApproved: body.allIllustrationsApproved, storyStatus: body.storyStatus };
  } catch (err) {
    return wrapNetworkError(err);
  }
}

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

// ============================================================================
// Pilot illustration flow (admin-only)
// ============================================================================
//
// Mirrors the routes added to server/src/routes/specialist/stories.router.ts
// under "PILOT ILLUSTRATION FLOW". The server returns plain JSON envelopes
// (no { success, data } wrapper), so these helpers parse them directly.

export type PilotVariant = "C" | "D";
export type PilotRunStatus = "pending" | "generating" | "done" | "failed";

export interface PilotStyleBibleEnvironmentEntry {
  atmosphere: string;
  spatialLayout: string;
}

export interface PilotStyleBible {
  characterSheet: string;
  characterAnchor: string;
  styleGuide: string;
  consistencyAnchors: string[];
  environmentRegistry: Record<string, PilotStyleBibleEnvironmentEntry>;
  palette: string;
  avoidList: string[];
  generatedAt: number;
}

export interface PilotAvatar {
  url: string;
  seed: number;
  generatedAt: number;
  prompt: string;
}

export interface PilotIllustrationRun {
  id: string;
  storyId: string;
  pageNumber: number;
  variant: PilotVariant;
  runIndex: number;
  sceneDirection: string;
  scenePromptStructured: string;
  finalPromptToImageModel: string;
  imageStatus: PilotRunStatus;
  imageUrl: string | null;
  errorMessage: string | null;
  referenceImage: string;
  seed: number;
  promptModel: string;
  imageModel: string;
  createdAt: number;
  createdBy: string;
  completedAt: number | null;
}

async function pilotResponseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

/** GET /api/specialist/stories/:storyId/pilot/style-bible — generates lazily on first call. */
export async function getPilotStyleBible(
  storyId: string,
): Promise<PilotStyleBible> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pilot/style-bible`,
      { headers },
    );
    const body = await pilotResponseJson<{ styleBible: PilotStyleBible }>(res);
    return body.styleBible;
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/**
 * POST /api/specialist/stories/:storyId/pilot/avatar — generates a fresh
 * avatar for the story. Pass a seed to reproduce an earlier roll, or omit it
 * for a random new one.
 */
export async function generatePilotAvatar(
  storyId: string,
  options: { seed?: number } = {},
): Promise<PilotAvatar> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pilot/avatar`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(options),
      },
    );
    const body = await pilotResponseJson<{ avatar: PilotAvatar }>(res);
    return body.avatar;
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/** GET /api/specialist/stories/:storyId/pilot/runs — every run, all pages, both variants. */
export async function listPilotRuns(
  storyId: string,
): Promise<PilotIllustrationRun[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pilot/runs`,
      { headers },
    );
    const body = await pilotResponseJson<{ runs: PilotIllustrationRun[] }>(res);
    return body.runs;
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/**
 * POST /api/specialist/stories/:storyId/pages/:pageNumber/pilot-runs
 *
 * Returns an array of runs (length 1 for variant "C" or "D", length 2 for
 * variant "both" with C then D).
 */
export async function generatePilotRun(
  storyId: string,
  pageNumber: number,
  variant: PilotVariant | "both",
  options: { seed?: number } = {},
): Promise<PilotIllustrationRun[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${BASE}/${encodeURIComponent(storyId)}/pages/${pageNumber}/pilot-runs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ variant, ...options }),
      },
    );
    const body = await pilotResponseJson<{ runs: PilotIllustrationRun[] }>(res);
    return body.runs;
  } catch (err) {
    return wrapNetworkError(err);
  }
}
