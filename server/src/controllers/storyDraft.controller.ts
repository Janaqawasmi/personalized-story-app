import { Request, Response } from "express";
import { db } from "../config/firebase";
import { retrieveKnowledgeForStory } from "../services/rag.service";
import { generateStoryDraft } from "../services/storyGenerator.service";
import { StoryBrief } from "../models/storyBrief.model";

export const generateDraftFromBrief = async (req: Request, res: Response) => {
  try {
    const briefId = req.params.briefId;

    if (!briefId) {
      return res.status(400).json({ error: "briefId parameter is required" });
    }

    // 1. Retrieve the story brief
    const briefSnap = await db.collection("admin_story_briefs").doc(briefId).get();

    if (!briefSnap.exists) {
      return res.status(404).json({ error: "Story brief not found" });
    }

    const briefData = briefSnap.data();
    if (!briefData) {
      return res.status(404).json({ error: "Story brief data not found" });
    }

    const brief = { id: briefSnap.id, ...briefData } as StoryBrief;

    // 2. Retrieve RAG knowledge context
    const ragContext = await retrieveKnowledgeForStory(brief);

    // 3. Generate story draft via LLM
    const storyDraftResult = await generateStoryDraft(brief, ragContext);

    // 4. Save the draft into Firestore
    const draftDocRef = await db.collection("story_drafts").add({
      briefId,
      title: storyDraftResult.draft.title,
      pages: storyDraftResult.draft.pages,
      status: "in_review",
      createdAt: new Date().toISOString(),
    });

    // 5. Update the brief status
    await db.collection("admin_story_briefs").doc(briefId).update({
      status: "generated",
      generatedDraftId: draftDocRef.id,
    });

    return res.json({
      success: true,
      draftId: draftDocRef.id,
      message: "Draft generated successfully",
    });
  } catch (error: any) {
    console.error("Error generating draft:", error);
    return res.status(500).json({
      error: "Failed to generate story draft",
      details: error.message,
    });
  }
};
