// src/routes/referenceData.routes.ts
import { Router } from "express";
import {
  getReferenceItems,
  getSituations,
  getSituationsByTopic,
} from "../controllers/referenceData.controller";

const router = Router();

// Get situations (with optional topic filter via query param)
router.get("/situations", getSituationsByTopic);

// Get reference items for a category (must come after /situations routes)
router.get("/:category", getReferenceItems);

export default router;

