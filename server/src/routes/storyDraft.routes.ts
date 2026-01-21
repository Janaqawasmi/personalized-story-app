import { Router } from "express";
import { 
  listDrafts, 
  getDraftById, 
  enterEditMode,
  cancelEditMode,
  updateDraft, 
  approveDraft 
} from "../controllers/storyDraft.controller";
import draftSuggestionRoutes from "./draftSuggestion.routes";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// GET /api/story-drafts (READ-ONLY) - List all generated drafts
router.get("/", listDrafts);

// Mount suggestion routes before :draftId route (more specific routes first)
router.use("/", draftSuggestionRoutes);

// POST /api/story-drafts/:draftId/edit - Enter edit mode
router.post("/:draftId/edit", requireAuth, enterEditMode);

// POST /api/story-drafts/:draftId/cancel-edit - Cancel edit mode
router.post("/:draftId/cancel-edit", requireAuth, cancelEditMode);

// PATCH /api/story-drafts/:draftId - Save edits
router.patch("/:draftId", requireAuth, updateDraft);

// POST /api/story-drafts/:draftId/approve - Approve draft
router.post("/:draftId/approve", requireAuth, approveDraft);

// GET /api/story-drafts/:draftId (READ-ONLY) - Get a single draft
router.get("/:draftId", getDraftById);

export default router;





















