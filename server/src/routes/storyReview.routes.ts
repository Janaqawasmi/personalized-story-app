import { Router } from "express";
import {
  listDraftsForReview,
  getDraftById,
  updateDraft,
  approveDraft,
} from "../controllers/storyReview.controller";
import {
  createReviewSession,
  getReviewSession,
  sendMessage,
  applyProposal,
} from "../controllers/reviewSession.controller";

const router = Router();

// Draft endpoints
router.get("/drafts", listDraftsForReview);
router.get("/drafts/:draftId", getDraftById);
router.patch("/drafts/:draftId", updateDraft);
router.post("/drafts/:draftId/approve", approveDraft);

// Review session endpoints
router.post("/drafts/:draftId/sessions", createReviewSession);
router.get("/sessions/:sessionId", getReviewSession);
router.post("/sessions/:sessionId/messages", sendMessage);
router.post("/sessions/:sessionId/proposals/:proposalId/apply", applyProposal);

export default router;
