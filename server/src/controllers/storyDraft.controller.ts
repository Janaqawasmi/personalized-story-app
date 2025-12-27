// server/src/controllers/storyDraft.controller.ts
import { Request, Response } from "express";
import admin from "firebase-admin";
import { firestore } from "../config/firebase";
import { StoryBrief } from "../models/storyBrief.model";
import { StoryDraft, GenerateDraftInput, GenerationConfig, DraftPage } from "../models/storyDraft.model";
import { buildStoryDraftPrompt } from "../services/storyPromptBuilder";
import { loadWritingRules } from "../services/ragWritingRules.service";
import { generateStoryDraft } from "../services/llmClient.service";
import { parseDraftOutput } from "../services/draftParser.service";

// TODO: AUTH - Add authentication middleware in later phase
// Extend Express Request to include user from authentication middleware
// interface AuthenticatedRequest extends Request {
//   user?: {
//     uid: string;
//   };
// }

/**
 * List all generated drafts (READ-ONLY)
 * GET /api/story-drafts
 * 
 * TODO: AUTH - Re-introduce authentication middleware to extract req.user.uid
 */
export const listDrafts = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Query for drafts that can be viewed (collection name: storyDrafts)
    // Include "generated", "editing", and "approved" statuses
    // Note: We filter by status and sort in memory to avoid requiring a composite index
    const snapshot = await firestore
      .collection("storyDrafts")
      .where("status", "in", ["generated", "editing", "approved"])
      .get();

    const drafts = snapshot.docs
      .map((doc) => {
        const data = doc.data() as StoryDraft;
        return {
          id: doc.id,
          briefId: data.briefId,
          title: data.title,
          generationConfig: data.generationConfig,
          status: data.status,
          revisionCount: data.revisionCount || 0,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      })
      // Sort in memory by createdAt descending (newest first)
      // Note: createdAt is already a Firestore Timestamp object at this point
      .sort((a, b) => {
        const aTime = a.createdAt instanceof admin.firestore.Timestamp 
          ? a.createdAt.seconds 
          : (a.createdAt as any)?.seconds || 0;
        const bTime = b.createdAt instanceof admin.firestore.Timestamp 
          ? b.createdAt.seconds 
          : (b.createdAt as any)?.seconds || 0;
        return bTime - aTime; // Descending order (newest first)
      });

    res.status(200).json({
      success: true,
      data: drafts,
    });
  } catch (error: any) {
    console.error("Error listing drafts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list drafts",
      details: error.message,
    });
  }
};

/**
 * Get a story draft by ID (READ-ONLY)
 * GET /api/story-drafts/:draftId
 * 
 * TODO: AUTH - Re-introduce authentication middleware to extract req.user.uid
 */
export const getDraftById = async (req: Request, res: Response): Promise<void> => {
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

    // TODO: AUTH - Re-introduce authentication check when auth middleware is added
    // if (!req.user || !req.user.uid) {
    //   res.status(401).json({
    //     success: false,
    //     error: "Authentication required",
    //   });
    //   return;
    // }

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

    // Allow viewing drafts in "generated", "editing", or "approved" status
    if (!["generated", "editing", "approved"].includes(draftData.status)) {
      res.status(400).json({
        success: false,
        error: `Draft status is "${draftData.status}", cannot view draft`,
      });
      return;
    }

    // Return only the fields requested for read-only view
    res.status(200).json({
      success: true,
      data: {
        id: draftDoc.id,
        briefId: draftData.briefId,
        title: draftData.title,
        generationConfig: draftData.generationConfig,
        pages: draftData.pages || [],
        status: draftData.status,
        revisionCount: draftData.revisionCount || 0,
        approvedAt: draftData.approvedAt,
        approvedBy: draftData.approvedBy,
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
 * TODO: AUTH - Re-introduce authentication middleware to extract req.user.uid
 */
export const generateDraftFromBrief = async (req: Request, res: Response): Promise<void> => {
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

    // TODO: AUTH - Re-introduce authentication check when auth middleware is added
    // if (!req.user || !req.user.uid) {
    //   res.status(401).json({
    //     success: false,
    //     error: "Authentication required",
    //   });
    //   return;
    // }

    // TODO: AUTH - Replace with req.user.uid when authentication is implemented
    const createdBy = "system_specialist";

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
        revisionCount: 0,
        generationConfig,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(draftRef, draft);

      return draftRef.id;
    });

    // Generation happens AFTER transaction (LLM call outside transaction)
    const startTime = Date.now();
    let rawModelOutput: string | undefined;
    
    try {
      // Build prompt using existing prompt builder
      const ragContext = await loadWritingRules();
      const prompt = buildStoryDraftPrompt(briefData, ragContext);

      // Call LLM
      rawModelOutput = await generateStoryDraft(prompt);
      
      // Parse output
      const parsedDraft = parseDraftOutput(rawModelOutput);

      const generationDuration = Date.now() - startTime;

      // Log generation (minimal - no prompt or content)
      console.log(`Draft generated: draftId=${draftId}, duration=${generationDuration}ms, pages=${parsedDraft.pages.length}`);

      // Update draft with generated content
      const draftRef = firestore.collection("storyDrafts").doc(draftId);
      await draftRef.update({
      status: "generated",
        title: parsedDraft.title,
        pages: parsedDraft.pages,
        rawModelOutput: rawModelOutput, // Store raw output for debugging
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
      const generationDuration = Date.now() - startTime;
      
      // Log error (minimal)
      console.error(`Draft generation failed: draftId=${draftId}, duration=${generationDuration}ms, error=${generationError.message}`);

      // Determine error reason
      let errorReason = "GENERATION_ERROR";
      if (generationError.message?.includes("parse") || generationError.message?.includes("JSON")) {
        errorReason = "PARSE_ERROR";
      }

      // If generation fails, update draft and brief status
      const draftRef = firestore.collection("storyDrafts").doc(draftId);
      const updateData: any = {
        status: "failed",
        error: {
          message: generationError.message || "Failed to generate draft",
          reason: errorReason,
        },
        updatedAt: admin.firestore.Timestamp.now(),
      };
      
      // Store raw output if available (even on failure, for debugging)
      if (rawModelOutput) {
        updateData.rawModelOutput = rawModelOutput;
      }
      
      await draftRef.update(updateData);

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
 * Enter edit mode for a draft
 * POST /api/story-drafts/:draftId/edit
 * 
 * NOTE: Edit mode is now a UI-only state. This endpoint exists for compatibility
 * but does not change draft status. Status only changes when edits are saved.
 */
export const enterEditMode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draftData = draftDoc.data() as StoryDraft;

    // Edit mode is now purely a UI state - return current status
    // Status will only change when edits are saved
    res.status(200).json({
      success: true,
      status: draftData.status,
    });
  } catch (error: any) {
    console.error("Error entering edit mode:", error);
    res.status(500).json({
      success: false,
      error: "Failed to enter edit mode",
      details: error.message,
    });
  }
};

/**
 * Cancel edit mode
 * POST /api/story-drafts/:draftId/cancel-edit
 * 
 * NOTE: Edit mode is now a UI-only state. This endpoint exists for compatibility
 * but does not change draft status. Status reflects content revisions, not UI mode.
 */
export const cancelEditMode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draftData = draftDoc.data() as StoryDraft;

    // Edit mode is now purely a UI state - return current status unchanged
    res.status(200).json({
      success: true,
      status: draftData.status,
    });
  } catch (error: any) {
    console.error("Error canceling edit mode:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel edit mode",
      details: error.message,
    });
  }
};

/**
 * Update a draft (save edits)
 * PATCH /api/story-drafts/:draftId
 * 
 * Saves edits to a draft. Allowed if status === "generated" or "editing".
 * Status changes to "editing" (meaning "revised") when first saved from "generated".
 */
export const updateDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;
    const updateData = req.body as {
      title?: string;
      pages: DraftPage[];
    };

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    if (!updateData.pages || !Array.isArray(updateData.pages)) {
      res.status(400).json({
        success: false,
        error: "pages array is required",
      });
      return;
    }

    // TODO: AUTH - Replace with req.user.uid when authentication is implemented
    // const userId = req.user?.uid || "system_specialist";

    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draftData = draftDoc.data() as StoryDraft;

    // Allow saving if status is "generated" or "editing" (not "approved" or "failed")
    if (draftData.status !== "generated" && draftData.status !== "editing") {
      res.status(409).json({
        success: false,
        error: `Cannot save edits: draft status is "${draftData.status}", must be "generated" or "editing"`,
      });
      return;
    }

    // Validate page numbers are sequential
    const sortedPages = [...updateData.pages].sort((a, b) => a.pageNumber - b.pageNumber);
    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      if (!page || page.pageNumber !== i + 1) {
        res.status(400).json({
          success: false,
          error: `Page numbers must be sequential starting from 1. Found page ${page?.pageNumber ?? 'unknown'} at position ${i + 1}`,
        });
        return;
      }
    }

    // Validate minimum page count
    if (sortedPages.length < 3) {
      res.status(400).json({
        success: false,
        error: "Draft must have at least 3 pages",
      });
      return;
    }

    // Update draft with new content and increment revision count
    const currentRevisionCount = draftData.revisionCount || 0;
    const newStatus = draftData.status === "generated" ? "editing" : draftData.status; // Mark as revised on first save
    
    await draftRef.update({
      ...(updateData.title !== undefined && { title: updateData.title }),
      pages: updateData.pages,
      revisionCount: currentRevisionCount + 1,
      status: newStatus, // Set to "editing" (revised) if was "generated"
      updatedAt: admin.firestore.Timestamp.now(),
    });

    res.status(200).json({
      success: true,
      status: newStatus,
      revisionCount: currentRevisionCount + 1,
    });
  } catch (error: any) {
    console.error("Error updating draft:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update draft",
      details: error.message,
    });
  }
};

/**
 * Approve a draft (finalize and create template)
 * POST /api/story-drafts/:draftId/approve
 * 
 * Approves a draft, making it immutable and creating a StoryTemplate.
 * Only allowed if status === "editing" OR "generated"
 */
export const approveDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    // TODO: AUTH - Replace with req.user.uid when authentication is implemented
    const approvedBy = "system_specialist";

    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draftData = draftDoc.data() as StoryDraft;

    // Only allow approval if status is "editing" or "generated"
    if (draftData.status !== "editing" && draftData.status !== "generated") {
      res.status(409).json({
        success: false,
        error: `Cannot approve draft: draft status is "${draftData.status}", expected "editing" or "generated"`,
      });
      return;
    }

    // Ensure draft has required content
    if (!draftData.title || !draftData.pages || draftData.pages.length === 0) {
      res.status(400).json({
        success: false,
        error: "Cannot approve draft: missing title or pages",
      });
      return;
    }

    const now = admin.firestore.Timestamp.now();

    // Use transaction to ensure atomicity
    await firestore.runTransaction(async (transaction) => {
      // Re-check draft status in transaction
      const draftDocInTx = await transaction.get(draftRef);
      if (!draftDocInTx.exists) {
        throw new Error("Draft not found");
      }

      const draftDataInTx = draftDocInTx.data() as StoryDraft;
      if (draftDataInTx.status !== "editing" && draftDataInTx.status !== "generated") {
        throw new Error(`Cannot approve draft: draft status is "${draftDataInTx.status}", expected "editing" or "generated"`);
      }

      // Fetch the brief to get topic, situation, and age group
      if (!draftDataInTx.briefId) {
        throw new Error("Cannot approve draft: missing briefId");
      }
      const briefRef = firestore.collection("storyBriefs").doc(draftDataInTx.briefId);
      const briefDocInTx = await transaction.get(briefRef);
      if (!briefDocInTx.exists) {
        throw new Error("Story brief not found");
      }
      const briefData = briefDocInTx.data() as StoryBrief;

      // Update draft to "approved" status
      transaction.update(draftRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: approvedBy,
        updatedAt: now,
      });

      // Create StoryTemplate document
      const templateRef = firestore.collection("story_templates").doc();
      
      // Re-validate required fields inside transaction
      if (!draftDataInTx.title || !draftDataInTx.pages || draftDataInTx.pages.length === 0) {
        throw new Error("Cannot approve draft: missing title or pages");
      }
      
      transaction.set(templateRef, {
        draftId: draftId,
        briefId: draftDataInTx.briefId,
        title: draftDataInTx.title,
        status: "approved",
        // Topic and situation from brief
        primaryTopic: briefData.therapeuticFocus.primaryTopic,
        specificSituation: briefData.therapeuticFocus.specificSituation,
        ageGroup: briefData.childProfile.ageGroup,
        generationConfig: draftDataInTx.generationConfig,
        pages: draftDataInTx.pages.map((page) => ({
          pageNumber: page.pageNumber,
          textTemplate: page.text,
          emotionalTone: page.emotionalTone || "",
          imagePromptTemplate: page.imagePrompt || "",
        })),
        createdAt: now,
        approvedAt: now,
        approvedBy: approvedBy,
      });
    });

    res.status(200).json({
      success: true,
      status: "approved",
      message: "Draft approved and template created",
    });
  } catch (error: any) {
    console.error("Error approving draft:", error);

    if (error.message?.includes("Cannot approve draft") || error.message?.includes("not found")) {
      res.status(error.message?.includes("not found") ? 404 : 409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to approve draft",
      details: error.message,
    });
  }
};
