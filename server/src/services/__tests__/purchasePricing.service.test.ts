import {
  PurchasePricingError,
  resolveTemplatePurchasePricing,
} from "../purchasePricing.service";

describe("resolveTemplatePurchasePricing", () => {
  it("uses priceCents for digital purchases", () => {
    expect(
      resolveTemplatePurchasePricing(
        { priceCents: 3499, printAvailable: true, printPriceCents: 5999, currency: "ILS" },
        "digital",
      ),
    ).toEqual({
      purchaseFormat: "digital",
      priceCents: 3499,
      currency: "ILS",
    });
  });

  it("uses printPriceCents for print purchases", () => {
    expect(
      resolveTemplatePurchasePricing(
        { priceCents: 3499, printAvailable: true, printPriceCents: 5999, currency: "ILS" },
        "print",
      ),
    ).toEqual({
      purchaseFormat: "print",
      priceCents: 5999,
      currency: "ILS",
    });
  });

  it("rejects print purchases when print is unavailable", () => {
    expect(() =>
      resolveTemplatePurchasePricing(
        { priceCents: 3499, printAvailable: false, currency: "ILS" },
        "print",
      ),
    ).toThrow(PurchasePricingError);
  });
});
