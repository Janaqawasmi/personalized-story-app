/**
 * Derives how the "My previews" tab should render a preview's cart CTA.
 *
 * Bug 2/3 regression guard: "Add to cart" must only ever move a preview into
 * the "added_to_cart" state (never "purchased"), and the previews list must
 * distinguish "in cart, unpaid" from "available to add" — it should never
 * silently look purchased.
 *
 * "checkout_pending" (checkout started, payment not yet confirmed) is its own
 * state rather than folded into "available": the preview isn't addable to
 * cart again (the server rejects that — see cart.router.ts), so showing an
 * "Add to cart" button would just produce a confusing failed request.
 */
export type PreviewCartState = "in_cart" | "checkout_pending" | "available";

export function getPreviewCartState(status: string | null | undefined): PreviewCartState {
  if (status === "added_to_cart") return "in_cart";
  if (status === "checkout_pending") return "checkout_pending";
  return "available";
}
