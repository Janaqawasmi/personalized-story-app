// server/src/specialist/pilotIllustration.service.ts
//
// Per-scene dual-variant (C/D) illustration service — pilot mode.
//
// Compared to specialistIllustration.service.ts (batch service, one Claude call
// for all prompts + one image trigger for all pages), this service:
//   - generates ONE scene at a time
//   - runs the scene-director pipeline (two Claude calls per page) so prompts
//     are scene-specific, not story-batched
//   - produces a separate prompt + image per variant (C = figurative scene
//     director, D = literal-mode scene director) for the same page so the
//     developer can compare them side-by-side
//   - stores each generation attempt as its own document in the
//     stories/{storyId}/illustrationRuns subcollection (vs. mutating the
//     pages array on the story doc)
//
// Lifecycle:
//   1. ensurePilotStyleBible(storyId)  — generated once per story (lazy)
//   2. generatePilotAvatarForStory(storyId, uid)  — admin explicit step;
//      can be re-rolled with a new seed until happy
//   3. generatePilotRun(storyId, pageNumber, variant, uid)  — runs the full
//      per-scene pipeline and writes one run doc; can be called repeatedly
//      to compare or to recover from failures
//
// All public functions require an admin-claim caller — enforced at the route
// layer via requireRole("admin"). This module trusts its caller.

import { firestore, admin } from "@/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { STORIES_COLLECTION } from "@/models/story.model";
import type { Story, PageIllustration } from "@/models/story.model";

import { callClaudeForStyleBible } from "./pilot/style-bible.generator";
import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
  type SceneDirectorMode,
} from "./pilot/scene-director";
import {
  assembleWithDetailedEnv,
  formatScenePromptForReport,
  CHARACTER_REF_INSTRUCTION,
} from "./pilot/style-bible.assembler";
import { generatePilotAvatar } from "./pilot/avatar-generator";
import type { StyleBible } from "./pilot/style-bible.types";
import {
  ILLUSTRATION_RUNS_SUBCOLLECTION,
  pilotRunStoragePath,
  type PilotAvatar,
  type PilotIllustrationRun,
  type PilotRunStatus,
  type PilotVariant,
} from "./pilot/types";

const PROMPT_MODEL = "claude-sonnet-4-6";
const IMAGE_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadStory(storyId: string): Promise<Story> {
  const doc = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  if (!doc.exists) {
    throw new Error(`Pilot: story ${storyId} not found`);
  }
  return doc.data() as Story;
}

function readPilotStyleBible(story: Story): StyleBible | null {
  const raw = story.pilotStyleBible;
  if (raw == null) return null;
  // Stored as an opaque record; the service is the only thing that ever
  // writes it, so the cast is safe.
  return raw as unknown as StyleBible;
}

function readPilotAvatar(story: Story): PilotAvatar | null {
  const raw = story.pilotAvatar;
  if (raw == null) return null;
  return raw as unknown as PilotAvatar;
}

function modeForVariant(variant: PilotVariant): SceneDirectorMode {
  // Per the pilot spec:
  //   C = scene-director-avatar-only (figurative)
  //   D = literal-scenes              (literal)
  return variant === "C" ? "figurative" : "literal";
}

// ---------------------------------------------------------------------------
// Style Bible (one per story, lazy)
// ---------------------------------------------------------------------------

/**
 * Returns the story's Pilot Style Bible, generating it on first access.
 *
 * Idempotent: subsequent calls return the cached value without re-calling
 * Claude. The Style Bible is locked once generated — re-rolling would
 * invalidate prior C-vs-D comparisons.
 */
export async function ensurePilotStyleBible(
  storyId: string,
): Promise<StyleBible> {
  const story = await loadStory(storyId);
  const existing = readPilotStyleBible(story);
  if (existing) return existing;

  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Pilot: story ${storyId} has no pages — cannot generate Style Bible`);
  }

  const bible = await callClaudeForStyleBible(story.pages, story.brief);

  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    pilotStyleBible: bible,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return bible;
}

// ---------------------------------------------------------------------------
// Avatar (one per story, admin-triggered)
// ---------------------------------------------------------------------------

/**
 * Generates a fresh character avatar for the story and stores it on the
 * story doc, replacing any prior avatar. Generating a Style Bible first if
 * one isn't already present.
 *
 * Re-rolling the avatar after page runs already exist does NOT delete those
 * runs — but it does invalidate them for comparison purposes. The admin UI
 * surfaces this trade-off; the service does not enforce it.
 *
 * If `seed` is omitted, a fresh random seed is used so re-rolls produce
 * different avatars from the same Style Bible.
 */
export async function generatePilotAvatarForStory(
  storyId: string,
  options: { seed?: number } = {},
): Promise<PilotAvatar> {
  const bible = await ensurePilotStyleBible(storyId);
  const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);

  const { url, prompt } = await generatePilotAvatar(bible, seed, storyId);

  const avatar: PilotAvatar = {
    url,
    seed,
    generatedAt: Date.now(),
    prompt,
  };

  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    pilotAvatar: avatar,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return avatar;
}

// ---------------------------------------------------------------------------
// Per-scene generation
// ---------------------------------------------------------------------------

interface GeneratePilotRunInput {
  storyId: string;
  pageNumber: number;
  variant: PilotVariant;
  /** uid of the admin triggering the run; recorded for audit. */
  createdBy: string;
  /**
   * Per-run image seed. If omitted, the story's illustrationSeed is reused
   * (if set) or a fresh random seed is generated. Keeping the seed stable
   * across re-runs of the same (page, variant) makes A/B comparisons more
   * reproducible — but the admin can also pass a fresh seed to explore
   * alternative compositions.
   */
  seed?: number;
}

/**
 * Generates one scene → one image for the given (page, variant) and writes
 * one PilotIllustrationRun document to the story's illustrationRuns subcollection.
 *
 * Steps:
 *   1. Load story + locked Style Bible + locked avatar (errors if missing).
 *   2. Allocate the next runIndex for this (page, variant) by counting
 *      existing runs.
 *   3. Pre-write the run doc with status="generating" so the UI can show
 *      progress immediately.
 *   4. Run Claude scene-director (mode = figurative or literal) for the
 *      target page only, threading the full story for narrative context.
 *   5. Run Claude prompt-converter for that page.
 *   6. Assemble final Seedream prompt (avatar reference + verbose env text).
 *   7. Call Seedream with the avatar as the reference image.
 *   8. Upload result to Firebase Storage; update the run doc to status="done".
 *   9. On failure at any step after the pre-write, mark the run "failed"
 *      with errorMessage.
 *
 * Returns the final run record.
 */
export async function generatePilotRun(
  input: GeneratePilotRunInput,
): Promise<PilotIllustrationRun> {
  const { storyId, pageNumber, variant, createdBy } = input;

  const story = await loadStory(storyId);
  const bible = readPilotStyleBible(story);
  const avatar = readPilotAvatar(story);

  if (!bible) {
    throw new Error(
      `Pilot: story ${storyId} has no pilotStyleBible. Call ensurePilotStyleBible first.`,
    );
  }
  if (!avatar) {
    throw new Error(
      `Pilot: story ${storyId} has no pilotAvatar. Call generatePilotAvatarForStory first.`,
    );
  }
  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Pilot: story ${storyId} has no pages`);
  }

  const targetPage = story.pages.find((p) => p.pageNumber === pageNumber);
  if (!targetPage) {
    throw new Error(`Pilot: story ${storyId} has no page ${pageNumber}`);
  }

  const seed =
    input.seed ??
    story.illustrationSeed ??
    Math.floor(Math.random() * 2 ** 31);

  // ---- Allocate next runIndex --------------------------------------------
  const runsRef = firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .collection(ILLUSTRATION_RUNS_SUBCOLLECTION);

  const priorSnapshot = await runsRef
    .where("pageNumber", "==", pageNumber)
    .where("variant", "==", variant)
    .get();
  const runIndex = priorSnapshot.size + 1;

  // ---- Pre-write run doc with status="generating" -------------------------
  const runDocRef = runsRef.doc();
  const now = Date.now();
  const initialRun: PilotIllustrationRun = {
    id: runDocRef.id,
    storyId,
    pageNumber,
    variant,
    runIndex,
    sceneDirection: "",
    scenePromptStructured: "",
    finalPromptToImageModel: "",
    imageStatus: "generating",
    imageUrl: null,
    errorMessage: null,
    referenceImage: avatar.url,
    seed,
    promptModel: PROMPT_MODEL,
    imageModel: IMAGE_MODEL,
    createdAt: now,
    createdBy,
    completedAt: null,
  };
  await runDocRef.set(initialRun);

  const mode = modeForVariant(variant);

  try {
    // ---- Step 1: Scene direction (Claude call 1) ------------------------
    const directions = await callClaudeForSceneDirections(
      story.pages,
      [targetPage],
      story.brief,
      bible,
      PROMPT_MODEL,
      mode,
    );
    const direction = directions[0];
    if (!direction) {
      throw new Error("scene director returned no directions");
    }

    // ---- Step 2: Structured prompt (Claude call 2) ----------------------
    const scenePrompts = await callClaudeForPromptsFromDirections(
      [targetPage],
      [direction],
      bible,
      PROMPT_MODEL,
      mode,
    );
    const scenePrompt = scenePrompts[0];
    if (!scenePrompt) {
      throw new Error("prompt converter returned no prompts");
    }

    // ---- Step 3: Final assembled Seedream prompt ------------------------
    const finalPrompt = assembleWithDetailedEnv(
      scenePrompt,
      bible,
      pageNumber,
      CHARACTER_REF_INSTRUCTION,
    );

    // ---- Step 4: Seedream image-to-image with avatar reference -----------
    const provider = new SeedreamProvider();
    const result = await provider.generateImage({
      textPrompt: finalPrompt,
      referenceImage: avatar.url,
      outputWidth: 1024,
      outputHeight: 1024,
      seed,
    });

    // ---- Step 5: Upload to Storage --------------------------------------
    const ext = (result.mimeType.split("/")[1] ?? "jpeg").replace("jpeg", "jpg");
    const storagePath = pilotRunStoragePath(storyId, pageNumber, variant, runIndex, ext);
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    await file.save(result.imageBuffer, {
      metadata: { contentType: result.mimeType },
    });
    await file.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // ---- Step 6: Finalise run doc ---------------------------------------
    const completedAt = Date.now();
    const finalRun: PilotIllustrationRun = {
      ...initialRun,
      sceneDirection: formatSceneDirectionForReport(direction),
      scenePromptStructured: formatScenePromptForReport(scenePrompt),
      finalPromptToImageModel: finalPrompt,
      imageStatus: "done",
      imageUrl,
      completedAt,
    };
    await runDocRef.set(finalRun);

    return finalRun;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pilot] run ${runDocRef.id} failed:`, err);
    const failedRun: PilotIllustrationRun = {
      ...initialRun,
      imageStatus: "failed" as PilotRunStatus,
      errorMessage: message,
      completedAt: Date.now(),
    };
    await runDocRef.set(failedRun);
    return failedRun;
  }
}

// ---------------------------------------------------------------------------
// Convenience: generate both variants for a page
// ---------------------------------------------------------------------------

/**
 * Generates one run for variant C and one for variant D in parallel for the
 * same page. Both share the story's locked avatar (so only the scene-director
 * mode varies between them — the comparison stays valid).
 */
export async function generatePilotRunsForBothVariants(
  input: Omit<GeneratePilotRunInput, "variant">,
): Promise<{ C: PilotIllustrationRun; D: PilotIllustrationRun }> {
  const [c, d] = await Promise.all([
    generatePilotRun({ ...input, variant: "C" }),
    generatePilotRun({ ...input, variant: "D" }),
  ]);
  return { C: c, D: d };
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Lists every PilotIllustrationRun for the story, ordered by (pageNumber asc,
 * variant asc, runIndex asc). The UI groups them client-side.
 */
export async function listPilotRunsForStory(
  storyId: string,
): Promise<PilotIllustrationRun[]> {
  const snapshot = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .collection(ILLUSTRATION_RUNS_SUBCOLLECTION)
    .get();

  const runs = snapshot.docs.map((d) => d.data() as PilotIllustrationRun);
  runs.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    if (a.variant !== b.variant) return a.variant === "C" ? -1 : 1;
    return a.runIndex - b.runIndex;
  });
  return runs;
}

/** Re-exports for consumers who need to inspect or extend the page-illustration shape. */
export type { PilotIllustrationRun, PilotAvatar, PilotVariant } from "./pilot/types";
export type { PageIllustration };
