/**
 * Specialist routes for story_templates (Phase 3: text-variant review).
 *
 * All routes require the caller to be the template's specialistId
 * (or have the admin role). Ownership is checked against the template doc's
 * `specialistId` field — the same UID that called /publish.
 *
 * Mounted at: /api/specialist/templates
 */

import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";
import {
  generateTextVariants,
  getTextVariants,
  updateTextVariant,
  approveTextVariant,
  finalizeTextVariants,
  TextVariantError,
} from "@/services/textVariants.service";

const router = Router();
router.use(requireAuth);
router.use(requireRole("specialist", "admin"));

// ─────────────────────────────────────────────────────────────────────────────
// Ownership helper
// ─────────────────────────────────────────────────────────────────────────────

async function verifyTemplateOwnership(
  templateId: string,
  uid: string,
  role: string | undefined,
): Promise<boolean> {
  // Admins can access any template.
  if (role === "admin") return true;

  const snap = await firestore
    .collection(COLLECTIONS.STORY_TEMPLATES)
    .doc(templateId)
    .get();
  if (!snap.exists) return false;

  const data = snap.data() as Record<string, unknown>;
  return data.specialistId === uid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/specialist/templates/:templateId/text-variants
 * Returns all variant docs + status fields for the review UI.
 */
async function handleGetTextVariants(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid ?? "";
  const role = req.user?.role;
  const templateId = req.params["templateId"] ?? "";

  if (!(await verifyTemplateOwnership(templateId, uid, role))) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  const result = await getTextVariants(templateId);
  if (!result.templateExists) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  res.status(200).json(result);
}

/**
 * POST /api/specialist/templates/:templateId/text-variants/generate
 * Triggers LLM variant generation for all pages.
 * Idempotent — re-running replaces existing pending variants.
 */
async function handleGenerateTextVariants(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid ?? "";
  const role = req.user?.role;
  const templateId = req.params["templateId"] ?? "";

  if (!(await verifyTemplateOwnership(templateId, uid, role))) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  try {
    await generateTextVariants(templateId);
    const result = await getTextVariants(templateId);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TextVariantError) {
      const status =
        err.code === "TEMPLATE_NOT_FOUND" ? 404
        : err.code === "NOT_PERSONALIZABLE" ? 409
        : 422;
      res.status(status).json({ error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

/**
 * PATCH /api/specialist/templates/:templateId/text-variants/:pageNumber
 * Specialist edits masculine and/or feminine text for a single page.
 * Resets reviewStatus to "pending" so the page needs re-approval.
 */
async function handleUpdateTextVariant(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid ?? "";
  const role = req.user?.role;
  const templateId = req.params["templateId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);

  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }
  if (!(await verifyTemplateOwnership(templateId, uid, role))) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: { masculine?: string; feminine?: string } = {};
  if (typeof body.masculine === "string") patch.masculine = body.masculine;
  if (typeof body.feminine === "string") patch.feminine = body.feminine;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Request body must include 'masculine' and/or 'feminine'.",
    });
    return;
  }

  try {
    await updateTextVariant(templateId, pageNumber, patch);
    res.status(200).json({ ok: true as const });
  } catch (err) {
    if (err instanceof TextVariantError) {
      res.status(422).json({ error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

/**
 * POST /api/specialist/templates/:templateId/text-variants/:pageNumber/approve
 * Marks a single page's variant as approved after validating {{CHILD_NAME}}.
 */
async function handleApproveTextVariant(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid ?? "";
  const role = req.user?.role;
  const templateId = req.params["templateId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);

  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }
  if (!(await verifyTemplateOwnership(templateId, uid, role))) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  try {
    await approveTextVariant(templateId, pageNumber, uid);
    res.status(200).json({ ok: true as const });
  } catch (err) {
    if (err instanceof TextVariantError) {
      res.status(422).json({ error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

/**
 * POST /api/specialist/templates/:templateId/text-variants/finalize
 * Validates all pages are approved, merges variants into template pages[],
 * and flips textPersonalizationReady = true.
 */
async function handleFinalizeTextVariants(req: Request, res: Response): Promise<void> {
  const uid = req.user?.uid ?? "";
  const role = req.user?.role;
  const templateId = req.params["templateId"] ?? "";

  if (!(await verifyTemplateOwnership(templateId, uid, role))) {
    res.status(404).json({ error: "NOT_FOUND", message: "Template not found." });
    return;
  }

  try {
    await finalizeTextVariants(templateId, uid);
    res.status(200).json({ ok: true as const, textPersonalizationReady: true });
  } catch (err) {
    if (err instanceof TextVariantError) {
      const status = err.code === "NOT_ALL_APPROVED" || err.code === "VALIDATION_FAILED" ? 409 : 422;
      res.status(status).json({ error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────────────────────

// More specific paths first so :pageNumber doesn't catch "generate" / "finalize".
router.post("/:templateId/text-variants/generate", handleGenerateTextVariants);
router.post("/:templateId/text-variants/finalize", handleFinalizeTextVariants);
router.post("/:templateId/text-variants/:pageNumber/approve", handleApproveTextVariant);
router.patch("/:templateId/text-variants/:pageNumber", handleUpdateTextVariant);
router.get("/:templateId/text-variants", handleGetTextVariants);

export default router;
