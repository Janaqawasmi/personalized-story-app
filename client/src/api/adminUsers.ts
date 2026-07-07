import { API_BASE, getAuthHeaders } from "./api";

export interface AdminUserPurchase {
  purchaseId: string;
  storyTitle: string;
  childName: string;
  itemType: "template" | "personalized";
  purchaseFormat: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string | null;
}

export interface AdminUserDetail {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    language: string | null;
    role: string;
    disabled: boolean;
    purchaseCount: number;
    freePreviewUsed: boolean;
    createdAt: string | null;
  };
  purchases: AdminUserPurchase[];
}

export interface AdminUserListItem {
  uid: string;
  email: string | null;
  displayName: string;
  role: string;
  disabled: boolean;
  purchaseCount: number;
  createdAt: string | null;
}

export interface AdminUserListPage {
  items: AdminUserListItem[];
  nextCursor: string | null;
  hasMore: boolean;
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

export async function getAdminUser(uid: string): Promise<AdminUserDetail> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(uid)}`, { headers });
  return handleAdminResponse<AdminUserDetail>(res);
}

export async function listAdminUsers(params: {
  cursor?: string | null;
  search?: string;
  limit?: number;
}): Promise<AdminUserListPage> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.search) query.set("search", params.search);
  query.set("limit", String(params.limit ?? 25));

  const res = await fetch(`${API_BASE}/api/admin/users?${query.toString()}`, { headers });
  return handleAdminResponse<AdminUserListPage>(res);
}

export async function setAdminUserDisabled(uid: string, disabled: boolean): Promise<{ uid: string; disabled: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(uid)}/disabled`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ disabled }),
  });
  return handleAdminResponse<{ uid: string; disabled: boolean }>(res);
}
