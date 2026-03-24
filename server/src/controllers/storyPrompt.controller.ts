// src/controllers/storyPrompt.controller.ts
import { Request, Response } from "express";
import { firestore } from "../config/firebase";
import { GenerationContract } from "../models/generationContract.model";
import { buildPromptFromContract } from "../services/contractPromptBuilder";

/**
 * Preview the prompt that would be generated from a contract.
 * Shows the actual prompt as it goes to the LLM (for debugging).
 * This is a read-only operation - no database writes, no LLM calls.
 * 
 * GET /api/specialist/story-briefs/:briefId/prompt-preview
 */
export const previewStoryPrompt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { briefId } = req.params;

    if (!briefId) {
      res.status(400).json({ success: false, error: "briefId is required" });
      return;
    }

    // Load the generation contract for this brief
    const snap = await firestore
      .collection("generationContracts")
      .doc(briefId)
      .get();

    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Generation contract not found" });
      return;
    }

    const contract = snap.data() as GenerationContract;

    // Build the actual prompt as it goes to the LLM
    const promptPreview = buildPromptFromContract(contract);

    res.status(200).json({
      success: true,
      data: {
        promptPreview,
        ragSources: [],
      },
    });
  } catch (error: any) {
    console.error("Error generating prompt preview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate prompt preview",
      details: error.message,
    });
  }
};
