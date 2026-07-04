import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { PrintOrderStatus, PurchaseFormat } from "../types/commerce";

const DEFAULT_DIGITAL_BOOK_PRICE = 29.99;
const DEFAULT_BOOK_CURRENCY = "ILS";

export interface PurchaseOptionData {
  currency: string;
  digitalPrice?: number;
  printPrice?: number;
  printAvailable: boolean;
}

function readAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { current?: unknown }).current === "number" &&
    Number.isFinite((value as { current?: number }).current)
  ) {
    return (value as { current: number }).current;
  }
  return undefined;
}

function readAmountFromCents(value: unknown): number | undefined {
  const cents = readAmount(value);
  return typeof cents === "number" ? Number((cents / 100).toFixed(2)) : undefined;
}

export function getPurchaseOptionsFromTemplateData(
  data: Record<string, unknown> | null | undefined,
): PurchaseOptionData {
  const pricing = (data?.pricing as Record<string, unknown> | undefined) ?? undefined;

  const digitalPrice =
    readAmount(pricing?.digital) ??
    readAmount(pricing?.digitalPrice) ??
    readAmount(data?.price) ??
    readAmountFromCents(pricing?.priceCents) ??
    readAmountFromCents(data?.priceCents) ??
    DEFAULT_DIGITAL_BOOK_PRICE;

  const printPrice =
    readAmount(pricing?.print) ??
    readAmount(pricing?.printPrice) ??
    readAmountFromCents(pricing?.printPriceCents) ??
    readAmountFromCents(data?.printPriceCents);

  const printAvailable = data?.printAvailable === true && typeof printPrice === "number";

  return {
    currency:
      typeof data?.currency === "string"
        ? data.currency
        : typeof pricing?.currency === "string"
          ? pricing.currency
          : DEFAULT_BOOK_CURRENCY,
    digitalPrice,
    printPrice: printAvailable ? printPrice : undefined,
    printAvailable,
  };
}

export async function fetchPurchaseOptions(templateId: string): Promise<PurchaseOptionData> {
  const snapshot = await getDoc(doc(db, "story_templates", templateId));
  if (!snapshot.exists()) {
    throw new Error("Story template not found");
  }

  return getPurchaseOptionsFromTemplateData(snapshot.data() as Record<string, unknown>);
}

export function getPurchaseFormatLabel(format: PurchaseFormat): string {
  return format === "print" ? "Print" : "Digital";
}

export function getPrintOrderStatusLabel(status?: PrintOrderStatus | null): string {
  switch (status) {
    case "paid_pending_preparation":
      return "Print order received";
    case "preparing_file":
      return "Preparing for print";
    case "sent_to_print":
      return "Sent to print";
    case "printed":
      return "Printed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Print order received";
  }
}
