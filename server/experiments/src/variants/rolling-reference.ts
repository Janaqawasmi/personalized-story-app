// rolling-reference variant — same as baseline EXCEPT each page uses the
// immediately preceding generated page as its reference image, rather than
// always anchoring to page 1.
//
// Hypothesis: rolling reference preserves character consistency (there is still
// a visual anchor) without locking every page's composition/lighting/pose to
// the page-1 scene. The reference "travels" with the story, so scene-specific
// prompts have more room to drive the output.

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

export const rollingReferenceVariant: ExperimentVariant = {
  id: "rolling-reference",
  description:
    "Each page uses the previous generated page as its reference image (rolling anchor, not page-1 anchor).",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    let visualBible;
    let imagePrompts: string[];

    if (ctx.lockedVisualBible) {
      ctx.log(
        `[rolling-reference] using locked Visual Bible — generating ${targetPages.length} prompts only…`,
      );
      visualBible = ctx.lockedVisualBible;
      imagePrompts = await callClaudeForPromptsOnly(
        targetPages,
        ctx.story.brief,
        visualBible,
      );
    } else {
      ctx.log(
        `[rolling-reference] generating Visual Bible + ${targetPages.length} prompts via Claude…`,
      );
      ({ visualBible, imagePrompts } = await callClaudeForImagePrompts(
        targetPages,
        ctx.story.brief,
      ));
    }

    const seed =
      ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[rolling-reference] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    ensureDir(ctx.outDir);

    const pageResults: PageRunResult[] = [];
    let previousPageRefUrl: string | undefined;

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const claudePrompt = imagePrompts[i]!;

      const finalPrompt = assembleSeedreamPrompt(
        { ...page, imagePrompt: claudePrompt },
        visualBible,
      );

      const pageStart = Date.now();
      try {
        ctx.log(
          `[rolling-reference] page ${page.pageNumber}: generating ${
            previousPageRefUrl
              ? `(image-to-image, ref=page ${targetPages[i - 1]!.pageNumber})`
              : "(text-to-image, anchor)"
          }…`,
        );

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          ...(previousPageRefUrl ? { referenceImage: previousPageRefUrl } : {}),
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        const filename = saveImage(
          ctx.outDir,
          page.pageNumber,
          result.imageBuffer,
          result.mimeType,
        );
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);

        // Upload this page so the NEXT page can use it as reference.
        const ext =
          result.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        const storagePath = `experiments/${ctx.story.id}/rolling-${Date.now()}-page-${page.pageNumber}.${ext}`;
        const bucket = admin.storage().bucket();
        await bucket.file(storagePath).save(result.imageBuffer, {
          metadata: { contentType: result.mimeType },
        });
        await bucket.file(storagePath).makePublic();
        const thisPageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        ctx.log(`[rolling-reference] page ${page.pageNumber} uploaded: ${thisPageUrl}`);

        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: claudePrompt,
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          ...(previousPageRefUrl ? { referenceImage: previousPageRefUrl } : {}),
          latencyMs: Date.now() - pageStart,
        });

        previousPageRefUrl = thisPageUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(
          `[rolling-reference] page ${page.pageNumber} FAILED: ${message}`,
        );
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: claudePrompt,
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          latencyMs: Date.now() - pageStart,
          error: message,
        });
        // On failure, previous reference stays unchanged (don't advance).
      }
    }

    const result: RunResult = {
      variantId: this.id,
      variantDescription: this.description,
      storyId: ctx.story.id,
      promptModel: PROMPT_MODEL,
      imageModel: SEEDREAM_MODEL,
      referenceStrategy: "rolling",
      seed,
      visualBible,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
    };

    return result;
  },
};
