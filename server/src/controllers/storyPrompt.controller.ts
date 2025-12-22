// src/controllers/storyPrompt.controller.ts
import { Request, Response } from "express";
import { firestore } from "../config/firebase";
import { retrieveKnowledgeForStory } from "../services/rag.service";
import { buildStoryDraftPrompt } from "../services/storyPromptBuilder";

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

    const snap = await firestore
      .collection("admin_story_briefs")
      .doc(briefId)
      .get();

    if (!snap.exists) {
      res.status(404).json({ success: false, error: "Story brief not found" });
      return;
    }

    const brief = { id: snap.id, ...snap.data() } as any;

    // 🔹 RAG happens HERE
    const ragContext = await retrieveKnowledgeForStory(brief);

    // 🔹 Prompt assembly happens HERE
    const prompt = buildStoryDraftPrompt(brief, ragContext);

    res.status(200).json({
      success: true,
      data: {
        topicKey: brief.topicKey,
        targetAgeGroup: brief.targetAgeGroup,
        prompt,
      },
    });
  } catch (error: any) {
    console.error("Error generating prompt preview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate prompt preview",
    });
  }
};
