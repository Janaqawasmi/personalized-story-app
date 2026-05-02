// scene-director variant (exp-09) — Two-Stage Creative Direction Pipeline
//
// Hypothesis: The current pipeline produces flat, literal images because it
// asks Claude to be both an art director (creative decisions) and a technical
// prompt writer (Seedream formatting) in a single call. Separating these two
// jobs into two focused calls should produce more emotionally alive scenes.
//
// Pipeline:
//   Story page text
//     → Call 1: Scene Director (claude-sonnet-4-6)
//         Decides: which moment to freeze, what the viewer should feel,
//         what physical detail carries the emotion, what makes it memorable.
//         Output: SceneDirection (moment / emotion_for_viewer / key_physical_detail /
//                                 visual_hook / camera)
//     → Call 2: Prompt Converter (claude-sonnet-4-6)
//         Translates SceneDirection → 5-section structured prompt
//         (setting / character / focalPoint / composition / lighting)
//     → assembleStyleBiblePagePrompt (unchanged)
//     → Seedream 4.0 text-to-image (no reference)
//
// Variable changed vs exp-05-sonnet (current best baseline):
//   Prompt pipeline: 1-call (story → structured prompt)
//                 →  2-call (story → scene direction → structured prompt)
//
// Everything else is identical: locked Style Bible, claude-sonnet-4-6,
// Seedream 4.0, seed from story doc, no reference image.
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant scene-director \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09-scene-director-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
} from "../scene-director";
import { assembleStyleBiblePagePrompt, formatScenePromptForReport } from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import {
  selectTargetPages,
  type ExperimentVariant,
  type PageRunResult,
  type RunResult,
} from "../types";
import { writeFileSync } from "fs";
import { join } from "path";
import type { StyleBible } from "../style-bible.types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-sonnet-4-6";

export const sceneDIrectorVariant: ExperimentVariant = {
  id: "scene-director",
  description:
    "Two-stage director pipeline: story → creative scene direction → structured image prompt. Tests whether separating creative thinking from technical formatting produces more alive, expressive children's book illustrations.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "scene-director requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);

    ensureDir(ctx.outDir);

    // --- Call 1: Creative scene direction ---
    ctx.log(
      `[scene-director] Call 1: generating creative scene directions for ${targetPages.length} pages (${PROMPT_MODEL})…`,
    );
    const directions = await callClaudeForSceneDirections(
      targetPages,
      ctx.story.brief,
      bible,
      PROMPT_MODEL,
    );

    // Save directions for inspection — this is the most valuable intermediate output.
    const directionsReport = directions
      .map((d, i) => {
        const page = targetPages[i]!;
        return `=== Page ${page.pageNumber} ===\n${formatSceneDirectionForReport(d)}`;
      })
      .join("\n\n");
    writeFileSync(join(ctx.outDir, "scene-directions.txt"), directionsReport, "utf8");
    ctx.log(`[scene-director] scene directions saved to scene-directions.txt`);

    // --- Call 2: Convert directions → structured Seedream prompts ---
    ctx.log(
      `[scene-director] Call 2: converting directions → structured prompts (${PROMPT_MODEL})…`,
    );
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
    );

    ctx.log(`[scene-director] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Image generation ---
    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const direction = directions[i]!;
      const finalPrompt = assembleStyleBiblePagePrompt(scene, bible, page.pageNumber);

      const pageStart = Date.now();
      try {
        ctx.log(`[scene-director] page ${page.pageNumber}: generating (text-to-image)…`);

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        const filename = saveImage(ctx.outDir, page.pageNumber, result.imageBuffer, result.mimeType);
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);

        // Save both the creative direction and the structured prompt for inspection.
        writeFileSync(
          join(ctx.outDir, `page-${page.pageNumber}.direction.txt`),
          formatSceneDirectionForReport(direction),
          "utf8",
        );
        writeFileSync(
          join(ctx.outDir, `page-${page.pageNumber}.scene.txt`),
          formatScenePromptForReport(scene),
          "utf8",
        );

        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          // Store the creative direction as the imagePrompt field so it
          // appears in the report alongside the final Seedream prompt.
          imagePrompt:
            `=== SCENE DIRECTION ===\n${formatSceneDirectionForReport(direction)}\n\n` +
            `=== STRUCTURED PROMPT ===\n${formatScenePromptForReport(scene)}`,
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[scene-director] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt:
            `=== SCENE DIRECTION ===\n${formatSceneDirectionForReport(direction)}\n\n` +
            `=== STRUCTURED PROMPT ===\n${formatScenePromptForReport(scene)}`,
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
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes:
        "Two Claude calls per run: scene-director (creative) + prompt-converter (technical). " +
        "See scene-directions.txt and page-N.direction.txt for the creative layer output.",
    };

    return result;
  },
};
