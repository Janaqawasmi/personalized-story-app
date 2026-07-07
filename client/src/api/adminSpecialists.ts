import { API_BASE, getAuthHeaders } from "./api";

export interface AdminSpecialistListItem {
  id: string;
  displayName: string;
  email: string | null;
  storyCount: number;
  totalPurchases: number;
  avgRating: number | null;
  status: "active" | "disabled";
  joinedAt: string | null;
  /** false for synthetic/legacy ids (e.g. "system_specialist") with no real Firebase Auth account — not clickable/disable-able. */
  isRealAccount: boolean;
}

export interface AdminSpecialistStory {
  id: string;
  title: string;
  status: string;
  ageGroup: string | null;
  primaryTopic: string;
  language: string | null;
  purchaseCount: number;
  avgRating: number | null;
  reviewCount: number;
  publishedAt: string | null;
  approvedAt: string | null;
}

export interface AdminSpecialistDetail {
  specialist: {
    id: string;
    displayName: string;
    email: string | null;
    status: "active" | "disabled";
    joinedAt: string | null;
    isRealAccount: boolean;
  };
  stats: {
    storyCount: number;
    totalPurchases: number;
    avgRating: number | null;
  };
  stories: AdminSpecialistStory[];
}

async function handleAdminResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message?: string } | string;
  };

  if (!res.ok || !data.success) {
    const message =
      (typeof data.error === "object" && data.error?.message) ||
      (typeof data.error === "string" && data.error) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data.data as T;
}

export async function listAdminSpecialists(): Promise<AdminSpecialistListItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/specialists`, { headers });
  return handleAdminResponse<AdminSpecialistListItem[]>(res);
}

export async function getAdminSpecialist(specialistId: string): Promise<AdminSpecialistDetail> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/specialists/${encodeURIComponent(specialistId)}`, {
    headers,
  });
  return handleAdminResponse<AdminSpecialistDetail>(res);
}

export async function setAdminSpecialistDisabled(
  specialistId: string,
  disabled: boolean,
): Promise<{ id: string; disabled: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/specialists/${encodeURIComponent(specialistId)}/disabled`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ disabled }),
  });
  return handleAdminResponse<{ id: string; disabled: boolean }>(res);
}
