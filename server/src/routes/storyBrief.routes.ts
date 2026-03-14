// server/src/routes/storyBrief.routes.ts
//
// PHASE 1 CHANGES:
//   - All routes require authentication
//   - Mutations require specialist or admin role
//   - generate-draft is guarded by requireApprovedContract
//   - Auth middleware populates req.user for audit trail

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { requireApprovedContract } from "../middleware/generationGuard.middleware";
import {
  createStoryBrief,
  listStoryBriefs,
  buildContract,
  getStoryBriefById,
} from "../controllers/storyBrief.controller";
import { generateDraftFromBrief } from "../controllers/storyDraft.controller";

const router = Router();

// All storyBrief routes require authentication
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// READ operations (any authenticated role)
// ──────────────────────────────────────────────────────────
router.get("/", listStoryBriefs);
router.get("/:briefId", getStoryBriefById);

// ──────────────────────────────────────────────────────────
// WRITE operations (specialist or admin)
// ──────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("specialist", "admin"),
  createStoryBrief
);

router.post(
  "/:briefId/build-contract",
  requireRole("specialist", "admin"),
  buildContract
);

// ──────────────────────────────────────────────────────────
// GENERATION (specialist or admin + approved contract)
//
// This is the critical governance gate. Three layers of protection:
//   1. requireAuth          → must be authenticated
//   2. requireRole          → must be specialist or admin
//   3. requireApprovedContract → contract must be "approved"
// ──────────────────────────────────────────────────────────
router.post(
  "/:briefId/generate-draft",
  requireRole("specialist", "admin"),
  requireApprovedContract,
  generateDraftFromBrief
);

export default router;
