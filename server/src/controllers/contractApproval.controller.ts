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
 *   - Contract status must be "valid"
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
    if (contract.status !== "valid") {
      res.status(409).json({
        success: false,
        error: `Contract cannot be approved in its current state`,
        details: `Current status: "${contract.status}". Must be "valid".`,
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

    // Build approval record with optional expiry (default: 7 days from now)
    const approvalExpiryDays = 7; // Configurable: could come from settings
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + approvalExpiryDays);

    const approvalRecord: ApprovalRecord = {
      decision: "approved",
      decidedBy: user.uid,
      decidedByName: user.displayName,
      decidedByEmail: user.email,
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      ...(notes ? { notes } : {}),
    };

    // Prepare audit entry
    const auditEntry = {
      action: "contract.approved" as const,
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract" as const,
      resourceId: briefId,
      relatedResourceId: briefId,
      metadata: {
        rulesVersionUsed: contract.rulesVersionUsed,
        errorCount: contract.errors?.length ?? 0,
        warningCount: contract.warnings?.length ?? 0,
        notes: notes ?? null,
      },
    };

    // Update contract and log audit trail atomically using transaction
    await firestore.runTransaction(async (transaction) => {
      // Re-read contract in transaction to ensure consistency
      const contractDoc = await transaction.get(contractRef);
      if (!contractDoc.exists) {
        throw new Error("Contract not found");
      }

      const currentContract = contractDoc.data() as GenerationContract;
      
      // Preserve previous approvals
      const previousApprovals = currentContract.previousApprovals || [];
      if (currentContract.approval) {
        previousApprovals.push(currentContract.approval);
      }

      // Update contract
      transaction.update(contractRef, {
        status: "approved" as ContractStatus,
        approval: approvalRecord,
        previousApprovals,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create audit entry
      const auditRef = firestore.collection("auditTrail").doc();
      transaction.set(auditRef, {
        ...auditEntry,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
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
 *   - Contract status must be "valid"
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
    if (contract.status !== "valid") {
      res.status(409).json({
        success: false,
        error: `Contract cannot be rejected in its current state`,
        details: `Current status: "${contract.status}". Must be "valid".`,
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

    // Prepare audit entry
    const auditEntry = {
      action: "contract.rejected" as const,
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract" as const,
      resourceId: briefId,
      relatedResourceId: briefId,
      metadata: {
        rulesVersionUsed: contract.rulesVersionUsed,
        reason: reason.trim(),
      },
    };

    // Update contract and log audit trail atomically using transaction
    await firestore.runTransaction(async (transaction) => {
      // Re-read contract in transaction to ensure consistency
      const contractDoc = await transaction.get(contractRef);
      if (!contractDoc.exists) {
        throw new Error("Contract not found");
      }

      const currentContract = contractDoc.data() as GenerationContract;
      
      // Preserve previous approvals
      const previousApprovals = currentContract.previousApprovals || [];
      if (currentContract.approval) {
        previousApprovals.push(currentContract.approval);
      }

      // Update contract
      transaction.update(contractRef, {
        status: "rejected" as ContractStatus,
        approval: approvalRecord,
        previousApprovals,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create audit entry
      const auditRef = firestore.collection("auditTrail").doc();
      transaction.set(auditRef, {
        ...auditEntry,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
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
/**
 * Returns the full persisted generation contract.
 * GET /api/agent1/contracts/:briefId/full
 */
/**
 * Helper function to serialize Firestore Timestamp to ISO string
 * Handles: Firestore Timestamp objects, FieldValue, Date objects, ISO strings, and objects with seconds/_seconds
 */
function serializeTimestamp(ts: any): string | undefined {
  if (!ts) return undefined;
  
  // Already a string (ISO format)
  if (typeof ts === "string") return ts;
  
  // Date object
  if (ts instanceof Date) return ts.toISOString();
  
  // Firestore Admin SDK Timestamp object (has toDate method)
  if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
    try {
      return ts.toDate().toISOString();
    } catch (e) {
      console.warn("Error converting Firestore Timestamp to Date:", e);
      return undefined;
    }
  }
  
  // Object with seconds property (Firestore Timestamp format: { seconds: number, nanoseconds?: number })
  if (ts && typeof ts === "object" && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000).toISOString();
  }
  
  // JSON serialized format with underscore prefix: { _seconds: number, _nanoseconds?: number }
  if (ts && typeof ts === "object" && typeof ts._seconds === "number") {
    return new Date(ts._seconds * 1000).toISOString();
  }
  
  // FieldValue.serverTimestamp() - this shouldn't be in the response, but handle gracefully
  if (ts && typeof ts === "object" && ts.constructor?.name === "FieldValue") {
    console.warn("Warning: FieldValue.serverTimestamp() found in response - timestamp not resolved yet");
    return undefined;
  }
  
  return undefined;
}

export const getContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const user = req.user; // May be undefined for unauthenticated requests

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

    const contractData = contractDoc.data() as GenerationContract;
    
    // Log contract view to audit trail (if user is authenticated)
    if (user) {
      await AuditTrail.log({
        action: "contract.viewed",
        actor: AuditTrail.actorFromRequest(user),
        resourceType: "generationContract",
        resourceId: briefId,
      });
    }
    
    // Debug: Log the timestamp format to help diagnose issues
    if (process.env.NODE_ENV === "development" || process.env.ALLOW_UNAUTHENTICATED_REQUESTS === "true") {
      console.log(`[DEBUG] Contract ${briefId} createdAt type:`, typeof contractData.createdAt, contractData.createdAt?.constructor?.name);
      console.log(`[DEBUG] Contract ${briefId} createdAt value:`, contractData.createdAt);
      console.log(`[DEBUG] Serialized createdAt:`, serializeTimestamp(contractData.createdAt));
    }
    
    // Serialize timestamps to ISO strings for JSON response
    const serializedContract: any = {
      ...contractData,
      createdAt: serializeTimestamp(contractData.createdAt),
      updatedAt: contractData.updatedAt ? serializeTimestamp(contractData.updatedAt) : undefined,
      // Also serialize approval timestamp if present
      approval: contractData.approval
        ? {
            ...contractData.approval,
            decidedAt: serializeTimestamp(contractData.approval.decidedAt),
            expiresAt: contractData.approval.expiresAt
              ? serializeTimestamp(contractData.approval.expiresAt)
              : undefined,
          }
        : undefined,
    };

    res.status(200).json({
      success: true,
      data: serializedContract,
    });
  } catch (error: any) {
    console.error("Error fetching contract:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contract",
      details: error.message,
    });
  }
};

export const getAuditHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 200);
    const cursor = req.query.cursor as string | undefined;

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    const result = await AuditTrail.getByBriefId(briefId, limit, cursor);

    res.status(200).json({
      success: true,
      data: result.entries,
      pagination: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit history:", error);
    
    // Check if it's an index error
    if (error.code === 9 || error.message?.includes("index") || error.message?.includes("FAILED_PRECONDITION")) {
      res.status(503).json({
        success: false,
        error: "Audit history index is still building",
        details: "The Firestore indexes for audit history queries are being built. Please wait a few minutes and try again. If this persists, check the Firebase Console for index status.",
        code: "INDEX_BUILDING",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch audit history",
      details: error.message,
    });
  }
};
