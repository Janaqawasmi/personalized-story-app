// avatar-environment variant (exp-08c) — Phase 3: Character + Environment
//
// Attempts to capture the benefit of both reference types simultaneously.
// Since Seedream supports only one reference image, this variant uses:
//   referenceImage = environment image   (anchors spatial layout)
//   text prompt    = full characterSheet  (richer than characterAnchor; anchors identity)
//
// Variable changed vs environment-only (exp-08b):
//   character description: characterAnchor (1–2 sentences)
//                       → characterSheet   (5–7 sentences, embedded in prompt)
//
// Hypothesis: The environment reference locks spatial layout while the richer
// character text prevents identity drift. Together they should outperform
// either reference alone.
//
// NOTE: The full characterSheet significantly lengthens the prompt. A warning
// is emitted when the prompt exceeds 1200 chars (Seedream's ~300-token limit).
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant avatar-environment \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-08c-avatar-environment-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import { callClaudeForStructuredScenePrompts } from "../style-bible.generator";
import { formatScenePromptForReport } from "../style-bible.assembler";
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
import type { StyleBible, ScenePromptSections } from "../style-bible.types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-sonnet-4-6";
const PROMPT_WARN_CHARS = 1200;

// ---------------------------------------------------------------------------
// Prompt assembly — swaps characterAnchor for the full characterSheet
// ---------------------------------------------------------------------------

/**
 * Same structure and token-weight ordering as assembleStyleBiblePagePrompt
 * (style-bible.assembler.ts) but embeds the full characterSheet instead of
 * the compact characterAnchor. This is the only variable that differs from
 * the environment-only variant.
 */
function assembleFullCharacterPrompt(
  scene: ScenePromptSections,
  bible: StyleBible,
  pageNumber: number,
): string {
  const anchors = bible.consistencyAnchors.slice(0, 2).join(", ");
  const palette = bible.palette.split(",").slice(0, 4).map((c) => c.trim()).join(", ");
  const avoid = `Avoid: ${bible.avoidList.slice(0, 3).join("; ")}.`;

  const parts = [
    "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos. Wordless illustration.",
    anchors + ".",
    `Setting: ${scene.setting}.`,
    // Full characterSheet instead of compact anchor — supplies more detail to
    // prevent identity drift when the environment image dominates composition.
    `Character: ${bible.characterSheet} In this scene: ${scene.character}.`,
    `Focal point: ${scene.focalPoint}.`,
    `Lighting: ${scene.lighting}.`,
    `Color palette: ${palette}.`,
    avoid,
    "Children's book illustration.",
  ];

  const prompt = parts.join(" ");

  if (prompt.length > PROMPT_WARN_CHARS) {
    console.warn(
      `[avatar-environment] page ${pageNumber} prompt is ${prompt.length} chars — may be truncated by Seedream.`,
    );
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

export const avatarEnvironmentVariant: ExperimentVariant = {
  id: "avatar-environment",
  description:
    "Phase 3: environment reference image + full characterSheet in text. Tests combined layout + identity vs single-reference baselines.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "avatar-environment requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "avatar-environment";

    ensureDir(ctx.outDir);

    ctx.log(`[avatar-environment] Generating ${targetPages.length} scene prompts with ${PROMPT_MODEL}…`);
    const scenePrompts = await callClaudeForStructuredScenePrompts(targetPages, bible, PROMPT_MODEL);

    // Pre-generate one environment image per unique registry key.
    const envUrlCache: Record<string, string> = {};
    for (const scene of scenePrompts) {
      const envKey = parseEnvKeyFromSetting(scene.setting);
      if (envUrlCache[envKey] !== undefined) continue;

      const envEntry = bible.environmentRegistry[envKey];
      if (!envEntry) {
        ctx.log(
          `[avatar-environment] WARNING: env key '${envKey}' not found in registry — page will run without reference.`,
        );
        continue;
      }
      ctx.log(`[avatar-environment] Generating environment image for '${envKey}'…`);
      envUrlCache[envKey] = await generateEnvironmentImage(envKey, envEntry, bible, seed, expId);
    }

    writeFileSync(join(ctx.outDir, "env-urls.json"), JSON.stringify(envUrlCache, null, 2), "utf8");

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const envKey = parseEnvKeyFromSetting(scene.setting);
      const envUrl = envUrlCache[envKey];
      // Full characterSheet in text; environment image as reference.
      const finalPrompt = assembleFullCharacterPrompt(scene, bible, page.pageNumber);

      const pageStart = Date.now();
      try {
        ctx.log(
          `[avatar-environment] page ${page.pageNumber}: generating (env ref '${envKey}' + full character)…`,
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
        ctx.log(`[avatar-environment] page ${page.pageNumber} FAILED: ${message}`);
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
      referenceStrategy: "avatar-environment",
      seed,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes: `Environment refs: ${JSON.stringify(envUrlCache)}`,
    };

    return result;
  },
};
