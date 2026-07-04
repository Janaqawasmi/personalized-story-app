import { Router, Request, Response } from "express";
import { db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { PrintOrderStatus } from "../../shared/types/commerce";
import { Purchase } from "../../shared/types/purchase";

const router = Router();

const PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "paid_pending_preparation",
  "preparing_file",
  "sent_to_print",
  "printed",
  "shipped",
  "delivered",
  "cancelled",
];

function isPrintOrderStatus(value: unknown): value is PrintOrderStatus {
  return typeof value === "string" && PRINT_ORDER_STATUSES.includes(value as PrintOrderStatus);
}

function toIsoString(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const purchasesSnapshot = await db.collectionGroup("purchases").get();

      const printPurchases = purchasesSnapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() as Purchase }))
        .filter(({ data }) => data.purchaseFormat === "print" && data.printOrder !== null);

      const caregiverIds = Array.from(
        new Set(
          printPurchases
            .map(({ data }) => data.caregiverUid)
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
        ),
      );

      const caregiverEmailEntries = await Promise.all(
        caregiverIds.map(async (caregiverUid) => {
          const caregiverDoc = await db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid).get();
          return [caregiverUid, (caregiverDoc.data()?.email as string | undefined) ?? null] as const;
        }),
      );

      const caregiverEmailById = new Map(caregiverEmailEntries);

      const rows = printPurchases
        .map(({ id, data }) => ({
          purchaseId: data.purchaseId || id,
          caregiverUid: data.caregiverUid,
          buyerEmail: caregiverEmailById.get(data.caregiverUid) ?? null,
          storyTitle: data.templateTitle || "",
          templateId: data.templateId,
          itemType: data.itemType ?? (data.childFirstName ? "personalized" : "template"),
          childName: data.childFirstName || "",
          purchaseFormat: data.purchaseFormat,
          paymentStatus: data.status,
          printOrderStatus: data.printOrder?.status ?? "paid_pending_preparation",
          shippingAddress: data.printOrder?.shippingAddress ?? null,
          phoneNumber: data.printOrder?.phoneNumber ?? null,
          deliveryNotes: data.printOrder?.deliveryNotes ?? null,
          needsAdminFollowUp: data.printOrder?.needsAdminFollowUp ?? true,
          createdAt: toIsoString(data.createdAt),
        }))
        .sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.localeCompare(a.createdAt);
        });

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("List print orders error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve print orders",
      });
    }
  },
);

router.patch(
  "/:caregiverUid/:purchaseId",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { caregiverUid, purchaseId } = req.params;
      const { status } = req.body as { status?: PrintOrderStatus };

      if (!caregiverUid || !purchaseId) {
        res.status(400).json({
          success: false,
          error: "caregiverUid and purchaseId are required",
        });
        return;
      }

      if (!isPrintOrderStatus(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid print order status",
        });
        return;
      }

      const purchaseRef = db.collection(COLLECTIONS.purchases(caregiverUid)).doc(purchaseId);
      const purchaseDoc = await purchaseRef.get();

      if (!purchaseDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Purchase not found",
        });
        return;
      }

      const purchase = purchaseDoc.data() as Purchase;

      if (purchase.purchaseFormat !== "print") {
        res.status(400).json({
          success: false,
          error: "Purchase is not a print order",
        });
        return;
      }

      const now = new Date().toISOString();
      await purchaseRef.update({
        printOrder: {
          status,
          needsAdminFollowUp: purchase.printOrder?.needsAdminFollowUp ?? true,
          shippingAddress: purchase.printOrder?.shippingAddress ?? null,
          phoneNumber: purchase.printOrder?.phoneNumber ?? null,
          deliveryNotes: purchase.printOrder?.deliveryNotes ?? null,
          createdAt: purchase.printOrder?.createdAt ?? now,
          updatedAt: now,
        },
      });

      res.status(200).json({
        success: true,
        data: { purchaseId, caregiverUid, status },
      });
    } catch (error) {
      console.error("Update print order status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update print order status",
      });
    }
  },
);

export default router;
