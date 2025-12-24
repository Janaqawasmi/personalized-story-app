import { Router } from "express";
import { getDraftById } from "../controllers/storyDraft.controller";

const router = Router();

// GET /api/story-drafts/:draftId (READ-ONLY)
router.get("/:draftId", getDraftById);

export default router;






