// server/src/controllers/draftSuggestion.controller.ts
import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import { StoryDraft } from "../models/storyDraft.model";
import { DraftSuggestion, CreateSuggestionInput } from "../models/draftSuggestion.model";
import { createSuggestionForDraft } from "../services/draftSuggestion.service";

/**
 * Extend Express Request to include user from auth middleware
 */
interface AuthenticatedRequest extends Request {
  user?: { uid: string };
}

/**
 * Create a new AI suggestion for a draft
 * POST /api/story-drafts/:draftId/suggestions
 */
export const createSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    const input = req.body as CreateSuggestionInput;

    // Validate input
    if (!input.scope || !["page", "selection"].includes(input.scope)) {
      res.status(400).json({
        success: false,
        error: "scope must be 'page' or 'selection'",
      });
      return;
    }

    if (!input.originalText || typeof input.originalText !== "string") {
      res.status(400).json({
        success: false,
        error: "originalText is required and must be a string",
      });
      return;
    }

    if (!input.instruction || typeof input.instruction !== "string") {
      res.status(400).json({
        success: false,
        error: "instruction is required and must be a string",
      });
      return;
    }

    // Validate instruction length
    if (input.instruction.length > 400) {
      res.status(400).json({
        success: false,
        error: "instruction must be 400 characters or less",
      });
      return;
    }

    // Validate originalText length
    if (input.originalText.length > 4000) {
      res.status(400).json({
        success: false,
        error: "originalText must be 4000 characters or less",
      });
      return;
    }

    // Validate pageNumber if scope is "page"
    if (input.scope === "page") {
      if (input.pageNumber === undefined || typeof input.pageNumber !== "number") {
        res.status(400).json({
          success: false,
          error: "pageNumber is required when scope is 'page'",
        });
        return;
      }
      if (input.pageNumber < 1) {
        res.status(400).json({
          success: false,
          error: "pageNumber must be a positive integer",
        });
        return;
      }
    }

    // Create suggestion
    const suggestionParams: {
      draftId: string;
      pageNumber?: number;
      scope: "page" | "selection";
      originalText: string;
      instruction: string;
      createdBy: string;
    } = {
      draftId,
      scope: input.scope,
      originalText: input.originalText,
      instruction: input.instruction,
      createdBy: userId,
    };

    // Only include pageNumber if it's defined (required for "page" scope, validated above)
    if (input.pageNumber !== undefined) {
      suggestionParams.pageNumber = input.pageNumber;
    }

    const result = await createSuggestionForDraft(suggestionParams);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error creating suggestion:", error);
    
    // Handle specific error types
    if (error.message?.includes("not found")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message?.includes("status is") || error.message?.includes("does not exist")) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to create suggestion",
      details: error.message,
    });
  }
};

/**
 * List suggestions for a draft
 * GET /api/story-drafts/:draftId/suggestions
 */
export const listSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { draftId } = req.params;
    const statusFilter = req.query.status as string | undefined;

    if (!draftId) {
      res.status(400).json({
        success: false,
        error: "draftId parameter is required",
      });
      return;
    }

    // Verify draft exists
    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    // Build query
    let query = firestore.collection("draft_suggestions").where("draftId", "==", draftId);

    // Apply status filter if provided
    if (statusFilter && ["proposed", "accepted", "rejected"].includes(statusFilter)) {
      query = query.where("status", "==", statusFilter) as any;
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const suggestions = snapshot.docs.map((doc) => {
      const data = doc.data() as DraftSuggestion;
      return {
        id: doc.id,
        draftId: data.draftId,
        briefId: data.briefId,
        pageNumber: data.pageNumber,
        scope: data.scope,
        instruction: data.instruction,
        originalText: data.originalText,
        suggestedText: data.suggestedText,
        rationale: data.rationale,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        acceptedAt: data.acceptedAt,
        rejectedAt: data.rejectedAt,
        // Exclude rawModelOutput from API response
      };
    });

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    console.error("Error listing suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list suggestions",
      details: error.message,
    });
  }
};

/**
 * Accept a suggestion (apply it to the draft)
 * POST /api/story-drafts/:draftId/suggestions/:suggestionId/accept
 */
export const acceptSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { draftId, suggestionId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!draftId || !suggestionId) {
      res.status(400).json({
        success: false,
        error: "draftId and suggestionId parameters are required",
      });
      return;
    }

    const now = admin.firestore.Timestamp.now();

    // Use transaction to ensure atomicity
    await firestore.runTransaction(async (transaction) => {
      // 1. Load suggestion
      const suggestionRef = firestore.collection("draft_suggestions").doc(suggestionId);
      const suggestionDoc = await transaction.get(suggestionRef);

      if (!suggestionDoc.exists) {
        throw new Error("Suggestion not found");
      }

      const suggestion = suggestionDoc.data() as DraftSuggestion;

      // 2. Validate suggestion belongs to this draft
      if (suggestion.draftId !== draftId) {
        throw new Error("Suggestion does not belong to this draft");
      }

      // 3. Validate suggestion status
      if (suggestion.status !== "proposed") {
        throw new Error(`Cannot accept suggestion: status is "${suggestion.status}", expected "proposed"`);
      }

      // 4. Handle scope-specific logic
      if (suggestion.scope === "selection") {
        // Selection scope not yet supported
        throw new Error("Accepting suggestions with scope='selection' is not yet supported");
      }

      // 5. Load draft
      const draftRef = firestore.collection("storyDrafts").doc(draftId);
      const draftDoc = await transaction.get(draftRef);

      if (!draftDoc.exists) {
        throw new Error("Draft not found");
      }

      const draft = draftDoc.data() as StoryDraft;

      // 6. Validate draft status
      if (draft.status !== "generated" && draft.status !== "editing") {
        throw new Error(`Cannot accept suggestion: draft status is "${draft.status}", expected "generated" or "editing"`);
      }

      // 7. Validate page exists
      if (!suggestion.pageNumber || !draft.pages) {
        throw new Error("Cannot accept suggestion: missing pageNumber or draft has no pages");
      }

      const pageIndex = draft.pages.findIndex(p => p.pageNumber === suggestion.pageNumber);
      if (pageIndex === -1) {
        throw new Error(`Page ${suggestion.pageNumber} does not exist in this draft`);
      }

      // 8. Update draft page
      const updatedPages = [...draft.pages];
      const originalPage = updatedPages[pageIndex];
      
      // TypeScript guard: ensure originalPage exists (should always be true after findIndex check)
      if (!originalPage) {
        throw new Error(`Page ${suggestion.pageNumber} not found in draft pages array`);
      }
      
      updatedPages[pageIndex] = {
        pageNumber: originalPage.pageNumber,
        text: suggestion.suggestedText,
        imagePrompt: originalPage.imagePrompt,
        ...(originalPage.emotionalTone && { emotionalTone: originalPage.emotionalTone }),
      };

      const newRevisionCount = (draft.revisionCount || 0) + 1;
      const newStatus = draft.status === "generated" ? "editing" : draft.status;

      transaction.update(draftRef, {
        pages: updatedPages,
        revisionCount: newRevisionCount,
        status: newStatus, // Mark as revised if was generated
        updatedAt: now,
      });

      // 9. Update suggestion status
      transaction.update(suggestionRef, {
        status: "accepted",
        acceptedAt: now,
        updatedAt: now,
      });
    });

    // Reload draft to return updated summary
    const draftRef = firestore.collection("storyDrafts").doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      res.status(404).json({
        success: false,
        error: "Draft not found",
      });
      return;
    }

    const draft = draftDoc.data() as StoryDraft;

    res.status(200).json({
      success: true,
      data: {
        draftId,
        title: draft.title,
        status: draft.status,
        revisionCount: draft.revisionCount,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error accepting suggestion:", error);

    // Handle specific error types
    if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message?.includes("does not belong") || error.message?.includes("status is") || error.message?.includes("Cannot accept")) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message?.includes("not yet supported")) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to accept suggestion",
      details: error.message,
    });
  }
};

/**
 * Reject a suggestion
 * POST /api/story-drafts/:draftId/suggestions/:suggestionId/reject
 */
export const rejectSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { draftId, suggestionId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!draftId || !suggestionId) {
      res.status(400).json({
        success: false,
        error: "draftId and suggestionId parameters are required",
      });
      return;
    }

    // Use transaction for consistency
    await firestore.runTransaction(async (transaction) => {
      // Load suggestion
      const suggestionRef = firestore.collection("draft_suggestions").doc(suggestionId);
      const suggestionDoc = await transaction.get(suggestionRef);

      if (!suggestionDoc.exists) {
        throw new Error("Suggestion not found");
      }

      const suggestion = suggestionDoc.data() as DraftSuggestion;

      // Validate suggestion belongs to this draft
      if (suggestion.draftId !== draftId) {
        throw new Error("Suggestion does not belong to this draft");
      }

      // Validate suggestion status
      if (suggestion.status !== "proposed") {
        throw new Error(`Cannot reject suggestion: status is "${suggestion.status}", expected "proposed"`);
      }

      // Update suggestion status
      const now = admin.firestore.Timestamp.now();
      transaction.update(suggestionRef, {
        status: "rejected",
        rejectedAt: now,
        updatedAt: now,
      });
    });

    res.status(200).json({
      success: true,
      message: "Suggestion rejected",
    });
  } catch (error: any) {
    console.error("Error rejecting suggestion:", error);

    // Handle specific error types
    if (error.message?.includes("not found")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    if (error.message?.includes("does not belong") || error.message?.includes("status is")) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to reject suggestion",
      details: error.message,
    });
  }
};

