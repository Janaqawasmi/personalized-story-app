import type { IllustrationStyleId } from "@/shared/types/visualStyles";

/**
 * Maps each internal illustration style ID to the art-medium / rendering tokens
 * injected into personalized image prompts (Phase 5+).
 *
 * These instructions replace only the art-medium section of the prompt. They must
 * NOT describe scenes, characters, settings, or narrative content — style choice
 * must never change the approved scene or therapeutic moment.
 */
export const STYLE_INSTRUCTIONS: Record<IllustrationStyleId, string> = {
  watercolor:
    "Soft watercolor illustration, visible wet-edge brushstrokes, gentle paint bleeds, transparent layered washes.",
  semi_realistic:
    "Semi-realistic digital illustration, soft painterly shading, believable proportions, warm photographic lighting.",
  flat_cartoon:
    "Flat cartoon illustration, bold clean outlines, solid fills, minimal shadow, graphic pop-art warmth.",
  paper_craft:
    "Paper-craft collage illustration, layered cut-paper textures, subtle edge shadows, tactile handmade feel.",
  vintage_1950s_little_golden:
    "Vintage 1950s Little Golden Book style, warm gouache brushwork, retro palette, slightly grainy texture, nostalgic storybook warmth.",
};
