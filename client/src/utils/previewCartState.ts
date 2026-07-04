/**
 * Derives how the "My previews" tab should render a preview's cart CTA.
 *
 * Bug 2/3 regression guard: "Add to cart" must only ever move a preview into
 * the "added_to_cart" state (never "purchased"), and the previews list must
 * distinguish "in cart, unpaid" from "available to add" — it should never
 * silently look purchased.
 */
export type PreviewCartState = "in_cart" | "available";

export function getPreviewCartState(status: string | null | undefined): PreviewCartState {
  return status === "added_to_cart" ? "in_cart" : "available";
}
