//server/src/routes/storyBrief.routes.ts
import { Router } from "express";

import { createStoryBrief, listStoryBriefs } from "../controllers/storyBrief.controller";
import { generateDraftFromBrief } from "../controllers/storyDraft.controller";

const router = Router();

router.get("/", listStoryBriefs);
router.post("/", createStoryBrief);
router.post("/:briefId/generate-draft", generateDraftFromBrief);

export default router;

