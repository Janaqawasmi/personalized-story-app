import { Router, Request, Response } from "express";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  generateStoryDraftFromBrief,
  BriefNotReadyError,
  UnsupportedStoryTypeError,
  TypeMismatchError,
  Step1IncoherentError,
} from "@/agent1";
import type { Agent1Result, ApprovedPart, GenerateOptions, StoryPage } from "@/agent1/types";
import { MODEL_LABELS, isModelChoice } from "@/agent1/shared/models";
import { NoTextBlockError } from "@/agent1/shared/llm-client";
import { firestore } from "@/config/firebase";
import {
  STORIES_COLLECTION,
  createStoryForGeneration,
  fillIllustrationV2DocDefaults,
  isTransitionAllowed,
} from "@/models/story.model";
import type { Story, StoryStatus } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { coerceStoryLanguage } from "@/models/storyBrief.model";
import { isClientWireBriefPayload } from "@dammah/story-brief-complexity";
import { enqueueJob } from "@/illustration/shared/job-enqueue";
import { appendIllustrationEvent } from "@/illustration/shared/history-events";
import {
  readLatestImage,
  listImagesForPage,
  listScenePlansForPage,
  readVisualBible,
  listVisualBibleVersions,
} from "@/illustration/shared/artefact-store";
import {
  patchVisualBible,
  PatchVisualBibleValidationError,
  type VisualBiblePatchBody,
} from "@/illustration/orchestrator/patchVisualBible";
import { publishStory, PublishStoryError, type PublishStoryBody } from "@/illustration/orchestrator/publishStory";
import type { EnvironmentEntry } from "@/illustration/types";
import { COLLECTIONS } from "@/shared/firestore/paths";

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

/** Words in a string (whitespace-delimited). */
function countWordsInText(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Split an edited manuscript body into pages on blank-line boundaries. */
function splitBodyIntoPages(body: string): StoryPage[] {
  return body
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({
      pageNumber: i + 1,
      text,
      wordCount: countWordsInText(text),
    }));
}

/**
 * Reconcile structured manuscript `pages` with the specialist's working
 * `currentDraft` so downstream consumers (illustration, publish) use the
 * approved, edited text rather than the original generated pages.
 *
 * Returns the pages to persist, or `null` when no change is needed:
 *  - Draft matches the composed pages (no manual edits) → keep the original
 *    structure intact (correctly handles multi-paragraph pages).
 *  - Draft diverges from the generated pages → rebuild pages from the edited body.
 *  - No structured pages yet (legacy text format) but a draft exists → derive them.
 */
function reconcilePagesFromDraft(story: Story): StoryPage[] | null {
  const body = story.currentDraft?.body?.trim() ?? "";
  if (!body) return null;

  const pages = story.pages ?? [];
  if (pages.length > 0) {
    const composed = [...pages]
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => p.text.trim())
      .join("\n\n")
      .trim();
    if (composed === body) return null; // no manual edits — keep page structure
  }

  return splitBodyIntoPages(body);
}

router.use(requireAuth);
router.use(requireRole("specialist", "admin"));

// ============================================================================
// SHARED HELPER
// ============================================================================

function hydrateStoryFromFirestore(
  storyId: string,
  data: Record<string, unknown> | undefined,
): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

async function readAndVerifyOwnership(
  storyId: string,
  ownerUid: string,
): Promise<Story | null> {
  const doc = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();
  if (!doc.exists) return null;
  const story = hydrateStoryFromFirestore(storyId, doc.data() as Record<string, unknown>);
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
    briefLanguage: coerceStoryLanguage(wire.briefLanguage),
    outputLanguage: coerceStoryLanguage(wire.outputLanguage),
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

  let stories = snapshot.docs.map((doc) =>
    hydrateStoryFromFirestore(doc.id, doc.data() as Record<string, unknown>),
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
    const newPages = patch.pages as Array<{ text: string; wordCount: number }>;
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
  const finalStory = hydrateStoryFromFirestore(storyId, finalDoc.data() as Record<string, unknown>);

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

  if (to === "illustration_ready") {
    const pages = story.illustrationPages ?? [];
    const unapproved = pages.filter((p) => p.status !== "approved").map((p) => p.pageNumber);
    if (unapproved.length > 0) {
      res.status(409).json({
        error: "NOT_ALL_PAGES_APPROVED",
        message: "Every page must have an approved illustration before marking ready to publish.",
        unapprovedPageNumbers: unapproved,
      });
      return;
    }
  }

  if (to === "illustration_workspace") {
    const jobId = await enqueueJob({
      storyId,
      type: "workspace_open",
      pageNumber: null,
      enqueuedBy: ownerUid,
      inputRefs: {},
      idempotencyKey: `${storyId}:workspace_open:v1`,
    });
    res.status(200).json({ jobId, status: "pending" });
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
    // Make the approved manuscript canonical: fold any manual edits living in
    // `currentDraft` back into `pages` so illustration/publish use the edited text.
    const reconciledPages = reconcilePagesFromDraft(story);
    if (reconciledPages) {
      extraFields.pages = reconciledPages;
    }
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

  if (to === "illustration_ready") {
    updatedHistory.push({
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: { kind: "illustration_ready_marked" as const },
    });
  }

  // NOTE: transitioning to "generating" via this endpoint only updates the
  // status — it does NOT run story generation. Use POST /:storyId/generate to
  // trigger actual generation.
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    status: to,
    updatedAt: now,
    ...extraFields,
    editHistory: updatedHistory,
  });

  // Phase 2: `illustration_workspace` is enqueued above; the worker flips status when done.

  const finalDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  const finalStory = hydrateStoryFromFirestore(storyId, finalDoc.data() as Record<string, unknown>);

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
  const finalStory = hydrateStoryFromFirestore(storyId, finalDoc.data() as Record<string, unknown>);

  res.status(200).json({ story: finalStory });
}

async function setIllustrationPagePendingImageJob(
  storyId: string,
  pageNumber: number,
  jobId: string,
): Promise<void> {
  await firestore.runTransaction(async (tx) => {
    const ref = firestore.collection(STORIES_COLLECTION).doc(storyId);
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const st = hydrateStoryFromFirestore(storyId, snap.data() as Record<string, unknown>);
    if (st.status !== "illustration_workspace") return;
    const pages = [...(st.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) return;
    const row = pages[idx]!;
    pages[idx] = {
      ...row,
      pendingJobId: jobId,
      status: "generating_image",
      lastError: null,
    };
    tx.update(ref, { illustrationPages: pages, updatedAt: Date.now() });
  });
}

async function handleEnqueuePageImage(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  if (story.status !== "illustration_workspace") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Image generation is only available in the illustration workspace.",
    });
    return;
  }
  const row = story.illustrationPages?.find((p) => p.pageNumber === pageNumber);
  if (!row || row.currentScenePlanVersion === null) {
    res.status(404).json({ error: "NOT_FOUND", message: "Illustration page not found." });
    return;
  }

  const idempotencyKey = `${storyId}:image:${pageNumber}:sp${row.currentScenePlanVersion}`;
  const jobId = await enqueueJob({
    storyId,
    type: "image_generation",
    pageNumber,
    enqueuedBy: ownerUid,
    inputRefs: {},
    idempotencyKey,
  });

  await setIllustrationPagePendingImageJob(storyId, pageNumber, jobId);

  res.status(200).json({ jobId, status: "pending" as const });
}

async function handleApprovePageImage(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  if (story.status !== "illustration_workspace") {
    res.status(409).json({ error: "INVALID_STATE", message: "Approvals only apply in illustration_workspace." });
    return;
  }
  const row = story.illustrationPages?.find((p) => p.pageNumber === pageNumber);
  if (!row || row.currentImageVersion === null) {
    res.status(409).json({ error: "INVALID_STATE", message: "No image to approve for this page." });
    return;
  }

  const img = await readLatestImage(storyId, pageNumber);
  if (!img || img.version !== row.currentImageVersion || img.reviewStatus !== "awaiting_review") {
    res.status(409).json({ error: "INVALID_STATE", message: "Latest image is not awaiting review." });
    return;
  }

  const now = Date.now();
  const storyRef = firestore.collection(STORIES_COLLECTION).doc(storyId);
  const imageRef = storyRef.collection(COLLECTIONS.STORY_IMAGES).doc(`${pageNumber}-${img.version}`);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(storyRef);
    if (!snap.exists) return;
    const st = hydrateStoryFromFirestore(storyId, snap.data() as Record<string, unknown>);
    const pages = [...(st.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) return;
    const r = pages[idx]!;
    if (r.currentImageVersion !== img.version) return;
    pages[idx] = { ...r, status: "approved" };
    tx.update(imageRef, { reviewStatus: "approved", approvedAt: now });
    tx.update(storyRef, { illustrationPages: pages, updatedAt: now });
  });

  await appendIllustrationEvent(
    storyId,
    { kind: "image_approved", pageNumber, version: img.version },
    ownerUid,
  );

  res.status(200).json({ ok: true as const });
}

async function handleRejectPageImage(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  if (story.status !== "illustration_workspace") {
    res.status(409).json({ error: "INVALID_STATE", message: "Rejections only apply in illustration_workspace." });
    return;
  }
  const row = story.illustrationPages?.find((p) => p.pageNumber === pageNumber);
  if (!row || row.currentImageVersion === null || row.currentScenePlanVersion === null) {
    res.status(409).json({ error: "INVALID_STATE", message: "No image to reject for this page." });
    return;
  }

  const img = await readLatestImage(storyId, pageNumber);
  if (!img || img.version !== row.currentImageVersion || img.reviewStatus !== "awaiting_review") {
    res.status(409).json({ error: "INVALID_STATE", message: "Latest image is not awaiting review." });
    return;
  }

  const body = req.body as { feedbackNote?: unknown };
  const feedbackNote =
    typeof body.feedbackNote === "string" ? body.feedbackNote.trim() : "";

  const idempotencyKey = `${storyId}:image_regen:${pageNumber}:sp${row.currentScenePlanVersion}:img${row.currentImageVersion}`;
  const jobId = await enqueueJob({
    storyId,
    type: "image_regen",
    pageNumber,
    enqueuedBy: ownerUid,
    inputRefs: { feedbackNote },
    idempotencyKey,
  });

  const now = Date.now();
  const storyRef = firestore.collection(STORIES_COLLECTION).doc(storyId);
  const imageRef = storyRef.collection(COLLECTIONS.STORY_IMAGES).doc(`${pageNumber}-${img.version}`);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(storyRef);
    if (!snap.exists) return;
    const st = hydrateStoryFromFirestore(storyId, snap.data() as Record<string, unknown>);
    const pages = [...(st.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) return;
    const r = pages[idx]!;
    if (r.currentImageVersion !== img.version) return;
    pages[idx] = {
      ...r,
      status: "generating_image",
      pendingJobId: jobId,
      lastError: null,
    };
    tx.update(imageRef, {
      reviewStatus: "needs_revision",
      rejectionNote: feedbackNote.length > 0 ? feedbackNote : null,
    });
    tx.update(storyRef, { illustrationPages: pages, updatedAt: now });
  });

  await appendIllustrationEvent(
    storyId,
    {
      kind: "image_rejected",
      pageNumber,
      version: img.version,
      feedbackNote,
    },
    ownerUid,
  );

  res.status(200).json({ jobId, status: "pending" as const });
}

async function handleRegenerateScenePlan(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  if (story.status !== "illustration_workspace") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Scene plan regeneration is only available in the illustration workspace.",
    });
    return;
  }
  const row = story.illustrationPages?.find((p) => p.pageNumber === pageNumber);
  if (!row || row.currentScenePlanVersion === null) {
    res.status(404).json({ error: "NOT_FOUND", message: "Illustration page not found." });
    return;
  }

  const body = req.body as { feedbackNote?: unknown };
  const feedbackNote =
    typeof body.feedbackNote === "string" ? body.feedbackNote.trim() : "";

  const idempotencyKey = `${storyId}:scene_plan_regen:${pageNumber}:sp${row.currentScenePlanVersion}`;
  const jobId = await enqueueJob({
    storyId,
    type: "scene_plan_regen",
    pageNumber,
    enqueuedBy: ownerUid,
    inputRefs: { feedbackNote },
    idempotencyKey,
  });

  res.status(200).json({ jobId, status: "pending" as const });
}

async function handleGetPageIllustrationHistory(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const rawPage = req.params["pageNumber"] ?? "";
  const pageNumber = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(pageNumber)) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Invalid page number." });
    return;
  }

  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }

  const [scenePlans, images] = await Promise.all([
    listScenePlansForPage(storyId, pageNumber),
    listImagesForPage(storyId, pageNumber),
  ]);

  res.status(200).json({ scenePlans, images });
}

async function handleGetVisualBible(req: Request, res: Response): Promise<void> {
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
  if (story.status !== "illustration_workspace" && story.status !== "illustration_ready") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Visual Bible is only available in illustration workspace states.",
    });
    return;
  }
  const v = story.currentVisualBibleVersion;
  if (v === null) {
    res.status(404).json({ error: "NOT_FOUND", message: "No Visual Bible version on story." });
    return;
  }
  const artefact = await readVisualBible(storyId, v);
  if (!artefact) {
    res.status(404).json({ error: "NOT_FOUND", message: "Visual Bible artefact missing." });
    return;
  }
  res.status(200).json({ artefact, version: v });
}

async function handleListVisualBibleVersions(req: Request, res: Response): Promise<void> {
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
  if (story.status !== "illustration_workspace" && story.status !== "illustration_ready") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Visual Bible history is only available in illustration workspace states.",
    });
    return;
  }
  const versions = await listVisualBibleVersions(storyId);
  res.status(200).json({ versions });
}

async function handlePatchVisualBible(req: Request, res: Response): Promise<void> {
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
  const body = req.body as Record<string, unknown>;
  const patch: VisualBiblePatchBody = {};
  if (typeof body.characterAnchor === "string") patch.characterAnchor = body.characterAnchor;
  if (typeof body.characterSheet === "string") patch.characterSheet = body.characterSheet;
  if (typeof body.styleGuide === "string") patch.styleGuide = body.styleGuide;
  if (typeof body.palette === "string") patch.palette = body.palette;
  if (Array.isArray(body.consistencyAnchors)) {
    patch.consistencyAnchors = body.consistencyAnchors.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(body.avoidList)) {
    patch.avoidList = body.avoidList.filter((x): x is string => typeof x === "string");
  }
  if (body.environmentRegistry && typeof body.environmentRegistry === "object" && body.environmentRegistry !== null) {
    patch.environmentRegistry = body.environmentRegistry as Record<string, EnvironmentEntry>;
  }

  try {
    const result = await patchVisualBible({ storyId, uid: ownerUid, body: patch });
    res.status(200).json(result);
  } catch (e) {
    if (e instanceof PatchVisualBibleValidationError) {
      const notFound = e.message === "Story not found.";
      res.status(notFound ? 404 : 400).json({
        error: notFound ? "NOT_FOUND" : "INVALID_INPUT",
        message: e.message,
      });
      return;
    }
    throw e;
  }
}

async function handlePostVisualBibleRegenerate(req: Request, res: Response): Promise<void> {
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
  if (story.status !== "illustration_workspace") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Visual Bible regeneration is only available in illustration_workspace.",
    });
    return;
  }
  const vbv = story.currentVisualBibleVersion;
  if (vbv === null) {
    res.status(409).json({ error: "INVALID_STATE", message: "Missing Visual Bible version." });
    return;
  }
  const idempotencyKey = `${storyId}:visual_bible_regen:vb${vbv}`;
  const jobId = await enqueueJob({
    storyId,
    type: "visual_bible_regen",
    pageNumber: null,
    enqueuedBy: ownerUid,
    inputRefs: {},
    idempotencyKey,
  });
  res.status(200).json({ jobId, status: "pending" as const });
}

async function handlePublishStory(req: Request, res: Response): Promise<void> {
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
  if (story.status !== "illustration_ready") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Publish is only available when the story is illustration_ready.",
    });
    return;
  }

  const raw = req.body as Record<string, unknown> | undefined;
  const body: PublishStoryBody = {};
  if (typeof raw?.["shortDescriptionHe"] === "string") body.shortDescriptionHe = raw["shortDescriptionHe"];
  if (typeof raw?.["shortDescriptionAr"] === "string") body.shortDescriptionAr = raw["shortDescriptionAr"];
  if (typeof raw?.["displayTopicHe"] === "string") body.displayTopicHe = raw["displayTopicHe"];
  if (typeof raw?.["displayTopicAr"] === "string") body.displayTopicAr = raw["displayTopicAr"];

  try {
    const { templateId } = await publishStory({ storyId, uid: ownerUid, body });
    res.status(200).json({ templateId });
  } catch (err) {
    if (err instanceof PublishStoryError) {
      const status = err.code === "NOT_READY" ? 409 : 409;
      res.status(status).json({ error: err.code, message: err.message });
      return;
    }
    throw err;
  }
}

async function handleCancelIllustrationJob(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const jobId = req.params["jobId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  const jobRef = firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .collection(COLLECTIONS.STORY_ILLUSTRATION_JOBS)
    .doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) {
    res.status(404).json({ error: "NOT_FOUND", message: "Job not found." });
    return;
  }
  const st = snap.data()?.["status"];
  if (st !== "pending" && st !== "running") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Only pending or running jobs can be cancelled.",
    });
    return;
  }
  await jobRef.update({ cancelRequested: true });
  res.status(200).json({ ok: true as const, status: st });
}

async function handleGetIllustrationJob(req: Request, res: Response): Promise<void> {
  const ownerUid = req.user?.uid ?? "";
  if (!ownerUid) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Could not determine user identity." });
    return;
  }
  const storyId = req.params["storyId"] ?? "";
  const jobId = req.params["jobId"] ?? "";
  const story = await readAndVerifyOwnership(storyId, ownerUid);
  if (!story) {
    res.status(404).json({ error: "NOT_FOUND", message: "Story not found." });
    return;
  }
  const jobRef = firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .collection(COLLECTIONS.STORY_ILLUSTRATION_JOBS)
    .doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) {
    res.status(404).json({ error: "NOT_FOUND", message: "Job not found." });
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  res.status(200).json({ job: { ...data, id: jobId } as unknown });
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// GET
router.get("/", handleListStories);
router.get("/:storyId/visual-bible/versions", handleListVisualBibleVersions);
router.get("/:storyId/visual-bible", handleGetVisualBible);
router.get("/:storyId/jobs/:jobId", handleGetIllustrationJob);
router.get("/:storyId", handleGetStory);

// PATCH
router.patch("/:storyId/visual-bible", handlePatchVisualBible);
router.patch("/:storyId", handlePatchStory);

// PUT
router.put("/:storyId/brief", handleUpdateBrief);

// POST
router.post("/:storyId/transitions", handleTransition);
router.post("/:storyId/publish", handlePublishStory);
router.post("/:storyId/jobs/:jobId/cancel", handleCancelIllustrationJob);
router.post("/:storyId/visual-bible/regenerate", handlePostVisualBibleRegenerate);
router.post("/:storyId/pages/:pageNumber/image", handleEnqueuePageImage);
router.post("/:storyId/pages/:pageNumber/image/approve", handleApprovePageImage);
router.post("/:storyId/pages/:pageNumber/image/reject", handleRejectPageImage);
router.post("/:storyId/pages/:pageNumber/scene-plan/regenerate", handleRegenerateScenePlan);
router.get("/:storyId/pages/:pageNumber/history", handleGetPageIllustrationHistory);
router.post("/:storyId/generate", handleGenerate); // from R2
router.post("/:storyId/generate-variant", handleGenerateVariant);

/** Max Agent 1 versions per story (default + reruns + model variants share this cap). */
const MAX_AGENT1_VERSIONS = 3;

/** Wall-clock cap for the full Agent 1 pipeline (three sequential LLM calls). */
const AGENT1_GENERATE_TIMEOUT_MS = 180_000;

const AGENT1_APPROVED_PART_CODES = new Set<string>([
  "emotionalTruth",
  "blueprint",
  "approachInstruction",
  "story",
]);

function parseAgent1Rerun(raw: unknown): {
  feedbackText: string;
  approvedParts: ApprovedPart[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedbackText =
    typeof o.feedbackText === "string" ? o.feedbackText.trim() : "";
  if (!feedbackText) return null;

  const approvedParts: ApprovedPart[] = [];
  if (Array.isArray(o.approvedParts)) {
    for (const p of o.approvedParts) {
      if (typeof p === "string" && AGENT1_APPROVED_PART_CODES.has(p)) {
        approvedParts.push(p as ApprovedPart);
      }
    }
  }

  return { feedbackText, approvedParts };
}

async function handleGenerate(req: Request, res: Response): Promise<void> {
  const { storyId } = req.params;
  const body = req.body as {
    story?: {
      brief?: unknown;
      parentStoryId?: string | null;
      title?: string;
    };
    agent1Rerun?: unknown;
  };
  const clientStory = body.story;

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

  let preGenStory: Story | undefined;
  let generateOptions: GenerateOptions | undefined;
  let story: Story;

  if (existingDoc.exists) {
    const existingStory = hydrateStoryFromFirestore(storyId, existingDoc.data() as Record<string, unknown>);
    preGenStory = existingStory;

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

    if (existingStory.status === "needs_revision") {
      if (existingStory.agent1Versions.length >= 3) {
        res.status(409).json({
          error: "REGEN_LIMIT",
          message:
            "This story already has the maximum number of Agent 1 versions. Open a new revision from the brief.",
        });
        return;
      }

      const rerunPayload = parseAgent1Rerun(body.agent1Rerun);
      if (!rerunPayload) {
        res.status(400).json({
          error: "INVALID_INPUT",
          message:
            "Regeneration requires agent1Rerun.feedbackText in the request body (and optional agent1Rerun.approvedParts).",
        });
        return;
      }

      const previousOutput = existingStory.agent1Result;
      if (!previousOutput) {
        res.status(400).json({
          error: "INVALID_INPUT",
          message: "Cannot regenerate: story has no agent1Result.",
        });
        return;
      }

      generateOptions = {
        feedback: {
          rerunOf: previousOutput.generationId,
          approvedParts: rerunPayload.approvedParts,
          feedbackText: rerunPayload.feedbackText,
          previousOutput,
        },
      };
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
      ...(typeof clientStory.parentStoryId === "string"
        ? { parentStoryId: clientStory.parentStoryId }
        : {}),
      ...(typeof clientStory.title === "string" ? { title: clientStory.title } : {}),
    });
  }

  const isRegeneration = preGenStory !== undefined && preGenStory.status === "needs_revision";

  await firestore.collection(STORIES_COLLECTION).doc(storyId).set(story);

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("AGENT1_TIMEOUT")),
        AGENT1_GENERATE_TIMEOUT_MS,
      );
    });

    const agent1Result: Agent1Result = await Promise.race([
      generateStoryDraftFromBrief(brief, generateOptions),
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
      // Persist structured manuscript pages when the JSON-format parser produced them.
      // null when the legacy text-format fallback was used.
      pages: agent1Result.pages ?? null,
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

    const finalStory = hydrateStoryFromFirestore(storyId, finalDoc.data() as Record<string, unknown>);

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

    const revertTo: StoryStatus = isRegeneration ? "in_review" : "draft_brief";
    const revertEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "status_changed" as const,
        from: "generating" as const,
        to: revertTo,
      },
    };

    try {
      if (isRegeneration && preGenStory) {
        await firestore
          .collection(STORIES_COLLECTION)
          .doc(storyId)
          .update({
            status: "in_review",
            briefStatus: preGenStory.briefStatus,
            brief: preGenStory.brief,
            agent1Result: preGenStory.agent1Result,
            agent1Versions: preGenStory.agent1Versions,
            currentDraft: preGenStory.currentDraft,
            pages: preGenStory.pages ?? null,
            title: preGenStory.title,
            parentStoryId: preGenStory.parentStoryId,
            updatedAt: now,
            editHistory: [...story.editHistory, failedEvent, revertEvent],
          });
      } else {
        await firestore
          .collection(STORIES_COLLECTION)
          .doc(storyId)
          .update({
            status: "draft_brief",
            briefStatus: "draft",
            updatedAt: now,
            editHistory: [...story.editHistory, failedEvent, revertEvent],
          });
      }
    } catch (revertError) {
      console.error(
        "Failed to revert story status after generation failure:",
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
    if (error instanceof NoTextBlockError) {
      res.status(502).json({
        error: "AGENT1_FAILED",
        message:
          "The model returned no usable text. For GPT variants, ensure OPENAI_API_KEY is valid and try again.",
        details: error.message,
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

// Generates an additional story version with a different AI model from the same
// stored brief, and appends it to agent1Versions for side-by-side comparison.
// Unlike /generate this does NOT change story status or the current draft — the
// specialist stays on the review screen while the new version is added.
async function handleGenerateVariant(req: Request, res: Response): Promise<void> {
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

  if (story.status !== "awaiting_review" && story.status !== "in_review") {
    res.status(409).json({
      error: "INVALID_STATE",
      message: "Model variants can only be generated while a draft is under review.",
    });
    return;
  }

  const rawChoice = (req.body as { modelChoice?: unknown })?.modelChoice;
  if (!isModelChoice(rawChoice)) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Request body must include 'modelChoice' as one of: sonnet, gpt, opus.",
    });
    return;
  }
  const modelChoice = rawChoice;

  if (story.agent1Versions.length >= MAX_AGENT1_VERSIONS) {
    res.status(409).json({
      error: "REGEN_LIMIT",
      message:
        "This story already has the maximum number of versions. Open a new revision from the brief.",
    });
    return;
  }

  if (story.agent1Versions.some((v) => v.modelChoice === modelChoice)) {
    res.status(409).json({
      error: "DUPLICATE_MODEL",
      message: `A version generated with ${MODEL_LABELS[modelChoice]} already exists for this story.`,
    });
    return;
  }

  const brief = story.brief;
  if (brief.status !== "submitted") {
    brief.status = "submitted";
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("AGENT1_TIMEOUT")),
        AGENT1_GENERATE_TIMEOUT_MS,
      );
    });

    const agent1Result: Agent1Result = await Promise.race([
      generateStoryDraftFromBrief(brief, { modelChoice }),
      timeoutPromise,
    ]);

    const now = Date.now();
    const generatedEvent = {
      id: crypto.randomUUID(),
      at: now,
      byUid: ownerUid,
      event: {
        kind: "agent1_generated" as const,
        version: story.agent1Versions.length + 1,
        succeeded: true,
      },
    };

    await firestore
      .collection(STORIES_COLLECTION)
      .doc(storyId)
      .update({
        agent1Versions: [...story.agent1Versions, agent1Result],
        updatedAt: now,
        editHistory: [...story.editHistory, generatedEvent],
      });

    const finalDoc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
    const finalStory = hydrateStoryFromFirestore(storyId, finalDoc.data() as Record<string, unknown>);

    res.status(200).json({ story: finalStory });
  } catch (error: unknown) {
    if (error instanceof BriefNotReadyError) {
      res.status(400).json({ error: "INVALID_INPUT", message: error.message });
      return;
    }
    if (error instanceof UnsupportedStoryTypeError) {
      res.status(400).json({ error: "INVALID_INPUT", message: error.message });
      return;
    }
    if (error instanceof TypeMismatchError) {
      res.status(400).json({ error: "INVALID_INPUT", message: error.message });
      return;
    }
    if (error instanceof NoTextBlockError) {
      res.status(502).json({
        error: "AGENT1_FAILED",
        message:
          "The model returned no usable text. For GPT variants, ensure OPENAI_API_KEY is valid and try again.",
        details: error.message,
      });
      return;
    }
    if (error instanceof Step1IncoherentError) {
      res.status(502).json({
        error: "AGENT1_FAILED",
        message: "Variant generation failed after retries. Please try again.",
      });
      return;
    }
    if (error instanceof Error && error.message === "AGENT1_TIMEOUT") {
      res.status(504).json({
        error: "AGENT1_TIMEOUT",
        message: "Variant generation timed out. Please try again.",
      });
      return;
    }

    console.error("Unexpected error in /generate-variant:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred during variant generation.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default router;
