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

import { firestore, admin } from "@/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import type { ImageGenerationProvider } from "@/shared/types/aiProvider";
import { STORIES_COLLECTION } from "@/models/story.model";
import type { Story, PageIllustration, StoryStatus } from "@/models/story.model";
import { STORAGE_PATHS } from "@/shared/firestore/paths";
import { callClaudeForImagePrompts } from "./image-prompt-generator";
import { assembleSeedreamPrompt } from "./prompt-builder";

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
// Step 6.1 — Trigger Seedream illustration generation for all approved pages
// ---------------------------------------------------------------------------

/**
 * Generates Seedream illustrations for all pages whose prompts are approved.
 * Page 1 is generated without a reference image; pages 2-N use page 1's
 * buffer as a style reference. A fixed seed anchors reproducibility.
 *
 * Per-page failures are recorded as illustrationStatus "failed" rather than
 * aborting the whole batch. The story advances to illustration_review once
 * all pages have been attempted.
 */
export async function triggerIllustrationGeneration(
  storyId: string,
  _specialistUid: string,
): Promise<void> {
  const provider = requireIllustrationProvider();
  const story = await loadStory(storyId);

  if (story.status !== "illustrating") {
    throw new Error(
      `triggerIllustrationGeneration: story must be in 'illustrating' status, got '${story.status}'`,
    );
  }

  if (!story.pages || story.pages.length === 0) {
    throw new Error(`triggerIllustrationGeneration: story ${storyId} has no pages`);
  }

  if (!story.visualBible) {
    throw new Error(`triggerIllustrationGeneration: story ${storyId} has no visualBible`);
  }

  const seed = story.illustrationSeed ?? undefined;
  const updatedPages: PageIllustration[] = [...story.pages];
  let page1Buffer: Buffer | undefined;

  for (let i = 0; i < updatedPages.length; i++) {
    const page = updatedPages[i]!;

    if (page.promptStatus !== "approved" || !page.imagePrompt) {
      updatedPages[i] = {
        ...page,
        illustrationStatus: "failed",
        illustrationRejectionNote: "Prompt not approved — skipped.",
      };
      continue;
    }

    updatedPages[i] = { ...page, illustrationStatus: "generating" };

    try {
      const seedreamPrompt = assembleSeedreamPrompt(page, story.visualBible);

      const result = await provider.generateImage({
        textPrompt: seedreamPrompt,
        ...(i > 0 && page1Buffer ? { referenceImage: page1Buffer, referenceImageMediaType: "image/png" } : {}),
        outputFormat: "png",
        outputWidth: 1024,
        outputHeight: 1024,
        ...(seed !== undefined ? { seed } : {}),
      });

      if (i === 0) {
        page1Buffer = result.imageBuffer;
      }

      const ext = result.mimeType.split("/")[1] ?? "png";
      const storagePath = STORAGE_PATHS.specialistIllustration(storyId, page.pageNumber, ext);
      const bucket = admin.storage().bucket();
      await bucket.file(storagePath).save(result.imageBuffer, {
        metadata: { contentType: result.mimeType },
      });

      // Make publicly readable and get a permanent URL
      await bucket.file(storagePath).makePublic();
      const illustrationUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      updatedPages[i] = {
        ...updatedPages[i]!,
        illustrationUrl,
        illustrationStatus: "done",
      };
    } catch (err) {
      console.error(
        `[illustration-pipeline] page ${page.pageNumber} generation failed:`,
        err,
      );
      updatedPages[i] = {
        ...updatedPages[i]!,
        illustrationStatus: "failed",
        illustrationRejectionNote:
          err instanceof Error ? err.message : "Unknown generation error.",
      };
    }

    // Persist progress after each page
    await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
      pages: updatedPages,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Advance to illustration_review regardless of per-page failures
  await firestore.collection(STORIES_COLLECTION).doc(storyId).update({
    status: "illustration_review" as StoryStatus,
    illustrationCompletedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
