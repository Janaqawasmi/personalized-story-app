/**
 * Pilot illustration types.
 *
 * Stored in Firestore subcollection: stories/{storyId}/illustrationRuns/{runId}
 *
 * Per the pilot spec, each (page × variant × generation attempt) produces one
 * run document. C-vs-D comparison reads two runs side by side (one per
 * variant) for the same page, plus history when the admin re-runs a variant.
 */

export type PilotVariant = "C" | "D";

export type PilotRunStatus = "pending" | "generating" | "done" | "failed";

/**
 * Avatar metadata stored on the story document. Generated once per story and
 * shared across every (page × variant) run so the C-vs-D comparison only
 * varies one thing (the scene-director mode).
 */
export interface PilotAvatar {
  url: string;
  seed: number;
  /** ms since epoch */
  generatedAt: number;
  /** The exact text-to-image prompt used to produce the avatar. */
  prompt: string;
}

/**
 * One generation attempt for one (page, variant). The admin can re-run
 * the same (page, variant) to get a new run with the next runIndex.
 */
export interface PilotIllustrationRun {
  /** Firestore doc id — assigned on create. */
  id: string;
  storyId: string;
  pageNumber: number;
  variant: PilotVariant;
  /** Monotonic 1-based index per (storyId, pageNumber, variant). */
  runIndex: number;

  // ---- Prompt artefacts (always populated once the Claude calls succeed) --
  /** Formatted multi-line scene direction (Call 1 output). */
  sceneDirection: string;
  /** Formatted multi-line 5-section structured prompt (Call 2 output). */
  scenePromptStructured: string;
  /** The exact string sent to Seedream as textPrompt. */
  finalPromptToImageModel: string;

  // ---- Image artefacts ---------------------------------------------------
  imageStatus: PilotRunStatus;
  imageUrl: string | null;
  errorMessage: string | null;

  // ---- Provenance --------------------------------------------------------
  /** URL of the avatar reference passed to Seedream as the reference image. */
  referenceImage: string;
  /** Seed passed to Seedream for this page generation. */
  seed: number;
  promptModel: string;
  imageModel: string;

  // ---- Timestamps (ms since epoch) ---------------------------------------
  createdAt: number;
  createdBy: string;
  completedAt: number | null;
}

/** Sub-collection name nested under stories/{storyId}. */
export const ILLUSTRATION_RUNS_SUBCOLLECTION = "illustrationRuns";

/** Storage path for a per-run image. */
export function pilotRunStoragePath(
  storyId: string,
  pageNumber: number,
  variant: PilotVariant,
  runIndex: number,
  ext: string,
): string {
  return `specialist-illustrations/pilot/${storyId}/page-${pageNumber}-${variant}-r${runIndex}.${ext}`;
}
