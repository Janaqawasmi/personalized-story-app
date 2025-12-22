import { Request, Response } from "express";
import { db } from "../config/firebase";

/**
 * Get all available topic tags from rag_theme_patterns collection
 * Returns unique topic tags from all documents
 */
export const getTopicTags = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection("rag_theme_patterns").get();

    const allTags = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const topicTags = data.topicTags;
      
      if (Array.isArray(topicTags)) {
        topicTags.forEach((tag: string) => {
          if (typeof tag === "string" && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });

    const uniqueTags = Array.from(allTags).sort();

    res.status(200).json({
      success: true,
      data: uniqueTags,
    });
  } catch (error: any) {
    console.error("Error fetching topic tags:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch topic tags",
      details: error.message,
    });
  }
};

