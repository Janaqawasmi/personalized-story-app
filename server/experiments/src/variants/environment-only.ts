// environment-only variant (exp-08b) — Phase 2: Environment Layout
//
// Tests whether a dedicated environment reference image (empty setting, no
// characters) stabilises spatial layout across pages that share the same
// environment, without the composition-cloning failure of full-page references.
//
// Variable changed vs avatar-only (exp-08a):
//   referenceStrategy: avatar → environment (empty setting image, no character)
//
// Hypothesis: An environment-only reference anchors prop positions and light
// quality without overriding the character or scene action. Pages sharing the
// same environment key should show consistent spatial layout.
//
// One environment image is generated per unique registry key used by the
// target pages. The same environment URL is reused for all pages that share
// a key.
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant environment-only \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-08b-environment-only-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import { callClaudeForStructuredScenePrompts } from "../style-bible.generator";
import { assembleStyleBiblePagePrompt, formatScenePromptForReport } from "../style-bible.assembler";
import { SeedreamProvider } from "@/providers/seedream.provider";
import { ensureDir, saveImage, savePromptText } from "../helpers";
import { generateEnvironmentImage, parseEnvKeyFromSetting } from "../avatar-generator";
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

export const environmentOnlyVariant: ExperimentVariant = {
  id: "environment-only",
  description:
    "Phase 2: empty environment image (no character) as Seedream reference. Tests spatial layout consistency.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "environment-only requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "environment-only";

    ensureDir(ctx.outDir);

    // Generate scene prompts first so we know which environment each page needs.
    ctx.log(`[environment-only] Generating ${targetPages.length} scene prompts with ${PROMPT_MODEL}…`);
    const scenePrompts = await callClaudeForStructuredScenePrompts(targetPages, bible, PROMPT_MODEL);

    // Pre-generate one environment image per unique registry key.
    const envUrlCache: Record<string, string> = {};
    for (const scene of scenePrompts) {
      const envKey = parseEnvKeyFromSetting(scene.setting);
      if (envUrlCache[envKey] !== undefined) continue;

      const envEntry = bible.environmentRegistry[envKey];
      if (!envEntry) {
        ctx.log(
          `[environment-only] WARNING: env key '${envKey}' not found in registry — page will run without reference.`,
        );
        continue;
      }
      ctx.log(`[environment-only] Generating environment image for '${envKey}'…`);
      envUrlCache[envKey] = await generateEnvironmentImage(envKey, envEntry, bible, seed, expId);
    }

    writeFileSync(join(ctx.outDir, "env-urls.json"), JSON.stringify(envUrlCache, null, 2), "utf8");

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const envKey = parseEnvKeyFromSetting(scene.setting);
      const envUrl = envUrlCache[envKey];
      const finalPrompt = assembleStyleBiblePagePrompt(scene, bible, page.pageNumber);

      const pageStart = Date.now();
      try {
        ctx.log(
          `[environment-only] page ${page.pageNumber}: generating (env '${envKey}' reference)…`,
        );

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          ...(envUrl ? { referenceImage: envUrl } : {}),
          outputWidth: 1024,
          outputHeight: 1024,
          seed,
        });

        const filename = saveImage(ctx.outDir, page.pageNumber, result.imageBuffer, result.mimeType);
        savePromptText(ctx.outDir, page.pageNumber, finalPrompt);
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
          ...(envUrl ? { referenceImage: envUrl } : {}),
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[environment-only] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: formatScenePromptForReport(scene),
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          ...(envUrl ? { referenceImage: envUrl } : {}),
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
      referenceStrategy: "environment",
      seed,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes: `Environment refs: ${JSON.stringify(envUrlCache)}`,
    };

    return result;
  },
};
