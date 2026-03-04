// server/src/routes/agent1.routes.ts
//
// PHASE 1 CHANGES:
//   - All routes now require authentication
//   - Added approval/rejection endpoints
//   - Added contract status and audit history endpoints
//   - Override requires specialist or admin role

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { previewContract, applyOverride } from "../controllers/storyBrief.controller";
import {
  approveContract,
  rejectContract,
  getContractStatus,
  getAuditHistory,
  getContract,
} from "../controllers/contractApproval.controller";

const router = Router();

// All agent1 routes require authentication
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// Contract Preview (authenticated, any role)
// ──────────────────────────────────────────────────────────
router.post("/contracts/preview", previewContract);

// ──────────────────────────────────────────────────────────
// Contract Override (specialist or admin only)
// ──────────────────────────────────────────────────────────
router.post(
  "/contracts/:briefId/override",
  requireRole("specialist", "admin"),
  applyOverride
);

// ──────────────────────────────────────────────────────────
// Contract Approval Gate (specialist or admin only)
// ──────────────────────────────────────────────────────────
router.post(
  "/contracts/:briefId/approve",
  requireRole("specialist", "admin"),
  approveContract
);

router.post(
  "/contracts/:briefId/reject",
  requireRole("specialist", "admin"),
  rejectContract
);

// ──────────────────────────────────────────────────────────
// Contract Status & Audit (authenticated, any role)
// ──────────────────────────────────────────────────────────
router.get("/contracts/:briefId/full", getContract);
router.get("/contracts/:briefId/status", getContractStatus);
router.get("/contracts/:briefId/audit", getAuditHistory);

export default router;
