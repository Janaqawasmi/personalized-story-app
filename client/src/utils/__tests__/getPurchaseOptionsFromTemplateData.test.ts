import { getPurchaseOptionsFromTemplateData } from "../purchaseOptions";

/**
 * Regression coverage for the "Coming soon" bug: two consumers (BookReaderPage
 * and PersonalizeStoryPage) spread this function's return value into a
 * differently-named local type (priceDigital/pricePrint instead of
 * digitalPrice/printPrice), so the real prices were silently dropped even
 * though this function resolved them correctly. This suite locks down the
 * exact field names so any future misuse is caught at the source of truth,
 * not just in the two page components (now fixed to map fields explicitly
 * instead of spreading).
 */
describe("getPurchaseOptionsFromTemplateData", () => {
  it("returns digitalPrice/printPrice/currency/printAvailable — not priceDigital/pricePrint", () => {
    const result = getPurchaseOptionsFromTemplateData({
      priceCents: 2999,
      printPriceCents: 5999,
      currency: "ILS",
      printAvailable: true,
    });

    expect(result).toEqual({
      currency: "ILS",
      digitalPrice: 29.99,
      printPrice: 59.99,
      printAvailable: true,
    });
    expect(result).not.toHaveProperty("priceDigital");
    expect(result).not.toHaveProperty("pricePrint");
  });

  it("resolves the exact backfilled template shape correctly", () => {
    // Matches the fields server/scripts/backfillTemplatePricing.ts writes.
    const result = getPurchaseOptionsFromTemplateData({
      priceCents: 2999,
      currency: "ILS",
      printPriceCents: 5999,
      printAvailable: true,
    });

    expect(result.digitalPrice).toBe(29.99);
    expect(result.printPrice).toBe(59.99);
    expect(result.printAvailable).toBe(true);
  });

  it("falls back to the default digital price and disables print when fields are missing", () => {
    const result = getPurchaseOptionsFromTemplateData({});

    expect(result.digitalPrice).toBe(29.99);
    expect(result.printPrice).toBeUndefined();
    expect(result.printAvailable).toBe(false);
    expect(result.currency).toBe("ILS");
  });

  it("disables print when printAvailable is true but printPriceCents is missing", () => {
    const result = getPurchaseOptionsFromTemplateData({ printAvailable: true });

    expect(result.printAvailable).toBe(false);
    expect(result.printPrice).toBeUndefined();
  });

  it("handles null/undefined template data without throwing", () => {
    expect(() => getPurchaseOptionsFromTemplateData(null)).not.toThrow();
    expect(() => getPurchaseOptionsFromTemplateData(undefined)).not.toThrow();
  });
});
