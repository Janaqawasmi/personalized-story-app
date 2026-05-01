// Baseline variant — bit-for-bit mirror of the production pipeline:
//   Claude (claude-haiku-4-5) → Visual Bible + per-page prompt
//   prompt-builder.assembleSeedreamPrompt wraps with style/character/palette
//   Seedream 4.0 generates; first page is text-to-image, subsequent pages use
//   the first generated image's public URL as a reference.
//
// Differences from production:
//   - Reads story from Firestore but never writes back.
//   - Images persist under `experiments/<expId>/<storyId>/` in Firebase Storage
//     (so reference URLs work the same way) AND to local disk for review.

import { admin } from "@/config/firebase";
import {
  callClaudeForImagePrompts,
  callClaudeForPromptsOnly,
} from "@/specialist/image-prompt-generator";
import { assembleSeedreamPrompt } from "@/specialist/prompt-builder";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import {
  selectTargetPages,
  type ExperimentVariant,
  type PageRunResult,
  type RunResult,
} from "../types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-haiku-4-5-20251001";

export const baselineVariant: ExperimentVariant = {
  id: "baseline",
  description: "Current production pipeline: Claude → Seedream with page-1 reference.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    let visualBible;
    let imagePrompts: string[];

    if (ctx.lockedVisualBible) {
      ctx.log(`[baseline] using locked Visual Bible — generating ${targetPages.length} prompts only…`);
      visualBible = ctx.lockedVisualBible;
      imagePrompts = await callClaudeForPromptsOnly(targetPages, ctx.story.brief, visualBible);
    } else {
      ctx.log(`[baseline] generating Visual Bible + ${targetPages.length} prompts via Claude…`);
      ({ visualBible, imagePrompts } = await callClaudeForImagePrompts(targetPages, ctx.story.brief));
    }

    // Use a fresh seed per run unless the story has one persisted (rare for experiments).
    const seed =
      ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[baseline] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    ensureDir(ctx.outDir);

    const pageResults: PageRunResult[] = [];
    let firstPageRefUrl: string | undefined;

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const claudePrompt = imagePrompts[i]!;

      // Build the same final prompt assembleSeedreamPrompt produces.
      const finalPrompt = assembleSeedreamPrompt(
        { ...page, imagePrompt: claudePrompt },
        visualBible,
      );

      const pageStart = Date.now();
      try {
        ctx.log(
          `[baseline] page ${page.pageNumber}: generating ${
            firstPageRefUrl ? "(image-to-image)" : "(text-to-image, anchor)"
          }…`,
        );

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          ...(firstPageRefUrl ? { referenceImage: firstPageRefUrl } : {}),
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        // Persist locally for review.
        const filename = saveImage(
          ctx.outDir,
          page.pageNumber,
          result.imageBuffer,
          result.mimeType,
        );
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);

        // For pages after the first, we need a public URL. Upload the first
        // generated image to Firebase Storage under experiments/ prefix.
        if (!firstPageRefUrl) {
          const ext = result.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
          const storagePath = `experiments/${ctx.story.id}/${Date.now()}-page-${page.pageNumber}.${ext}`;
          const bucket = admin.storage().bucket();
          await bucket.file(storagePath).save(result.imageBuffer, {
            metadata: { contentType: result.mimeType },
          });
          await bucket.file(storagePath).makePublic();
          firstPageRefUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
          ctx.log(`[baseline] anchor uploaded: ${firstPageRefUrl}`);
        }

        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: claudePrompt,
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          ...(i > 0 && firstPageRefUrl ? { referenceImage: firstPageRefUrl } : {}),
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[baseline] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: claudePrompt,
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          latencyMs: Date.now() - pageStart,
          error: message,
        });
      }
    }

    const result: RunResult = {
      variantId: this.id,
      variantDescription: this.description,
      storyId: ctx.story.id,
      promptModel: PROMPT_MODEL,
      imageModel: SEEDREAM_MODEL,
      referenceStrategy: "page1",
      seed,
      visualBible,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
    };

    return result;
  },
};
