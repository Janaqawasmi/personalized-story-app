import { Router } from "express";
import { generateDraftFromBrief } from "../controllers/storyDraft.controller";

const router = Router();

// POST /api/story-drafts/:briefId/generate
router.post("/:briefId/generate", generateDraftFromBrief);

export default router;










