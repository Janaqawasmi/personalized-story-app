import { Request, Response } from "express";
import { firestore } from "../config/firebase";
import { StoryBrief, createStoryBrief as createStoryBriefModel, StoryBriefInput } from "../models/storyBrief.model";

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
