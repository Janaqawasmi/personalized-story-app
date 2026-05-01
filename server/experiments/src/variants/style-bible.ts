// style-bible variant (exp-04)
//
// Implements the children's-book-illustrator skill framework end-to-end:
//
//   Style Bible (locked)
//     characterAnchor   — compact visual identifier, embedded in every prompt
//     consistencyAnchors — 3-5 phrases repeated verbatim in every prompt
//     environmentRegistry — atmosphere + SPATIAL LAYOUT per setting
//     avoidList          — embedded as "Avoid: …" in positive prompt
//
//   Structured scene prompts (5 sections per page)
//     setting    — registry key | time/light state | prop positions
//     character  — surface they're on | body language (no emotion words)
//     focalPoint — one element the eye lands on first
//     composition — framing | angle | foreground/midground/background
//     lighting   — source | quality | what's lit | what's in shadow | mood word
//
// Variable changed vs exp-03 (prompt-engineering):
//   - Entire VB replaced by StyleBible (spatial layout + character sheet +
//     consistency anchors + avoid list)
//   - Per-page prompts now use 5-section structure instead of free 3-part text
//   - Prompt assembly uses assembleStyleBiblePagePrompt instead of assembleSeedreamPrompt
//
// The framework is story-agnostic: the same prompt instructions work for any story.

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
const PROMPT_MODEL = "claude-haiku-4-5-20251001";

export const styleBibleVariant: ExperimentVariant = {
  id: "style-bible",
  description:
    "Children's-book-illustrator skill framework: StyleBible (spatial layout + character sheet + consistency anchors + avoid list) + 5-section structured scene prompts.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    let bible: StyleBible;
    if (ctx.lockedStyleBible) {
      ctx.log(`[style-bible] using locked Style Bible — generating ${targetPages.length} scene prompts…`);
      bible = ctx.lockedStyleBible;
    } else {
      ctx.log(`[style-bible] generating Style Bible from all ${ctx.story.pages!.length} pages…`);
      bible = await callClaudeForStyleBible(ctx.story.pages!, ctx.story.brief);
    }

    ctx.log(`[style-bible] character anchor: ${bible.characterAnchor}`);
    ctx.log(`[style-bible] environments: ${Object.keys(bible.environmentRegistry).join(", ")}`);

    const scenePrompts = await callClaudeForStructuredScenePrompts(targetPages, bible);

    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    ctx.log(`[style-bible] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    ensureDir(ctx.outDir);

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;

      const finalPrompt = assembleStyleBiblePagePrompt(scene, bible, page.pageNumber);

      const pageStart = Date.now();
      try {
        ctx.log(`[style-bible] page ${page.pageNumber}: generating (text-to-image)…`);

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
        ctx.log(`[style-bible] page ${page.pageNumber} FAILED: ${message}`);
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
