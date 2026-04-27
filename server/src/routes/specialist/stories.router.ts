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
  toPageIllustrations,
} from "@/models/story.model";
import type { Story, StoryStatus, PageIllustration } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { isClientWireBriefPayload } from "@dammah/story-brief-complexity";
import { generateImagePromptsForPages } from "@/specialist/specialistIllustration.service";

const router = Router();

/** Specialist prose edits are snapshotted as an extra agent1Versions entry before regeneration. */
function buildSpecialistSnapshotFields(
  story: Story,
): Pick<Story, "agent1Versions" | "agent1Result"> | null {
  const draft = story.currentDraft;
  const base: Agent1Result | null =
    story.agent1Versions.length > 0
      ? story.agent1Versions[story.agent1Versions.length - 1]!
      : story.agent1Result ?? null;
  if (!draft || !base) return null;

  if (
    draft.body.trim() === base.story.trim() &&
    draft.title.trim() === base.title.trim()
  ) {
    return null;
  }

  const wc = draft.wordCount;
  const [minW, maxW] = base.targetWordRange;
  const wordCountDrift: Agent1Result["wordCountDrift"] =
    wc < minW ? "under" : wc > maxW ? "over" : "within_range";

  const snapshot: Agent1Result = {
    ...base,
    generationId: crypto.randomUUID(),
    title: draft.title,
    story: draft.body,
    wordCount: wc,
    wordCountDrift,
    generatedAt: new Date().toISOString(),
    rerunOf: base.generationId,
  };

  return {
    agent1Versions: [...story.agent1Versions, snapshot],
    agent1Result: snapshot,
  };
}

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

function normalizeIncomingBrief(raw: unknown, createdBy: string): StoryBrief | null {
  if (!raw || typeof raw !== "object") return null;

  const asRecord = raw as Record<string, unknown>;
  if ("ageAndScope" in asRecord && "therapeuticArchitecture" in asRecord) {
    return raw as StoryBrief;
  }

  if (!isClientWireBriefPayload(raw)) {
    return null;
  }

  const wire = raw as Record<string, unknown>;
  const s1 = (wire.section1 ?? {}) as Record<string, unknown>;
  const s2 = (wire.section2 ?? {}) as Record<string, unknown>;
  const s3 = (wire.section3 ?? {}) as Record<string, unknown>;
  const s4 = (wire.section4 ?? {}) as Record<string, unknown>;
  const s5 = (wire.section5 ?? {}) as Record<string, unknown>;

  const supportingTypes = Array.isArray(s4.supportingCharacters)
    ? s4.supportingCharacters.filter((v): v is string => typeof v === "string")
    : [];
  type SupportingCharacterType =
    NonNullable<StoryBrief["storyWorld"]["supportingCharacters"]>[number]["type"];
  const roleNotes =
    s4.characterRoleNotes && typeof s4.characterRoleNotes === "object"
      ? (s4.characterRoleNotes as Record<string, unknown>)
      : {};

  const now = new Date() as unknown as StoryBrief["createdAt"];

  return {
    createdAt: now,
    updatedAt: now,
    createdBy,
    status: "submitted",
    version: 1,
    storyType: String(wire.storyType ?? "") as StoryBrief["storyType"],
    ageAndScope: {
      ageRange: String(s1.ageRange ?? "3-5") as StoryBrief["ageAndScope"]["ageRange"],
      peakIntensity: String(s1.peakIntensity ?? "moderate") as StoryBrief["ageAndScope"]["peakIntensity"],
      storyLength: String(s1.storyLength ?? "standard") as StoryBrief["ageAndScope"]["storyLength"],
    },
    clinicalFoundation: {
      population: String(s2.population ?? ""),
      trigger: String(s2.trigger ?? ""),
      therapeuticIntention: {
        feel: String(s2.intentionFeel ?? ""),
        because: String(s2.intentionBecause ?? ""),
      },
      creativeVision: String(s2.creativeVision ?? ""),
      ...(typeof s2.oneTrueThing === "string" && s2.oneTrueThing.trim()
        ? { oneTrueThing: s2.oneTrueThing }
        : {}),
    },
    therapeuticArchitecture: {
      primaryApproach: String(s3.primaryApproach ?? "") as StoryBrief["therapeuticArchitecture"]["primaryApproach"],
      ...(typeof s3.supportingApproach === "string" && s3.supportingApproach
        ? {
            supportingApproach:
              s3.supportingApproach as StoryBrief["therapeuticArchitecture"]["supportingApproach"],
          }
        : {}),
      shameDimension: String(s3.shameDimension ?? "not_significant") as StoryBrief["therapeuticArchitecture"]["shameDimension"],
      typeSpecificField: {
        fieldType: "somatic_expression",
        selections: Array.isArray(s3.somaticExpressions)
          ? s3.somaticExpressions.filter((v): v is string => typeof v === "string")
          : [],
        ...(typeof s3.somaticOther === "string" && s3.somaticOther.trim()
          ? { freeText: s3.somaticOther }
          : {}),
      },
      copingTool: String(s3.copingTool ?? "") as StoryBrief["therapeuticArchitecture"]["copingTool"],
      resolutionCompleteness: String(
        s3.resolutionCompleteness ?? "partial",
      ) as StoryBrief["therapeuticArchitecture"]["resolutionCompleteness"],
      mustNeverList: Array.isArray(s3.mustNeverList)
        ? s3.mustNeverList.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [],
    },
    storyWorld: {
      personalization: s4.personalization !== "no",
      ...(typeof s4.protagonistGender === "string"
        ? { protagonistGender: s4.protagonistGender as StoryBrief["storyWorld"]["protagonistGender"] }
        : {}),
      protagonistType: String(s4.protagonistType ?? "child") as StoryBrief["storyWorld"]["protagonistType"],
      protagonistAge: String(
        s4.protagonistAgeRelative ?? "same_age",
      ) as StoryBrief["storyWorld"]["protagonistAge"],
      caregiverPresence: String(
        s4.caregiverPresence ?? "present_and_comforting",
      ) as StoryBrief["storyWorld"]["caregiverPresence"],
      narrativeDistance: String(s4.narrativeDistance ?? "direct") as StoryBrief["storyWorld"]["narrativeDistance"],
      ...(typeof s4.parallelChallenge === "string" && s4.parallelChallenge.trim()
        ? { parallelChallenge: s4.parallelChallenge }
        : {}),
      supportingCharacters: supportingTypes.map((type) => {
        const role = roleNotes[type];
        return {
          type: type as SupportingCharacterType,
          ...(typeof role === "string" && role.trim() ? { functionalRole: role } : {}),
        };
      }),
      ...(typeof s4.characterNotes === "string" && s4.characterNotes.trim()
        ? { characterNotes: s4.characterNotes }
        : {}),
    },
    personalizationConfig: {
      ...(typeof s5.whyNot === "string" && s5.whyNot.trim()
        ? { whyNot: s5.whyNot }
        : {}),
    },
    ...(Array.isArray(wire.acknowledgedWarnings)
      ? {
          acknowledgedWarnings: wire.acknowledgedWarnings.filter(
            (v): v is string => typeof v === "string",
          ),
        }
      : {}),
  } as StoryBrief;
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

  // Filter by statuses (optional — no filter returns all stories including archived)
  if (statusesParam && typeof statusesParam === "string") {
    const requested = statusesParam.split(",").map((s) => s.trim()) as StoryStatus[];
    stories = stories.filter((s) => requested.includes(s.status));
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

  // When pages are patched, keep currentDraft in sync so the legacy body
  // field stays consistent for UI consumers that still read currentDraft.body.
  if (Array.isArray(patch.pages) && patch.pages.length > 0) {
    const newPages = patch.pages as PageIllustration[];
    const derivedBody = newPages.map((p) => p.text).join("\n\n");
    const derivedWordCount = newPages.reduce((sum, p) => sum + p.wordCount, 0);
    const existingDraft = story.currentDraft;
    patch.currentDraft = {
      title: existingDraft?.title ?? story.title,
      body: derivedBody,
      wordCount: derivedWordCount,
      updatedAt: now,
    };
    if (!updatedHistory.some((e) => e.event.kind === "draft_edited")) {
      updatedHistory.push({
        id: crypto.randomUUID(),
        at: now,
        byUid: ownerUid,
        event: { kind: "draft_edited" as const, snapshot: patch.currentDraft },
      });
    }
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

  const { to } = req.body;
  const feedbackRaw = req.body.feedback;
  const feedback =
    typeof feedbackRaw === "string" ? feedbackRaw.trim() : "";

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

  if (to === "needs_revision") {
    const snap = buildSpecialistSnapshotFields(story);
    if (snap) {
      Object.assign(extraFields, snap);
    }
  }

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

  if (to === "needs_revision") {
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

  // Fire-and-forget prompt generation starts only when specialist explicitly
  // moves approved → prompt_review.
  if (to === "prompt_review") {
    generateImagePromptsForPages(storyId, ownerUid).catch((err: unknown) => {
      console.error(
        `[illustration-pipeline] generateImagePromptsForPages failed for story ${storyId}:`,
        err,
      );
    });
  }

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

  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Could not determine user identity.",
    });
    return;
  }

  const existingDoc = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();

  const brief = normalizeIncomingBrief(clientStory.brief, ownerUid);
  if (!brief) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Invalid brief payload. Expected canonical StoryBrief or client CompleteBrief wire format.",
    });
    return;
  }

  if (brief.status !== "submitted") {
    brief.status = "submitted";
  }

  let story: Story;
  if (existingDoc.exists) {
    const existingStory = { id: storyId, ...existingDoc.data() } as Story;

    if (existingStory.ownerUid !== ownerUid) {
      res.status(409).json({
        error: "CONFLICT",
        message: `A story with id '${storyId}' already exists for a different owner.`,
      });
      return;
    }

    if (existingStory.status === "generating") {
      res.status(409).json({
        error: "CONFLICT",
        message: "Story is already generating.",
      });
      return;
    }

    if (
      existingStory.status !== "draft_brief" &&
      existingStory.status !== "needs_revision"
    ) {
      res.status(409).json({
        error: "CONFLICT",
        message:
          `Cannot generate from status '${existingStory.status}'. ` +
          "Only draft_brief or needs_revision can be generated.",
      });
      return;
    }

    const now = Date.now();
    const generateEvent =
      existingStory.status === "needs_revision"
        ? {
            id: crypto.randomUUID(),
            at: now,
            byUid: ownerUid,
            event: {
              kind: "status_changed" as const,
              from: "needs_revision" as const,
              to: "generating" as const,
            },
          }
        : {
            id: crypto.randomUUID(),
            at: now,
            byUid: ownerUid,
            event: {
              kind: "status_changed" as const,
              from: "draft_brief" as const,
              to: "generating" as const,
            },
          };

    story = {
      ...existingStory,
      brief,
      status: "generating",
      briefStatus: "submitted",
      parentStoryId:
        clientStory.parentStoryId ?? existingStory.parentStoryId ?? null,
      title: clientStory.title ?? existingStory.title ?? "Untitled story",
      updatedAt: now,
      submittedAt: now,
      editHistory: [...existingStory.editHistory, generateEvent],
    };
  } else {
    story = createStoryForGeneration({
      id: storyId,
      ownerUid,
      brief,
      parentStoryId: clientStory.parentStoryId ?? undefined,
      title: clientStory.title ?? undefined,
    });
  }

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
      agent1Versions: [...story.agent1Versions, agent1Result],
      currentDraft: {
        title: agent1Result.title,
        body: agent1Result.story,
        wordCount: agent1Result.wordCount,
        updatedAt: now,
      },
      // Persist structured pages when the new JSON-format parser produced them.
      // null when the legacy text-format fallback was used.
      pages: agent1Result.pages ? toPageIllustrations(agent1Result.pages) : null,
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

// ============================================================================
// GATE 1 — IMAGE PROMPT REVIEW
// ============================================================================
//
// GET  /:storyId/pages                         list pages with prompt statuses
// PATCH /:storyId/pages/:pageNumber/prompt     approve or reject a single prompt
//   body: { action: "approve" | "reject", rejectionNote?: string }
//
// When all prompts are approved the story auto-advances to "illustrating" and
// triggerIllustrationGeneration() is fired in the background.

import { triggerIllustrationGeneration } from "@/specialist/specialistIllustration.service";

router.get("/:storyId/pages", handleListPages);
router.patch("/:storyId/pages/:pageNumber/prompt", handleReviewPrompt);

async function handleListPages(req: Request, res: Response): Promise<void> {
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

  if (!story.pages || story.pages.length === 0) {
    res.status(200).json({ pages: [] });
    return;
  }

  res.status(200).json({ pages: story.pages });
}

// ============================================================================
// GATE 2 — ILLUSTRATION REVIEW
// ============================================================================
//
// GET  /:storyId/illustrations                          list pages with illustration status
// PATCH /:storyId/pages/:pageNumber/illustration        approve or reject a single illustration
//   body: { action: "approve" | "reject", rejectionNote?: string }
//
// When all illustrations are approved the story auto-advances to
// "illustration_ready".
// When an illustration is rejected the page is re-queued for generation
// (illustrationStatus set back to "pending" and triggerIllustrationGeneration
//  is fire-and-forgotten so only the failed pages are re-generated on next run).

router.get("/:storyId/illustrations", handleListIllustrations);
router.patch("/:storyId/pages/:pageNumber/illustration", handleReviewIllustration);

async function handleListIllustrations(req: Request, res: Response): Promise<void> {
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

  res.status(200).json({ pages: story.pages ?? [] });
}

async function handleReviewIllustration(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const pageNumberRaw = req.params["pageNumber"];
  const pageNumber = parseInt(pageNumberRaw ?? "", 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    res.status(400).json({ error: "INVALID_INPUT", message: "pageNumber must be a positive integer." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  if (story.status !== "illustration_review") {
    res.status(409).json({
      error: "WRONG_STATUS",
      message: `Illustration review requires status 'illustration_review', got '${story.status}'.`,
    });
    return;
  }

  if (!story.pages) {
    res.status(409).json({ error: "NO_PAGES", message: "Story has no pages." });
    return;
  }

  const pageIndex = story.pages.findIndex((p) => p.pageNumber === pageNumber);
  if (pageIndex === -1) {
    res.status(404).json({ error: "NOT_FOUND", message: `Page ${pageNumber} not found.` });
    return;
  }

  const { action, rejectionNote } = req.body as {
    action?: string;
    rejectionNote?: string;
  };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "body.action must be 'approve' or 'reject'.",
    });
    return;
  }

  if (action === "reject" && (!rejectionNote || typeof rejectionNote !== "string" || !rejectionNote.trim())) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "rejectionNote is required when action is 'reject'.",
    });
    return;
  }

  const updatedPages = story.pages.map((p, i) => {
    if (i !== pageIndex) return p;
    if (action === "approve") {
      return { ...p, illustrationStatus: "done" as const, illustrationRejectionNote: null };
    }
    return {
      ...p,
      illustrationStatus: "pending" as const,
      illustrationRejectionNote: rejectionNote ?? null,
    };
  });

  const now = Date.now();
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    pages: updatedPages,
    updatedAt: now,
  });

  // Auto-advance: if all illustrations are now done, move to illustration_ready
  const allDone = updatedPages.every((p) => p.illustrationStatus === "done");
  if (allDone) {
    await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
      status: "illustration_ready" as StoryStatus,
      illustrationReadyAt: now,
      updatedAt: now,
    });
  } else if (action === "reject") {
    // Re-trigger generation for failed pages — fire-and-forget
    triggerIllustrationGeneration(storyId, ownerUid).catch((err: unknown) => {
      console.error(
        `[illustration-pipeline] re-trigger after rejection failed for story ${storyId}:`,
        err,
      );
    });
  }

  const updatedDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const updatedStory = { id: storyId, ...updatedDoc.data() } as Story;

  res.status(200).json({
    page: updatedStory.pages?.[pageIndex] ?? null,
    allIllustrationsApproved: allDone,
    storyStatus: updatedStory.status,
  });
}

async function handleReviewPrompt(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }

  const storyId = req.params["storyId"] ?? "";
  const pageNumberRaw = req.params["pageNumber"];
  const pageNumber = parseInt(pageNumberRaw ?? "", 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    res.status(400).json({ error: "INVALID_INPUT", message: "pageNumber must be a positive integer." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  if (story.status !== "prompt_review") {
    res.status(409).json({
      error: "WRONG_STATUS",
      message: `Prompt review requires status 'prompt_review', got '${story.status}'.`,
    });
    return;
  }

  if (!story.pages) {
    res.status(409).json({ error: "NO_PAGES", message: "Story has no pages." });
    return;
  }

  const pageIndex = story.pages.findIndex((p) => p.pageNumber === pageNumber);
  if (pageIndex === -1) {
    res.status(404).json({ error: "NOT_FOUND", message: `Page ${pageNumber} not found.` });
    return;
  }

  const { action, rejectionNote } = req.body as {
    action?: string;
    rejectionNote?: string;
  };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "body.action must be 'approve' or 'reject'.",
    });
    return;
  }

  if (action === "reject" && (!rejectionNote || typeof rejectionNote !== "string" || !rejectionNote.trim())) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "rejectionNote is required when action is 'reject'.",
    });
    return;
  }

  const updatedPages = story.pages.map((p, i) => {
    if (i !== pageIndex) return p;
    return {
      ...p,
      promptStatus: action === "approve" ? ("approved" as const) : ("rejected" as const),
      promptRejectionNote: action === "reject" ? (rejectionNote ?? null) : null,
    };
  });

  const now = Date.now();
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    pages: updatedPages,
    updatedAt: now,
  });

  // Auto-advance: if all prompts are now approved, move to illustrating
  const allApproved = updatedPages.every((p) => p.promptStatus === "approved");
  if (allApproved) {
    await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
      status: "illustrating" as StoryStatus,
      promptsApprovedAt: now,
      updatedAt: now,
    });
    triggerIllustrationGeneration(storyId, ownerUid).catch((err: unknown) => {
      console.error(
        `[illustration-pipeline] triggerIllustrationGeneration failed for story ${storyId}:`,
        err,
      );
    });
  }

  const updatedDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const updatedStory = { id: storyId, ...updatedDoc.data() } as Story;

  res.status(200).json({
    page: updatedStory.pages?.[pageIndex] ?? null,
    allPromptsApproved: allApproved,
    storyStatus: updatedStory.status,
  });
}

export default router;
