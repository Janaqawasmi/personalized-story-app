import { API_BASE, getAuthHeaders } from "./api";

const BASE = `${API_BASE}/api/specialist/templates`;

export interface TextVariantDoc {
  pageNumber: number;
  originalText: string;
  masculine: string;
  feminine: string;
  reviewStatus: "pending" | "approved";
  generatedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface TextVariantsResponse {
  templateExists: boolean;
  textVariantStatus: "none" | "generating" | string;
  personalizationEnabled: boolean;
  /** True once generateTextVariants() has completed successfully — display-only. */
  textPersonalizationReady: boolean;
  variants: TextVariantDoc[];
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
  throw new Error(body.message || body.error || `Request failed (${res.status})`);
}

export async function getTextVariants(templateId: string): Promise<TextVariantsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${encodeURIComponent(templateId)}/text-variants`, { headers });
  await throwIfNotOk(res);
  return res.json() as Promise<TextVariantsResponse>;
}

/**
 * Triggers (or retries) LLM text-variant generation for a template. Validates
 * and merges the results into pages[].textTemplate and flips
 * textPersonalizationReady server-side — no follow-up approval call needed.
 */
export async function generateTextVariants(templateId: string): Promise<TextVariantsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${encodeURIComponent(templateId)}/text-variants/generate`, {
    method: "POST",
    headers,
  });
  await throwIfNotOk(res);
  return res.json() as Promise<TextVariantsResponse>;
}
