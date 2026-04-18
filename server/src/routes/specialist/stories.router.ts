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
} from "@/models/story.model";
import type { Story } from "@/models/story.model";

const router = Router();

router.use(requireAuth);
router.use(requireRole("specialist", "admin"));

router.post("/:storyId/generate", handleGenerate);

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
    });
  }
}

export default router;
