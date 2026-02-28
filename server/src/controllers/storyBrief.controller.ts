import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import { StoryBrief, createStoryBrief as createStoryBriefModel, StoryBriefInput } from "../models/storyBrief.model";
import { buildGenerationContractFromBriefId, buildGenerationContract } from "../agents/agent1/buildGenerationContract";
import { loadClinicalRules } from "../services/clinicalRules.service";
import type { SpecialistOverrides } from "../models/generationContract.model";

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
 * Automatically builds a generation contract after creation (Agent 1)
 */
export const createStoryBrief = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as StoryBriefInput;

    // Use the model's createStoryBrief helper which validates and sets system fields
    const storyBrief = createStoryBriefModel(input);

    // Save to Firestore
    const docRef = await firestore
      .collection("storyBriefs")
      .add(storyBrief);

    const briefId = docRef.id;

    // Auto-build contract (Agent 1) - fire and forget (don't block response)
    buildGenerationContractFromBriefId(briefId, { firestore })
      .then((contract) => {
        console.log(`[createStoryBrief] Auto-built contract for brief ${briefId}. status=${contract.status}, reviewStatus=${contract.reviewStatus}`);
      })
      .catch((err) => {
        console.error(`[createStoryBrief] Failed to auto-build contract for brief ${briefId}:`, err);
        // Non-critical: contract can be built manually later
      });

    res.status(201).json({
      success: true,
      data: {
        id: briefId,
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
 */
export const buildContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    console.log(`[buildContract] Rebuilding contract for brief ${briefId}...`);
    const contract = await buildGenerationContractFromBriefId(briefId, {
      firestore,
    });
    console.log(`[buildContract] Done. status=${contract.status}, reviewStatus=${contract.reviewStatus}`);

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
 * Get a persisted generation contract by brief ID
 * GET /api/agent1/contracts/:briefId
 */
export const getContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId is required",
      });
      return;
    }

    const contractDoc = await firestore.collection("generationContracts").doc(briefId).get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Generation contract for brief "${briefId}" not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: contractDoc.data(),
    });
  } catch (error: any) {
    console.error("Error fetching generation contract:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch generation contract",
      details: error.message,
    });
  }
};

/**
 * Apply specialist overrides to a story brief and regenerate the contract.
 * Accepts a full SpecialistOverrides payload (copingToolId, add/remove
 * required elements, add/remove must-avoid, sensitivity, ending style,
 * caregiver presence, key message, scene length).
 *
 * POST /api/agent1/contracts/:briefId/override
 */
export const applyOverride = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const overrides = req.body; // SpecialistOverrides payload

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    if (!overrides || typeof overrides !== "object") {
      res.status(400).json({ success: false, error: "Request body must be an overrides object" });
      return;
    }

    // Load the brief
    const briefDoc = await firestore.collection("storyBriefs").doc(briefId).get();
    if (!briefDoc.exists) {
      res.status(404).json({ success: false, error: `Story brief "${briefId}" not found` });
      return;
    }

    const briefData = briefDoc.data();
    if (!briefData) {
      res.status(404).json({ success: false, error: `Story brief "${briefId}" has no data` });
      return;
    }

    const ageBand = briefData.childProfile?.ageGroup;

    // --- Validate coping tool override if provided ---
    if (overrides.copingToolId) {
      if (!ageBand) {
        res.status(400).json({ success: false, error: "Cannot validate coping tool: brief missing ageGroup" });
        return;
      }
      const rules = await loadClinicalRules(undefined, firestore);
      const copingTool = rules.copingTools[overrides.copingToolId];
      if (!copingTool) {
        res.status(400).json({ success: false, error: `Coping tool "${overrides.copingToolId}" not found in rules` });
        return;
      }
      if (!copingTool.allowedAges.includes(ageBand)) {
        res.status(400).json({ success: false, error: `Coping tool "${overrides.copingToolId}" is not allowed for age band "${ageBand}"` });
        return;
      }
    }

    // --- Validate scene count if provided ---
    if (overrides.minScenes !== undefined && (typeof overrides.minScenes !== "number" || overrides.minScenes < 1)) {
      res.status(400).json({ success: false, error: "minScenes must be a positive number" });
      return;
    }
    if (overrides.maxScenes !== undefined && (typeof overrides.maxScenes !== "number" || overrides.maxScenes < 1)) {
      res.status(400).json({ success: false, error: "maxScenes must be a positive number" });
      return;
    }
    if (overrides.maxWords !== undefined && (typeof overrides.maxWords !== "number" || overrides.maxWords < 50)) {
      res.status(400).json({ success: false, error: "maxWords must be a number >= 50" });
      return;
    }

    // --- Preserve existing rules version ---
    let existingRulesVersion: string | undefined;
    try {
      const existingContractDoc = await firestore.collection("generationContracts").doc(briefId).get();
      if (existingContractDoc.exists) {
        existingRulesVersion = existingContractDoc.data()?.rulesVersionUsed as string | undefined;
      }
    } catch {
      // non-critical
    }

    // --- Save overrides to the brief ---
    const overridesPayload: Record<string, any> = {
      ...overrides,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Remove undefined values to avoid Firestore errors
    for (const key of Object.keys(overridesPayload)) {
      if (overridesPayload[key] === undefined) {
        delete overridesPayload[key];
      }
    }

    await firestore.collection("storyBriefs").doc(briefId).update({
      overrides: overridesPayload,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- Derive reviewer from auth ---
    const reviewerId = (req as any).user?.uid || "specialist";
    const clinicalRationale = overrides.reason || undefined;

    // --- Regenerate contract with overrides applied ---
    const contract = await buildGenerationContractFromBriefId(
      briefId,
      { firestore },
      existingRulesVersion ? { rulesVersion: existingRulesVersion } : undefined,
      { reviewerId, clinicalRationale }
    );

    console.log(`[applyOverride] Overrides applied for brief ${briefId}. overrideUsed=${contract.overrideUsed}`);

    res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error: any) {
    console.error("Error applying overrides:", error);
    res.status(500).json({
      success: false,
      error: "Failed to apply overrides",
      details: error.message,
    });
  }
};

/**
 * Get the append-only review history (audit trail) for a generation contract
 *
 * GET /api/agent1/contracts/:briefId/reviews
 */
export const getReviewHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId parameter is required" });
      return;
    }

    const contractRef = firestore.collection("generationContracts").doc(briefId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      res.status(404).json({
        success: false,
        error: `Generation contract for brief "${briefId}" not found`,
      });
      return;
    }

    const reviewsSnapshot = await contractRef
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .get();

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, data: reviews });
  } catch (error: any) {
    console.error("Error fetching review history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch review history",
      details: error.message,
    });
  }
};

/**
 * Reset all specialist overrides on a story brief and regenerate the contract
 * from pure clinical rules (no overrides).
 *
 * DELETE /api/agent1/contracts/:briefId/override
 */
export const resetOverrides = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    const briefDoc = await firestore.collection("storyBriefs").doc(briefId).get();
    if (!briefDoc.exists) {
      res.status(404).json({ success: false, error: `Story brief "${briefId}" not found` });
      return;
    }

    // Preserve existing rules version if available
    let existingRulesVersion: string | undefined;
    try {
      const existingContractDoc = await firestore.collection("generationContracts").doc(briefId).get();
      if (existingContractDoc.exists) {
        existingRulesVersion = existingContractDoc.data()?.rulesVersionUsed as string | undefined;
      }
    } catch {
      // non-critical
    }

    // Remove overrides from the brief
    await firestore.collection("storyBriefs").doc(briefId).update({
      overrides: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- Derive reviewer from auth ---
    const reviewerId = (req as any).user?.uid || "specialist";

    // Regenerate contract without overrides
    const contract = await buildGenerationContractFromBriefId(
      briefId,
      { firestore },
      existingRulesVersion ? { rulesVersion: existingRulesVersion } : undefined,
      { reviewerId, clinicalRationale: "Overrides reset to clinical defaults" }
    );

    console.log(`[resetOverrides] Overrides cleared for brief ${briefId}. status=${contract.status}`);

    res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error: any) {
    console.error("Error resetting overrides:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset overrides",
      details: error.message,
    });
  }
};
