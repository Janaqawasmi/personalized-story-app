// scene-director-avatar variant (exp-09b) — Full Pipeline
//
// Combines everything learned so far into one variant:
//
//   1. Avatar generation (1 portrait, plain background)
//   2. Environment generation (empty setting, no character)
//   3. Composite reference: stitch avatar (left) + environment (right)
//      into one 1024×1024 image — Seedream's single reference slot
//   4. Scene Director — Claude reads the FULL story for narrative context,
//      produces creative scene directions for target pages only
//   5. Prompt Converter — translates directions → 5-section structured prompt
//   6. Assemble final prompt with COMPOSITE_REF_INSTRUCTION at position 2
//   7. Seedream image-to-image with composite as reference
//
// Variables vs exp-09 (scene-director, no reference):
//   · referenceStrategy: none → composite (avatar left + environment right)
//   · + COMPOSITE_REF_INSTRUCTION in assembled prompt
//   · + full story context in scene director Call 1
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant scene-director-avatar \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09b-v2-scene-director-avatar-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
} from "../scene-director";
import {
  assembleStyleBiblePagePrompt,
  formatScenePromptForReport,
  COMPOSITE_REF_INSTRUCTION,
} from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import {
  generateCharacterAvatars,
  generateEnvironmentImage,
  stitchAvatarAndEnvironment,
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
    "Full pipeline: scene director (full story context) + composite reference (avatar left, environment right) + COMPOSITE_REF_INSTRUCTION.",
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

    // --- Step 1: Generate scene prompts first to know which environments are needed ---
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

    ctx.log(`[scene-director-avatar] Call 2: converting directions → structured prompts…`);
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
    );

    // --- Step 2: Generate 1 avatar ---
    ctx.log(`[scene-director-avatar] Generating 1 avatar (seed ${seed})…`);
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, 1);
    const avatarUrl = avatarUrls[0]!;
    ctx.log(`[scene-director-avatar] Avatar ready: ${avatarUrl}`);
    writeFileSync(join(ctx.outDir, "avatar-url.json"), JSON.stringify({ url: avatarUrl }, null, 2), "utf8");

    // --- Step 3: Generate environment image for each unique env key ---
    const envUrlCache: Record<string, string> = {};
    const envBufferCache: Record<string, Buffer> = {};

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

      // Fetch the buffer so we can stitch it — re-download from the public URL.
      const resp = await fetch(envUrlCache[envKey]!);
      envBufferCache[envKey] = Buffer.from(await resp.arrayBuffer());
    }

    writeFileSync(join(ctx.outDir, "env-urls.json"), JSON.stringify(envUrlCache, null, 2), "utf8");

    // Fetch the avatar buffer for stitching.
    const avatarResp = await fetch(avatarUrl);
    const avatarBuffer = Buffer.from(await avatarResp.arrayBuffer());

    // --- Step 4: Stitch composites — one per unique environment ---
    const compositeUrlCache: Record<string, string> = {};
    const compositeBuffersByEnv: Record<string, Buffer> = {};

    for (const envKey of Object.keys(envBufferCache)) {
      ctx.log(`[scene-director-avatar] Stitching composite for env '${envKey}'…`);
      const envBuffer = envBufferCache[envKey]!;

      // Re-import stitchAvatarAndEnvironment returns the URL; we also need the
      // buffer for the composite. Build it inline so we can pass it to Seedream
      // as base64 if needed — but since Seedream requires a URL, upload is fine.
      const compositeUrl = await stitchAvatarAndEnvironment(avatarBuffer, envBuffer, `${expId}-${envKey}`);
      compositeUrlCache[envKey] = compositeUrl;

      // Fetch the composite buffer for local save.
      const compResp = await fetch(compositeUrl);
      compositeBuffersByEnv[envKey] = Buffer.from(await compResp.arrayBuffer());
    }

    writeFileSync(join(ctx.outDir, "composite-urls.json"), JSON.stringify(compositeUrlCache, null, 2), "utf8");

    ctx.log(`[scene-director-avatar] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Step 5: Generate each page using the composite reference ---
    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const direction = directions[i]!;
      const envKey = parseEnvKeyFromSetting(scene.setting);
      const compositeUrl = compositeUrlCache[envKey];

      const finalPrompt = assembleStyleBiblePagePrompt(
        scene,
        bible,
        page.pageNumber,
        COMPOSITE_REF_INSTRUCTION,
      );

      const pageStart = Date.now();
      try {
        ctx.log(
          `[scene-director-avatar] page ${page.pageNumber}: generating (composite ref, env='${envKey}')…`,
        );

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          ...(compositeUrl ? { referenceImage: compositeUrl } : {}),
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
          ...(compositeUrl ? { referenceImage: compositeUrl } : {}),
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
          ...(compositeUrl ? { referenceImage: compositeUrl } : {}),
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
        `Avatar: ${avatarUrl}. Composites: ${JSON.stringify(compositeUrlCache)}. ` +
        `Scene director read ${allPages.length} pages, directed ${targetPages.length}.`,
    };
  },
};
