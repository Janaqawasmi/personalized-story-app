import { Request, Response } from "express";
import { firestore } from "../config/firebase";
import { StoryBrief } from "../models/storyBrief.model";

/**
 * List all story briefs (newest first)
 */
export const listStoryBriefs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await firestore
      .collection("admin_story_briefs")
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
 * Create a new story brief (written by specialist)
 */
export const createStoryBrief = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      topicKey,
      targetAgeGroup,
      topicTags,
      therapeuticIntent,
      constraints,
      createdBy,
    } = req.body;

    // ─────────────────────────────
    // Validation (strict & explicit)
    // ─────────────────────────────
    if (!topicKey || !targetAgeGroup || !createdBy) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: topicKey, targetAgeGroup, createdBy",
      });
      return;
    }

    if (topicTags && !Array.isArray(topicTags)) {
      res.status(400).json({
        success: false,
        error: "topicTags must be an array of strings",
      });
      return;
    }

    if (therapeuticIntent && !Array.isArray(therapeuticIntent)) {
      res.status(400).json({
        success: false,
        error: "therapeuticIntent must be an array of strings",
      });
      return;
    }

    // ─────────────────────────────
    // Build Story Brief document
    // ─────────────────────────────
    const storyBrief: Omit<StoryBrief, "id"> = {
      topicKey,
      targetAgeGroup,
      topicTags: topicTags || [],
      therapeuticIntent: therapeuticIntent || [],
      constraints: constraints || {},
      status: "draft", // draft → generated → reviewed → approved
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await firestore
      .collection("admin_story_briefs")
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

    res.status(500).json({
      success: false,
      error: "Failed to create story brief",
      details: error.message,
    });
  }
};
