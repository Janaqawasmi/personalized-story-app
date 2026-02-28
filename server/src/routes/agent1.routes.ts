// server/src/routes/agent1.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { previewContract, applyOverride, resetOverrides, getContract, getReviewHistory } from "../controllers/storyBrief.controller";

const router = Router();

router.get("/contracts/:briefId", requireAuth, getContract);
router.get("/contracts/:briefId/reviews", requireAuth, getReviewHistory);
router.post("/contracts/preview", requireAuth, previewContract);
router.post("/contracts/:briefId/override", requireAuth, applyOverride);
router.delete("/contracts/:briefId/override", requireAuth, resetOverrides);

export default router;
