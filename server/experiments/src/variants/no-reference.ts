// no-reference variant — identical to baseline EXCEPT every page is generated
// text-to-image. Page 1 is not used as a reference for pages 2..N.
//
// Hypothesis: removing the reference image lets each page's prompt actually
// drive composition / lighting / pose, fixing the baseline's failure where
// pages 5 and 10 came back as near-clones of page 1. Cost: character
// consistency may drop since there's no visual anchor across pages.

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

export const noReferenceVariant: ExperimentVariant = {
  id: "no-reference",
  description: "Same prompts as baseline but every page is text-to-image (no reference).",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    let visualBible;
    let imagePrompts: string[];

    if (ctx.lockedVisualBible) {
      ctx.log(`[no-reference] using locked Visual Bible — generating ${targetPages.length} prompts only…`);
      visualBible = ctx.lockedVisualBible;
      imagePrompts = await callClaudeForPromptsOnly(targetPages, ctx.story.brief, visualBible);
    } else {
      ctx.log(`[no-reference] generating Visual Bible + ${targetPages.length} prompts via Claude…`);
      ({ visualBible, imagePrompts } = await callClaudeForImagePrompts(targetPages, ctx.story.brief));
    }

    const seed =
      ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[no-reference] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    ensureDir(ctx.outDir);

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const claudePrompt = imagePrompts[i]!;

      const finalPrompt = assembleSeedreamPrompt(
        { ...page, imagePrompt: claudePrompt },
        visualBible,
      );

      const pageStart = Date.now();
      try {
        ctx.log(`[no-reference] page ${page.pageNumber}: generating (text-to-image)…`);

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
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

        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: claudePrompt,
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[no-reference] page ${page.pageNumber} FAILED: ${message}`);
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
      referenceStrategy: "none",
      seed,
      visualBible,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
    };

    return result;
  },
};
