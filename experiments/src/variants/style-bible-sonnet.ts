// style-bible-sonnet variant (exp-05)
//
// Identical to style-bible (exp-04b) in every respect except the prompt model:
//   - Prompt model: claude-sonnet-4-6  (hypothesis: more precise scene descriptions)
//   - Image model:  Seedream 4.0        (unchanged)
//   - Seed:         from story doc      (unchanged, for reproducibility)
//   - Style Bible:  locked via --locked-sb (unchanged)
//   - No-reference strategy             (unchanged)
//
// Variable changed vs exp-04b:
//   PROMPT_MODEL  claude-haiku-4-5-20251001 → claude-sonnet-4-6
//
// Hypothesis: Sonnet produces less metaphor leakage, better body-language
// specificity, and more precise lighting description than Haiku, which should
// translate to higher scene-clarity and emotional-expression scores.
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant style-bible-sonnet \
//     --story ca8b0cea-4cb3-428f-afce-4693f5dba9f9 \
//     --pages 1,5,10 \
//     --out exp-05-sonnet-prompts \
//     --locked-sb experiments/locked-style-bibles/ca8b0cea-4cb3-428f-afce-4693f5dba9f9.json

import { callClaudeForStyleBible, callClaudeForStructuredScenePrompts } from "../style-bible.generator";
import { assembleStyleBiblePagePrompt, formatScenePromptForReport } from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import {
  selectTargetPages,
  type ExperimentVariant,
  type PageRunResult,
  type RunResult,
} from "../types";
import type { StyleBible } from "../style-bible.types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-sonnet-4-6";

export const styleBibleSonnetVariant: ExperimentVariant = {
  id: "style-bible-sonnet",
  description:
    "Style Bible framework (exp-04b) with claude-sonnet-4-6 as the prompt model. Hypothesis: Sonnet produces more precise scene descriptions with less metaphor leakage.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    let bible: StyleBible;
    if (ctx.lockedStyleBible) {
      ctx.log(`[style-bible-sonnet] using locked Style Bible — generating ${targetPages.length} scene prompts with ${PROMPT_MODEL}…`);
      bible = ctx.lockedStyleBible;
    } else {
      ctx.log(`[style-bible-sonnet] generating Style Bible from all ${ctx.story.pages!.length} pages…`);
      bible = await callClaudeForStyleBible(ctx.story.pages!, ctx.story.brief);
    }

    ctx.log(`[style-bible-sonnet] character anchor: ${bible.characterAnchor}`);
    ctx.log(`[style-bible-sonnet] environments: ${Object.keys(bible.environmentRegistry).join(", ")}`);

    const scenePrompts = await callClaudeForStructuredScenePrompts(targetPages, bible, PROMPT_MODEL);

    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[style-bible-sonnet] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    ensureDir(ctx.outDir);

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;

      const finalPrompt = assembleStyleBiblePagePrompt(scene, bible, page.pageNumber);

      const pageStart = Date.now();
      try {
        ctx.log(`[style-bible-sonnet] page ${page.pageNumber}: generating (text-to-image)…`);

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        const filename = saveImage(ctx.outDir, page.pageNumber, result.imageBuffer, result.mimeType);
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);

        // Also save the structured scene sections for inspection.
        const { writeFileSync } = await import("fs");
        const { join } = await import("path");
        writeFileSync(
          join(ctx.outDir, `page-${page.pageNumber}.scene.txt`),
          formatScenePromptForReport(scene),
          "utf8",
        );

        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: formatScenePromptForReport(scene),
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[style-bible-sonnet] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: formatScenePromptForReport(scene),
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
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
    };
  },
};
