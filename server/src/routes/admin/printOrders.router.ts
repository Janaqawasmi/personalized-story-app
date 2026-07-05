import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { PrintOrderStatus } from "../../shared/types/commerce";
import { Purchase } from "../../shared/types/purchase";

const router = Router();

const PRINT_ORDER_STATUSES: PrintOrderStatus[] = [
  "order_received",
  "in_preparation",
  "ready",
  "shipped",
  "completed",
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

/**
 * GET /api/admin/print-orders
 *
 * Lists every paid print purchase for the admin "Print orders" panel.
 * Includes enough identifying data (previewId, personalizedStoryId,
 * templateId, itemType) for the admin to unambiguously locate and open the
 * exact story that was purchased (see GET /:caregiverUid/:purchaseId/content).
 */
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

      const caregiverEntries = await Promise.all(
        caregiverIds.map(async (caregiverUid) => {
          const caregiverDoc = await db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid).get();
          const data = caregiverDoc.data();
          return [
            caregiverUid,
            {
              email: (data?.email as string | undefined) ?? null,
              displayName: (data?.displayName as string | undefined) ?? null,
            },
          ] as const;
        }),
      );

      const caregiverById = new Map(caregiverEntries);

      const rows = printPurchases
        .map(({ id, data }) => {
          const caregiver = caregiverById.get(data.caregiverUid);
          return {
            purchaseId: data.purchaseId || id,
            caregiverUid: data.caregiverUid,
            buyerName: caregiver?.displayName ?? null,
            buyerEmail: caregiver?.email ?? null,
            storyTitle: data.templateTitle || "",
            templateId: data.templateId,
            previewId: data.previewId,
            personalizedStoryId: data.personalizedStoryId,
            itemType: data.itemType ?? (data.childFirstName ? "personalized" : "template"),
            childName: data.childFirstName || "",
            purchaseFormat: data.purchaseFormat,
            amountCents: data.amountCents,
            currency: data.currency,
            paymentStatus: data.status,
            printOrderStatus: data.printOrder?.status ?? "order_received",
            shippingDetails: data.shippingDetails ?? null,
            purchasedAt: toIsoString(data.paidAt) ?? toIsoString(data.createdAt),
            createdAt: toIsoString(data.createdAt),
          };
        })
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

/**
 * GET /api/admin/print-orders/:caregiverUid/:purchaseId/content
 *
 * Lets admin open the exact story that was purchased, so they never have to
 * guess which content to prepare for printing:
 *  - Personalized purchase -> the final generated personalizedStories doc
 *    (personalized text + personalized images).
 *  - Original/template purchase -> the published story_templates doc
 *    (specialist-approved sample text + sample images).
 * Image paths are resolved server-side (signed URL for private Storage
 * paths, passed through as-is if already a public URL) so the admin client
 * never needs Storage read permission for another caregiver's files.
 */
router.get(
  "/:caregiverUid/:purchaseId/content",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { caregiverUid, purchaseId } = req.params;

      const purchaseDoc = await db
        .collection(COLLECTIONS.purchases(caregiverUid!))
        .doc(purchaseId!)
        .get();

      if (!purchaseDoc.exists) {
        res.status(404).json({ success: false, error: "Purchase not found" });
        return;
      }

      const purchase = purchaseDoc.data() as Purchase;

      if (purchase.purchaseFormat !== "print") {
        res.status(400).json({ success: false, error: "Purchase is not a print order" });
        return;
      }

      const isPersonalized =
        (purchase.itemType ?? (purchase.childFirstName ? "personalized" : "template")) === "personalized";

      if (isPersonalized && purchase.personalizedStoryId) {
        const storyDoc = await db
          .collection(COLLECTIONS.PERSONALIZED_STORIES)
          .doc(purchase.personalizedStoryId)
          .get();

        if (!storyDoc.exists) {
          res.status(404).json({ success: false, error: "Personalized story not found" });
          return;
        }

        const story = storyDoc.data()!;
        const rawPages = Array.isArray(story.pages) ? (story.pages as Record<string, unknown>[]) : [];
        const pages = await Promise.all(
          rawPages
            .slice()
            .sort((a, b) => (a.pageNumber as number) - (b.pageNumber as number))
            .map(async (p) => ({
              pageNumber: p.pageNumber as number,
              text: (p.personalizedText as string) ?? "",
              imageUrl: await resolveImageUrl(p.generatedImagePath as string | null | undefined),
            })),
        );

        res.status(200).json({
          success: true,
          data: {
            source: "personalized",
            title: story.templateTitle ?? "",
            childName: story.childFirstName ?? null,
            coverImageUrl: story.coverImageUrl ?? null,
            pages,
          },
        });
        return;
      }

      // Original/template purchase — read the published template directly.
      const templateDoc = await db.collection(COLLECTIONS.STORY_TEMPLATES).doc(purchase.templateId).get();
      if (!templateDoc.exists) {
        res.status(404).json({ success: false, error: "Story template not found" });
        return;
      }

      const template = templateDoc.data()!;
      const rawPages = Array.isArray(template.pages) ? (template.pages as Record<string, unknown>[]) : [];
      const pages = rawPages
        .slice()
        .sort((a, b) => (a.pageNumber as number) - (b.pageNumber as number))
        .map((p) => {
          const textTemplate = p.textTemplate as { masculine?: string; feminine?: string } | undefined;
          return {
            pageNumber: p.pageNumber as number,
            text: textTemplate?.masculine || textTemplate?.feminine || "",
            imageUrl: (p.sampleImageUrl as string | undefined) ?? null,
          };
        });

      res.status(200).json({
        success: true,
        data: {
          source: "template",
          title: template.title ?? "",
          childName: null,
          coverImageUrl: (template.coverImage as string | undefined) ?? (template.coverImageUrl as string | undefined) ?? null,
          pages,
        },
      });
    } catch (error) {
      console.error("Get print order content error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve story content",
      });
    }
  },
);

async function resolveImageUrl(path: string | null | undefined): Promise<string | null> {
  const trimmed = path?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  try {
    const [url] = await admin
      .storage()
      .bucket()
      .file(trimmed)
      .getSignedUrl({ action: "read", expires: Date.now() + 30 * 60 * 1000 });
    return url;
  } catch (err) {
    console.warn(`[admin print-orders] Could not sign image URL for ${trimmed}:`, err);
    return null;
  }
}

/**
 * PATCH /api/admin/print-orders/:caregiverUid/:purchaseId
 *
 * Updates a print order's customer-facing fulfillment status.
 */
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
