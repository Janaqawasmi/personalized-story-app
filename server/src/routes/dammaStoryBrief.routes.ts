// server/src/routes/dammaStoryBrief.routes.ts

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  createDammaStoryBrief,
  getDammaStoryBrief,
  listDammaStoryBriefs,
} from "../controllers/dammaStoryBrief.controller";
import {
  createDammaStoryBriefFeedback,
  listDammaStoryBriefFeedback,
} from "../controllers/dammaStoryBriefFeedback.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("specialist", "admin"), listDammaStoryBriefs);
router.post("/", requireRole("specialist", "admin"), createDammaStoryBrief);

router.get(
  "/:briefId/feedback",
  requireRole("specialist", "admin"),
  listDammaStoryBriefFeedback,
);
router.post(
  "/:briefId/feedback",
  requireRole("specialist", "admin"),
  createDammaStoryBriefFeedback,
);

router.get("/:briefId", requireRole("specialist", "admin"), getDammaStoryBrief);

export default router;
