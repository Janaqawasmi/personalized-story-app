// server/src/routes/draftSuggestion.routes.ts
import { Router } from "express";
import {
  createSuggestion,
  listSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  generateImagePromptSuggestionEndpoint,
} from "../controllers/draftSuggestion.controller";

const router = Router();

// POST /api/story-drafts/:draftId/suggestions - Create a new suggestion
router.post("/:draftId/suggestions", createSuggestion);

// GET /api/story-drafts/:draftId/suggestions - List suggestions for a draft
router.get("/:draftId/suggestions", listSuggestions);

// POST /api/story-drafts/:draftId/suggestions/:suggestionId/accept - Accept a suggestion
router.post("/:draftId/suggestions/:suggestionId/accept", acceptSuggestion);

// POST /api/story-drafts/:draftId/suggestions/:suggestionId/reject - Reject a suggestion
router.post("/:draftId/suggestions/:suggestionId/reject", rejectSuggestion);

// POST /api/story-drafts/:draftId/pages/:pageNumber/image-prompt-suggestion - Generate image prompt suggestion
router.post("/:draftId/pages/:pageNumber/image-prompt-suggestion", generateImagePromptSuggestionEndpoint);

export default router;

