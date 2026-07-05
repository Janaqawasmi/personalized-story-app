import { API_BASE, getAuthHeaders } from "./api";
import type { PrintOrderStatus, PurchaseFormat, ShippingDetails } from "../types/commerce";

export interface AdminPrintOrderItem {
  purchaseId: string;
  caregiverUid: string;
  buyerName: string | null;
  buyerEmail: string | null;
  storyTitle: string;
  templateId: string;
  previewId: string;
  personalizedStoryId: string | null;
  itemType: "template" | "personalized";
  childName: string;
  purchaseFormat: PurchaseFormat;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  printOrderStatus: PrintOrderStatus;
  shippingDetails: ShippingDetails | null;
  purchasedAt: string | null;
  createdAt: string | null;
}

export interface AdminPrintOrderStoryContent {
  source: "personalized" | "template";
  title: string;
  childName: string | null;
  coverImageUrl: string | null;
  pages: Array<{ pageNumber: number; text: string; imageUrl: string | null }>;
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

export async function listAdminPrintOrders(): Promise<AdminPrintOrderItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/print-orders`, { headers });
  return handleAdminResponse<AdminPrintOrderItem[]>(res);
}

export async function updateAdminPrintOrderStatus(input: {
  caregiverUid: string;
  purchaseId: string;
  status: PrintOrderStatus;
}): Promise<{ caregiverUid: string; purchaseId: string; status: PrintOrderStatus }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/api/admin/print-orders/${encodeURIComponent(input.caregiverUid)}/${encodeURIComponent(input.purchaseId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: input.status }),
    },
  );
  return handleAdminResponse<{ caregiverUid: string; purchaseId: string; status: PrintOrderStatus }>(res);
}

/**
 * Fetches the exact story content (personalized final story, or original
 * template) for a print order, so admin never has to guess which content to
 * prepare for printing.
 */
export async function fetchAdminPrintOrderStoryContent(input: {
  caregiverUid: string;
  purchaseId: string;
}): Promise<AdminPrintOrderStoryContent> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/api/admin/print-orders/${encodeURIComponent(input.caregiverUid)}/${encodeURIComponent(input.purchaseId)}/content`,
    { headers },
  );
  return handleAdminResponse<AdminPrintOrderStoryContent>(res);
}
