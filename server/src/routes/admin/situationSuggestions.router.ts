// server/src/routes/admin/situationSuggestions.router.ts
//
// Admin-only review surface for `story_templates.situationProposal` — the
// "suggest a new situation" request a specialist can make from the Publish
// dialog (client/src/specialist/components/illustration/PublishDialog.tsx)
// when no existing referenceData/situations entry fits.
//
// Previously the only way to review these was a locally-run CLI script
// (server/scripts/approveSituationProposal.ts). These endpoints expose the
// exact same service logic (server/src/services/situationProposals.service.ts)
// to the admin dashboard, gated by requireRole("admin") — never reachable by
// specialists or public/caregiver users.

import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  approveSituationProposal,
  listPendingSituationProposals,
  rejectSituationProposal,
  SituationProposalError,
} from "@/services/situationProposals.service";

const router = Router();

function statusForErrorCode(code: SituationProposalError["code"]): number {
  switch (code) {
    case "TEMPLATE_NOT_FOUND":
      return 404;
    case "INVALID_INPUT":
      return 400;
    case "NO_PROPOSAL":
    case "NOT_PENDING":
    case "SITUATION_ID_TAKEN":
      return 409;
    default:
      return 500;
  }
}

function handleError(res: Response, err: unknown, fallbackMessage: string): void {
  if (err instanceof SituationProposalError) {
    res.status(statusForErrorCode(err.code)).json({ success: false, error: err.message, code: err.code });
    return;
  }
  console.error(fallbackMessage, err);
  res.status(500).json({ success: false, error: fallbackMessage });
}

/**
 * GET /api/admin/situation-suggestions
 *
 * Lists every pending situation suggestion for the admin review screen.
 */
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const proposals = await listPendingSituationProposals();
      res.status(200).json({ success: true, data: proposals });
    } catch (err) {
      handleError(res, err, "Failed to list pending situation suggestions.");
    }
  },
);

/**
 * POST /api/admin/situation-suggestions/:templateId/approve
 * body: { situationId: string }
 *
 * Creates the referenceData/situations/items/{situationId} entry and marks
 * the proposal approved. Idempotent — a repeated call after a successful
 * approval returns the existing result instead of erroring.
 */
router.post(
  "/:templateId/approve",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params["templateId"] ?? "";
    const situationId = (req.body as { situationId?: unknown })?.situationId;
    if (typeof situationId !== "string" || !situationId.trim()) {
      res.status(400).json({ success: false, error: "situationId is required." });
      return;
    }

    try {
      const result = await approveSituationProposal(templateId, situationId, req.user!.uid);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err, "Failed to approve situation suggestion.");
    }
  },
);

/**
 * POST /api/admin/situation-suggestions/:templateId/reject
 * body: { note?: string }
 *
 * Marks the proposal rejected. Does not touch the template's published
 * status, situationId, or any other field — the story stays exactly as
 * published. Idempotent — a repeated call after a successful rejection is a
 * no-op.
 */
router.post(
  "/:templateId/reject",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params["templateId"] ?? "";
    const note = (req.body as { note?: unknown })?.note;

    try {
      const result = await rejectSituationProposal(
        templateId,
        req.user!.uid,
        typeof note === "string" ? note : undefined,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      handleError(res, err, "Failed to reject situation suggestion.");
    }
  },
);

export default router;
