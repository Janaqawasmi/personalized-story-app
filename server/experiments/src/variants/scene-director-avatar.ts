// scene-director-avatar variant (exp-09b) — Scene Director + Avatar Reference
//
// Combines the two improvements from exp-08a-v2 and exp-09:
//   exp-09    introduced the two-stage creative director pipeline
//             (story → scene direction → structured prompt)
//   exp-08a-v2 introduced avatar as character reference + explicit instruction
//             telling Seedream what role the reference plays
//
// This variant stacks both:
//   · Scene Director pipeline  — richer, emotionally specific prompts
//   · Character avatar reference — visual anchor for identity
//   · CHARACTER_REF_INSTRUCTION — explicit role label at position 2
//
// Variable changed vs exp-09 (scene-director, no reference):
//   referenceStrategy: none → avatar (character portrait)
//   + CHARACTER_REF_INSTRUCTION prepended to assembled prompt
//
// Variable changed vs exp-08a-v2 (avatar-only with instruction):
//   Prompt pipeline: 1-call (story → structured prompt)
//                 →  2-call (story → scene direction → structured prompt)
//
// Hypothesis: The creative direction pipeline produces a better scene prompt
// AND the avatar reference locks the character's physical appearance. Together
// they should outperform either improvement alone.
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant scene-director-avatar \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-09b-scene-director-avatar-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import {
  callClaudeForSceneDirections,
  callClaudeForPromptsFromDirections,
  formatSceneDirectionForReport,
} from "../scene-director";
import {
  assembleStyleBiblePagePrompt,
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
  type RunResult,
} from "../types";
import { writeFileSync } from "fs";
import { join } from "path";
import type { StyleBible } from "../style-bible.types";

const SEEDREAM_MODEL = process.env.SEEDREAM_MODEL_ID ?? "seedream-4-0-250828";
const PROMPT_MODEL = "claude-sonnet-4-6";
const AVATAR_COUNT = 3;

export const sceneDIrectorAvatarVariant: ExperimentVariant = {
  id: "scene-director-avatar",
  description:
    "exp-09 scene director pipeline (two-stage) + avatar character reference with explicit CHARACTER_REF_INSTRUCTION. Tests whether creative direction + visual identity anchor together outperform either improvement alone.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "scene-director-avatar requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "scene-director-avatar";

    ensureDir(ctx.outDir);

    // --- Generate avatar reference images ---
    ctx.log(
      `[scene-director-avatar] Generating ${AVATAR_COUNT} avatar variations (seed ${seed}…${seed + AVATAR_COUNT - 1})…`,
    );
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, AVATAR_COUNT);
    const chosenAvatarUrl = avatarUrls[0]!;
    ctx.log(`[scene-director-avatar] Using avatar-0 as reference: ${chosenAvatarUrl}`);
    writeFileSync(join(ctx.outDir, "avatar-urls.json"), JSON.stringify(avatarUrls, null, 2), "utf8");

    // --- Call 1: Creative scene direction ---
    ctx.log(
      `[scene-director-avatar] Call 1: generating creative scene directions for ${targetPages.length} pages (${PROMPT_MODEL})…`,
    );
    const directions = await callClaudeForSceneDirections(
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

    // --- Call 2: Convert directions → structured Seedream prompts ---
    ctx.log(
      `[scene-director-avatar] Call 2: converting directions → structured prompts (${PROMPT_MODEL})…`,
    );
    const scenePrompts = await callClaudeForPromptsFromDirections(
      targetPages,
      directions,
      bible,
      PROMPT_MODEL,
    );

    ctx.log(`[scene-director-avatar] seed=${seed}, image model=${SEEDREAM_MODEL}`);

    // --- Image generation ---
    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const direction = directions[i]!;

      // CHARACTER_REF_INSTRUCTION tells Seedream to use the avatar for
      // identity only — not for composition or background.
      const finalPrompt = assembleStyleBiblePagePrompt(
        scene,
        bible,
        page.pageNumber,
        CHARACTER_REF_INSTRUCTION,
      );

      const pageStart = Date.now();
      try {
        ctx.log(`[scene-director-avatar] page ${page.pageNumber}: generating (avatar reference)…`);

        const result = await provider.generateImage({
          textPrompt: finalPrompt,
          referenceImage: chosenAvatarUrl,
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
          referenceImage: chosenAvatarUrl,
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
          referenceImage: chosenAvatarUrl,
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
      notes: `Avatar: ${avatarUrls.join(" | ")}. Two Claude calls: scene-director + prompt-converter. See scene-directions.txt.`,
    };
  },
};
