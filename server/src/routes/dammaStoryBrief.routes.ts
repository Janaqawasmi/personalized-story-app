// server/src/routes/dammaStoryBrief.routes.ts

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createDammaStoryBrief } from "../controllers/dammaStoryBrief.controller";

const router = Router();

router.use(requireAuth);
router.post("/", requireRole("specialist", "admin"), createDammaStoryBrief);

export default router;
