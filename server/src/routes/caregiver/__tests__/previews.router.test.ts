/** @jest-environment node */

/**
 * Unit tests for isPreviewVisibleInMyPreviews() — the filter behind
 * GET /api/caregiver/previews ("My previews" tab).
 *
 * Regression coverage for cart/payment flow Bug 3: a preview that has been
 * purchased must disappear from "My previews" (it now belongs in
 * "Purchased"), while a preview merely sitting in the cart must stay visible
 * so the client can label it "In cart" instead of hiding it.
 */

// previews.router.ts (transitively, via preview.service/middleware) imports
// the Firebase Admin config module, which throws outside a real environment
// unless a service account is configured. Stub it so importing the router
// module (to reach the exported pure predicate) is side-effect free.
jest.mock("@/config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  db: {},
}));

import { isPreviewVisibleInMyPreviews } from "../previews.router";

describe("isPreviewVisibleInMyPreviews", () => {
  it("shows a freshly generated preview", () => {
    expect(isPreviewVisibleInMyPreviews("ready")).toBe(true);
  });

  it("shows a preview that is in the cart (not yet paid)", () => {
    expect(isPreviewVisibleInMyPreviews("added_to_cart")).toBe(true);
  });

  it("shows a preview mid-checkout (payment not yet confirmed)", () => {
    expect(isPreviewVisibleInMyPreviews("checkout_pending")).toBe(true);
  });

  it("hides a preview once it has been purchased", () => {
    expect(isPreviewVisibleInMyPreviews("purchased")).toBe(false);
  });

  it("hides an expired preview", () => {
    expect(isPreviewVisibleInMyPreviews("expired")).toBe(false);
  });

  it("hides a converted (legacy) preview", () => {
    expect(isPreviewVisibleInMyPreviews("converted")).toBe(false);
  });

  it("defaults to visible for an unknown/missing status", () => {
    expect(isPreviewVisibleInMyPreviews(undefined)).toBe(true);
  });
});
