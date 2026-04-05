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
import {
  createLegacyStoryBrief,
  LegacyStoryBriefInput,
} from "../models/storyBrief.model";
import { GenerationContract, ApprovalRecord } from "../models/generationContract.model";
import { buildGenerationContractFromBriefId, buildGenerationContract } from "../agents/agent1/buildGenerationContract";
import { loadClinicalRules } from "../services/clinicalRules.service";
import { AuditTrail } from "../services/auditTrail.service";
import { serializeTimestamp, serializeContractForResponse } from "../utils/serializeTimestamp";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

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
    const input = req.body as LegacyStoryBriefInput;

    // CRITICAL: Override createdBy with authenticated user identity
    // Ignore any createdBy value from the client
    const securedInput: LegacyStoryBriefInput = {
      ...input,
      createdBy: user.uid,
    };

    const storyBrief = createLegacyStoryBrief(securedInput);

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

    // NOTE: Archiving of rejected/approved contracts is handled inside saveContractToFirestore()
    // in buildGenerationContract.ts. No need to archive here — by this point, the new contract
    // has already been saved (overwriting the old one), so reading the doc would return the
    // new contract, not the old one. (Dead code removed — confirmed by runtime logs, H1.)

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

// ============================================================================
// applyOverride — helper types and composed functions
// ============================================================================

/** Shape returned by validateCopingToolForBrief when validation fails */
interface OverrideValidationError {
  status: number;
  body: { success: boolean; error: string; details?: string };
}

/** All mutable state derived from the existing contract, needed by the transaction */
interface OverrideContext {
  existingContract: GenerationContract | null;
  previousApprovalRevoked: boolean;
  previousApprovals: ApprovalRecord[];
  overrideCount: number;
  overrideHistory: Array<{
    copingToolId: string;
    reason?: string;
    appliedAt: FieldValue | Timestamp | string;
    appliedBy: string;
    appliedByName: string;
  }>;
  revokedApproval: ApprovalRecord | null;
  existingRulesVersion: string | undefined;
}

/**
 * Loads the existing generation contract for a brief (if any).
 * Returns null if no contract exists or if the read fails.
 */
async function loadExistingContract(briefId: string): Promise<GenerationContract | null> {
  try {
    const doc = await firestore.collection("generationContracts").doc(briefId).get();
    return doc.exists ? (doc.data() as GenerationContract) : null;
  } catch (err) {
    console.warn(`Could not check existing contract for brief ${briefId}:`, err);
    return null;
  }
}

/**
 * Validates that the coping tool exists in clinical rules and is allowed for the brief's age band.
 * Returns null on success, or an error object on failure.
 */
async function validateCopingToolForBrief(
  briefId: string,
  copingToolId: string
): Promise<OverrideValidationError | null> {
  const briefDoc = await firestore.collection("storyBriefs").doc(briefId).get();
  if (!briefDoc.exists) {
    return { status: 404, body: { success: false, error: `Story brief "${briefId}" not found` } };
  }

  const briefData = briefDoc.data();
  if (!briefData) {
    return { status: 404, body: { success: false, error: `Story brief "${briefId}" has no data` } };
  }

  const ageBand = briefData.childProfile?.ageGroup;
  if (!ageBand) {
    return { status: 400, body: { success: false, error: "Cannot validate override: brief missing ageBand" } };
  }

  const rules = await loadClinicalRules(undefined, firestore);
  const copingTool = rules.copingTools[copingToolId];

  if (!copingTool) {
    return { status: 400, body: { success: false, error: `Coping tool "${copingToolId}" not found in rules` } };
  }

  if (!copingTool.allowedAges.includes(ageBand)) {
    return {
      status: 400,
      body: { success: false, error: `Coping tool "${copingToolId}" is not allowed for age band "${ageBand}"` },
    };
  }

  return null; // Valid
}

/**
 * Derives the override context from the existing contract:
 * - approval revocation state
 * - override tracking (count, history)
 * - existing rules version for rebuild
 */
function prepareOverrideContext(
  existingContract: GenerationContract | null,
): OverrideContext {
  const ctx: OverrideContext = {
    existingContract,
    previousApprovalRevoked: false,
    previousApprovals: [],
    overrideCount: 0,
    overrideHistory: [],
    revokedApproval: null,
    existingRulesVersion: existingContract?.rulesVersionUsed || undefined,
  };

  if (existingContract) {
    ctx.previousApprovals = existingContract.previousApprovals || [];
    ctx.overrideCount = (existingContract.overrideCount || 0) + 1;
    ctx.overrideHistory = existingContract.overrideHistory || [];

    if (existingContract.status === "approved" && existingContract.approval) {
      ctx.previousApprovalRevoked = true;
      ctx.revokedApproval = {
        ...existingContract.approval,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedReason: "override_applied",
      };
    }
  }

  return ctx;
}

/**
 * Updates the brief with the override and rebuilds the generation contract.
 * Includes a defense-in-depth safety check to ensure the rebuilt contract is never "approved".
 */
async function updateBriefAndRebuildContract(
  briefId: string,
  copingToolId: string,
  reason: string | undefined,
  existingRulesVersion: string | undefined
): Promise<GenerationContract> {
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

  // Defense in depth: rebuilt contracts must never be "approved"
  if (contract.status === "approved") {
    await firestore.collection("generationContracts").doc(briefId).update({
      status: "valid",
      approval: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    contract.status = "valid";
  }

  return contract;
}

/**
 * Builds the override history entry for the current override action.
 */
function buildOverrideHistoryEntry(
  copingToolId: string,
  reason: string | undefined,
  user: AuthenticatedUser
): OverrideContext["overrideHistory"][number] {
  const entry: any = {
    copingToolId,
    appliedAt: admin.firestore.Timestamp.now(),
    appliedBy: user.uid,
    appliedByName: user.displayName,
  };
  // Only include reason if provided (avoid undefined in Firestore)
  if (reason && reason.trim().length > 0) {
    entry.reason = reason.trim();
  }
  return entry;
}

/**
 * Executes the atomic Firestore transaction that:
 * - Updates contract metadata (override count, history, previous approvals)
 * - Clears current approval if it was revoked
 * - Writes audit trail entries
 */
async function executeOverrideTransaction(
  briefId: string,
  ctx: OverrideContext,
  user: AuthenticatedUser,
  copingToolId: string,
  reason: string | undefined,
  contract: GenerationContract
): Promise<void> {
  const contractRef = firestore.collection("generationContracts").doc(briefId);

  // Pre-build audit entries
  const approvalRevokedAudit = ctx.previousApprovalRevoked && ctx.revokedApproval
    ? {
        action: "contract.approval_revoked" as const,
        actor: AuditTrail.actorFromRequest(user),
        resourceType: "generationContract" as const,
        resourceId: briefId,
        relatedResourceId: briefId,
        metadata: {
          reason: "override_applied",
          previousApproval: ctx.existingContract!.approval,
          overrideCopingToolId: copingToolId,
          overrideReason: reason || null,
        },
      }
    : null;

  const overrideAppliedAudit = {
    action: "contract.override_applied" as const,
    actor: AuditTrail.actorFromRequest(user),
    resourceType: "generationContract" as const,
    resourceId: briefId,
    relatedResourceId: briefId,
    metadata: {
      copingToolId,
      overrideCount: ctx.overrideCount,
      reason: reason || null,
      previousApprovalRevoked: ctx.previousApprovalRevoked,
      newStatus: contract.status,
      rulesVersionUsed: contract.rulesVersionUsed,
    },
  };

  await firestore.runTransaction(async (transaction) => {
    const contractDoc = await transaction.get(contractRef);
    if (!contractDoc.exists) {
      throw new Error("Contract not found during override");
    }

    // Merge revoked approval into previous approvals list
    const finalPreviousApprovals = [...ctx.previousApprovals];
    if (ctx.revokedApproval) {
      finalPreviousApprovals.push(ctx.revokedApproval);
    }

    // Update contract metadata atomically
    transaction.update(contractRef, {
      overrideCount: ctx.overrideCount,
      overrideHistory: ctx.overrideHistory,
      previousApprovals: finalPreviousApprovals,
      ...(ctx.previousApprovalRevoked ? { approval: admin.firestore.FieldValue.delete() } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Write audit entries atomically
    if (approvalRevokedAudit) {
      const ref = firestore.collection("auditTrail").doc();
      transaction.set(ref, { ...approvalRevokedAudit, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    }

    const ref = firestore.collection("auditTrail").doc();
    transaction.set(ref, { ...overrideAppliedAudit, timestamp: admin.firestore.FieldValue.serverTimestamp() });
  });
}

/**
 * Reads the saved contract back from Firestore and serializes it for the HTTP response.
 */
async function readAndSerializeOverrideResponse(
  briefId: string,
  fallbackContract: GenerationContract,
  previousApprovalRevoked: boolean
): Promise<Record<string, any>> {
  const savedDoc = await firestore.collection("generationContracts").doc(briefId).get();
  const savedContract = savedDoc.exists ? (savedDoc.data() as GenerationContract) : fallbackContract;

  return serializeContractForResponse(savedContract, {
    previousApprovalRevoked,
    overrideCount: savedContract.overrideCount || 0,
  });
}

// ============================================================================
// applyOverride — main handler (orchestrates the composed functions above)
// ============================================================================

/**
 * Apply override to a story brief and regenerate contract
 * POST /api/agent1/contracts/:briefId/override
 *
 * When an override is applied, any previous approval is revoked.
 * The contract status is set back to "valid", requiring re-approval before generation.
 */
export const applyOverride = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { copingToolId, reason } = req.body;
    const user = req.user!;

    // ── 1. Input validation ──────────────────────────────────────────────────
    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }
    if (!copingToolId || typeof copingToolId !== "string") {
      res.status(400).json({ success: false, error: "copingToolId is required and must be a string" });
      return;
    }

    // ── 2. Load existing contract & check if reason is required ──────────────
    const existingContract = await loadExistingContract(briefId);
    if (existingContract?.status === "approved" &&
        (!reason || typeof reason !== "string" || reason.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: "Override reason required",
        details: "Overriding an approved contract requires a clinical justification for the audit trail.",
      });
      return;
    }

    // ── 3. Validate coping tool against clinical rules ───────────────────────
    const validationError = await validateCopingToolForBrief(briefId, copingToolId);
    if (validationError) {
      res.status(validationError.status).json(validationError.body);
      return;
    }

    // ── 4. Prepare override context (revocation, tracking, rules version) ────
    const ctx = prepareOverrideContext(existingContract);

    // ── 5. Update brief & rebuild contract ───────────────────────────────────
    const contract = await updateBriefAndRebuildContract(
      briefId, copingToolId, reason, ctx.existingRulesVersion
    );

    // ── 6. Append current override to history ────────────────────────────────
    ctx.overrideHistory.push(buildOverrideHistoryEntry(copingToolId, reason, user));

    // ── 7. Execute atomic transaction (contract metadata + audit trail) ──────
    await executeOverrideTransaction(briefId, ctx, user, copingToolId, reason, contract);

    // ── 8. Read back and respond ─────────────────────────────────────────────
    const responseData = await readAndSerializeOverrideResponse(
      briefId, contract, ctx.previousApprovalRevoked
    );
    res.status(200).json({ success: true, data: responseData });
  } catch (error: any) {
    console.error("Error applying override:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply override",
      details: error.message,
    });
  }
};
