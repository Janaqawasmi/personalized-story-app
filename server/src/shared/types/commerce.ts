export type PurchaseFormat = "digital" | "print";

/** Customer-facing print fulfillment states — no internal/admin jargon. */
export type PrintOrderStatus =
  | "order_received"
  | "in_preparation"
  | "ready"
  | "shipped"
  | "completed"
  | "cancelled";

export interface PrintOrder {
  status: PrintOrderStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Simple contact/address details collected before checkout for print
 * purchases only. Digital purchases never collect this.
 */
export interface ShippingDetails {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  streetAddress: string;
  buildingOrHouseNumber?: string;
  apartment?: string;
  postalCode?: string;
  deliveryNotes?: string;
}
