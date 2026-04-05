// client/src/api/dammaStoryBrief.ts
//
// Submit the spec v1.2 Story Brief form (CompleteBrief) to the backend.

import type { CompleteBrief } from "../types/storyBrief";
import { API_BASE, getAuthHeaders } from "./api";

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
      throw new Error(data.error || data.details || `Submit failed (${res.status})`);
    }
    if (!data.success || !data.data?.id) {
      throw new Error(data.error || data.details || "Invalid server response");
    }
    return { briefId: data.data.id };
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        "Unable to reach the server. Check your connection and that the API is running.",
      );
    }
    throw err;
  }
}
