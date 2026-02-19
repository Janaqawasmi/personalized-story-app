// server/src/routes/agent1.routes.ts
import { Router } from "express";
import { previewContract, applyOverride } from "../controllers/storyBrief.controller";

const router = Router();

router.post("/contracts/preview", previewContract);
router.post("/contracts/:briefId/override", applyOverride);

export default router;
