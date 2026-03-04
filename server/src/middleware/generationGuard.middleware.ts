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
import { loadClinicalRules } from "../services/clinicalRules.service";
import type { GenerationContract } from "../models/generationContract.model";

/**
 * Standardized blocking reason codes for generation.blocked events
 */
type BlockingReason =
  | "CONTRACT_NOT_FOUND"
  | "CONTRACT_NOT_APPROVED"
  | "CONTRACT_HAS_ERRORS"
  | "CONTRACT_REJECTED"
  | "CONTRACT_RULES_OUTDATED"
  | "CONTRACT_APPROVAL_EXPIRED";

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
      // Log blocked attempt with structured reason
      if (user) {
        await AuditTrail.log({
          action: "generation.blocked",
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract",
          resourceId: briefId,
          metadata: {
            reason: "CONTRACT_NOT_FOUND" as BlockingReason,
          },
        });
      }

      res.status(404).json({
        success: false,
        error: "Generation contract not found",
        details: `No contract exists for brief "${briefId}". Build the contract first.`,
        blockingReason: "CONTRACT_NOT_FOUND",
      });
      return;
    }

    const contract = contractDoc.data() as GenerationContract;

    // Check 1: Contract must be approved
    if (contract.status !== "approved") {
      let blockingReason: BlockingReason;
      let message: string;

      if (contract.status === "invalid" || (contract.errors && contract.errors.length > 0)) {
        blockingReason = "CONTRACT_HAS_ERRORS";
        message = "Contract has validation errors. Fix the brief and rebuild.";
      } else if (contract.status === "rejected") {
        blockingReason = "CONTRACT_REJECTED";
        message = "Contract was rejected by a specialist. Review the rejection reason, update the brief, and rebuild.";
      } else {
        blockingReason = "CONTRACT_NOT_APPROVED";
        message = contract.status === "valid"
          ? "Contract has not been reviewed yet. A specialist must approve it before generation."
          : `Contract status "${contract.status}" does not allow generation.`;
      }

      // Log blocked attempt with structured reason
      if (user) {
        await AuditTrail.log({
          action: "generation.blocked",
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract",
          resourceId: briefId,
          metadata: {
            reason: blockingReason,
            currentStatus: contract.status,
            errorCount: contract.errors?.length ?? 0,
          },
        });
      }

      res.status(403).json({
        success: false,
        error: "Generation not authorized",
        details: message,
        contractStatus: contract.status,
        blockingReason,
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

    // Check 2: Contract must have no errors
    if (contract.errors && contract.errors.length > 0) {
      const blockingReason: BlockingReason = "CONTRACT_HAS_ERRORS";
      
      if (user) {
        await AuditTrail.log({
          action: "generation.blocked",
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract",
          resourceId: briefId,
          metadata: {
            reason: blockingReason,
            errorCount: contract.errors.length,
          },
        });
      }

      res.status(403).json({
        success: false,
        error: "Contract has errors",
        details: `Contract has ${contract.errors.length} error(s). Fix the brief and rebuild.`,
        blockingReason,
        errors: contract.errors,
      });
      return;
    }

    // Check 3: Rules version currency
    try {
      const currentRules = await loadClinicalRules(undefined, firestore);
      const currentRulesVersion = currentRules.version;
      
      if (contract.rulesVersionUsed !== currentRulesVersion) {
        const blockingReason: BlockingReason = "CONTRACT_RULES_OUTDATED";
        
        if (user) {
          await AuditTrail.log({
            action: "generation.blocked",
            actor: AuditTrail.actorFromRequest(user),
            resourceType: "generationContract",
            resourceId: briefId,
            metadata: {
              reason: blockingReason,
              contractVersion: contract.rulesVersionUsed,
              currentVersion: currentRulesVersion,
            },
          });
        }

        res.status(403).json({
          success: false,
          error: "Contract rules version outdated",
          details: `Contract was built with rules version "${contract.rulesVersionUsed}", but current version is "${currentRulesVersion}". Rebuild the contract to use the latest rules.`,
          blockingReason,
          contractRulesVersion: contract.rulesVersionUsed,
          currentRulesVersion,
        });
        return;
      }
    } catch (error) {
      console.error("Error checking rules version:", error);
      // Don't block generation if rules check fails - log warning but proceed
      console.warn("Warning: Could not verify rules version currency, proceeding with generation");
    }

    // Check 4: Approval expiry
    if (contract.approval?.expiresAt) {
      let expiryTime: number;
      
      if (contract.approval.expiresAt instanceof Date) {
        expiryTime = contract.approval.expiresAt.getTime();
      } else if (typeof contract.approval.expiresAt === "object" && "toMillis" in contract.approval.expiresAt) {
        expiryTime = (contract.approval.expiresAt as any).toMillis();
      } else if (typeof contract.approval.expiresAt === "string") {
        expiryTime = new Date(contract.approval.expiresAt).getTime();
      } else {
        // Can't parse expiry, log warning but proceed
        console.warn("Warning: Could not parse approval expiry timestamp");
        expiryTime = 0;
      }

      if (expiryTime > 0 && Date.now() > expiryTime) {
        const blockingReason: BlockingReason = "CONTRACT_APPROVAL_EXPIRED";
        
        if (user) {
          await AuditTrail.log({
            action: "generation.blocked",
            actor: AuditTrail.actorFromRequest(user),
            resourceType: "generationContract",
            resourceId: briefId,
            metadata: {
              reason: blockingReason,
              expiredAt: new Date(expiryTime).toISOString(),
            },
          });
        }

        res.status(403).json({
          success: false,
          error: "Contract approval expired",
          details: `Approval expired on ${new Date(expiryTime).toISOString()}. Contract must be re-approved before generation.`,
          blockingReason,
          expiredAt: new Date(expiryTime).toISOString(),
        });
        return;
      }
    }

    // All checks passed — contract is approved and valid
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
