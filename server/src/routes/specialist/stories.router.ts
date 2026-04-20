import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  generateStoryDraftFromBrief,
  BriefNotReadyError,
  UnsupportedStoryTypeError,
  TypeMismatchError,
  Step1IncoherentError,
} from "@/agent1";
import type { Agent1Result } from "@/agent1";
import { firestore } from "@/config/firebase";
import {
  STORIES_COLLECTION,
  createStoryForGeneration,
  isTransitionAllowed,
} from "@/models/story.model";
import type { Story, StoryStatus } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";

const router = Router();

router.use(requireAuth);
router.use(requireRole("specialist", "admin"));

// ============================================================================
// SHARED HELPER
// ============================================================================

async function readAndVerifyOwnership(
  storyId: string,
  ownerUid: string,
): Promise<Story | null> {
  const doc = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();
  if (!doc.exists) return null;
  const story = { id: storyId, ...doc.data() } as Story;
  if (story.ownerUid !== ownerUid) return null; // 404, not 403
  return story;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function handleListStories(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const { statuses: statusesParam, sortBy = "lastOpenedAt", sortDir = "desc", limit: limitParam } = req.query;
  const limit = limitParam !== undefined ? Number(limitParam) : 100;

  const snapshot = await firestore
    .collection(STORIES_COLLECTION)
    .where("ownerUid", "==", ownerUid)
    .get();

  let stories = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Story,
  );

  // Filter by statuses
  if (statusesParam && typeof statusesParam === "string") {
    const requested = statusesParam.split(",").map((s) => s.trim()) as StoryStatus[];
    stories = stories.filter((s) => requested.includes(s.status));
  } else {
    stories = stories.filter((s) => s.status !== "archived");
  }

  // Sort
  const validSortFields = ["lastOpenedAt", "createdAt", "title"] as const;
  type SortField = (typeof validSortFields)[number];
  const field: SortField = (validSortFields as readonly string[]).includes(sortBy as string)
    ? (sortBy as SortField)
    : "lastOpenedAt";
  const dir = sortDir === "asc" ? 1 : -1;

  stories.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return av < bv ? -dir : dir;
  });

  // Limit
  stories = stories.slice(0, limit);

  res.status(200).json({ stories, total: stories.length });
}

async function handleGetStory(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  const now = Date.now();
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    lastOpenedAt: now,
    updatedAt: now,
  });
  story.lastOpenedAt = now;
  story.updatedAt = now;

  res.status(200).json({ story });
}

async function handlePatchStory(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  const { patch } = req.body;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Request body must include a 'patch' object." });
    return;
  }

  const FORBIDDEN = [
    "status", "brief", "agent1Result", "agent1Versions",
    "editHistory", "ownerUid", "id", "parentStoryId",
    "createdAt", "submittedAt", "approvedAt",
  ];
  const forbidden = Object.keys(patch).filter((k) => FORBIDDEN.includes(k));
  if (forbidden.length > 0) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: `Forbidden fields in patch: ${forbidden.join(", ")}`,
    });
    return;
  }

  const now = Date.now();
  const updatedHistory = [...story.editHistory];

  if (patch.currentDraft !== undefined) {
    const historyEntry = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "draft_edited" as const,
        snapshot: patch.currentDraft,
      },
    };
    updatedHistory.push(historyEntry);
  }

  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    ...patch,
    updatedAt: now,
    editHistory: updatedHistory,
  });

  const finalDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const finalStory = { id: storyId, ...finalDoc.data() } as Story;

  res.status(200).json({ story: finalStory });
}

async function handleTransition(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  const { to, feedback } = req.body;
  if (!to || typeof to !== "string") {
    res.status(400).json({ error: "INVALID_INPUT", message: "Request body must include a 'to' status string." });
    return;
  }

  if (!isTransitionAllowed(story.status, to as StoryStatus)) {
    res.status(409).json({
      error: "INVALID_TRANSITION",
      message: `Cannot transition from ${story.status} to ${to}.`,
    });
    return;
  }

  if (to === "needs_revision" && !feedback) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Feedback is required for needs_revision transitions.",
    });
    return;
  }

  const now = Date.now();
  const extraFields: Partial<Story> = {};

  if (to === "approved") {
    extraFields.approvedAt = now;
  } else if (to === "in_review") {
    extraFields.lastOpenedAt = now;
  }
  // "archived": no extra fields

  const statusEvent = {
    id: crypto.randomUUID(),
    at: now,
    byUid: ownerUid,
    event: {
      kind: "status_changed" as const,
      from: story.status,
      to: to as StoryStatus,
    },
  };

  const updatedHistory = [...story.editHistory, statusEvent];

  if (to === "needs_revision" && feedback) {
    const feedbackEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "regeneration_requested" as const,
        feedback,
      },
    };
    updatedHistory.push(feedbackEvent);
  }

  // NOTE: transitioning to "generating" via this endpoint only updates the
  // status — it does NOT invoke Agent 1. Use POST /:storyId/generate to
  // trigger actual generation.
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    status: to,
    updatedAt: now,
    ...extraFields,
    editHistory: updatedHistory,
  });

  const finalDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const finalStory = { id: storyId, ...finalDoc.data() } as Story;

  res.status(200).json({ story: finalStory });
}

async function handleUpdateBrief(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  if (story.status !== "draft_brief") {
    res.status(409).json({
      error: "BRIEF_LOCKED",
      message: "Briefs cannot be edited after submission. Open a new revision instead.",
    });
    return;
  }

  const { brief }: { brief: StoryBrief } = req.body;
  if (!brief || typeof brief !== "object") {
    res.status(400).json({ error: "INVALID_INPUT", message: "Request body must include a 'brief' object." });
    return;
  }

  // TODO: Add brief schema validation when moving beyond pilot
  const now = Date.now();
  const updateFields: Record<string, unknown> = {
    brief,
    updatedAt: now,
  };

  if (brief.ageAndScope?.ageRange) {
    updateFields.ageRange = brief.ageAndScope.ageRange;
  }
  if (brief.storyType) {
    updateFields.storyType = brief.storyType;
  }

  await firestore.collection(STORIES_COLLECTION).doc(storyId).update(updateFields);

  const finalDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const finalStory = { id: storyId, ...finalDoc.data() } as Story;

  res.status(200).json({ story: finalStory });
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// GET
router.get("/", handleListStories);
router.get("/:storyId", handleGetStory);

// PATCH
router.patch("/:storyId", handlePatchStory);

// PUT
router.put("/:storyId/brief", handleUpdateBrief);

// POST
router.post("/:storyId/transitions", handleTransition);
router.post("/:storyId/generate", handleGenerate); // from R2

async function handleGenerate(req: Request, res: Response): Promise<void> {
  const { storyId } = req.params;
  const { story: clientStory } = req.body;

  if (!storyId || typeof storyId !== "string") {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Missing or invalid storyId parameter.",
    });
    return;
  }

  if (!clientStory || !clientStory.brief) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message:
        "Request body must include a 'story' object with a 'brief' field.",
    });
    return;
  }

  const existingDoc = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();

  if (existingDoc.exists) {
    res.status(409).json({
      error: "CONFLICT",
      message: `A story with id '${storyId}' already exists. Cannot create a duplicate.`,
    });
    return;
  }

  const brief = clientStory.brief;

  if (brief.status !== "submitted") {
    brief.status = "submitted";
  }

  const ownerUid = req.user?.uid ?? "";

  if (!ownerUid) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Could not determine user identity.",
    });
    return;
  }

  const story = createStoryForGeneration({
    id: storyId,
    ownerUid,
    brief,
    parentStoryId: clientStory.parentStoryId ?? undefined,
    title: clientStory.title ?? undefined,
  });

  await firestore.collection(STORIES_COLLECTION).doc(storyId).set(story);

  try {
    const TIMEOUT_MS = 120_000;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AGENT1_TIMEOUT")), TIMEOUT_MS);
    });

    const agent1Result: Agent1Result = await Promise.race([
      generateStoryDraftFromBrief(brief),
      timeoutPromise,
    ]);

    const now = Date.now();
    const updatedFields: Partial<Story> = {
      status: "awaiting_review",
      agent1Result,
      agent1Versions: [agent1Result],
      currentDraft: {
        title: agent1Result.title,
        body: agent1Result.story,
        wordCount: agent1Result.wordCount,
        updatedAt: now,
      },
      updatedAt: now,
    };

    const generatedEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "agent1_generated" as const,
        version: 1,
        succeeded: true,
      },
    };

    const statusEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "status_changed" as const,
        from: "generating" as const,
        to: "awaiting_review" as const,
      },
    };

    await firestore
      .collection(STORIES_COLLECTION)
      .doc(storyId)
      .update({
        ...updatedFields,
        editHistory: [...story.editHistory, generatedEvent, statusEvent],
      });

    const finalDoc = await firestore
      .collection(STORIES_COLLECTION)
      .doc(storyId)
      .get();

    const finalStory = { id: storyId, ...finalDoc.data() } as Story;

    res.status(200).json({ story: finalStory });
  } catch (error: unknown) {
    const now = Date.now();
    const failedEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "agent1_generated" as const,
        version: 1,
        succeeded: false,
      },
    };

    const revertEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "status_changed" as const,
        from: "generating" as const,
        to: "draft_brief" as const,
      },
    };

    try {
      await firestore
        .collection(STORIES_COLLECTION)
        .doc(storyId)
        .update({
          status: "draft_brief",
          briefStatus: "draft",
          updatedAt: now,
          editHistory: [...story.editHistory, failedEvent, revertEvent],
        });
    } catch (revertError) {
      console.error(
        "Failed to revert story status after Agent 1 failure:",
        revertError,
      );
    }

    if (error instanceof BriefNotReadyError) {
      res.status(400).json({
        error: "INVALID_INPUT",
        message: error.message,
      });
      return;
    }
    if (error instanceof UnsupportedStoryTypeError) {
      res.status(400).json({
        error: "INVALID_INPUT",
        message: error.message,
      });
      return;
    }
    if (error instanceof TypeMismatchError) {
      res.status(400).json({
        error: "INVALID_INPUT",
        message: error.message,
      });
      return;
    }
    if (error instanceof Step1IncoherentError) {
      res.status(502).json({
        error: "AGENT1_FAILED",
        message:
          "Story generation failed after retries. Please try again.",
      });
      return;
    }
    if (error instanceof Error && error.message === "AGENT1_TIMEOUT") {
      res.status(504).json({
        error: "AGENT1_TIMEOUT",
        message: "Story generation timed out. Please try again.",
      });
      return;
    }

    console.error("Unexpected error in /generate:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred during generation.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default router;
