// literal-scenes variant (exp-09d)
//
// LITERAL-mode scene director — forbids metaphor and simile in every output
// field, pushing Claude to write only what is physically visible and
// measurable. Sibling of scene-director-avatar-only (exp-09c, figurative).
//
// One change from exp-09c: the scene director and prompt converter are both
// run with mode="literal", which injects the LITERAL LANGUAGE rule blocks
// described in scene-director.ts. Everything else (avatar reference, env
// locked via verbose text, downstream assembly) is identical.
//
// Run command:
//   cd server && npm run experiment:run -- \
//     --variant literal-scenes \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09d-literal-scenes-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
} from "../scene-director";
import {
  assembleWithDetailedEnv,
  formatScenePromptForReport,
  CHARACTER_REF_INSTRUCTION,
} from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import { generateCharacterAvatars } from "../avatar-generator";
import {
  selectTargetPages,
  type ExperimentVariant,
  type PageRunResult,
} from "../types";
import { writeFileSync } from "fs";
import { join } from "path";
import type { StyleBible } from "../style-bible.types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-sonnet-4-6";

export const literalScenesVariant: ExperimentVariant = {
  id: "literal-scenes",
  description:
    "Scene director (literal-mode, full story context) + avatar reference only. Forbids metaphor/simile in every output field; environment locked via full atmosphere+spatialLayout text description.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);
    const allPages = ctx.story.pages!;

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "literal-scenes requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "literal-scenes";

    ensureDir(ctx.outDir);

    // --- Step 1: Scene directions in LITERAL mode ---
    ctx.log(
      `[literal-scenes] Call 1: scene directions (literal) — reading all ${allPages.length} pages for context, directing ${targetPages.length} pages…`,
    );
    const directions = await callClaudeForSceneDirections(
      allPages,
      targetPages,
      ctx.story.brief,
      bible,
      PROMPT_MODEL,
      "literal",
    );

    const directionsReport = directions
      .map((d, i) => `=== Page ${targetPages[i]!.pageNumber} ===\n${formatSceneDirectionForReport(d)}`)
      .join("\n\n");
    writeFileSync(join(ctx.outDir, "scene-directions.txt"), directionsReport, "utf8");
    ctx.log(`[literal-scenes] scene directions saved.`);

    // --- Step 2: Convert directions → structured prompts, still LITERAL mode ---
    ctx.log(`[literal-scenes] Call 2: converting directions → structured prompts (literal)…`);
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
      "literal",
    );

    // --- Step 3: Generate 1 avatar (character reference only) ---
    ctx.log(`[literal-scenes] Generating 1 avatar (seed ${seed})…`);
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, 1);
    const avatarUrl = avatarUrls[0]!;
    ctx.log(`[literal-scenes] Avatar ready: ${avatarUrl}`);
    writeFileSync(join(ctx.outDir, "avatar-url.json"), JSON.stringify({ url: avatarUrl }, null, 2), "utf8");

    ctx.log(`[literal-scenes] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Step 4: Generate each page ---
    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const direction = directions[i]!;

      const finalPrompt = assembleWithDetailedEnv(
        scene,
        bible,
        page.pageNumber,
        CHARACTER_REF_INSTRUCTION,
      );

      const pageStart = Date.now();
      try {
        ctx.log(`[literal-scenes] page ${page.pageNumber}: generating…`);

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          referenceImage: avatarUrl,
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        const filename = saveImage(ctx.outDir, page.pageNumber, result.imageBuffer, result.mimeType);
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);

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
          imagePrompt:
            `=== SCENE DIRECTION ===\n${formatSceneDirectionForReport(direction)}\n\n` +
            `=== STRUCTURED PROMPT ===\n${formatScenePromptForReport(scene)}`,
          finalPromptToImageModel: finalPrompt,
          imageFilename: filename,
          referenceImage: avatarUrl,
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[literal-scenes] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt:
            `=== SCENE DIRECTION ===\n${formatSceneDirectionForReport(direction)}\n\n` +
            `=== STRUCTURED PROMPT ===\n${formatScenePromptForReport(scene)}`,
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          referenceImage: avatarUrl,
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
      referenceStrategy: "avatar",
      seed,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes:
        `Avatar: ${avatarUrl}. ` +
        `Scene director (literal mode) read ${allPages.length} pages, directed ${targetPages.length}. ` +
        `Environment locked via verbose text (atmosphere+spatialLayout), no env reference image.`,
    };
  },
};
