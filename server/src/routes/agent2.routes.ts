// server/src/routes/agent2.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { reviewContract, getReviewHistory } from "../agents/agent2/reviewContract";

const router = Router();

// GET /api/agent2/contracts/:briefId/reviews
// Fetch append-only review history (audit trail) for a contract
router.get("/contracts/:briefId/reviews", requireAuth, getReviewHistory);

// POST /api/agent2/contracts/:briefId/review
// Specialist review decision (approved | needs_changes | rejected)
router.post("/contracts/:briefId/review", requireAuth, reviewContract);

export default router;
