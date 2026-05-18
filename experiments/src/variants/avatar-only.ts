// avatar-only variant (exp-08a) — Phase 1: Character Identity
//
// Tests whether a dedicated character avatar (full-body portrait, no scene)
// used as a Seedream reference image improves character consistency across pages,
// without the layout-cloning failure seen with full-page references (exp-00/02).
//
// Variable changed vs exp-05-sonnet (current best baseline):
//   referenceStrategy: none → avatar (character portrait, plain background)
//
// Hypothesis: A clean character portrait anchors physical appearance better
// than the text characterAnchor alone, without dominating scene composition
// the way a full-story-page reference does.
//
// Generates 3 avatar variations (seeds: baseSeed, baseSeed+1, baseSeed+2).
// Variation 0 is used for all pages. The others are saved for manual scoring.
//
// Run command:
//   npm run -w server experiment:run -- \
//     --variant avatar-only \
//     --story jana-school-door-story-001 \
//     --pages 1,2,3 \
//     --out exp-08a-avatar-only-jana \
//     --locked-sb experiments/locked-style-bibles/jana-school-door-story-001.json

import { callClaudeForStructuredScenePrompts } from "../style-bible.generator";
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

export const avatarOnlyVariant: ExperimentVariant = {
  id: "avatar-only",
  description:
    "Phase 1: character avatar (plain-background portrait) as Seedream reference. Tests character consistency vs text-only baseline.",
  async run(ctx) {
    const start = Date.now();
    const provider = new SeedreamProvider();
    const targetPages = selectTargetPages(ctx.story, ctx.targetPageNumbers);

    if (!ctx.lockedStyleBible) {
      throw new Error(
        "avatar-only requires --locked-sb (Style Bible must be locked for one-variable isolation).",
      );
    }
    const bible: StyleBible = ctx.lockedStyleBible;
    const seed = ctx.story.illustrationSeed ?? Math.floor(Math.random() * 2 ** 31);
    const expId = ctx.outDir.split(/[\\/]/).pop() ?? "avatar-only";

    ensureDir(ctx.outDir);

    ctx.log(`[avatar-only] Generating ${AVATAR_COUNT} avatar variations (seed ${seed}…${seed + AVATAR_COUNT - 1})…`);
    const avatarUrls = await generateCharacterAvatars(bible, seed, expId, AVATAR_COUNT);
    const chosenAvatarUrl = avatarUrls[0]!;
    ctx.log(`[avatar-only] Using avatar-0 as reference: ${chosenAvatarUrl}`);

    writeFileSync(join(ctx.outDir, "avatar-urls.json"), JSON.stringify(avatarUrls, null, 2), "utf8");

    ctx.log(`[avatar-only] Generating ${targetPages.length} scene prompts with ${PROMPT_MODEL}…`);
    const scenePrompts = await callClaudeForStructuredScenePrompts(targetPages, bible, PROMPT_MODEL);

    const pageResults: PageRunResult[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i]!;
      const scene = scenePrompts[i]!;
      const finalPrompt = assembleStyleBiblePagePrompt(scene, bible, page.pageNumber, CHARACTER_REF_INSTRUCTION);

      const pageStart = Date.now();
      try {
        ctx.log(`[avatar-only] page ${page.pageNumber}: generating (avatar reference)…`);

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
          referenceImage: chosenAvatarUrl,
          latencyMs: Date.now() - pageStart,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.log(`[avatar-only] page ${page.pageNumber} FAILED: ${message}`);
        pageResults.push({
          pageNumber: page.pageNumber,
          pageText: page.text,
          imagePrompt: formatScenePromptForReport(scene),
          finalPromptToImageModel: finalPrompt,
          imageFilename: "",
          referenceImage: chosenAvatarUrl,
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
      referenceStrategy: "avatar",
      seed,
      pages: pageResults,
      totalLatencyMs: Date.now() - start,
      notes: `Avatar variations: ${avatarUrls.join(" | ")}`,
    };

    return result;
  },
};
