// server/src/middleware/generationGuard.middleware.ts
//
// Middleware that enforces the core governance rule:
//   "No story generation can occur without specialist approval."
//
// This guard MUST be applied to any endpoint that triggers story generation.
// It verifies that the generation contract exists and has status "approved".
//
// Usage in routes:
//   import { requireApprovedContract } from "../middleware/generationGuard.middleware";
//   router.post("/:briefId/generate-draft", requireAuth, requireApprovedContract, generateDraftFromBrief);

import { Request, Response, NextFunction } from "express";
import { firestore } from "../config/firebase";
import { AuditTrail } from "../services/auditTrail.service";
import type { GenerationContract } from "../models/generationContract.model";

/**
 * Verifies that the generation contract for the given briefId is "approved".
 *
 * Expects `req.params.briefId` to be set.
 * Expects `req.user` to be set (requireAuth must come first).
 *
 * On success: attaches `req.approvedContract` for downstream use and calls next().
 * On failure: returns 403/404/409 and logs a "generation.blocked" audit event.
 */

// Extend Request to carry the approved contract
declare global {
  namespace Express {
    interface Request {
      approvedContract?: GenerationContract;
    }
  }
}

export async function requireApprovedContract(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const briefId = req.params.briefId;
  const user = req.user;

  if (!briefId) {
    res.status(400).json({
      success: false,
      error: "briefId is required",
    });
    return;
  }

  try {
    // Load contract
    const contractDoc = await firestore
      .collection("generationContracts")
      .doc(briefId)
      .get();

    if (!contractDoc.exists) {
      // Log blocked attempt
      if (user) {
        await AuditTrail.log({
          action: "generation.blocked",
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract",
          resourceId: briefId,
          metadata: {
            reason: "contract_not_found",
          },
        });
      }

      res.status(404).json({
        success: false,
        error: "Generation contract not found",
        details: `No contract exists for brief "${briefId}". Build the contract first.`,
      });
      return;
    }

    const contract = contractDoc.data() as GenerationContract;

    // THE CRITICAL CHECK: contract must be approved
    if (contract.status !== "approved") {
      // Log blocked attempt
      if (user) {
        await AuditTrail.log({
          action: "generation.blocked",
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract",
          resourceId: briefId,
          metadata: {
            reason: "contract_not_approved",
            currentStatus: contract.status,
          },
        });
      }

      // Return specific error based on status
      const statusMessages: Record<string, string> = {
        invalid: "Contract has validation errors. Fix the brief and rebuild.",
        valid: "Contract has not been reviewed yet. A specialist must approve it before generation.",
        pending_review: "Contract is pending specialist review. Approval is required before generation.",
        rejected: "Contract was rejected by a specialist. Review the rejection reason, update the brief, and rebuild.",
      };

      const message =
        statusMessages[contract.status ?? ""] ??
        `Contract status "${contract.status}" does not allow generation.`;

      res.status(403).json({
        success: false,
        error: "Generation not authorized",
        details: message,
        contractStatus: contract.status,
        // Include rejection info if applicable
        ...(contract.status === "rejected" && contract.approval
          ? {
              rejection: {
                reason: contract.approval.notes,
                rejectedBy: contract.approval.decidedByName,
              },
            }
          : {}),
      });
      return;
    }

    // Contract is approved — attach to request and proceed
    req.approvedContract = contract;
    next();
  } catch (error: any) {
    console.error("Generation guard error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify contract approval status",
      details: error.message,
    });
  }
}
