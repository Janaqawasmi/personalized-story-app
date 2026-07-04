export type PurchaseFormat = "digital" | "print";

export type PrintOrderStatus =
  | "paid_pending_preparation"
  | "preparing_file"
  | "sent_to_print"
  | "printed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface PrintOrder {
  status: PrintOrderStatus;
  needsAdminFollowUp: boolean;
  shippingAddress: string | null;
  phoneNumber: string | null;
  deliveryNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
