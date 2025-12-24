//server/src/routes/specialistPrompt.routes.ts
import { Router } from "express";
import { previewStoryPrompt } from "../controllers/storyPrompt.controller";

const router = Router();

// REVIEW/APPROVAL ENDPOINTS COMMENTED OUT
/**
 * Specialist – Prompt Preview
 * GET /api/specialist/story-briefs/:briefId/prompt-preview
 */
// router.get(
//   "/story-briefs/:briefId/prompt-preview",
//   previewStoryPrompt
// );

export default router;
