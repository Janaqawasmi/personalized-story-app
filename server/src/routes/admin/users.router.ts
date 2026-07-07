import { Router, Request, Response } from "express";
import type { Query } from "firebase-admin/firestore";
import { admin, db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { resolveCaregiverDisplayName } from "../../shared/utils/caregiverDisplayName";
import { fetchCursorPage } from "../../shared/utils/pagination";
import { AuditTrail } from "../../services/auditTrail.service";
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
 * GET /api/admin/users
 *
 * Paginated caregiver directory, replacing AdminUsersPage's previous raw
 * client-side Firestore listener over the entire `caregivers` collection.
 * Also resolves each user's REAL role from Firebase Auth custom claims —
 * the Firestore doc's own `role` field is always "caregiver" (set once at
 * registration, see registerCaregiver.router.ts), so it can't be trusted to
 * reflect an admin/specialist promotion done later via the custom-claims
 * script.
 *
 * Search matches by email prefix (Firestore has no substring/full-text
 * search) and, when active, switches ordering from createdAt to email since
 * a range filter must share its orderBy field.
 */
router.get("/", requireAuth, requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    const baseQuery: Query = search
      ? db
          .collection(COLLECTIONS.CAREGIVERS)
          .orderBy("email")
          .where("email", ">=", search)
          .where("email", "<", `${search}`)
      : db.collection(COLLECTIONS.CAREGIVERS).orderBy("createdAt", "desc");

    const page = await fetchCursorPage(baseQuery, limit, cursor, (doc) => ({
      uid: doc.id,
      data: doc.data(),
    }));

    const uids = page.items.map((item) => item.uid);
    const authUsers = uids.length > 0 ? await admin.auth().getUsers(uids.map((uid) => ({ uid }))) : { users: [] };
    const authByUid = new Map(authUsers.users.map((u) => [u.uid, u]));

    const items = page.items.map(({ uid, data }) => {
      const authUser = authByUid.get(uid);
      return {
        uid,
        email: (data.email as string | undefined) ?? null,
        displayName: resolveCaregiverDisplayName(data),
        role: (authUser?.customClaims?.role as string | undefined) ?? "caregiver",
        disabled: authUser?.disabled ?? false,
        purchaseCount: (data.purchaseCount as number | undefined) ?? 0,
        createdAt: toIsoString(data.createdAt),
      };
    });

    res.status(200).json({
      success: true,
      data: { items, nextCursor: page.nextCursor ?? null, hasMore: page.hasMore },
    });
  } catch (error) {
    console.error("[admin/users] list error:", error);
    res.status(500).json({
      success: false,
      error: { code: "USERS_LIST_FAILED", message: "Failed to load users" },
    });
  }
});

/**
 * PATCH /api/admin/users/:uid/disabled
 * Disables/enables a caregiver's Firebase Auth account. Deliberately does
 * NOT allow changing role/claims here — granting admin/specialist access
 * stays on the `npm run set-user-role` CLI script; this endpoint only ever
 * flips the Auth `disabled` flag.
 */
router.patch(
  "/:uid/disabled",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid } = req.params;
      const { disabled } = req.body as { disabled?: boolean };
      if (!uid || typeof disabled !== "boolean") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "uid and boolean disabled are required." },
        });
        return;
      }

      await admin.auth().updateUser(uid, { disabled });
      await AuditTrail.log({
        action: disabled ? "user.disabled" : "user.enabled",
        actor: AuditTrail.actorFromRequest(req.user!),
        resourceType: "user",
        resourceId: uid,
      });

      res.status(200).json({ success: true, data: { uid, disabled } });
    } catch (error) {
      console.error("[admin/users] disable error:", error);
      res.status(500).json({
        success: false,
        error: { code: "USER_DISABLE_FAILED", message: "Failed to update user account status" },
      });
    }
  },
);

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

      const authUser = await admin
        .auth()
        .getUser(uid)
        .catch(() => null);

      res.status(200).json({
        success: true,
        data: {
          user: {
            uid,
            email: (caregiverData?.email as string | undefined) ?? null,
            displayName: resolveCaregiverDisplayName(caregiverData),
            language: (caregiverData?.language as string | undefined) ?? null,
            role: (authUser?.customClaims?.role as string | undefined) ?? "caregiver",
            disabled: authUser?.disabled ?? false,
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
