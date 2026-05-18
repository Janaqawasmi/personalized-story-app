// scene-director-avatar variant (exp-09b) — Full Pipeline
//
// Combines everything learned so far into one variant:
//
//   1. Avatar generation (1 portrait, plain background)
//   2. Environment generation (empty setting, no character)
//   3. Scene Director — Claude reads the FULL story for narrative context,
//      produces creative scene directions for target pages only
//   4. Prompt Converter — translates directions → 5-section structured prompt
//   5. Assemble final prompt with DUAL_REF_INSTRUCTION at position 2
//   6. Seedream image-to-image with avatar + environment as separate referenceImages
//
// Variables vs exp-09 (scene-director, no reference):
//   · referenceStrategy: none → avatar-environment (two separate reference images)
//   · + DUAL_REF_INSTRUCTION in assembled prompt
//   · + full story context in scene director Call 1
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant scene-director-avatar \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09b-v3-scene-director-avatar-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
} from "../scene-director";
import {
  assembleStyleBiblePagePrompt,
  formatScenePromptForReport,
  DUAL_REF_INSTRUCTION,
} from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import {
  generateCharacterAvatars,
  generateEnvironmentImage,
  parseEnvKeyFromSetting,
} from "../avatar-generator";
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

export const sceneDIrectorAvatarVariant: ExperimentVariant = {
  id: "scene-director-avatar",
  description:
    "Full pipeline: scene director (full story context) + avatar reference + environment reference passed as separate referenceImages to Seedream.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);
    const allPages = ctx.story.pages!;

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "scene-director-avatar requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "scene-director-avatar";

    ensureDir(ctx.outDir);

    // --- Step 1: Scene directions (Call 1) — Claude reads ALL pages for context ---
    ctx.log(
      `[scene-director-avatar] Call 1: scene directions — reading all ${allPages.length} pages for context, directing ${targetPages.length} pages…`,
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
    ctx.log(`[scene-director-avatar] scene directions saved.`);

    // --- Step 2: Convert directions → structured prompts (Call 2) ---
    ctx.log(`[scene-director-avatar] Call 2: converting directions → structured prompts…`);
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
    );

    // --- Step 3: Generate 1 avatar ---
    ctx.log(`[scene-director-avatar] Generating 1 avatar (seed ${seed})…`);
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, 1);
    const avatarUrl = avatarUrls[0]!;
    ctx.log(`[scene-director-avatar] Avatar ready: ${avatarUrl}`);
    writeFileSync(join(ctx.outDir, "avatar-url.json"), JSON.stringify({ url: avatarUrl }, null, 2), "utf8");

    // --- Step 4: Generate environment image for each unique env key ---
    const envUrlCache: Record<string, string> = {};

    for (const scene of scenePrompts) {
      const envKey = parseEnvKeyFromSetting(scene.setting);
      if (envUrlCache[envKey] !== undefined) continue;

      const envEntry = bible.environmentRegistry[envKey];
      if (!envEntry) {
        ctx.log(`[scene-director-avatar] WARNING: env key '${envKey}' not in registry — skipping.`);
        continue;
      }
      ctx.log(`[scene-director-avatar] Generating environment '${envKey}'…`);
      envUrlCache[envKey] = await generateEnvironmentImage(envKey, envEntry, bible, seed, expId);
    }

    writeFileSync(join(ctx.outDir, "env-urls.json"), JSON.stringify(envUrlCache, null, 2), "utf8");

    ctx.log(`[scene-director-avatar] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Step 5: Generate each page using avatar + environment as separate references ---
    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const direction = directions[i]!;
      const envKey = parseEnvKeyFromSetting(scene.setting);
      const envUrl = envUrlCache[envKey];

      // Pass avatar first (character identity), env second (spatial layout).
      const referenceImages: string[] = [
        avatarUrl,
        ...(envUrl ? [envUrl] : []),
      ];

      const finalPrompt = assembleStyleBiblePagePrompt(
        scene,
        bible,
        page.pageNumber,
        DUAL_REF_INSTRUCTION,
      );

      const pageStart = Date.now();
      try {
        ctx.log(
          `[scene-director-avatar] page ${page.pageNumber}: generating (${referenceImages.length} refs, env='${envKey}')…`,
        );

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          referenceImages,
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
          referenceImage: referenceImages.join(" | "),
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[scene-director-avatar] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt:
            `=== SCENE DIRECTION ===\n${formatSceneDirectionForReport(direction)}\n\n` +
            `=== STRUCTURED PROMPT ===\n${formatScenePromptForReport(scene)}`,
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          referenceImage: referenceImages.join(" | "),
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
      referenceStrategy: "avatar-environment",
      seed,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes:
        `Avatar: ${avatarUrl}. Environments: ${JSON.stringify(envUrlCache)}. ` +
        `Scene director read ${allPages.length} pages, directed ${targetPages.length}. ` +
        `References passed as separate array to Seedream (avatar first, env second).`,
    };
  },
};
