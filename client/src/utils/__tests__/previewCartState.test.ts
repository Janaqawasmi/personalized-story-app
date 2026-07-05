import { getPreviewCartState } from "../previewCartState";

describe("getPreviewCartState", () => {
  it("treats a freshly generated preview as available to add", () => {
    expect(getPreviewCartState("ready")).toBe("available");
  });

  it("labels a preview already added to the cart as in_cart", () => {
    expect(getPreviewCartState("added_to_cart")).toBe("in_cart");
  });

  it("never treats a purchased preview as in_cart (it should be hidden upstream instead)", () => {
    expect(getPreviewCartState("purchased")).toBe("available");
  });

  it("labels a preview mid-checkout as checkout_pending, not in_cart or available", () => {
    expect(getPreviewCartState("checkout_pending")).toBe("checkout_pending");
  });

  it("defaults to available for missing/undefined status", () => {
    expect(getPreviewCartState(undefined)).toBe("available");
    expect(getPreviewCartState(null)).toBe("available");
  });
});
