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
 */

type DocData = Record<string, unknown>;

const previewUpdates: Array<{ previewId: string; data: DocData }> = [];
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
    previewId: "preview-1",
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  purchaseDocsFixture = [];
  previewUpdates.length = 0;
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
            status: "paid_pending_preparation",
            needsAdminFollowUp: true,
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
    });

    it("processes each matching purchase independently when a session covers multiple items", async () => {
      const paidAlready = makePurchaseDoc(
        "purchase-1",
        pendingPurchase({ purchaseId: "purchase-1", previewId: "preview-1", status: "paid" })
      );
      const stillPending = makePurchaseDoc(
        "purchase-2",
        pendingPurchase({ purchaseId: "purchase-2", previewId: "preview-2" })
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
