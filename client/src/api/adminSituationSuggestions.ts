import { API_BASE, getAuthHeaders } from "./api";

export interface AdminSituationSuggestion {
  templateId: string;
  title: string;
  slug: string;
  primaryTopic: string;
  labelHe: string;
  labelAr: string;
  labelEn: string;
  reason: string;
  createdBy: string;
  /** ms since epoch, or null if unavailable. */
  createdAt: number | null;
}

async function handleAdminResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: string;
  };

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data.data as T;
}

export async function listPendingSituationSuggestions(): Promise<AdminSituationSuggestion[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/situation-suggestions`, { headers });
  return handleAdminResponse<AdminSituationSuggestion[]>(res);
}

export async function approveSituationSuggestion(
  templateId: string,
  situationId: string,
): Promise<{ situationId: string; alreadyApproved: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/api/admin/situation-suggestions/${encodeURIComponent(templateId)}/approve`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ situationId }),
    },
  );
  return handleAdminResponse<{ situationId: string; alreadyApproved: boolean }>(res);
}

export async function rejectSituationSuggestion(
  templateId: string,
  note?: string,
): Promise<{ alreadyRejected: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/api/admin/situation-suggestions/${encodeURIComponent(templateId)}/reject`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ note: note?.trim() || undefined }),
    },
  );
  return handleAdminResponse<{ alreadyRejected: boolean }>(res);
}
