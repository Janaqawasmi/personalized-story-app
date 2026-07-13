/**
 * Specialist routes for story_templates (text-variant generation status).
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
  TextVariantError,
} from "@/services/textVariants.service";
import { TEXT_VARIANT_UNAVAILABLE_MESSAGE } from "@/shared/types/textVariant";

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
 * Returns variant status + docs for the workspace status indicator.
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
 * Triggers LLM variant generation for all pages. Validates and merges the
 * results into pages[].textTemplate and flips textPersonalizationReady in
 * the same call — no follow-up approval step. Used for manual retry when
 * the automatic post-publish generation failed.
 * Idempotent — re-running replaces existing variants.
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
      if (err.code === "TEMPLATE_NOT_FOUND") {
        res.status(404).json({ error: err.code, message: "Template not found." });
        return;
      }
      if (err.code === "NOT_PERSONALIZABLE") {
        res.status(409).json({
          error: err.code,
          message: "This story does not support personalization.",
        });
        return;
      }
      // GENERATION_FAILED / VALIDATION_FAILED: the technical reason is already
      // logged server-side and persisted on the template (textVariantFailure).
      // Return a neutral, user-safe message — never expose provider/model/parse
      // detail to the specialist. The failed template is picked up by the
      // repair job / a later retry automatically.
      res.status(503).json({
        error: "TEXT_PERSONALIZATION_UNAVAILABLE",
        message: TEXT_VARIANT_UNAVAILABLE_MESSAGE,
      });
      return;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────────────────────

// More specific paths first so :pageNumber doesn't catch "generate".
router.post("/:templateId/text-variants/generate", handleGenerateTextVariants);
router.get("/:templateId/text-variants", handleGetTextVariants);

export default router;
