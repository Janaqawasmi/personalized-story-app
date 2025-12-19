import { Request, Response } from "express";
import { db } from "../config/firebase";

/**
 * List drafts waiting for specialist review
 */
export const listDraftsForReview = async (_req: Request, res: Response) => {
    try {
      const snapshot = await db
        .collection("story_drafts")
        .where("status", "==", "in_review")
        .get();
  
      const drafts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      res.json({ success: true, drafts });
    } catch (error) {
      console.error("List drafts error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch drafts",
        details: error instanceof Error ? error.message : error,
      });
    }
  };
  
/**
 * Get a single draft by ID
 */
export const getDraftById = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "draftId parameter is required" });
    }

    const doc = await db.collection("story_drafts").doc(draftId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    res.json({
      success: true,
      draft: { id: doc.id, ...doc.data() },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch draft" });
  }
};

/**
 * Update draft content (specialist edits)
 */
export const updateDraft = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { pages } = req.body;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "draftId parameter is required" });
    }

    if (!Array.isArray(pages)) {
      return res.status(400).json({ success: false, error: "pages must be an array" });
    }

    await db.collection("story_drafts").doc(draftId).update({
      pages,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update draft" });
  }
};

/**
 * Approve draft → create story template
 */
export const approveDraft = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { specialistId } = req.body;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "draftId parameter is required" });
    }

    if (!specialistId) {
      return res.status(400).json({ success: false, error: "specialistId is required" });
    }

    const draftRef = db.collection("story_drafts").doc(draftId);
    const draftSnap = await draftRef.get();

    if (!draftSnap.exists) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    const draft = draftSnap.data();

    // 1️⃣ Create approved template
    await db.collection("story_templates").add({
        draftId,
        title: draft?.title ?? "Untitled",
        pages: Array.isArray(draft?.pages)
          ? draft.pages.map((p: any) => ({
              pageNumber: p.pageNumber ?? null,
              textTemplate: p.text ?? "",
              emotionalTone: p.emotionalTone ?? "",
              imagePromptTemplate: p.imagePrompt ?? "",
            }))
          : [],
        approvedBy: specialistId,
        approvedAt: new Date().toISOString(),
        isActive: true,
      });      

    // 2️⃣ Update draft status
    await draftRef.update({
      status: "approved",
      approvedBy: specialistId,
      approvedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to approve draft" });
  }
};