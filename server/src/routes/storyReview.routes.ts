import { Router } from "express";
import {
  listDraftsForReview,
  getDraftById,
  updateDraft,
  approveDraft,
} from "../controllers/storyReview.controller";

const router = Router();

router.get("/drafts", listDraftsForReview);
router.get("/drafts/:draftId", getDraftById);
router.patch("/drafts/:draftId", updateDraft);
router.post("/drafts/:draftId/approve", approveDraft);

export default router;
