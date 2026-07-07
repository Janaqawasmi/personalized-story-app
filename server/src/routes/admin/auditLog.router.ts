import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { AuditTrail, type AuditAction } from "../../services/auditTrail.service";

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
  return null;
}

/**
 * GET /api/admin/audit-log
 * Paginated, optionally filtered view over the append-only `auditTrail`
 * collection — real data that was already being written (brief/generation
 * lifecycle events, and now admin account actions) but had no admin-facing
 * surface until this route.
 */
router.get("/", requireAuth, requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const params: { limit: number; cursor?: string; action?: AuditAction; actorUid?: string } = { limit };
    if (typeof req.query.cursor === "string") params.cursor = req.query.cursor;
    if (typeof req.query.action === "string") params.action = req.query.action as AuditAction;
    if (typeof req.query.actorUid === "string") params.actorUid = req.query.actorUid;

    const page = await AuditTrail.listAll(params);

    res.status(200).json({
      success: true,
      data: {
        items: page.items.map((entry) => ({
          id: entry.id,
          action: entry.action,
          actor: entry.actor,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          relatedResourceId: entry.relatedResourceId ?? null,
          metadata: entry.metadata ?? null,
          timestamp: toIsoString(entry.timestamp),
        })),
        nextCursor: page.nextCursor ?? null,
        hasMore: page.hasMore,
      },
    });
  } catch (error) {
    console.error("[admin/audit-log] list error:", error);
    res.status(500).json({
      success: false,
      error: { code: "AUDIT_LOG_LIST_FAILED", message: "Failed to load audit log" },
    });
  }
});

export default router;
