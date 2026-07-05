import { PurchaseFormat } from "../shared/types/commerce";

export const DEFAULT_DIGITAL_PRICE_CENTS = 2999;
export const DEFAULT_CURRENCY = "ILS";

export class PurchasePricingError extends Error {
  code: "INVALID_FORMAT" | "PRINT_NOT_AVAILABLE";

  constructor(code: PurchasePricingError["code"], message: string) {
    super(message);
    this.name = "PurchasePricingError";
    this.code = code;
  }
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isPrintPurchaseAvailable(
  templateData: Record<string, unknown> | null | undefined,
): boolean {
  if (!templateData || templateData.printAvailable !== true) {
    return false;
  }

  return toFiniteNumber(templateData.printPriceCents) !== null;
}

export function normalizePurchaseFormat(value: unknown): PurchaseFormat | null {
  return value === "digital" || value === "print" ? value : null;
}

export function resolveTemplatePurchasePricing(
  templateData: Record<string, unknown> | null | undefined,
  purchaseFormat: PurchaseFormat,
): { purchaseFormat: PurchaseFormat; priceCents: number; currency: string } {
  if (purchaseFormat !== "digital" && purchaseFormat !== "print") {
    throw new PurchasePricingError("INVALID_FORMAT", "Invalid purchase format.");
  }

  const currency =
    typeof templateData?.currency === "string" && templateData.currency.trim()
      ? templateData.currency
      : DEFAULT_CURRENCY;

  if (purchaseFormat === "digital") {
    return {
      purchaseFormat,
      priceCents: toFiniteNumber(templateData?.priceCents) ?? DEFAULT_DIGITAL_PRICE_CENTS,
      currency,
    };
  }

  if (!isPrintPurchaseAvailable(templateData)) {
    throw new PurchasePricingError(
      "PRINT_NOT_AVAILABLE",
      "Print version is not available for this story.",
    );
  }

  return {
    purchaseFormat,
    priceCents: toFiniteNumber(templateData?.printPriceCents) ?? 0,
    currency,
  };
}
