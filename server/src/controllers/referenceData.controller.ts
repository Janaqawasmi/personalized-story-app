// src/controllers/referenceData.controller.ts
import { Request, Response } from "express";
import {
  loadReferenceItems,
  loadSituations,
  loadSituationsByTopic,
  ReferenceDataCategory,
} from "../services/referenceData.service";

/**
 * Get reference items for a category
 * GET /api/reference-data/:category
 */
export const getReferenceItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    if (!category || !["topics", "emotionalGoals", "exclusions"].includes(category)) {
      res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: topics, emotionalGoals, exclusions`,
      });
      return;
    }

    const items = await loadReferenceItems(category as ReferenceDataCategory);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Error loading reference items:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load reference items",
      details: error.message,
    });
  }
};

/**
 * Get all situations
 * GET /api/reference-data/situations
 */
export const getSituations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await loadSituations();

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Error loading situations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load situations",
      details: error.message,
    });
  }
};

/**
 * Get situations filtered by topic (optional)
 * GET /api/reference-data/situations?topicKey=xxx
 * GET /api/reference-data/situations (returns all)
 */
export const getSituationsByTopic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topicKey } = req.query;

    let items;
    if (topicKey && typeof topicKey === "string") {
      items = await loadSituationsByTopic(topicKey);
    } else {
      items = await loadSituations();
    }

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Error loading situations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load situations",
      details: error.message,
    });
  }
};

