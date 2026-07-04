import { randomUUID } from "crypto";
import crypto from "crypto";
import {
  PaymentProvider,
  CheckoutSessionResult,
  RefundResult,
} from "../shared/types/paymentProvider";

const MOCK_WEBHOOK_SECRET =
  process.env.MOCK_PAYMENT_WEBHOOK_SECRET || "dev-mock-payment-secret";

function sign(payload: string): string {
  return crypto.createHmac("sha256", MOCK_WEBHOOK_SECRET).update(payload).digest("hex");
}

/**
 * Signs a webhook event the same way MockPaymentProvider.verifyWebhookSignature
 * expects. Exported for tests that need to hit POST /webhook directly.
 */
export function signMockPayload(payload: string): string {
  return sign(payload);
}

/**
 * Sandbox-only PaymentProvider. No real gateway, no real money, no external
 * network calls. "Payment" is confirmed via POST /api/caregiver/checkout/mock-simulate,
 * an authenticated route that only exists while this provider is registered.
 *
 * Replace with a real provider (e.g. Stripe) before accepting real payments —
 * see server/src/shared/types/paymentProvider.ts for the contract.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly providerId = "mock";

  async createCheckoutSession(params: {
    customerId: string | null;
    customerEmail: string;
    lineItems: Array<{
      name: string;
      description?: string;
      amountCents: number;
      currency: string;
      quantity: number;
      metadata?: Record<string, string>;
    }>;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sess_${randomUUID()}`;
    const paymentIntentId = `mock_pi_${randomUUID()}`;
    const frontendUrl = process.env.FRONTEND_URL || "https://app.example.com";
    const checkoutUrl = `${frontendUrl}/checkout/mock?session_id=${sessionId}`;

    return { sessionId, checkoutUrl, paymentIntentId };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!signature) return false;
    const body = typeof payload === "string" ? payload : payload.toString("utf8");
    const expected = sign(body);

    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  async refund(params: {
    chargeId: string;
    amountCents?: number;
    reason?: string;
  }): Promise<RefundResult> {
    return {
      refundId: `mock_refund_${randomUUID()}`,
      status: "succeeded",
      amountCents: params.amountCents ?? 0,
    };
  }
}
