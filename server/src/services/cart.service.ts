import { db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";
import { cartItemConverter } from "../shared/firestore/converters";
import { CartItem } from "../shared/types/cartItem";

export interface CartItemValidationError {
  cartItemId: string;
  reason: string;
}

export interface CartValidationResult {
  readyToPay: CartItem[];
  photosNeeded: Array<{ previewId: string; childFirstName: string }>;
  invalid: CartItemValidationError[];
}

/**
 * Validates all cart items for a caregiver before checkout.
 *
 * Checks per item:
 * 1. Preview exists and is in "ready" or "added_to_cart" status
 * 2. Template is still active and published
 * 3. Child profile exists
 * 4. Child photo is not expired or deleted
 * 5. No duplicate purchase for the same preview
 */
export async function validateCartItems(
  caregiverUid: string
): Promise<CartValidationResult> {
  const readyToPay: CartItem[] = [];
  const photosNeeded: Array<{ previewId: string; childFirstName: string }> = [];
  const invalid: CartItemValidationError[] = [];

  // Load all cart items
  const cartSnapshot = await db
    .collection(COLLECTIONS.cart(caregiverUid))
    .withConverter(cartItemConverter)
    .get();

  if (cartSnapshot.empty) {
    return { readyToPay, photosNeeded, invalid };
  }

  // Load all purchases to check for duplicates
  const purchasesSnapshot = await db
    .collection(COLLECTIONS.purchases(caregiverUid))
    .get();
  const purchasedPreviewIds = new Set<string>();
  for (const doc of purchasesSnapshot.docs) {
    const data = doc.data();
    const status = data.status as string;
    if (["paid", "generation_in_progress", "completed"].includes(status)) {
      purchasedPreviewIds.add(data.previewId as string);
    }
  }

  for (const cartDoc of cartSnapshot.docs) {
    const item = cartDoc.data();
    let invalidReason: string | null = null;

    // Check 1: Preview exists and status is valid
    const previewDoc = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .doc(item.previewId)
      .get();

    if (!previewDoc.exists) {
      invalidReason = "This preview is no longer available";
    } else {
      const previewData = previewDoc.data()!;
      const previewStatus = previewData.status as string;

      if (previewStatus === "expired" || previewStatus === "converted") {
        invalidReason = "This preview is no longer available";
      } else if (previewStatus !== "ready" && previewStatus !== "added_to_cart") {
        invalidReason = "Preview is in an unexpected state";
      }
    }

    // Check 2: Template is still active
    if (!invalidReason) {
      const templateDoc = await db
        .collection(COLLECTIONS.STORY_TEMPLATES)
        .doc(item.templateId)
        .get();

      if (!templateDoc.exists) {
        invalidReason = "This story is no longer available";
      } else {
        const templateData = templateDoc.data()!;
        if (!templateData.isActive || !templateData.isPublished) {
          invalidReason = "This story is no longer available";
        }
      }
    }

    // Check 3: No duplicate purchase
    if (!invalidReason && purchasedPreviewIds.has(item.previewId)) {
      invalidReason = "Already purchased";
    }

    if (invalidReason) {
      invalid.push({ cartItemId: item.cartItemId, reason: invalidReason });
      continue;
    }

    // Check 4: Photo availability from preview document
    const previewData = previewDoc.data()!;
    const photoStatus = previewData.photoStatus as string;

    if (photoStatus === "preview_used" || photoStatus === "uploaded") {
      readyToPay.push(item);
    } else if (photoStatus === "deleted" || photoStatus === "expired") {
      photosNeeded.push({
        previewId: item.previewId,
        childFirstName: item.childFirstName,
      });
    } else {
      invalid.push({
        cartItemId: item.cartItemId,
        reason: `Photo is in an unexpected status: ${photoStatus}`,
      });
    }
  }

  return { readyToPay, photosNeeded, invalid };
}
