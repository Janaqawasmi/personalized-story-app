// server/src/controllers/contractApproval.controller.ts
//
// Handles the specialist approval gate for generation contracts.
// This is the critical governance layer that ensures no story generation
// can occur without explicit specialist approval.
//
// Endpoints:
//   POST /api/agent1/contracts/:briefId/approve   → Approve contract
//   POST /api/agent1/contracts/:briefId/reject    → Reject contract (with reason)
//   GET  /api/agent1/contracts/:briefId/status    → Check approval status
//   GET  /api/agent1/contracts/:briefId/audit     → Get audit history

import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import { AuditTrail } from "../services/auditTrail.service";
import type { GenerationContract, ContractStatus, ApprovalRecord } from "../models/generationContract.model";

// ============================================================================
// Approve Contract
// ============================================================================

/**
 * Approves a generation contract, allowing story generation to proceed.
 *
 * Preconditions:
 *   - Contract must exist
 *   - Contract status must be "valid" or "pending_review"
 *   - Contract must have zero errors
 *   - User must be authenticated (enforced by middleware)
 *
 * Effects:
 *   - Sets contract.status = "approved"
 *   - Sets contract.approval with specialist details and timestamp
 *   - Logs "contract.approved" to audit trail
 */
export const approveContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { notes } = req.body;
    const user = req.user!; // Guaranteed by requireAuth middleware

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    // Load contract
    const contractRef = firestore.collection("generationContracts").doc(briefId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Generation contract for brief "${briefId}" not found. Build the contract first.`,
      });
      return;
    }

    const contract = contractDoc.data() as GenerationContract;

    // Validate contract is in an approvable state
    const approvableStatuses: ContractStatus[] = ["valid", "pending_review"];
    if (!contract.status || !approvableStatuses.includes(contract.status)) {
      res.status(409).json({
        success: false,
        error: `Contract cannot be approved in its current state`,
        details: `Current status: "${contract.status}". Must be "valid" or "pending_review".`,
      });
      return;
    }

    // Verify contract has no errors
    if (contract.errors && contract.errors.length > 0) {
      res.status(409).json({
        success: false,
        error: "Contract has errors and cannot be approved",
        details: `${contract.errors.length} error(s) found. Fix the brief and rebuild the contract.`,
        errors: contract.errors,
      });
      return;
    }

    // Build approval record
    const approvalRecord: ApprovalRecord = {
      decision: "approved",
      decidedBy: user.uid,
      decidedByName: user.displayName,
      decidedByEmail: user.email,
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(notes ? { notes } : {}),
    };

    // Update contract atomically
    await contractRef.update({
      status: "approved" as ContractStatus,
      approval: approvalRecord,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log to immutable audit trail
    await AuditTrail.log({
      action: "contract.approved",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract",
      resourceId: briefId,
      relatedResourceId: briefId,
      metadata: {
        rulesVersionUsed: contract.rulesVersionUsed,
        errorCount: contract.errors?.length ?? 0,
        warningCount: contract.warnings?.length ?? 0,
        notes: notes ?? null,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        briefId,
        status: "approved",
        approval: {
          ...approvalRecord,
          decidedAt: new Date().toISOString(), // Return readable timestamp to client
        },
      },
    });
  } catch (error: any) {
    console.error("Error approving contract:", error);
    res.status(500).json({
      success: false,
      error: "Failed to approve contract",
      details: error.message,
    });
  }
};

// ============================================================================
// Reject Contract
// ============================================================================

/**
 * Rejects a generation contract, blocking story generation.
 * A rejection reason is REQUIRED — this is a clinical accountability measure.
 *
 * Preconditions:
 *   - Contract must exist
 *   - Contract status must be "valid" or "pending_review"
 *   - Rejection reason must be provided
 *
 * Effects:
 *   - Sets contract.status = "rejected"
 *   - Sets contract.approval with specialist details, timestamp, and reason
 *   - Logs "contract.rejected" to audit trail
 */
export const rejectContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Rejection reason is required",
        details: "Please explain why this contract is being rejected for clinical traceability.",
      });
      return;
    }

    // Load contract
    const contractRef = firestore.collection("generationContracts").doc(briefId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Generation contract for brief "${briefId}" not found`,
      });
      return;
    }

    const contract = contractDoc.data() as GenerationContract;

    // Validate contract is in a rejectable state
    const rejectableStatuses: ContractStatus[] = ["valid", "pending_review"];
    if (!contract.status || !rejectableStatuses.includes(contract.status)) {
      res.status(409).json({
        success: false,
        error: `Contract cannot be rejected in its current state`,
        details: `Current status: "${contract.status}". Must be "valid" or "pending_review".`,
      });
      return;
    }

    // Build rejection record
    const approvalRecord: ApprovalRecord = {
      decision: "rejected",
      decidedBy: user.uid,
      decidedByName: user.displayName,
      decidedByEmail: user.email,
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: reason.trim(),
    };

    // Update contract
    await contractRef.update({
      status: "rejected" as ContractStatus,
      approval: approvalRecord,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log to immutable audit trail
    await AuditTrail.log({
      action: "contract.rejected",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract",
      resourceId: briefId,
      relatedResourceId: briefId,
      metadata: {
        rulesVersionUsed: contract.rulesVersionUsed,
        reason: reason.trim(),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        briefId,
        status: "rejected",
        reason: reason.trim(),
      },
    });
  } catch (error: any) {
    console.error("Error rejecting contract:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject contract",
      details: error.message,
    });
  }
};

// ============================================================================
// Check Approval Status
// ============================================================================

/**
 * Returns the current approval status of a contract.
 * Used by the frontend to determine available actions,
 * and by the generation guard to verify approval.
 */
export const getContractStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    const contractDoc = await firestore
      .collection("generationContracts")
      .doc(briefId)
      .get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Generation contract for brief "${briefId}" not found`,
      });
      return;
    }

    const contract = contractDoc.data() as GenerationContract;

    res.status(200).json({
      success: true,
      data: {
        briefId,
        status: contract.status,
        approval: contract.approval ?? null,
        errorCount: contract.errors?.length ?? 0,
        warningCount: contract.warnings?.length ?? 0,
      },
    });
  } catch (error: any) {
    console.error("Error getting contract status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get contract status",
      details: error.message,
    });
  }
};

// ============================================================================
// Get Audit History
// ============================================================================

/**
 * Returns the audit trail for a specific brief/contract.
 * Enables full traceability of who did what and when.
 */
export const getAuditHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    const entries = await AuditTrail.getByBriefId(briefId, limit);

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error("Error fetching audit history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit history",
      details: error.message,
    });
  }
};
