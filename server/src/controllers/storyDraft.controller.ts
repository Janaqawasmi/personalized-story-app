// server/src/controllers/storyDraft.controller.ts
import { Request, Response } from "express";
import admin from "firebase-admin";
import { firestore } from "../config/firebase";
import type { LegacyStoryBrief } from "../models/storyBrief.model";
import { StoryDraft, DraftPage } from "../models/storyDraft.model";
import { AuditTrail } from "../services/auditTrail.service";

// Note: req.user is already typed globally by auth.middleware.ts
// No need for local Request interface

/**
 * List all generated drafts (READ-ONLY)
 * GET /api/story-drafts
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

    // Get user ID from authentication middleware
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    const userId = req.user.uid;

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

    // Validate page numbers are sequential and required fields exist
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

      // Validate required fields for each page
      if (typeof page.text !== "string" || page.text.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: `Page ${page.pageNumber} is missing required field 'text' or text is empty`,
        });
        return;
      }

      // Validate imagePrompt is present and is a string (required field per DraftPage model)
      if (page.imagePrompt === undefined || page.imagePrompt === null) {
        res.status(400).json({
          success: false,
          error: `Page ${page.pageNumber} is missing required field 'imagePrompt'`,
        });
        return;
      }

      if (typeof page.imagePrompt !== "string") {
        res.status(400).json({
          success: false,
          error: `Page ${page.pageNumber} has invalid 'imagePrompt': must be a string`,
        });
        return;
      }

      // Validate imagePrompt is non-empty after trimming (required field per DraftPage model)
      if (page.imagePrompt.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: `Page ${page.pageNumber} has empty 'imagePrompt': must contain non-whitespace content`,
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

    // Normalize pages to ensure they match the DraftPage model structure
    const normalizedPages = sortedPages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text.trim(),
      imagePrompt: page.imagePrompt.trim(), // Required field, already validated above
      ...(page.emotionalTone && typeof page.emotionalTone === "string" && { emotionalTone: page.emotionalTone.trim() }),
    }));

    // Update draft with new content and increment revision count
    const currentRevisionCount = draftData.revisionCount || 0;
    const newStatus = draftData.status === "generated" ? "editing" : draftData.status; // Mark as revised on first save
    
    await draftRef.update({
      ...(updateData.title !== undefined && { title: updateData.title }),
      pages: normalizedPages,
      revisionCount: currentRevisionCount + 1,
      status: newStatus, // Set to "editing" (revised) if was "generated"
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Log draft edit to audit trail
    if (req.user) {
      await AuditTrail.log({
        action: "draft.updated",
        actor: AuditTrail.actorFromRequest(req.user),
        resourceType: "storyDraft",
        resourceId: draftId,
        relatedResourceId: draftData.briefId,
        metadata: {
          revisionCount: currentRevisionCount + 1,
          status: newStatus,
        },
      });
    }

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

    // Get user ID from authentication middleware
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    const approvedBy = req.user.uid;

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
      const briefData = briefDocInTx.data() as LegacyStoryBrief;

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
        pricing: {
          digital: 19.99,
          print: 29.99,
        },
        currency: "USD",
      });
    });

    // Get template ID created for this draft (after transaction completes)
    const templatesSnapshot = await firestore
      .collection("story_templates")
      .where("draftId", "==", draftId)
      .limit(1)
      .get();
    const templateId = templatesSnapshot.empty || templatesSnapshot.docs.length === 0 || !templatesSnapshot.docs[0] ? null : templatesSnapshot.docs[0].id;

    // Log draft approval to audit trail
    if (req.user) {
      const draftDoc = await draftRef.get();
      const draftData = draftDoc.exists ? (draftDoc.data() as StoryDraft) : null;
      const metadata: Record<string, unknown> = {
        action: "draft_approved_and_template_created",
        approvedBy: req.user.uid,
      };
      if (templateId) {
        metadata.templateId = templateId;
      }
      await AuditTrail.log({
        action: "draft.approved",
        actor: AuditTrail.actorFromRequest(req.user),
        resourceType: "storyDraft",
        resourceId: draftId,
        ...(draftData?.briefId && { relatedResourceId: draftData.briefId }),
        metadata,
      });
    }

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
