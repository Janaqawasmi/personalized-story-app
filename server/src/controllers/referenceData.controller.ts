// src/controllers/referenceData.controller.ts
import { Request, Response } from "express";
import { db } from "../config/firebase";
import {
  loadReferenceItems,
  loadSituations,
  loadSituationsByTopic,
  ReferenceDataCategory,
  SituationReferenceItem,
} from "../services/referenceData.service";

const VALID_CATEGORIES: ReferenceDataCategory[] = [
  "topics", "situations", "emotionalGoals", "exclusions",
  "generalSituations", "specificSituations", "contentExclusions",
  "therapeuticMechanisms", "copingTools", "copingToolGroups", "emotionalArcs",
  "languageComplexities", "emotionalTones", "topicSensitivities",
  "endingStyles", "protagonistTypes", "protagonistAgeRelations",
  "protagonistGenders", "caregiverRoles", "peakIntensities",
  "supportCharacterTypes", "supportCharacterRoles",
];

/**
 * Get reference items for a category
 * GET /api/reference-data/:category
 */
export const getReferenceItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    if (!category || !VALID_CATEGORIES.includes(category as ReferenceDataCategory)) {
      res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
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

/**
 * Generic handler for filtered situation-like collections (v2.0).
 * Supports any query parameter as a Firestore filter.
 *
 * GET /api/reference-data/generalSituations?topicKey=school_fears
 * GET /api/reference-data/specificSituations?generalSituationKey=separation
 */
export const getFilteredSituations = (collection: "generalSituations" | "specificSituations") =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filterEntries = Object.entries(req.query).filter(
        ([, v]) => typeof v === "string" && v.length > 0
      ) as [string, string][];

      let query: FirebaseFirestore.Query = db
        .collection("referenceData")
        .doc(collection)
        .collection("items")
        .where("active", "==", true);

      for (const [field, value] of filterEntries) {
        query = query.where(field, "==", value);
      }

      // Sort in-memory to avoid requiring a composite index for every filter combination
      const snapshot = await query.get();

      const items: SituationReferenceItem[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            key: doc.id,
            label_en: data.label_en || "",
            label_ar: data.label_ar || "",
            label_he: data.label_he || "",
            active: true,
            topicKey: data.topicKey || "",
            generalSituationKey: data.generalSituationKey || undefined,
            _order: typeof data.order === "number" ? data.order : 999,
          };
        })
        .sort((a, b) => a._order - b._order)
        .map(({ _order, ...rest }) => rest);

      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      console.error(`Error loading ${collection}:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to load ${collection}`,
        details: error.message,
      });
    }
  };

/**
 * Get platform-level reference config.
 * GET /api/reference-data/config
 *
 * Stored at: referenceData/config
 * Example fields:
 *   - platformMinAge: number
 *   - platformMaxAge: number
 */
export const getReferenceConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const configDoc = await db.collection("referenceData").doc("config").get();

    if (!configDoc.exists) {
      res.status(200).json({
        success: true,
        data: {},
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: configDoc.data() || {},
    });
  } catch (error: any) {
    console.error("Error loading reference config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load reference config",
      details: error.message,
    });
  }
};

