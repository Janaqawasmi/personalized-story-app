// server/src/controllers/dammaStoryBriefFeedback.controller.ts
//
// Specialist feedback on a submitted DAMMAH Story Brief — Firestore subcollection
// dammaStoryBriefs/{briefId}/feedback/{feedbackId}

import { Request, Response } from "express";
import type { DocumentData } from "firebase-admin/firestore";
import { firestore, admin } from "../config/firebase";
import { AuditTrail } from "../services/auditTrail.service";
import type { AuthenticatedUser } from "../middleware/auth.middleware";
import { serializeTimestamp } from "../utils/serializeTimestamp";
import {
  DAMMA_BRIEF_FEEDBACK_SCHEMA_VERSION,
  ALLOWED_FIELD_IDS,
  ALLOWED_OVERALL_QUICK_TAGS,
  ALLOWED_FIELD_QUICK_TAGS,
  ALLOWED_FIELD_VERDICTS,
  FEEDBACK_SUBCOLLECTION,
  MAX_GENERAL_COMMENT_CHARS,
  MAX_FIELD_COMMENT_CHARS,
  MAX_FIELD_FEEDBACK_KEYS,
} from "../models/dammaStoryBriefFeedback.model";

const COLLECTION = "dammaStoryBriefs";

function canAccessBriefForFeedback(
  briefData: DocumentData,
  user: AuthenticatedUser,
): boolean {
  const isOwner = briefData.submittedByUid === user.uid;
  const isAdmin = user.role === "admin";
  return isOwner || isAdmin;
}

function parseFeedbackBody(body: unknown): {
  generalComment: string;
  overallQuickTags: string[];
  fieldFeedback: Record<
    string,
    { verdict?: string; quickTags: string[]; comment: string }
  >;
} | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const generalComment = typeof b.generalComment === "string" ? b.generalComment : "";
  const overallQuickTags = Array.isArray(b.overallQuickTags)
    ? b.overallQuickTags.filter((t): t is string => typeof t === "string")
    : [];
  const fieldFeedbackRaw = b.fieldFeedback;
  if (fieldFeedbackRaw != null && typeof fieldFeedbackRaw !== "object") return null;
  const fieldFeedback: Record<
    string,
    { verdict?: string; quickTags: string[]; comment: string }
  > = {};
  if (fieldFeedbackRaw && typeof fieldFeedbackRaw === "object") {
    for (const [key, val] of Object.entries(fieldFeedbackRaw as Record<string, unknown>)) {
      if (!ALLOWED_FIELD_IDS.has(key)) continue;
      if (val == null || typeof val !== "object") continue;
      const v = val as Record<string, unknown>;
      const qt = Array.isArray(v.quickTags)
        ? v.quickTags.filter((t): t is string => typeof t === "string")
        : [];
      const comment = typeof v.comment === "string" ? v.comment : "";
      const verdictRaw = v.verdict;
      const verdict = typeof verdictRaw === "string" ? verdictRaw : undefined;
      const entry: { verdict?: string; quickTags: string[]; comment: string } = {
        quickTags: qt,
        comment,
      };
      if (verdict !== undefined) entry.verdict = verdict;
      fieldFeedback[key] = entry;
    }
  }
  return { generalComment, overallQuickTags, fieldFeedback };
}

function validateFeedbackPayload(parsed: {
  generalComment: string;
  overallQuickTags: string[];
  fieldFeedback: Record<
    string,
    { verdict?: string; quickTags: string[]; comment: string }
  >;
}): string | null {
  if (parsed.generalComment.length > MAX_GENERAL_COMMENT_CHARS) {
    return `generalComment exceeds ${MAX_GENERAL_COMMENT_CHARS} characters`;
  }
  for (const t of parsed.overallQuickTags) {
    if (!ALLOWED_OVERALL_QUICK_TAGS.has(t)) return `Invalid overall quick tag: ${t}`;
  }
  const keys = Object.keys(parsed.fieldFeedback);
  if (keys.length > MAX_FIELD_FEEDBACK_KEYS) {
    return `Too many field feedback entries (max ${MAX_FIELD_FEEDBACK_KEYS})`;
  }
  for (const [key, entry] of Object.entries(parsed.fieldFeedback)) {
    if (!ALLOWED_FIELD_IDS.has(key)) return `Invalid field id: ${key}`;
    if (entry.comment.length > MAX_FIELD_COMMENT_CHARS) {
      return `comment for ${key} exceeds ${MAX_FIELD_COMMENT_CHARS} characters`;
    }
    if (entry.verdict !== undefined) {
      if (!ALLOWED_FIELD_VERDICTS.has(entry.verdict)) {
        return `Invalid verdict for ${key}: ${entry.verdict}`;
      }
    }
    for (const t of entry.quickTags) {
      if (!ALLOWED_FIELD_QUICK_TAGS.has(t)) return `Invalid field quick tag for ${key}: ${t}`;
    }
  }
  const hasGeneral = parsed.generalComment.trim().length > 0;
  const hasOverall = parsed.overallQuickTags.length > 0;
  const hasField = keys.some((k) => {
    const e = parsed.fieldFeedback[k];
    if (!e) return false;
    return (
      e.verdict !== undefined ||
      e.comment.trim().length > 0 ||
      e.quickTags.length > 0
    );
  });
  if (!hasGeneral && !hasOverall && !hasField) {
    return "Add a general comment, at least one overall tag, or field-level feedback";
  }
  return null;
}

/**
 * POST /api/admin/damma-story-briefs/:briefId/feedback
 */
export async function createDammaStoryBriefFeedback(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const { briefId } = req.params;
    if (!briefId) {
      res.status(400).json({ success: false, error: "Invalid brief id" });
      return;
    }

    const briefRef = firestore.collection(COLLECTION).doc(briefId);
    const briefSnap = await briefRef.get();
    if (!briefSnap.exists) {
      res.status(404).json({ success: false, error: "Brief not found" });
      return;
    }

    const briefData = briefSnap.data()!;
    if (!canAccessBriefForFeedback(briefData, user)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const parsed = parseFeedbackBody(req.body);
    if (!parsed) {
      res.status(400).json({ success: false, error: "Invalid request body" });
      return;
    }

    const validationError = validateFeedbackPayload(parsed);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const briefSnapshot = briefData.brief ?? null;

    const docBody = {
      schemaVersion: DAMMA_BRIEF_FEEDBACK_SCHEMA_VERSION,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      submittedByUid: user.uid,
      submittedByEmail: user.email ?? "",
      submittedByDisplayName: user.displayName ?? "",
      generalComment: parsed.generalComment.trim(),
      overallQuickTags: parsed.overallQuickTags,
      fieldFeedback: parsed.fieldFeedback,
      briefSnapshotAtFeedback: briefSnapshot,
    };

    const docRef = await briefRef.collection(FEEDBACK_SUBCOLLECTION).add(docBody);

    await AuditTrail.log({
      action: "damma_brief.feedback_submitted",
      actor: AuditTrail.actorFromRequest(user),
      resourceType: "storyBrief",
      resourceId: briefId,
      relatedResourceId: docRef.id,
      metadata: {
        overallTagCount: parsed.overallQuickTags.length,
        fieldKeys: Object.keys(parsed.fieldFeedback),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        briefId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("createDammaStoryBriefFeedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save feedback",
      details: message,
    });
  }
}

/**
 * GET /api/admin/damma-story-briefs/:briefId/feedback?limit=20
 */
export async function listDammaStoryBriefFeedback(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const { briefId } = req.params;
    if (!briefId) {
      res.status(400).json({ success: false, error: "Invalid brief id" });
      return;
    }

    const briefRef = firestore.collection(COLLECTION).doc(briefId);
    const briefSnap = await briefRef.get();
    if (!briefSnap.exists) {
      res.status(404).json({ success: false, error: "Brief not found" });
      return;
    }

    const briefData = briefSnap.data()!;
    if (!canAccessBriefForFeedback(briefData, user)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20),
    );

    const snap = await briefRef
      .collection(FEEDBACK_SUBCOLLECTION)
      .orderBy("submittedAt", "desc")
      .limit(limit)
      .get();

    const items = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        briefId,
        schemaVersion: x.schemaVersion,
        submittedAt: serializeTimestamp(x.submittedAt),
        submittedByUid: x.submittedByUid,
        submittedByEmail: x.submittedByEmail,
        submittedByDisplayName: x.submittedByDisplayName,
        generalComment: x.generalComment ?? "",
        overallQuickTags: x.overallQuickTags ?? [],
        fieldFeedback: x.fieldFeedback ?? {},
        briefSnapshotAtFeedback: x.briefSnapshotAtFeedback,
      };
    });

    res.status(200).json({ success: true, data: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("listDammaStoryBriefFeedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list feedback",
      details: message,
    });
  }
}
