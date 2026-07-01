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
  textVariantStatus: "none" | "generating" | "pending_review" | string;
  personalizationEnabled: boolean;
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

export async function generateTextVariants(templateId: string): Promise<TextVariantsResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE}/${encodeURIComponent(templateId)}/text-variants/generate`, {
    method: "POST",
    headers,
  });
  await throwIfNotOk(res);
  return res.json() as Promise<TextVariantsResponse>;
}

export async function updateTextVariant(
  templateId: string,
  pageNumber: number,
  patch: { masculine?: string; feminine?: string },
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(templateId)}/text-variants/${pageNumber}`,
    { method: "PATCH", headers, body: JSON.stringify(patch) },
  );
  await throwIfNotOk(res);
}

export async function approveTextVariant(
  templateId: string,
  pageNumber: number,
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(templateId)}/text-variants/${pageNumber}/approve`,
    { method: "POST", headers },
  );
  await throwIfNotOk(res);
}

export async function finalizeTextVariants(templateId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE}/${encodeURIComponent(templateId)}/text-variants/finalize`,
    { method: "POST", headers },
  );
  await throwIfNotOk(res);
}
