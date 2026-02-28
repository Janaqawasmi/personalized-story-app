// server/src/routes/agent2.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { reviewContract } from "../agents/agent2/reviewContract";

const router = Router();

// POST /api/agent2/contracts/:briefId/review
// Specialist review decision (approved | needs_changes | rejected)
router.post("/contracts/:briefId/review", requireAuth, reviewContract);

export default router;
