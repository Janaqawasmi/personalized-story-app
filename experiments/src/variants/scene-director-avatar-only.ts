// scene-director-avatar-only variant (exp-09c)
//
// Pipeline:
//   1. Scene Director — Claude reads the FULL story (all pages) for narrative
//      context, then produces creative scene directions for target pages only
//   2. Prompt Converter — translates directions → 5-section structured prompt
//   3. Assemble final prompt using assembleWithDetailedEnv:
//        - CHARACTER_REF_INSTRUCTION at position 2
//        - Full atmosphere + spatialLayout from registry injected as text
//          (replaces the brief scene.setting key) — this locks the environment
//          across all pages without needing an environment reference image
//   4. Seedream image-to-image with ONE reference: the character avatar
//
// Variable vs exp-09b-v3 (scene-director-avatar, dual reference):
//   · referenceStrategy: avatar-environment → avatar only
//   · Environment locked via verbose text description, not a reference image
//   · DUAL_REF_INSTRUCTION → CHARACTER_REF_INSTRUCTION
//   · No environment image generation step
//
// Run command:
//   cd server && npm run experiment:run -- \
//     --variant scene-director-avatar-only \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09c-scene-director-avatar-only-jana \
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

export const sceneDIrectorAvatarOnlyVariant: ExperimentVariant = {
  id: "scene-director-avatar-only",
  description:
    "Scene director (full story context) + avatar reference only. Environment locked via full atmosphere+spatialLayout text description instead of a reference image.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);
    const allPages = ctx.story.pages!;

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "scene-director-avatar-only requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "scene-director-avatar-only";

    ensureDir(ctx.outDir);

    // --- Step 1: Scene directions — Claude reads ALL pages for narrative context ---
    ctx.log(
      `[scene-director-avatar-only] Call 1: scene directions — reading all ${allPages.length} pages for context, directing ${targetPages.length} pages…`,
    );
    const directions = await callClaudeForSceneDirections(
      allPages,
      targetPages,
      ctx.story.brief,
      bible,
      PROMPT_MODEL,
    );

    const directionsReport = directions
      .map((d, i) => `=== Page ${targetPages[i]!.pageNumber} ===\n${formatSceneDirectionForReport(d)}`)
      .join("\n\n");
    writeFileSync(join(ctx.outDir, "scene-directions.txt"), directionsReport, "utf8");
    ctx.log(`[scene-director-avatar-only] scene directions saved.`);

    // --- Step 2: Convert directions → structured prompts ---
    ctx.log(`[scene-director-avatar-only] Call 2: converting directions → structured prompts…`);
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
    );

    // --- Step 3: Generate 1 avatar (character reference only) ---
    ctx.log(`[scene-director-avatar-only] Generating 1 avatar (seed ${seed})…`);
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, 1);
    const avatarUrl = avatarUrls[0]!;
    ctx.log(`[scene-director-avatar-only] Avatar ready: ${avatarUrl}`);
    writeFileSync(join(ctx.outDir, "avatar-url.json"), JSON.stringify({ url: avatarUrl }, null, 2), "utf8");

    ctx.log(`[scene-director-avatar-only] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Step 4: Generate each page ---
    // Environment consistency is achieved via verbose text: assembleWithDetailedEnv
    // injects the full atmosphere + spatialLayout from the registry so Seedream
    // receives the complete spatial contract in text on every page.
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
        ctx.log(`[scene-director-avatar-only] page ${page.pageNumber}: generating…`);

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
        ctx.log(`[scene-director-avatar-only] page ${page.pageNumber} FAILED: ${message}`);
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
        `Scene director read ${allPages.length} pages, directed ${targetPages.length}. ` +
        `Environment locked via verbose text (atmosphere+spatialLayout), no env reference image.`,
    };
  },
};
