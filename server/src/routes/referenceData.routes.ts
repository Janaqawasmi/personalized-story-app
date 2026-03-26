// src/routes/referenceData.routes.ts
import { Router } from "express";
import {
  getReferenceItems,
  getSituations,
  getSituationsByTopic,
  getFilteredSituations,
  getReferenceConfig,
} from "../controllers/referenceData.controller";

const router = Router();

// Named collection routes (must come before the generic /:category catch-all)
router.get("/situations", getSituationsByTopic);
router.get("/generalSituations", getFilteredSituations("generalSituations"));
router.get("/specificSituations", getFilteredSituations("specificSituations"));
router.get("/config", getReferenceConfig);

// Generic category route (topics, emotionalGoals, exclusions, contentExclusions, etc.)
router.get("/:category", getReferenceItems);

export default router;

