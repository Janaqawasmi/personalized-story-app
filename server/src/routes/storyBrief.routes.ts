//server/src/routes/storyBrief.routes.ts
import { Router } from "express";

import { createStoryBrief, listStoryBriefs, buildContract, getStoryBriefById } from "../controllers/storyBrief.controller";
import { generateDraftFromBrief } from "../controllers/storyDraft.controller";

const router = Router();

router.get("/", listStoryBriefs);
router.get("/:briefId", getStoryBriefById);
router.post("/", createStoryBrief);
router.post("/:briefId/build-contract", buildContract);
router.post("/:briefId/generate-draft", generateDraftFromBrief);

export default router;

