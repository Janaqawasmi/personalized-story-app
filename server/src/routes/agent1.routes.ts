// server/src/routes/agent1.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { previewContract, applyOverride, getContract } from "../controllers/storyBrief.controller";

const router = Router();

router.get("/contracts/:briefId", requireAuth, getContract);
router.post("/contracts/preview", requireAuth, previewContract);
router.post("/contracts/:briefId/override", requireAuth, applyOverride);

export default router;
