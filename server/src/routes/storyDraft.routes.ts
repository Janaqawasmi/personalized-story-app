import { Router } from "express";
import { listDrafts, getDraftById } from "../controllers/storyDraft.controller";

const router = Router();

// GET /api/story-drafts (READ-ONLY) - List all generated drafts
router.get("/", listDrafts);

// GET /api/story-drafts/:draftId (READ-ONLY) - Get a single draft
router.get("/:draftId", getDraftById);

export default router;






