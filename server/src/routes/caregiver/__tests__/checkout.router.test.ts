/** @jest-environment node */

/**
 * Unit tests for processPaymentEvent() — the logic shared by the real
 * payment-provider webhook and the sandbox mock-simulate route
 * (server/src/routes/caregiver/checkout.router.ts). This is where a
 * "successful payment" or "failed payment" callback actually gets applied
 * to a purchase, so it's the most safety-critical function in the checkout
 * flow: it must be idempotent (a webhook fired twice must not double-charge
 * effects or re-trigger story generation) and must only ever act on
 * purchases still in "pending" status.
 *
 * Both the real webhook route (POST /checkout/webhook) and the sandbox
 * mock-simulate route (POST /checkout/mock-simulate) call this exact
 * function with no divergence — so testing processPaymentEvent() here is
 * testing both paths' cleanup logic at once (cart/payment flow Bug 6).
 */

type DocData = Record<string, unknown>;

const previewUpdates: Array<{ previewId: string; data: DocData }> = [];
const cartItemDeletesById: Array<{ caregiverUid: string; cartItemId: string }> = [];
const cartItemDeletesByQuery: Array<{ caregiverUid: string; previewId: string }> = [];
/** previewId -> cart item ids to return from the previewId fallback query (legacy purchases only). */
let cartItemsByPreviewId: Record<string, string[]> = {};
let purchaseDocsFixture: Array<{ id: string; data: () => DocData; ref: { update: jest.Mock } }> = [];

jest.mock("@/config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  db: {
    collectionGroup: jest.fn().mockImplementation((name: string) => {
      if (name !== "purchases") throw new Error(`Unexpected collectionGroup: ${name}`);
      return {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockImplementation(() =>
            Promise.resolve({
              empty: purchaseDocsFixture.length === 0,
              docs: purchaseDocsFixture,
            })
          ),
        }),
      };
    }),
    collection: jest.fn().mockImplementation((path: string) => {
      if (path === "storyPreviews") {
        return {
          doc: jest.fn().mockImplementation((previewId: string) => ({
            update: jest.fn().mockImplementation((data: DocData) => {
              previewUpdates.push({ previewId, data });
              return Promise.resolve();
            }),
          })),
        };
      }

      const cartMatch = path.match(/^caregivers\/(.+)\/cart$/);
      if (cartMatch) {
        const caregiverUid = cartMatch[1]!;
        return {
          doc: jest.fn().mockImplementation((cartItemId: string) => ({
            delete: jest.fn().mockImplementation(() => {
              cartItemDeletesById.push({ caregiverUid, cartItemId });
              return Promise.resolve();
            }),
          })),
          where: jest.fn().mockImplementation((field: string, _op: string, value: string) => {
            if (field !== "previewId") throw new Error(`Unexpected cart query field: ${field}`);
            return {
              get: jest.fn().mockImplementation(() => {
                const ids = cartItemsByPreviewId[value] ?? [];
                return Promise.resolve({
                  docs: ids.map((cartItemId) => ({
                    ref: {
                      delete: jest.fn().mockImplementation(() => {
                        cartItemDeletesByQuery.push({ caregiverUid, previewId: value });
                        return Promise.resolve();
                      }),
                    },
                  })),
                });
              }),
            };
          }),
        };
      }

      throw new Error(`Unexpected collection path in test: ${path}`);
    }),
  },
}));

jest.mock("@/services/fullStoryGeneration.service", () => ({
  generateFullStory: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { generateFullStory } from "@/services/fullStoryGeneration.service";
import { processPaymentEvent } from "../checkout.router";

function makePurchaseDoc(id: string, data: DocData) {
  return { id, data: () => data, ref: { update: jest.fn().mockResolvedValue(undefined) } };
}

function pendingPurchase(overrides: Partial<DocData> = {}): DocData {
  return {
    purchaseId: "purchase-1",
    caregiverUid: "caregiver-1",
    previewId: "preview-1",
    cartItemId: "cart-item-1",
    purchaseFormat: "digital",
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  purchaseDocsFixture = [];
  previewUpdates.length = 0;
  cartItemDeletesById.length = 0;
  cartItemDeletesByQuery.length = 0;
  cartItemsByPreviewId = {};
});

describe("processPaymentEvent", () => {
  it("throws when the event has no sessionId", async () => {
    await expect(
      processPaymentEvent({ type: "checkout.completed", data: {} })
    ).rejects.toThrow(/sessionId/i);
  });

  it("no-ops when no purchase matches the session id", async () => {
    purchaseDocsFixture = [];

    await expect(
      processPaymentEvent({ type: "checkout.completed", data: { sessionId: "unknown_session" } })
    ).resolves.toBeUndefined();

    expect(generateFullStory).not.toHaveBeenCalled();
  });

  describe("checkout.completed / payment.success", () => {
    it("marks a pending purchase paid and triggers full story generation", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase());
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "checkout.completed",
        data: { sessionId: "mock_sess_1", chargeId: "mock_ch_1" },
      });

      expect(doc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "paid", paymentChargeId: "mock_ch_1" })
      );
      expect(generateFullStory).toHaveBeenCalledWith("purchase-1", "preview-1");
    });

    it("only moves the preview to 'purchased' once payment is confirmed (regression: was previously set at checkout initiation, before payment)", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase());
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "checkout.completed",
        data: { sessionId: "mock_sess_1", chargeId: "mock_ch_1" },
      });

      expect(previewUpdates).toEqual(
        expect.arrayContaining([
          {
            previewId: "preview-1",
            data: expect.objectContaining({ status: "purchased" }),
          },
        ])
      );
    });

    it("creates a print order for paid print purchases", async () => {
      const doc = makePurchaseDoc(
        "purchase-1",
        pendingPurchase({ purchaseFormat: "print", printOrder: null })
      );
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "checkout.completed",
        data: { sessionId: "mock_sess_1", chargeId: "mock_ch_1" },
      });

      expect(doc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "paid",
          printOrder: expect.objectContaining({
            status: "order_received",
          }),
        })
      );
      expect(generateFullStory).toHaveBeenCalledWith("purchase-1", "preview-1");
    });

    it("is idempotent: a purchase that is no longer pending is skipped", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase({ status: "paid" }));
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "checkout.completed",
        data: { sessionId: "mock_sess_1", chargeId: "mock_ch_1" },
      });

      expect(doc.ref.update).not.toHaveBeenCalled();
      expect(generateFullStory).not.toHaveBeenCalled();
      expect(previewUpdates).toHaveLength(0);
    });

    it("processes each matching purchase independently when a session covers multiple items", async () => {
      const paidAlready = makePurchaseDoc(
        "purchase-1",
        pendingPurchase({ purchaseId: "purchase-1", previewId: "preview-1", status: "paid" })
      );
      const stillPending = makePurchaseDoc(
        "purchase-2",
        pendingPurchase({ purchaseId: "purchase-2", previewId: "preview-2", cartItemId: "cart-item-2" })
      );
      purchaseDocsFixture = [paidAlready, stillPending];

      await processPaymentEvent({
        type: "checkout.completed",
        data: { sessionId: "mock_sess_1" },
      });

      expect(paidAlready.ref.update).not.toHaveBeenCalled();
      expect(stillPending.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "paid" })
      );
      expect(generateFullStory).toHaveBeenCalledTimes(1);
      expect(generateFullStory).toHaveBeenCalledWith("purchase-2", "preview-2");

      // Only the newly-confirmed purchase's preview should move to
      // "purchased"; the already-paid one must not be touched again.
      expect(previewUpdates).toEqual([
        {
          previewId: "preview-2",
          data: expect.objectContaining({ status: "purchased" }),
        },
      ]);
    });

    describe("cart cleanup (Bug 6: purchased item lingering in cart)", () => {
      it("removes the purchased item from the cart by cartItemId (digital)", async () => {
        const doc = makePurchaseDoc(
          "purchase-1",
          pendingPurchase({ purchaseFormat: "digital", cartItemId: "cart-item-1" })
        );
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toEqual([{ caregiverUid: "caregiver-1", cartItemId: "cart-item-1" }]);
        expect(cartItemDeletesByQuery).toHaveLength(0);
      });

      it("removes the purchased item from the cart by cartItemId (print)", async () => {
        const doc = makePurchaseDoc(
          "purchase-1",
          pendingPurchase({ purchaseFormat: "print", cartItemId: "cart-item-print-1" })
        );
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toEqual([
          { caregiverUid: "caregiver-1", cartItemId: "cart-item-print-1" },
        ]);
      });

      it("removes the cart item for a personalized purchase", async () => {
        const doc = makePurchaseDoc(
          "purchase-1",
          pendingPurchase({ childFirstName: "Noa", cartItemId: "cart-item-personalized" })
        );
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toEqual([
          { caregiverUid: "caregiver-1", cartItemId: "cart-item-personalized" },
        ]);
      });

      it("removes the cart item for a non-personalized (template) purchase", async () => {
        const doc = makePurchaseDoc(
          "purchase-1",
          pendingPurchase({ childFirstName: "", cartItemId: "cart-item-template" })
        );
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toEqual([
          { caregiverUid: "caregiver-1", cartItemId: "cart-item-template" },
        ]);
      });

      it("falls back to a previewId lookup for purchases created before cartItemId existed", async () => {
        cartItemsByPreviewId["preview-legacy"] = ["legacy-cart-item"];
        const doc = makePurchaseDoc(
          "purchase-1",
          pendingPurchase({ previewId: "preview-legacy", cartItemId: undefined })
        );
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toHaveLength(0);
        expect(cartItemDeletesByQuery).toEqual([
          { caregiverUid: "caregiver-1", previewId: "preview-legacy" },
        ]);
      });

      it("does not delete a cart item for an already-processed (non-pending) purchase", async () => {
        const doc = makePurchaseDoc("purchase-1", pendingPurchase({ status: "paid" }));
        purchaseDocsFixture = [doc];

        await processPaymentEvent({
          type: "checkout.completed",
          data: { sessionId: "mock_sess_1" },
        });

        expect(cartItemDeletesById).toHaveLength(0);
        expect(cartItemDeletesByQuery).toHaveLength(0);
      });
    });
  });

  describe("payment.failed", () => {
    it("marks a pending purchase failed and reverts the preview to ready", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase());
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "payment.failed",
        data: { sessionId: "mock_sess_1", failureReason: "card_declined" },
      });

      expect(doc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", failureReason: "card_declined" })
      );
      expect(previewUpdates).toEqual([
        {
          previewId: "preview-1",
          data: expect.objectContaining({ status: "ready", purchaseId: null }),
        },
      ]);
      expect(generateFullStory).not.toHaveBeenCalled();
    });

    it("keeps the cart item so the user can retry checkout (never deletes on failure)", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase());
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "payment.failed",
        data: { sessionId: "mock_sess_1", failureReason: "card_declined" },
      });

      expect(cartItemDeletesById).toHaveLength(0);
      expect(cartItemDeletesByQuery).toHaveLength(0);
    });

    it("is idempotent: a non-pending purchase is not reverted twice", async () => {
      const doc = makePurchaseDoc("purchase-1", pendingPurchase({ status: "failed" }));
      purchaseDocsFixture = [doc];

      await processPaymentEvent({
        type: "payment.failed",
        data: { sessionId: "mock_sess_1" },
      });

      expect(doc.ref.update).not.toHaveBeenCalled();
      expect(previewUpdates).toHaveLength(0);
    });
  });
});
