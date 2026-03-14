// server/src/controllers/storyBrief.controller.ts
//
// PHASE 1 CHANGES:
//   - createStoryBrief: createdBy now comes from req.user (auth session), not req.body
//   - buildContract: logs "contract.built" to audit trail
//   - previewContract: logs "contract.preview" to audit trail
//   - applyOverride: revokes previous approval, logs to audit trail
//   - All mutation endpoints expect req.user (set by auth middleware)

import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import type { FieldValue, Timestamp } from "firebase-admin/firestore";
import { StoryBrief, createStoryBrief as createStoryBriefModel, StoryBriefInput } from "../models/storyBrief.model";
import { GenerationContract, ApprovalRecord } from "../models/generationContract.model";
import { buildGenerationContractFromBriefId, buildGenerationContract } from "../agents/agent1/buildGenerationContract";
import { loadClinicalRules } from "../services/clinicalRules.service";
import { AuditTrail } from "../services/auditTrail.service";

/**
 * List all story briefs (newest first)
 */
export const listStoryBriefs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await firestore
      .collection("storyBriefs")
      .orderBy("createdAt", "desc")
      .get();

    const briefs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      data: briefs,
    });
  } catch (error: any) {
    console.error("Error listing story briefs:", error);

    res.status(500).json({
      success: false,
      error: "Failed to list story briefs",
      details: error.message,
    });
  }
};

/**
 * Get a single story brief by ID
 */
export const getStoryBriefById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    const briefDoc = await firestore.collection("storyBriefs").doc(briefId).get();

    if (!briefDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Story brief "${briefId}" not found`,
      });
      return;
    }

    const brief = {
      id: briefDoc.id,
      ...briefDoc.data(),
    };

    res.status(200).json({
      success: true,
      data: brief,
    });
  } catch (error: any) {
    console.error("Error fetching story brief:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch story brief",
      details: error.message,
    });
  }
};

/**
 * Create a new story brief (written by specialist)
 *
 * PHASE 1 FIX: createdBy is derived from the authenticated user session,
 * NOT from the request body. This guarantees clinical accountability —
 * we always know which specialist authored the brief.
 */
export const createStoryBrief = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!; // Guaranteed by requireAuth middleware
    const input = req.body as StoryBriefInput;

    // CRITICAL: Override createdBy with authenticated user identity
    // Ignore any createdBy value from the client
    const securedInput: StoryBriefInput = {
      ...input,
      createdBy: user.uid,
    };

    // Use the model's createStoryBrief helper which validates and sets system fields
    const storyBrief = createStoryBriefModel(securedInput);

    // Save to Firestore
    const docRef = await firestore
      .collection("storyBriefs")
      .add(storyBrief);

    // Log to audit trail
    await AuditTrail.log({
      action: "brief.created",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "storyBrief",
      resourceId: docRef.id,
      metadata: {
        topic: input.therapeuticFocus?.primaryTopic,
        ageGroup: input.childProfile?.ageGroup,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...storyBrief,
      },
    });
  } catch (error: any) {
    console.error("Error creating story brief:", error);

    res.status(400).json({
      success: false,
      error: "Failed to create story brief",
      details: error.message,
    });
  }
};

/**
 * Build a generation contract from a story brief ID
 *
 * PHASE 1 FIX: Logs "contract.built" to audit trail with actor info.
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

export const buildContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const user = req.user!;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    const contract = await buildGenerationContractFromBriefId(briefId, {
      firestore,
    });

    // Check if an existing contract exists and should be archived
    const existingContractDoc = await firestore.collection("generationContracts").doc(briefId).get();
    if (existingContractDoc.exists) {
      const existingContract = existingContractDoc.data() as GenerationContract;
      
      // Archive if contract was rejected or approved (preserve history)
      if (existingContract.status === "rejected" || existingContract.status === "approved") {
        const archiveReason = existingContract.status === "rejected" 
          ? "rebuilt_after_rejection"
          : "rebuilt_after_outdated_rules";
        
        await firestore
          .collection("generationContracts")
          .doc(briefId)
          .collection("history")
          .add({
            ...existingContract,
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
            archivedReason: archiveReason,
          });
      }
    }

    // Log to audit trail
    await AuditTrail.log({
      action: "contract.built",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract",
      resourceId: briefId,
      metadata: {
        status: contract.status,
        rulesVersionUsed: contract.rulesVersionUsed,
        errorCount: contract.errors.length,
        warningCount: contract.warnings.length,
      },
    });

    // Read the contract back from Firestore to get resolved timestamps
    // (createdAt and updatedAt are FieldValue.serverTimestamp() until saved)
    const savedContractDoc = await firestore
      .collection("generationContracts")
      .doc(briefId)
      .get();

    if (!savedContractDoc.exists) {
      // Contract wasn't saved (shouldn't happen, but handle gracefully)
      console.warn(`Contract ${briefId} not found in Firestore after build`);
      res.status(500).json({
        success: false,
        error: "Contract was not saved to Firestore",
      });
      return;
    }

    const savedContract = savedContractDoc.data() as GenerationContract;
    
    // Debug: Log the timestamp format to help diagnose issues
    if (process.env.NODE_ENV === "development" || process.env.ALLOW_UNAUTHENTICATED_REQUESTS === "true") {
      console.log(`[DEBUG] Contract ${briefId} createdAt type:`, typeof savedContract.createdAt, savedContract.createdAt?.constructor?.name);
      console.log(`[DEBUG] Contract ${briefId} createdAt value:`, savedContract.createdAt);
      console.log(`[DEBUG] Serialized createdAt:`, serializeTimestamp(savedContract.createdAt));
    }

    // Serialize timestamps to ISO strings for JSON response
    const serializedContract: any = {
      ...savedContract,
      createdAt: serializeTimestamp(savedContract.createdAt),
      updatedAt: savedContract.updatedAt ? serializeTimestamp(savedContract.updatedAt) : undefined,
      approval: savedContract.approval
        ? {
            ...savedContract.approval,
            decidedAt: serializeTimestamp(savedContract.approval.decidedAt),
          }
        : undefined,
    };

    res.status(200).json({
      success: true,
      data: serializedContract,
    });
  } catch (error: any) {
    console.error("Error building generation contract:", error);

    res.status(500).json({
      success: false,
      error: "Failed to build generation contract",
      details: error.message,
    });
  }
};

/**
 * Preview a generation contract from a brief object (without saving to Firestore)
 * POST /api/agent1/contracts/preview
 */
export const previewContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { brief, briefId } = req.body;

    if (!brief) {
      res.status(400).json({
        success: false,
        error: "brief is required in request body",
      });
      return;
    }

    const tempBriefId = briefId || "preview_temp";
    const contract = await buildGenerationContract(
      tempBriefId,
      brief,
      { firestore },
      { skipSave: true } // Preview mode: don't save to Firestore
    );

    // Serialize timestamps for preview (createdAt will be FieldValue, so use current time as fallback)
    const serializedContract: any = {
      ...contract,
      createdAt: serializeTimestamp(contract.createdAt) || new Date().toISOString(),
      updatedAt: contract.updatedAt ? serializeTimestamp(contract.updatedAt) : undefined,
    };

    // Log preview to audit trail (lightweight, for traceability)
    if (req.user) {
      await AuditTrail.log({
        action: "contract.preview",
        actor: AuditTrail.actorFromRequest(req.user),
        resourceType: "generationContract",
        resourceId: tempBriefId,
        metadata: {
          status: contract.status,
          errorCount: contract.errors.length,
          warningCount: contract.warnings.length,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: serializedContract,
    });
  } catch (error: any) {
    console.error("Error previewing generation contract:", error);

    res.status(500).json({
      success: false,
      error: "Failed to preview generation contract",
      details: error.message,
    });
  }
};

/**
 * Apply override to a story brief and regenerate contract
 * POST /api/agent1/contracts/:briefId/override
 *
 * PHASE 1 FIX: When an override is applied, any previous approval is revoked.
 * The contract status is set back to "valid", requiring re-approval before generation.
 * This ensures the specialist reviews the changed contract.
 */
export const applyOverride = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { copingToolId, reason } = req.body;
    const user = req.user!;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    if (!copingToolId || typeof copingToolId !== "string") {
      res.status(400).json({
        success: false,
        error: "copingToolId is required and must be a string",
      });
      return;
    }

    // Check if existing contract was approved - if so, reason is required
    let existingContract: GenerationContract | null = null;
    let requiresReason = false;
    try {
      const existingContractDoc = await firestore
        .collection("generationContracts")
        .doc(briefId)
        .get();

      if (existingContractDoc.exists) {
        existingContract = existingContractDoc.data() as GenerationContract;
        requiresReason = existingContract?.status === "approved";
      }
    } catch (err) {
      console.warn(`Could not check existing contract for brief ${briefId}:`, err);
    }

    // Require reason if overriding an approved contract
    if (requiresReason && (!reason || typeof reason !== "string" || reason.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: "Override reason required",
        details: "Overriding an approved contract requires a clinical justification for the audit trail.",
      });
      return;
    }

    // Load the brief
    const briefDoc = await firestore.collection("storyBriefs").doc(briefId).get();
    if (!briefDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Story brief "${briefId}" not found`,
      });
      return;
    }

    const briefData = briefDoc.data();
    if (!briefData) {
      res.status(404).json({
        success: false,
        error: `Story brief "${briefId}" has no data`,
      });
      return;
    }

    // Validate override: tool exists and is allowed for age
    const ageBand = briefData.childProfile?.ageGroup;
    if (!ageBand) {
      res.status(400).json({
        success: false,
        error: "Cannot validate override: brief missing ageBand",
      });
      return;
    }

    const rules = await loadClinicalRules(undefined, firestore);
    const copingTool = rules.copingTools[copingToolId];

    if (!copingTool) {
      res.status(400).json({
        success: false,
        error: `Coping tool "${copingToolId}" not found in rules`,
      });
      return;
    }

    if (!copingTool.allowedAges.includes(ageBand)) {
      res.status(400).json({
        success: false,
        error: `Coping tool "${copingToolId}" is not allowed for age band "${ageBand}"`,
      });
      return;
    }

    // --- Check if a previous approval existed and prepare to revoke it ---
    let previousApprovalRevoked = false;
    let previousApprovals: ApprovalRecord[] = [];
    let overrideCount = 0;
    let overrideHistory: Array<{
      copingToolId: string;
      reason?: string;
      appliedAt: FieldValue | Timestamp | string;
      appliedBy: string;
      appliedByName: string;
    }> = [];
    let revokedApproval: ApprovalRecord | null = null;

    if (existingContract) {
      // Preserve previous approvals
      previousApprovals = existingContract.previousApprovals || [];
      
      // Track override count and history
      overrideCount = (existingContract.overrideCount || 0) + 1;
      overrideHistory = existingContract.overrideHistory || [];

      if (existingContract.status === "approved" && existingContract.approval) {
        previousApprovalRevoked = true;

        // Mark the current approval as revoked (will be added to previousApprovals in transaction)
        revokedApproval = {
          ...existingContract.approval,
          revokedAt: admin.firestore.FieldValue.serverTimestamp(),
          revokedReason: "override_applied",
        };
      }
    }

    // Check if an existing contract exists to preserve its rules version
    let existingRulesVersion: string | undefined = undefined;
    try {
      const existingContractDoc = await firestore
        .collection("generationContracts")
        .doc(briefId)
        .get();

      if (existingContractDoc.exists) {
        const existingContractData = existingContractDoc.data();
        if (existingContractData?.rulesVersionUsed) {
          existingRulesVersion = existingContractData.rulesVersionUsed as string;
        }
      }
    } catch (err) {
      console.warn(`Could not load existing contract for brief ${briefId}:`, err);
    }

    // Update brief with override
    await firestore.collection("storyBriefs").doc(briefId).update({
      overrides: {
        copingToolId,
        reason: reason || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Regenerate contract using the original rules version if available
    const contract = await buildGenerationContractFromBriefId(
      briefId,
      { firestore },
      existingRulesVersion ? { rulesVersion: existingRulesVersion } : undefined
    );

    // --- Ensure the rebuilt contract is NOT approved ---
    // The buildGenerationContract sets status to "valid" or "invalid" based on errors,
    // so a freshly built contract will never be "approved". This is correct behavior.
    // We add an explicit safety check as defense in depth.
    if (contract.status === "approved") {
      // This should never happen, but if it does, force it back
      await firestore.collection("generationContracts").doc(briefId).update({
        status: "valid",
        approval: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      contract.status = "valid";
    }

    // Add override to history
    // Note: FieldValue.serverTimestamp() cannot be used inside arrays
    // Use Timestamp.now() instead, which will be serialized correctly
    const overrideEntry: {
      copingToolId: string;
      reason?: string;
      appliedAt: any;
      appliedBy: string;
      appliedByName: string;
    } = {
      copingToolId,
      appliedAt: admin.firestore.Timestamp.now(),
      appliedBy: user.uid,
      appliedByName: user.displayName,
    };
    
    // Only include reason if it's provided (avoid undefined in Firestore)
    if (reason && reason.trim().length > 0) {
      overrideEntry.reason = reason.trim();
    }
    
    overrideHistory.push(overrideEntry);

    // Prepare audit entries
    const approvalRevokedAuditEntry = previousApprovalRevoked && revokedApproval
      ? {
          action: "contract.approval_revoked" as const,
          actor: AuditTrail.actorFromRequest(user),
          resourceType: "generationContract" as const,
          resourceId: briefId,
          relatedResourceId: briefId,
          metadata: {
            reason: "override_applied",
            previousApproval: existingContract!.approval,
            overrideCopingToolId: copingToolId,
            overrideReason: reason || null,
          },
        }
      : null;

    const overrideAppliedAuditEntry = {
      action: "contract.override_applied" as const,
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract" as const,
      resourceId: briefId,
      relatedResourceId: briefId,
      metadata: {
        copingToolId,
        overrideCount,
        reason: reason || null,
        previousApprovalRevoked,
        newStatus: contract.status,
        rulesVersionUsed: contract.rulesVersionUsed,
      },
    };

    // Update contract and log audit trail atomically using transaction
    const contractRef = firestore.collection("generationContracts").doc(briefId);
    await firestore.runTransaction(async (transaction) => {
      // Re-read contract in transaction to ensure consistency
      const contractDoc = await transaction.get(contractRef);
      if (!contractDoc.exists) {
        throw new Error("Contract not found during override");
      }

      const currentContract = contractDoc.data() as GenerationContract;
      
      // If approval was revoked, add it to previousApprovals
      const finalPreviousApprovals = [...previousApprovals];
      if (revokedApproval) {
        finalPreviousApprovals.push(revokedApproval);
      }

      // Update contract atomically
      transaction.update(contractRef, {
        overrideCount,
        overrideHistory,
        previousApprovals: finalPreviousApprovals,
        // Clear current approval if it was revoked
        ...(previousApprovalRevoked ? { approval: admin.firestore.FieldValue.delete() } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create audit entries atomically
      if (approvalRevokedAuditEntry) {
        const auditRef1 = firestore.collection("auditTrail").doc();
        transaction.set(auditRef1, {
          ...approvalRevokedAuditEntry,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const auditRef2 = firestore.collection("auditTrail").doc();
      transaction.set(auditRef2, {
        ...overrideAppliedAuditEntry,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Read the contract back from Firestore to get resolved timestamps
    const savedContractDoc = await firestore
      .collection("generationContracts")
      .doc(briefId)
      .get();

    const savedContract = savedContractDoc.exists
      ? (savedContractDoc.data() as GenerationContract)
      : contract;

    // Serialize timestamps to ISO strings for JSON response
    const serializedContract: any = {
      ...savedContract,
      createdAt: serializeTimestamp(savedContract.createdAt),
      updatedAt: savedContract.updatedAt ? serializeTimestamp(savedContract.updatedAt) : undefined,
      approval: savedContract.approval
        ? {
            ...savedContract.approval,
            decidedAt: serializeTimestamp(savedContract.approval.decidedAt),
            expiresAt: savedContract.approval.expiresAt
              ? serializeTimestamp(savedContract.approval.expiresAt)
              : undefined,
          }
        : undefined,
      previousApprovalRevoked, // Inform the client that re-approval is needed
      overrideCount: savedContract.overrideCount || 0,
    };

    res.status(200).json({
      success: true,
      data: serializedContract,
    });
  } catch (error: any) {
    console.error("Error applying override:", error);

    res.status(500).json({
      success: false,
      error: "Failed to apply override",
      details: error.message,
    });
  }
};
