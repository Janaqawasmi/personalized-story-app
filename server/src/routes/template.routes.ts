import { Router } from "express";
import { getStoryTemplate } from "../controllers/template.controller";

console.log("✅ template.routes loaded");

const router = Router();

router.get("/:templateId", getStoryTemplate);

export default router;
