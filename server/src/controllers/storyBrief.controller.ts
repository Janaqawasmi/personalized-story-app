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
import { StoryBrief, createStoryBrief as createStoryBriefModel, StoryBriefInput } from "../models/storyBrief.model";
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

    res.status(200).json({
      success: true,
      data: contract,
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
      data: contract,
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

    // --- PHASE 1: Check if a previous approval existed and revoke it ---
    let previousApprovalRevoked = false;
    try {
      const existingContractDoc = await firestore
        .collection("generationContracts")
        .doc(briefId)
        .get();

      if (existingContractDoc.exists) {
        const existingContract = existingContractDoc.data();

        if (existingContract?.status === "approved") {
          previousApprovalRevoked = true;

          // Log that the approval was revoked due to override
          await AuditTrail.log({
            action: "contract.approval_revoked",
            actor: AuditTrail.actorFromRequest(user),
            resourceType: "generationContract",
            resourceId: briefId,
            metadata: {
              reason: "override_applied",
              previousApproval: existingContract.approval ?? null,
              overrideCopingToolId: copingToolId,
            },
          });
        }
      }
    } catch (err) {
      console.warn(`Could not check existing contract for brief ${briefId}:`, err);
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

    // --- PHASE 1: Ensure the rebuilt contract is NOT approved ---
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

    // Log override to audit trail
    await AuditTrail.log({
      action: "contract.override_applied",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "generationContract",
      resourceId: briefId,
      metadata: {
        copingToolId,
        reason: reason || null,
        previousApprovalRevoked,
        newStatus: contract.status,
        rulesVersionUsed: contract.rulesVersionUsed,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        ...contract,
        previousApprovalRevoked, // Inform the client that re-approval is needed
      },
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
