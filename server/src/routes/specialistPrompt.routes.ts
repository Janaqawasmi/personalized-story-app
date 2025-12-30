//server/src/routes/specialistPrompt.routes.ts
import { Router } from "express";
import { previewStoryPrompt } from "../controllers/storyPrompt.controller";

const router = Router();

/**
 * Specialist – Prompt Preview (Read-only)
 * GET /api/specialist/story-briefs/:briefId/prompt-preview
 * 
 * Returns a human-readable preview of the prompt that would be generated.
 * Uses ONLY rag_writing_rules collection.
 * No database writes, no LLM calls, no status changes.
 */
router.get(
  "/story-briefs/:briefId/prompt-preview",
  previewStoryPrompt
);

export default router;
