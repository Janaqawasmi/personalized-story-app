import { API_BASE, getAuthHeaders } from "./api";
import type { PrintOrderStatus, PurchaseFormat } from "../types/commerce";

export interface AdminPrintOrderItem {
  purchaseId: string;
  caregiverUid: string;
  buyerEmail: string | null;
  storyTitle: string;
  templateId: string;
  itemType: "template" | "personalized";
  childName: string;
  purchaseFormat: PurchaseFormat;
  paymentStatus: string;
  printOrderStatus: PrintOrderStatus;
  shippingAddress: string | null;
  phoneNumber: string | null;
  deliveryNotes: string | null;
  needsAdminFollowUp: boolean;
  createdAt: string | null;
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
