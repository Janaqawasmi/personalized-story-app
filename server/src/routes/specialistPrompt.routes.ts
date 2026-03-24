//server/src/routes/specialistPrompt.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { previewStoryPrompt } from "../controllers/storyPrompt.controller";

const router = Router();

// All specialist routes require authentication
router.use(requireAuth);

/**
 * Specialist – Prompt Preview (Read-only)
 * GET /api/specialist/story-briefs/:briefId/prompt-preview
 * 
 * Returns a human-readable preview of the prompt that would be generated
 * from the saved generation contract for the given brief.
 * No database writes, no LLM calls, no status changes.
 */
router.get(
  "/story-briefs/:briefId/prompt-preview",
  previewStoryPrompt
);

export default router;
