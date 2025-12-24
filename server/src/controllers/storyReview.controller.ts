import { Request, Response } from "express";
import { db } from "../config/firebase";

/**
 * List drafts waiting for specialist review
 */
export const listDraftsForReview = async (_req: Request, res: Response) => {
    try {
      const snapshot = await db
        .collection("storyDrafts")
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

    const doc = await db.collection("storyDrafts").doc(draftId).get();
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

    await db.collection("storyDrafts").doc(draftId).update({
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
 * Enforces revision count check
 */
export const approveDraft = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { specialistId, sessionId } = req.body;

    if (!draftId) {
      return res.status(400).json({ success: false, error: "draftId parameter is required" });
    }

    if (!specialistId) {
      return res.status(400).json({ success: false, error: "specialistId is required" });
    }

    const draftRef = db.collection("storyDrafts").doc(draftId);
    const draftSnap = await draftRef.get();

    if (!draftSnap.exists) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    const draft = draftSnap.data();

    // If sessionId provided, verify the session's revision count matches draft
    if (sessionId) {
      const sessionSnap = await db.collection("review_sessions").doc(sessionId).get();
      if (sessionSnap.exists) {
        const session = sessionSnap.data();
        const sessionRevisionCount = session?.revisionCount || 0;
        const draftRevisionCount = draft?.revisionCount || 0;

        if (sessionRevisionCount !== draftRevisionCount) {
          return res.status(400).json({
            success: false,
            error: "Revision count mismatch. The draft has been modified. Please refresh and try again.",
          });
        }
      }
    }

    // 1️⃣ Create approved template
    const templateRef = await db.collection("story_templates").add({
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
      revisionCount: draft?.revisionCount || 0,
      isActive: true,
    });

    // 2️⃣ Update draft status
    await draftRef.update({
      status: "approved",
      approvedBy: specialistId,
      approvedAt: new Date().toISOString(),
      templateId: templateRef.id,
    });

    // 3️⃣ Close review session if provided
    if (sessionId) {
      await db.collection("review_sessions").doc(sessionId).update({
        status: "approved",
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      templateId: templateRef.id,
    });
  } catch (error: any) {
    console.error("Error approving draft:", error);
    res.status(500).json({
      success: false,
      error: "Failed to approve draft",
      details: error.message,
    });
  }
};