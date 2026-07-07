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
    purchaseCount: number;
    freePreviewUsed: boolean;
    createdAt: string | null;
  };
  purchases: AdminUserPurchase[];
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
