import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import { StoryBrief, createStoryBrief as createStoryBriefModel, StoryBriefInput } from "../models/storyBrief.model";
import { buildGenerationContractFromBriefId, buildGenerationContract } from "../agents/agent1/buildGenerationContract";
import { loadClinicalRules } from "../services/clinicalRules.service";

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

    const contract = await buildGenerationContractFromBriefId(briefId, {
      firestore,
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
 */
export const applyOverride = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const { copingToolId, reason } = req.body;

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
      // If we can't load existing contract, continue with default version
      console.warn(`Could not load existing contract for brief ${briefId}:`, err);
    }

    // Update brief with override
    await firestore.collection("storyBriefs").doc(briefId).update({
      overrides: {
        copingToolId,
        reason: reason || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Update root-level timestamp
    });

    // Regenerate contract using the original rules version if available
    const contract = await buildGenerationContractFromBriefId(
      briefId,
      { firestore },
      existingRulesVersion ? { rulesVersion: existingRulesVersion } : undefined
    );

    res.status(200).json({
      success: true,
      data: contract,
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
