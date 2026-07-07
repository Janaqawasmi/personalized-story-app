import { API_BASE, getAuthHeaders } from "./api";

export interface AdminAiStats {
  totalGenerations: number;
  avgLatencyMs: number;
  avgLlmCallsPerStory: number;
  avgReruns: number;
  stuckGenerating: number;
  failureRatePct: number;
  exampleBankBreakdown: Record<string, number>;
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

export async function getAdminAiStats(): Promise<AdminAiStats> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/ai/stats`, { headers });
  return handleAdminResponse<AdminAiStats>(res);
}
