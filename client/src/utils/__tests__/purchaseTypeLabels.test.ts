import {
  getPurchaseTypeLabelKey,
  getPrintOrderStatusLabelKey,
  getPurchaseFormatLabelKey,
} from "../purchaseOptions";

describe("getPurchaseFormatLabelKey", () => {
  it("maps digital to the localized digital label key", () => {
    expect(getPurchaseFormatLabelKey("digital")).toEqual({
      key: "pages.purchaseFormat.digitalLabel",
    });
  });

  it("maps print to the localized print label key", () => {
    expect(getPurchaseFormatLabelKey("print")).toEqual({
      key: "pages.purchaseFormat.printLabel",
    });
  });
});

describe("getPurchaseTypeLabelKey", () => {
  it("labels a digital personalized purchase", () => {
    expect(getPurchaseTypeLabelKey("digital", "personalized", "Noa")).toEqual({
      key: "pages.myStories.purchased.type.digitalPersonalized",
    });
  });

  it("labels a digital original (template) purchase", () => {
    expect(getPurchaseTypeLabelKey("digital", "template", "")).toEqual({
      key: "pages.myStories.purchased.type.digitalOriginal",
    });
  });

  it("labels a print personalized purchase", () => {
    expect(getPurchaseTypeLabelKey("print", "personalized", "Noa")).toEqual({
      key: "pages.myStories.purchased.type.printPersonalized",
    });
  });

  it("labels a print original (template) purchase", () => {
    expect(getPurchaseTypeLabelKey("print", "template", "")).toEqual({
      key: "pages.myStories.purchased.type.printOriginal",
    });
  });

  it("defaults to digital when purchaseFormat is missing", () => {
    expect(getPurchaseTypeLabelKey(undefined, "personalized", "Noa")).toEqual({
      key: "pages.myStories.purchased.type.digitalPersonalized",
    });
  });

  it("falls back to childFirstName presence when itemType is absent (legacy records)", () => {
    expect(getPurchaseTypeLabelKey("digital", undefined, "Noa")).toEqual({
      key: "pages.myStories.purchased.type.digitalPersonalized",
    });
    expect(getPurchaseTypeLabelKey("digital", undefined, "")).toEqual({
      key: "pages.myStories.purchased.type.digitalOriginal",
    });
    expect(getPurchaseTypeLabelKey("digital", undefined, null)).toEqual({
      key: "pages.myStories.purchased.type.digitalOriginal",
    });
  });

  it("itemType takes precedence over childFirstName when both are present", () => {
    // Defensive: an inconsistent record (itemType says template but a name
    // slipped in) should still trust the explicit itemType field.
    expect(getPurchaseTypeLabelKey("digital", "template", "Noa")).toEqual({
      key: "pages.myStories.purchased.type.digitalOriginal",
    });
  });
});

describe("getPrintOrderStatusLabelKey", () => {
  it.each([
    "order_received",
    "in_preparation",
    "ready",
    "shipped",
    "completed",
    "cancelled",
  ] as const)("maps known status '%s' to its own translation key", (status) => {
    expect(getPrintOrderStatusLabelKey(status)).toEqual({
      key: `pages.myStories.purchased.printStatus.${status}`,
    });
  });

  it("defaults to order_received for a missing status", () => {
    expect(getPrintOrderStatusLabelKey(null)).toEqual({
      key: "pages.myStories.purchased.printStatus.order_received",
    });
    expect(getPrintOrderStatusLabelKey(undefined)).toEqual({
      key: "pages.myStories.purchased.printStatus.order_received",
    });
  });

  it("defaults to order_received for an unrecognized status string", () => {
    expect(getPrintOrderStatusLabelKey("some_future_status" as never)).toEqual({
      key: "pages.myStories.purchased.printStatus.order_received",
    });
  });
});
