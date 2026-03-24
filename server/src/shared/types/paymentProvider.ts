export interface PaymentProvider {
  readonly providerId: string;

  createCheckoutSession(params: {
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
  }): Promise<CheckoutSessionResult>;

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  refund(params: {
    chargeId: string;
    amountCents?: number;
    reason?: string;
  }): Promise<RefundResult>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  paymentIntentId: string;
}

export interface RefundResult {
  refundId: string;
  status: "succeeded" | "pending" | "failed";
  amountCents: number;
}
