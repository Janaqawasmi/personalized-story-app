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
import type { ImageGenerationProvider } from "@/shared/types/aiProvider";
import { STORIES_COLLECTION } from "@/models/story.model";
import type { Story } from "@/models/story.model";

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
// Step 3.2 placeholder — will be implemented in the next step
// ---------------------------------------------------------------------------

export async function generateImagePromptsForPages(
  _storyId: string,
  _specialistUid: string,
): Promise<void> {
  throw new Error("generateImagePromptsForPages: not yet implemented");
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
