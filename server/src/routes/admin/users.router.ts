import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { resolveCaregiverDisplayName } from "../../shared/utils/caregiverDisplayName";
import type { Purchase } from "../../shared/types/purchase";

const router = Router();

function toIsoString(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

/**
 * GET /api/admin/users/:uid
 *
 * The caregivers/{uid} root doc is already admin-readable directly via
 * Firestore rules (see AdminUsersPage's client-side listener), but the
 * `purchases` subcollection is owner-only ("allow read: if isOwner(uid)") —
 * only the Admin SDK can see a caregiver's full purchase/activity history,
 * so this route exists specifically for that.
 */
router.get(
  "/:uid",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid } = req.params;
      if (!uid) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "uid is required." },
        });
        return;
      }

      const caregiverSnap = await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).get();
      if (!caregiverSnap.exists) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found." },
        });
        return;
      }
      const caregiverData = caregiverSnap.data();

      // Query the specific subcollection directly (not collectionGroup + where) —
      // we already know the owning caregiver, so no composite index is needed.
      const purchasesSnap = await db
        .collection(COLLECTIONS.CAREGIVERS)
        .doc(uid)
        .collection("purchases")
        .get();

      const purchases = purchasesSnap.docs
        .map((doc) => {
          const data = doc.data() as Purchase;
          return {
            purchaseId: data.purchaseId || doc.id,
            storyTitle: data.templateTitle || "",
            childName: data.childFirstName || "",
            itemType: data.itemType ?? (data.childFirstName ? "personalized" : "template"),
            purchaseFormat: data.purchaseFormat,
            amountCents: data.amountCents,
            currency: data.currency,
            status: data.status,
            createdAt: toIsoString(data.createdAt),
          };
        })
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      res.status(200).json({
        success: true,
        data: {
          user: {
            uid,
            email: (caregiverData?.email as string | undefined) ?? null,
            displayName: resolveCaregiverDisplayName(caregiverData),
            language: (caregiverData?.language as string | undefined) ?? null,
            purchaseCount: (caregiverData?.purchaseCount as number | undefined) ?? 0,
            freePreviewUsed: caregiverData?.freePreviewUsed === true,
            createdAt: toIsoString(caregiverData?.createdAt),
          },
          purchases,
        },
      });
    } catch (error) {
      console.error("[admin/users] detail error:", error);
      res.status(500).json({
        success: false,
        error: { code: "USER_DETAIL_FAILED", message: "Failed to load user" },
      });
    }
  },
);

export default router;
