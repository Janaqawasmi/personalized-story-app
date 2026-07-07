import { API_BASE, getAuthHeaders } from "./api";

export interface PurchaseTimeseriesDay {
  date: string;
  count: number;
  revenueCents: number;
}

export interface PurchaseTimeseries {
  series: PurchaseTimeseriesDay[];
  totalRevenueCents: number;
  totalPaidPurchases: number;
  totalPurchaseAttempts: number;
  totalRefundedCents: number;
  totalRefundedPurchases: number;
  allTimeRevenueCents: number;
  allTimePaidPurchases: number;
  allTimeRefundedCents: number;
  allTimeRefundedPurchases: number;
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

export async function getPurchasesTimeseries(days = 30): Promise<PurchaseTimeseries> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/analytics/purchases-timeseries?days=${days}`, {
    headers,
  });
  return handleAdminResponse<PurchaseTimeseries>(res);
}
