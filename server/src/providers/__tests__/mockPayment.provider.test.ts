/** @jest-environment node */

/**
 * Unit tests for the sandbox-only MockPaymentProvider — the stand-in
 * registered at server startup until a real gateway (e.g. Stripe) is wired
 * in. Covers exactly what checkout.router.ts relies on: session creation
 * shape, and signature verification behaving like a real provider's would
 * (reject missing/tampered/wrong signatures, accept a correctly signed one).
 */

import { MockPaymentProvider, signMockPayload } from "../mockPayment.provider";

describe("MockPaymentProvider", () => {
  const provider = new MockPaymentProvider();

  const baseParams = {
    customerId: null,
    customerEmail: "caregiver@example.com",
    lineItems: [
      {
        name: "Test Story",
        amountCents: 2999,
        currency: "ILS",
        quantity: 1,
      },
    ],
    successUrl: "http://localhost:3000/checkout/success?session_id={SESSION_ID}",
    cancelUrl: "http://localhost:3000/checkout/cancel",
  };

  it("has a stable providerId used to gate the mock-simulate route", () => {
    expect(provider.providerId).toBe("mock");
  });

  it("creates a checkout session with a session id, intent id, and matching checkout URL", async () => {
    const session = await provider.createCheckoutSession(baseParams);

    expect(session.sessionId).toMatch(/^mock_sess_/);
    expect(session.paymentIntentId).toMatch(/^mock_pi_/);
    expect(session.checkoutUrl).toContain("/checkout/mock?session_id=");
    expect(session.checkoutUrl).toContain(session.sessionId);
  });

  it("generates a unique session id per call", async () => {
    const a = await provider.createCheckoutSession(baseParams);
    const b = await provider.createCheckoutSession(baseParams);
    expect(a.sessionId).not.toBe(b.sessionId);
  });

  describe("verifyWebhookSignature", () => {
    it("accepts a correctly signed payload", () => {
      const payload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_abc" } });
      const signature = signMockPayload(payload);

      expect(provider.verifyWebhookSignature(payload, signature)).toBe(true);
    });

    it("rejects a payload whose body was tampered with after signing", () => {
      const originalPayload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_abc" } });
      const signature = signMockPayload(originalPayload);
      const tamperedPayload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_evil" } });

      expect(provider.verifyWebhookSignature(tamperedPayload, signature)).toBe(false);
    });

    it("rejects an empty signature", () => {
      const payload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_abc" } });
      expect(provider.verifyWebhookSignature(payload, "")).toBe(false);
    });

    it("rejects a garbage signature of the wrong length", () => {
      const payload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_abc" } });
      expect(provider.verifyWebhookSignature(payload, "not-a-real-signature")).toBe(false);
    });

    it("rejects a well-formed but incorrect signature", () => {
      const payload = JSON.stringify({ type: "checkout.completed", data: { sessionId: "mock_sess_abc" } });
      const wrongSignature = signMockPayload("some other payload entirely");
      expect(provider.verifyWebhookSignature(payload, wrongSignature)).toBe(false);
    });
  });

  describe("refund", () => {
    it("returns a succeeded refund result echoing the requested amount", async () => {
      const result = await provider.refund({ chargeId: "mock_ch_123", amountCents: 1500 });
      expect(result.status).toBe("succeeded");
      expect(result.amountCents).toBe(1500);
      expect(result.refundId).toMatch(/^mock_refund_/);
    });
  });
});
