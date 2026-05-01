// prompt-engineering variant (exp-03)
//
// Same as no-reference + locked VB, but Claude uses enhanced per-page prompt
// instructions that enforce a 3-part structure:
//   1. Subject + body language  (emotion shown physically, never named)
//   2. Environment objects       (registry key + ≥2 specific props)
//   3. Light                     (source, colour, what it does/doesn't illuminate)
//
// Also expands from 1–2 to 2–3 sentences and replaces the generic rabbit
// example with three examples tuned to this story's dark-bedroom aesthetic.
//
// Variable changed vs exp-01b-no-ref-locked: ONLY the Claude prompt that
// generates per-page image descriptions. VB, seed, image model, reference
// strategy are all identical.

import {
  callClaudeForEnhancedPrompts,
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

export const promptEngineeringVariant: ExperimentVariant = {
  id: "prompt-engineering",
  description:
    "No-reference + locked VB with enhanced Claude prompt: 3-part structure (body language → environment objects → light), 2–3 sentences, story-specific examples.",
  async run(ctx) {
    if (!ctx.lockedVisualBible) {
      throw new Error(
        "[prompt-engineering] this variant requires --locked-vb (Visual Bible must be locked for fair comparison).",
      );
    }

    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);
    const visualBible = ctx.lockedVisualBible;

    ctx.log(
      `[prompt-engineering] generating ${targetPages.length} enhanced prompts via Claude…`,
    );
    const imagePrompts = await callClaudeForEnhancedPrompts(
      targetPages,
      ctx.story.brief,
      visualBible,
    );

    const seed =
      ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[prompt-engineering] seed=${seed}, image model=${SEEDREAM_MODEL}`);

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
        ctx.log(
          `[prompt-engineering] page ${page.pageNumber}: generating (text-to-image)…`,
        );

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
        ctx.log(`[prompt-engineering] page ${page.pageNumber} FAILED: ${message}`);
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

    return {
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
  },
};
