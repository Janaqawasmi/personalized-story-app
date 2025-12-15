import { Router } from "express";

import { createStoryBrief } from "../controllers/storyBrief.controller";

const router = Router();

router.post("/", createStoryBrief);

export default router;

