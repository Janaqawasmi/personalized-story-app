// server/src/specialist/specialistIllustration.service.ts
//
// Specialist Illustration Pipeline Service
//
// Orchestrates the full illustration pipeline for approved stories:
//
//   approved
//     → (auto) pages_review        — generateImagePromptsForPages() runs here
//     → (Gate 1) illustrating      — triggerIllustrationGeneration() runs here
//     → (Gate 2) illustration_review
//     → illustration_ready
//     → published
//
// Public surface used by the specialist API router:
//   generateImagePromptsForPages(storyId, specialistUid)  — Step 3.2
//   assembleSeedreamPrompt(page, visualBible)              — Step 3.3
//   triggerIllustrationGeneration(storyId, specialistUid) — Step 6.1
//   approvePagePrompt(storyId, pageNumber, uid)            — Step 5.x
//   rejectPagePrompt(storyId, pageNumber, note, uid)       — Step 5.x
//   approveIllustration(storyId, pageNumber, uid)          — Step 7.x
//   rejectIllustration(storyId, pageNumber, note, uid)     — Step 7.x

import { firestore } from "@/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import type { ImageGenerationProvider } from "@/shared/types/aiProvider";
import { STORIES_COLLECTION } from "@/models/story.model";
import type { Story, PageIllustration } from "@/models/story.model";
import { callClaudeForImagePrompts } from "./image-prompt-generator";

// ---------------------------------------------------------------------------
// Provider registration (parallel to fullStoryGeneration pattern)
// ---------------------------------------------------------------------------

let _imageProvider: ImageGenerationProvider | null = null;

export function registerIllustrationProvider(
  provider: ImageGenerationProvider,
): void {
  _imageProvider = provider;
}

function requireIllustrationProvider(): ImageGenerationProvider {
  if (!_imageProvider) {
    throw new Error(
      "Illustration provider is not configured. " +
        "Call registerIllustrationProvider() at application startup.",
    );
  }
  return _imageProvider;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function loadStory(storyId: string): Promise<Story> {
  const doc = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();
  if (!doc.exists) {
    throw new Error(`Story not found: ${storyId}`);
  }
  return doc.data() as Story;
}

// ---------------------------------------------------------------------------
// Step 3.2 — Generate image prompts for all pages
// ---------------------------------------------------------------------------

/**
 * Calls Claude once to produce a Visual Bible + one Seedream prompt per page.
 * Persists results to Firestore and advances the story to pages_review if
 * called from the approved auto-advance path (status already pages_review).
 *
 * Idempotent: if all prompts are already populated (non-null imagePrompt),
 * returns without making another Claude call.
 */
export async function generateImagePromptsForPages(
  storyId: string,
  specialistUid: string,
): Promise<void> {
  const story = await loadStory(storyId);

  if (story.status !== "pages_review") {
    throw new Error(
      `generateImagePromptsForPages: story must be in pages_review status, got '${story.status}'`,
    );
  }

  if (!story.pages || story.pages.length === 0) {
    throw new Error(
      `generateImagePromptsForPages: story ${storyId} has no pages`,
    );
  }

  // Idempotency: skip if prompts already generated
  const allPromptsPresent = story.pages.every((p) => p.imagePrompt !== null);
  if (allPromptsPresent && story.visualBible !== null) {
    return;
  }

  const { visualBible, imagePrompts } = await callClaudeForImagePrompts(
    story.pages,
    story.brief,
  );

  const seed = Math.floor(Math.random() * 2 ** 31);

  const updatedPages: PageIllustration[] = story.pages.map((page, i) => ({
    ...page,
    imagePrompt: imagePrompts[i] ?? null,
    promptStatus: "pending" as const,
  }));

  await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .update({
      pages: updatedPages,
      visualBible,
      illustrationSeed: seed,
      promptsGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

// ---------------------------------------------------------------------------
// Step 3.3 placeholder — will be implemented in the next step
// ---------------------------------------------------------------------------

export { assembleSeedreamPrompt } from "./prompt-builder";

// ---------------------------------------------------------------------------
// Step 6.1 placeholder
// ---------------------------------------------------------------------------

export async function triggerIllustrationGeneration(
  _storyId: string,
  _specialistUid: string,
): Promise<void> {
  throw new Error("triggerIllustrationGeneration: not yet implemented");
}
