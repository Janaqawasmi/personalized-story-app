/** @jest-environment node */

/**
 * Unit tests for priceAndValidateCheckoutItem() — the checkout-time re-check
 * that a print cart item actually has valid shipping details before a
 * pending purchase/payment session is ever created.
 *
 * Root cause this guards against: cart.router.ts already validates
 * shippingDetails when a print item is *added* to the cart, but that's an
 * add-time UX check, not a security boundary — Firestore rules allow the
 * owning buyer to write directly to their own cart subcollection, bypassing
 * the REST API entirely. Checkout is the point that actually creates a
 * pending Purchase, so it must never trust the cart item's shippingDetails
 * without re-validating.
 */

jest.mock("@/config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  db: {},
}));

import { priceAndValidateCheckoutItem } from "../checkout.router";
import type { CartItem } from "@/shared/types/cartItem";

const VALID_SHIPPING = {
  fullName: "Noa Cohen",
  phoneNumber: "050-1234567",
  city: "Tel Aviv",
  streetAddress: "Herzl 1",
};

function baseTemplateData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    priceCents: 2999,
    currency: "ILS",
    printAvailable: true,
    printPriceCents: 5999,
    ...overrides,
  };
}

function digitalCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "cart-1",
    caregiverUid: "caregiver-1",
    previewId: "preview-1",
    templateId: "template-1",
    templateTitle: "A Story",
    childFirstName: "",
    coverImageUrl: null,
    purchaseFormat: "digital",
    priceCents: 2999,
    currency: "ILS",
    language: "he",
    addedAt: "MOCK_TIMESTAMP" as never,
    ...overrides,
  };
}

function printCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return digitalCartItem({
    purchaseFormat: "print",
    shippingDetails: { ...VALID_SHIPPING },
    ...overrides,
  });
}

describe("priceAndValidateCheckoutItem", () => {
  it("succeeds for a digital item with no shippingDetails at all", () => {
    const result = priceAndValidateCheckoutItem(digitalCartItem(), baseTemplateData());

    expect(result).toEqual({
      valid: true,
      purchaseFormat: "digital",
      priceCents: 2999,
      currency: "ILS",
    });
  });

  it("succeeds for a print item with valid shippingDetails", () => {
    const result = priceAndValidateCheckoutItem(printCartItem(), baseTemplateData());

    expect(result).toEqual({
      valid: true,
      purchaseFormat: "print",
      priceCents: 5999,
      currency: "ILS",
    });
  });

  it("fails with a clear reason when a print item has no shippingDetails at all", () => {
    // Simulates a cart item written without shippingDetails (e.g. bypassing
    // cart.router.ts's add-time validation) rather than an explicit undefined.
    const result = priceAndValidateCheckoutItem(
      digitalCartItem({ purchaseFormat: "print" }),
      baseTemplateData(),
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/shipping details are invalid/i);
  });

  it("fails when a print item's shippingDetails is missing required fields", () => {
    const result = priceAndValidateCheckoutItem(
      printCartItem({ shippingDetails: { fullName: "", phoneNumber: "", city: "", streetAddress: "" } }),
      baseTemplateData(),
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/shipping details are invalid/i);
  });

  it("fails when a print item's shippingDetails has an invalid phone number", () => {
    const result = priceAndValidateCheckoutItem(
      printCartItem({ shippingDetails: { ...VALID_SHIPPING, phoneNumber: "abc" } }),
      baseTemplateData(),
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/shipping details are invalid/i);
  });

  it("does not validate or require shippingDetails for a digital item, even if the cart item happens to carry a (stale) value", () => {
    const result = priceAndValidateCheckoutItem(
      digitalCartItem({ shippingDetails: { fullName: "", phoneNumber: "", city: "", streetAddress: "" } }),
      baseTemplateData(),
    );

    expect(result.valid).toBe(true);
  });

  it("fails when the template no longer exists", () => {
    const result = priceAndValidateCheckoutItem(digitalCartItem(), null);

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/no longer available/i);
  });

  it("fails when print is requested but the template has print unavailable", () => {
    const result = priceAndValidateCheckoutItem(
      printCartItem(),
      baseTemplateData({ printAvailable: false, printPriceCents: null }),
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/print version is no longer available/i);
  });
});
