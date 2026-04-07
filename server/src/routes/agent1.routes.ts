import { Router } from "express";

import { postAgent1Generate } from "../controllers/agent1.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);
router.post("/generate", requireRole("specialist", "admin"), postAgent1Generate);

export default router;
