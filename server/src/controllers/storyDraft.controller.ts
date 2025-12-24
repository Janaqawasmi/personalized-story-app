// server/src/controllers/storyDraft.controller.ts
import { Request, Response } from "express";
import admin from "firebase-admin";
import { firestore } from "../config/firebase";
import { StoryBrief } from "../models/storyBrief.model";
import { StoryDraft, GenerateDraftInput, GenerationConfig } from "../models/storyDraft.model";

// Extend Express Request to include user from authentication middleware
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
  };
}

/**
 * Get a story draft by ID (READ-ONLY)
 * GET /api/story-drafts/:draftId
 */
export const getDraftById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;

    // Validate draftId
    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    // Validate authentication
    if (!req.user || !req.user.uid) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Fetch draft from Firestore
    const draftDoc = await firestore.collection("storyDrafts").doc(draftId).get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draftData = draftDoc.data() as StoryDraft;

    // Ensure status is "generated" (only generated drafts can be viewed)
    if (draftData.status !== "generated") {
      res.status(400).json({
        success: false,
        error: `Draft status is "${draftData.status}", only "generated" drafts can be viewed`,
      });
      return;
    }

    // Return only the fields requested for read-only view
    res.status(200).json({
      success: true,
      data: {
        id: draftDoc.id,
        title: draftData.title,
        generationConfig: draftData.generationConfig,
        pages: draftData.pages || [],
        createdAt: draftData.createdAt,
        updatedAt: draftData.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching draft:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch draft",
      details: error.message,
    });
  }
};

/**
 * Generate a story draft from a story brief
 * POST /api/admin/story-briefs/:briefId/generate-draft
 * 
 * TODO: Add idempotency protection for generate-draft
 */
export const generateDraftFromBrief = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { briefId } = req.params;
    const input = req.body as GenerateDraftInput;

    // Validate briefId
    if (!briefId) {
      res.status(400).json({
        success: false,
        error: "briefId parameter is required",
      });
      return;
    }

    // Validate authentication
    if (!req.user || !req.user.uid) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const createdBy = req.user.uid;

    // Validate input
    if (!input.length || !input.tone) {
      res.status(400).json({
        success: false,
        error: "length and tone are required",
      });
      return;
    }

    const briefRef = firestore.collection("storyBriefs").doc(briefId);
    const now = admin.firestore.Timestamp.now();

    // Load brief first to derive generationConfig
    const briefDoc = await briefRef.get();
    if (!briefDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Story brief not found",
      });
      return;
    }

    const briefData = briefDoc.data() as StoryBrief;

    // Validate brief status before transaction
    if (briefData.status !== "created") {
      res.status(409).json({
        success: false,
        error: `Cannot generate draft: brief status is "${briefData.status}", expected "created"`,
      });
      return;
    }

    // Derive generationConfig from StoryBrief (single source of truth)
    // TODO: Add language field to StoryBrief model to store target language
    //       For now, defaulting to Arabic as the primary language
    const generationConfig: GenerationConfig = {
      language: "ar", // TODO: Derive from briefData.language once added to StoryBrief model
      targetAgeGroup: briefData.childProfile.ageGroup,
      length: input.length,
      tone: input.tone,
      emphasis: input.emphasis ?? "balanced",
    };

    // Use transaction to ensure atomicity
    const draftId = await firestore.runTransaction(async (transaction) => {
      // Re-check brief status in transaction (optimistic locking)
      const briefDocInTx = await transaction.get(briefRef);
      if (!briefDocInTx.exists) {
        throw new Error("Story brief not found");
      }

      const briefDataInTx = briefDocInTx.data() as StoryBrief;
      if (briefDataInTx.status !== "created") {
        throw new Error(`Cannot generate draft: brief status is "${briefDataInTx.status}", expected "created"`);
      }

      // Update brief status to "draft_generating" and lock it
      transaction.update(briefRef, {
        status: "draft_generating",
        lockedAt: now,
        updatedAt: now,
      });

      // Create new draft with "generating" status
      const draftRef = firestore.collection("storyDrafts").doc();
      const draft: Omit<StoryDraft, "title" | "pages"> = {
        briefId,
        createdBy,
        status: "generating",
        version: 1,
        generationConfig,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(draftRef, draft);

      return draftRef.id;
    });

    try {
      const mockDraft = generateMockDraft(generationConfig);

      // Update draft with generated content
      const draftRef = firestore.collection("storyDrafts").doc(draftId);
      await draftRef.update({
        status: "generated",
        title: mockDraft.title,
        pages: mockDraft.pages,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Update brief status to "draft_generated"
      await briefRef.update({
        status: "draft_generated",
        lockedByDraftId: draftId,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(201).json({
        success: true,
        draftId,
        status: "generated",
      });
    } catch (generationError: any) {
      // If generation fails, update draft and brief status
      const draftRef = firestore.collection("storyDrafts").doc(draftId);
      await draftRef.update({
        status: "failed",
        error: {
          message: generationError.message || "Failed to generate draft",
        },
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Reset brief status back to "created" and unlock
      const briefUpdateData: any = {
        status: "created",
        updatedAt: admin.firestore.Timestamp.now(),
      };
      briefUpdateData.lockedAt = admin.firestore.FieldValue.delete();
      
      await briefRef.update(briefUpdateData);

      throw generationError;
    }
  } catch (error: any) {
    console.error("Error generating draft:", error);

    // Check if it's a conflict error (status not "created")
    if (error.message?.includes("Cannot generate draft")) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Check if brief not found
    if (error.message?.includes("not found")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to generate story draft",
      details: error.message,
    });
  }
};

/**
 * Generate mock draft content (hardcoded for now, no LLM)
 */
function generateMockDraft(config: GenerationConfig): {
  title: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    imagePrompt: string;
    emotionalTone?: string;
  }>;
} {
  // Mock content based on language
  if (config.language === "ar") {
    return {
      title: "قصة جميلة",
      pages: [
        {
          pageNumber: 1,
          text: "كان هناك طفل اسمه {{child_name}} يحب اللعب في الحديقة.",
          imagePrompt: "A happy child playing in a sunny garden with flowers and trees",
          emotionalTone: "calm",
        },
        {
          pageNumber: 2,
          text: "في أحد الأيام، شعر {{child_name}} بالخوف قليلاً من شيء جديد.",
          imagePrompt: "A child looking slightly worried or curious about something new",
          emotionalTone: "gentle",
        },
        {
          pageNumber: 3,
          text: "لكن مع دعم من حوله، أصبح {{child_name}} يشعر بالأمان مرة أخرى.",
          imagePrompt: "A child feeling safe and supported with a smile",
          emotionalTone: "warm",
        },
      ],
    };
  } else {
    // Hebrew
    return {
      title: "סיפור יפה",
      pages: [
        {
          pageNumber: 1,
          text: "היה פעם ילד בשם {{child_name}} שאהב לשחק בגינה.",
          imagePrompt: "A happy child playing in a sunny garden with flowers and trees",
          emotionalTone: "calm",
        },
        {
          pageNumber: 2,
          text: "יום אחד, {{child_name}} הרגיש קצת פחד ממשהו חדש.",
          imagePrompt: "A child looking slightly worried or curious about something new",
          emotionalTone: "gentle",
        },
        {
          pageNumber: 3,
          text: "אבל עם תמיכה מסביב, {{child_name}} הרגיש שוב בטוח.",
          imagePrompt: "A child feeling safe and supported with a smile",
          emotionalTone: "warm",
        },
      ],
    };
  }
}
