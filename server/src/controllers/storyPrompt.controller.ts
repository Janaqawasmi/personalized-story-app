// src/controllers/storyPrompt.controller.ts
import { Request, Response } from "express";
import { firestore } from "../config/firebase";
import { StoryBrief } from "../models/storyBrief.model";
import { loadWritingRules } from "../services/ragWritingRules.service";
import { buildStoryDraftPrompt } from "../services/storyPromptBuilder";

/**
 * Preview the prompt that would be generated for a story brief.
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

    // Load the story brief
    const snap = await firestore
      .collection("storyBriefs")
      .doc(briefId)
      .get();

    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Story brief not found" });
      return;
    }

    const brief = { id: snap.id, ...snap.data() } as StoryBrief;

    // Load ONLY rag_writing_rules (single RAG source)
    const ragRulesText = await loadWritingRules();

    // Build the actual prompt as it goes to the LLM
    const promptPreview = buildStoryDraftPrompt(brief, ragRulesText);

    res.status(200).json({
      success: true,
      data: {
        promptPreview,
        ragSources: ["rag_writing_rules"],
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
