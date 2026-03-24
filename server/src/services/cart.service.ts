import { db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";
import { cartItemConverter } from "../shared/firestore/converters";
import { CartItem } from "../shared/types/cartItem";

export interface CartItemValidationError {
  cartItemId: string;
  reason: string;
}

interface CartValidationResult {
  valid: CartItem[];
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
  const valid: CartItem[] = [];
  const invalid: CartItemValidationError[] = [];

  // Load all cart items
  const cartSnapshot = await db
    .collection(COLLECTIONS.cart(caregiverUid))
    .withConverter(cartItemConverter)
    .get();

  if (cartSnapshot.empty) {
    return { valid, invalid };
  }

  // Load all purchases to check for duplicates
  const purchasesSnapshot = await db
    .collection(COLLECTIONS.purchases(caregiverUid))
    .get();
  const purchasedPreviewIds = new Set<string>();
  for (const doc of purchasesSnapshot.docs) {
    const data = doc.data();
    const status = data.status as string;
    if (status !== "failed" && status !== "refunded") {
      purchasedPreviewIds.add(data.previewId as string);
    }
  }

  for (const cartDoc of cartSnapshot.docs) {
    const item = cartDoc.data();
    const errors: string[] = [];

    // Check 1: Preview exists and status is valid
    const previewDoc = await db
      .collection(COLLECTIONS.STORY_PREVIEWS)
      .doc(item.previewId)
      .get();

    if (!previewDoc.exists) {
      errors.push("Preview no longer exists");
    } else {
      const previewData = previewDoc.data()!;
      const previewStatus = previewData.status as string;
      if (previewStatus !== "ready" && previewStatus !== "added_to_cart") {
        errors.push(`Preview is in invalid status: ${previewStatus}`);
      }
    }

    // Check 2: Template is still active
    const templateDoc = await db
      .collection(COLLECTIONS.STORY_TEMPLATES)
      .doc(item.templateId)
      .get();

    if (!templateDoc.exists) {
      errors.push("Template no longer exists");
    } else {
      const templateData = templateDoc.data()!;
      if (!templateData.isActive || !templateData.isPublished) {
        errors.push("Template is no longer available");
      }
    }

    // Check 3: Child profile exists
    const childDoc = await db
      .collection(COLLECTIONS.children(caregiverUid))
      .doc(item.childId)
      .get();

    if (!childDoc.exists) {
      errors.push("Child profile no longer exists");
    } else {
      // Check 4: Photo not expired
      const childData = childDoc.data()!;
      const photoStatus = childData.photoStatus as string;
      if (photoStatus === "expired" || photoStatus === "deleted") {
        errors.push(`Child photo is ${photoStatus} — a new photo upload is required`);
      }
    }

    // Check 5: No duplicate purchase
    if (purchasedPreviewIds.has(item.previewId)) {
      errors.push("This story has already been purchased");
    }

    if (errors.length > 0) {
      invalid.push({
        cartItemId: item.cartItemId,
        reason: errors.join("; "),
      });
    } else {
      valid.push(item);
    }
  }

  return { valid, invalid };
}
