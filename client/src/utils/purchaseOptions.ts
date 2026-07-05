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

export function getPrintOrderStatusLabel(status?: PrintOrderStatus | null): string {
  switch (status) {
    case "order_received":
      return "Order received";
    case "in_preparation":
      return "In preparation";
    case "ready":
      return "Ready";
    case "shipped":
      return "Shipped";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Order received";
  }
}

export interface TranslationKeyResult {
  key: string;
  params?: Record<string, string>;
}

/**
 * Caregiver-facing (translated) "Digital"/"Print" label — e.g. for the cart
 * page's format line. Replaces the old hardcoded-English getPurchaseFormatLabel().
 */
export function getPurchaseFormatLabelKey(format: PurchaseFormat): TranslationKeyResult {
  return { key: format === "print" ? "pages.purchaseFormat.printLabel" : "pages.purchaseFormat.digitalLabel" };
}

/**
 * Caregiver-facing (translated) label combining purchase format + personalization
 * type for the "Purchased Stories" tab — e.g. "Digital personalized story" /
 * "Print original story". `itemType` is absent on records created before the
 * field existed, so falls back to `childFirstName` presence (same rule as
 * getPreviewSubtitleKey).
 */
export function getPurchaseTypeLabelKey(
  purchaseFormat: PurchaseFormat | null | undefined,
  itemType: "template" | "personalized" | null | undefined,
  childFirstName: string | null | undefined,
): TranslationKeyResult {
  const format = purchaseFormat === "print" ? "print" : "digital";
  const personalized = itemType ? itemType === "personalized" : !!childFirstName?.trim();
  const variant = personalized ? "Personalized" : "Original";
  return { key: `pages.myStories.purchased.type.${format}${variant}` };
}

const KNOWN_PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "order_received",
  "in_preparation",
  "ready",
  "shipped",
  "completed",
  "cancelled",
];

/**
 * Caregiver-facing (translated) print-order status label for the "Purchased
 * Stories" tab. Distinct from getPrintOrderStatusLabel(), which returns
 * hardcoded English used by the admin dashboard. Deliberately customer-facing
 * only — never surfaces internal fulfillment/admin-follow-up wording.
 */
export function getPrintOrderStatusLabelKey(
  status?: PrintOrderStatus | null,
): TranslationKeyResult {
  const resolved =
    status && KNOWN_PRINT_ORDER_STATUSES.includes(status) ? status : "order_received";
  return { key: `pages.myStories.purchased.printStatus.${resolved}` };
}
