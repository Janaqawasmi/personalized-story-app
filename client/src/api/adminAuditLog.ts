import { API_BASE, getAuthHeaders } from "./api";

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  actor: { uid: string; email: string; displayName: string; role: string };
  resourceType: string;
  resourceId: string;
  relatedResourceId: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string | null;
}

export interface AdminAuditLogPage {
  items: AdminAuditLogEntry[];
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

export async function listAdminAuditLog(params: {
  cursor?: string | null;
  action?: string;
  limit?: number;
}): Promise<AdminAuditLogPage> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.action) query.set("action", params.action);
  query.set("limit", String(params.limit ?? 50));

  const res = await fetch(`${API_BASE}/api/admin/audit-log?${query.toString()}`, { headers });
  return handleAdminResponse<AdminAuditLogPage>(res);
}
