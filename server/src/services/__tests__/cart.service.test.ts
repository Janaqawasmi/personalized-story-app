/** @jest-environment node */

/**
 * Unit tests for validateCartItems() — the gate between "items in cart" and
 * "checkout may create a purchase". Each test isolates one rejection reason
 * so a future regression points straight at the broken check.
 */

type DocData = Record<string, unknown>;

const CAREGIVER_UID = "test-caregiver-uid";

let cartItemsFixture: DocData[] = [];
let purchasesFixture: DocData[] = [];
let previewsFixture: Record<string, DocData | null> = {};
let templatesFixture: Record<string, DocData | null> = {};

function snap(data: DocData | null) {
  return { exists: data !== null && data !== undefined, data: () => data ?? {} };
}

jest.mock("@/config/firebase", () => ({
  db: {
    collection: jest.fn().mockImplementation((path: string) => {
      if (path === `caregivers/${CAREGIVER_UID}/cart`) {
        return {
          withConverter: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: cartItemsFixture.length === 0,
            docs: cartItemsFixture.map((item) => ({ data: () => item })),
          }),
        };
      }
      if (path === `caregivers/${CAREGIVER_UID}/purchases`) {
        return {
          get: jest.fn().mockResolvedValue({
            docs: purchasesFixture.map((p) => ({ data: () => p })),
          }),
        };
      }
      if (path === "storyPreviews") {
        return {
          doc: jest.fn().mockImplementation((id: string) => ({
            get: jest.fn().mockResolvedValue(snap(previewsFixture[id] ?? null)),
          })),
        };
      }
      if (path === "story_templates") {
        return {
          doc: jest.fn().mockImplementation((id: string) => ({
            get: jest.fn().mockResolvedValue(snap(templatesFixture[id] ?? null)),
          })),
        };
      }
      throw new Error(`Unexpected collection path in test: ${path}`);
    }),
  },
}));

import { validateCartItems } from "../cart.service";

function cartItem(overrides: Partial<DocData> = {}): DocData {
  return {
    cartItemId: "cart-1",
    caregiverUid: CAREGIVER_UID,
    previewId: "preview-1",
    templateId: "template-1",
    templateTitle: "Test Story",
    childFirstName: "Noa",
    coverImageUrl: null,
    purchaseFormat: "digital",
    priceCents: 2999,
    currency: "ILS",
    language: "he",
    ...overrides,
  };
}

function readyPreview(overrides: Partial<DocData> = {}): DocData {
  return { status: "ready", photoStatus: "uploaded", ...overrides };
}

function activeTemplate(overrides: Partial<DocData> = {}): DocData {
  return { isActive: true, isPublished: true, ...overrides };
}

beforeEach(() => {
  cartItemsFixture = [];
  purchasesFixture = [];
  previewsFixture = {};
  templatesFixture = {};
});

describe("validateCartItems", () => {
  it("returns all-empty results when the cart is empty", async () => {
    const result = await validateCartItems(CAREGIVER_UID);
    expect(result).toEqual({ readyToPay: [], photosNeeded: [], invalid: [] });
  });

  it("marks an item ready to pay when preview, template, and photo are all valid", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate();

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(1);
    expect(result.readyToPay[0]!.cartItemId).toBe("cart-1");
    expect(result.invalid).toHaveLength(0);
    expect(result.photosNeeded).toHaveLength(0);
  });

  it("refreshes a digital cart item's price from the current template price", async () => {
    cartItemsFixture = [cartItem({ priceCents: 2999 })];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate({ priceCents: 3499 });

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay[0]!.priceCents).toBe(3499);
  });

  it("rejects an item whose preview no longer exists", async () => {
    cartItemsFixture = [cartItem()];
    // previewsFixture left empty -> preview doc does not exist

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(0);
    expect(result.invalid).toEqual([
      { cartItemId: "cart-1", reason: "This preview is no longer available" },
    ]);
  });

  it.each(["expired", "converted"])(
    "rejects an item whose preview status is %s",
    async (status) => {
      cartItemsFixture = [cartItem()];
      previewsFixture["preview-1"] = readyPreview({ status });

      const result = await validateCartItems(CAREGIVER_UID);

      expect(result.invalid).toEqual([
        { cartItemId: "cart-1", reason: "This preview is no longer available" },
      ]);
    }
  );

  it("rejects an item whose template no longer exists", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview();
    // templatesFixture left empty -> template doc does not exist

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.invalid).toEqual([
      { cartItemId: "cart-1", reason: "This story is no longer available" },
    ]);
  });

  it("rejects an item whose template is unpublished or inactive", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate({ isPublished: false });

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.invalid).toEqual([
      { cartItemId: "cart-1", reason: "This story is no longer available" },
    ]);
  });

  it("rejects an item that was already purchased", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate();
    purchasesFixture = [{ previewId: "preview-1", status: "paid" }];

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.invalid).toEqual([{ cartItemId: "cart-1", reason: "Already purchased" }]);
  });

  it("does not treat a failed/refunded purchase as a duplicate", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate();
    purchasesFixture = [{ previewId: "preview-1", status: "failed" }];

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(1);
  });

  it("routes an item with a deleted/expired photo to photosNeeded, not invalid", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview({ photoStatus: "expired" });
    templatesFixture["template-1"] = activeTemplate();

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
    expect(result.photosNeeded).toEqual([{ previewId: "preview-1", childFirstName: "Noa" }]);
  });

  it("marks a fixed (non-personalizable 'Buy Story') item ready to pay with no photo at all", async () => {
    cartItemsFixture = [cartItem({ childFirstName: "" })];
    previewsFixture["preview-1"] = readyPreview({ kind: "fixed", photoStatus: "none" });
    templatesFixture["template-1"] = activeTemplate();

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(1);
    expect(result.readyToPay[0]!.cartItemId).toBe("cart-1");
    expect(result.photosNeeded).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it("keeps a print cart item ready when print pricing is available", async () => {
    cartItemsFixture = [cartItem({ purchaseFormat: "print", priceCents: 0 })];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate({
      printAvailable: true,
      printPriceCents: 5999,
    });

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(1);
    expect(result.readyToPay[0]!.purchaseFormat).toBe("print");
    expect(result.readyToPay[0]!.priceCents).toBe(5999);
  });

  it("rejects a print cart item when print is unavailable", async () => {
    cartItemsFixture = [cartItem({ purchaseFormat: "print" })];
    previewsFixture["preview-1"] = readyPreview();
    templatesFixture["template-1"] = activeTemplate({
      printAvailable: false,
      printPriceCents: 5999,
    });

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay).toHaveLength(0);
    expect(result.invalid).toEqual([
      { cartItemId: "cart-1", reason: "Print version is no longer available" },
    ]);
  });

  it("rejects an item with an unrecognized photo status", async () => {
    cartItemsFixture = [cartItem()];
    previewsFixture["preview-1"] = readyPreview({ photoStatus: "weird_status" });
    templatesFixture["template-1"] = activeTemplate();

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.invalid).toEqual([
      { cartItemId: "cart-1", reason: "Photo is in an unexpected status: weird_status" },
    ]);
  });

  it("evaluates multiple cart items independently", async () => {
    cartItemsFixture = [
      cartItem({ cartItemId: "cart-1", previewId: "preview-1", templateId: "template-1" }),
      cartItem({ cartItemId: "cart-2", previewId: "preview-2", templateId: "template-1" }),
    ];
    previewsFixture["preview-1"] = readyPreview();
    previewsFixture["preview-2"] = readyPreview({ status: "expired" });
    templatesFixture["template-1"] = activeTemplate();

    const result = await validateCartItems(CAREGIVER_UID);

    expect(result.readyToPay.map((i) => i.cartItemId)).toEqual(["cart-1"]);
    expect(result.invalid).toEqual([
      { cartItemId: "cart-2", reason: "This preview is no longer available" },
    ]);
  });
});
