import { Router } from "express";

import { createStoryBrief, listStoryBriefs } from "../controllers/storyBrief.controller";

const router = Router();

router.get("/", listStoryBriefs);
router.post("/", createStoryBrief);

export default router;

