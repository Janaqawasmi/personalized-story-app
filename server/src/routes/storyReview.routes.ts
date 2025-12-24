//server/src/routes/storyReview.routes.ts
import { Router } from "express";
// REVIEW/APPROVAL ENDPOINTS COMMENTED OUT (out of scope for current phase)
// import {
//   listDraftsForReview,
//   getDraftById,
//   updateDraft,
//   approveDraft,
// } from "../controllers/storyReview.controller";
// import {
//   createReviewSession,
//   getReviewSession,
//   sendMessage,
//   applyProposal,
// } from "../controllers/reviewSession.controller";
import { getTopicTags } from "../controllers/topicTags.controller";

const router = Router();

// REVIEW/APPROVAL ENDPOINTS COMMENTED OUT (out of scope for current phase)
// Draft endpoints
// router.get("/drafts", listDraftsForReview);
// router.get("/drafts/:draftId", getDraftById);
// router.patch("/drafts/:draftId", updateDraft);
// router.post("/drafts/:draftId/approve", approveDraft);

// Review session endpoints
// router.post("/drafts/:draftId/sessions", createReviewSession);
// router.get("/sessions/:sessionId", getReviewSession);
// router.post("/sessions/:sessionId/messages", sendMessage);
// router.post("/sessions/:sessionId/proposals/:proposalId/apply", applyProposal);

// Topic tags endpoint (utility endpoint, kept active)
router.get("/topic-tags", getTopicTags);

export default router;
