// server/src/controllers/dammaStoryBrief.controller.ts
//
// Persists the spec v1.2 Story Brief form aggregate (client CompleteBrief) for
// specialist submission. Separate from legacy LegacyStoryBrief documents.

import { Request, Response } from "express";
import { firestore, admin } from "../config/firebase";
import { AuditTrail } from "../services/auditTrail.service";
import type { AuthenticatedUser } from "../middleware/auth.middleware";

const COLLECTION = "dammaStoryBriefs";

/**
 * POST /api/admin/damma-story-briefs
 * Body: full brief JSON (client CompleteBrief after normalization).
 */
export async function createDammaStoryBrief(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const briefPayload = req.body;
    if (briefPayload == null || typeof briefPayload !== "object") {
      res.status(400).json({ success: false, error: "Request body must be a JSON object" });
      return;
    }

    const doc = {
      schemaVersion: "damma-story-brief-form-v1",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      submittedByUid: user.uid,
      brief: briefPayload,
    };

    const docRef = await firestore.collection(COLLECTION).add(doc);

    await AuditTrail.log({
      action: "damma_brief.submitted",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "storyBrief",
      resourceId: docRef.id,
      metadata: {
        storyType: (briefPayload as { storyType?: string }).storyType,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("createDammaStoryBrief:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save story brief",
      details: message,
    });
  }
}
