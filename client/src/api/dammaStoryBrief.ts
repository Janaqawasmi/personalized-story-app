// client/src/api/dammaStoryBrief.ts
//
// Submit the spec v1.2 Story Brief form (CompleteBrief) to the backend.

import type { CompleteBrief } from "../types/storyBrief";
import type { BriefFeedbackPayload, StoryBriefFeedbackDoc } from "../types/storyBriefFeedback";
import { API_BASE, getAuthHeaders } from "./api";

/** Prefer combining `error` + `details` so 403 responses explain required vs actual role. */
function dammaApiErrorMessage(
  data: { error?: string; details?: string },
  fallback: string,
): string {
  const { error, details } = data;
  if (error && details) return `${error}: ${details}`;
  return error || details || fallback;
}

const NETWORK_ERROR =
  "Unable to reach the server. Check your connection and that the API is running.";

function rethrowIfNetworkError(err: unknown): void {
  if (err instanceof TypeError && err.message.includes("fetch")) {
    throw new Error(NETWORK_ERROR);
  }
}

export interface DammaBriefSubmitResult {
  briefId: string;
}

/**
 * POST /api/admin/damma-story-briefs — persists brief JSON, returns Firestore document id.
 */
export async function submitDammaStoryBriefForm(
  brief: CompleteBrief,
): Promise<DammaBriefSubmitResult> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/damma-story-briefs`, {
      method: "POST",
      headers,
      body: JSON.stringify(brief),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id?: string };
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(dammaApiErrorMessage(data, `Submit failed (${res.status})`));
    }
    if (!data.success || !data.data?.id) {
      throw new Error(dammaApiErrorMessage(data, "Invalid server response"));
    }
    return { briefId: data.data.id };
  } catch (err) {
    rethrowIfNetworkError(err);
    throw err;
  }
}

export interface DammaStoryBriefRecord {
  id: string;
  brief: unknown;
  submittedAt?: string;
  submittedByUid?: string;
  schemaVersion?: string;
}

export interface DammaStoryBriefListItem {
  id: string;
  submittedAt?: string;
  submittedByUid?: string;
  schemaVersion?: string;
  storyType?: string;
}

/**
 * GET /api/admin/damma-story-briefs — briefs submitted by the current specialist.
 */
export async function listDammaStoryBriefs(limit = 50): Promise<DammaStoryBriefListItem[]> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${API_BASE}/api/admin/damma-story-briefs`);
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), { headers });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: DammaStoryBriefListItem[];
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(dammaApiErrorMessage(data, `List failed (${res.status})`));
    }
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(dammaApiErrorMessage(data, "Invalid server response"));
    }
    return data.data;
  } catch (err) {
    rethrowIfNetworkError(err);
    throw err;
  }
}

/**
 * GET /api/admin/damma-story-briefs/:briefId
 */
export async function fetchDammaStoryBrief(briefId: string): Promise<DammaStoryBriefRecord> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/damma-story-briefs/${encodeURIComponent(briefId)}`, {
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: DammaStoryBriefRecord;
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(dammaApiErrorMessage(data, `Load failed (${res.status})`));
    }
    if (!data.success || !data.data) {
      throw new Error(dammaApiErrorMessage(data, "Invalid server response"));
    }
    return data.data;
  } catch (err) {
    rethrowIfNetworkError(err);
    throw err;
  }
}

/**
 * POST /api/admin/damma-story-briefs/:briefId/feedback
 */
export async function submitDammaStoryBriefFeedback(
  briefId: string,
  payload: BriefFeedbackPayload,
): Promise<{ feedbackId: string; briefId: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE}/api/admin/damma-story-briefs/${encodeURIComponent(briefId)}/feedback`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id?: string; briefId?: string };
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(dammaApiErrorMessage(data, `Submit failed (${res.status})`));
    }
    if (!data.success || !data.data?.id) {
      throw new Error(dammaApiErrorMessage(data, "Invalid server response"));
    }
    return { feedbackId: data.data.id, briefId: data.data.briefId ?? briefId };
  } catch (err) {
    rethrowIfNetworkError(err);
    throw err;
  }
}

/**
 * GET /api/admin/damma-story-briefs/:briefId/feedback
 */
export async function listDammaStoryBriefFeedback(
  briefId: string,
  limit = 20,
): Promise<StoryBriefFeedbackDoc[]> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(
      `${API_BASE}/api/admin/damma-story-briefs/${encodeURIComponent(briefId)}/feedback`,
    );
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), { headers });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: StoryBriefFeedbackDoc[];
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      throw new Error(dammaApiErrorMessage(data, `Load failed (${res.status})`));
    }
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(dammaApiErrorMessage(data, "Invalid server response"));
    }
    return data.data;
  } catch (err) {
    rethrowIfNetworkError(err);
    throw err;
  }
}
