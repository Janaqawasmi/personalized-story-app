import { Router } from "express";
import { createPersonalizedStory } from "../controllers/personalizedStory.controller";

const router = Router();

router.post("/", createPersonalizedStory);

export default router;
