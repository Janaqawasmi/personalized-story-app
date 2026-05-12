/**
 * Two-call creative director pipeline (exp-09).
 *
 * The fundamental problem with the current pipeline: Claude is asked to be
 * both an art director (creative decisions) and a technical prompt writer
 * (precise Seedream formatting) in a single call. Those two modes are
 * incompatible — creative thinking degrades formatting, and formatting pressure
 * kills creative thinking. The result is technically correct but visually dead.
 *
 * This module separates the two jobs into two focused calls:
 *
 * Call 1 — SCENE DIRECTOR (creative)
 *   Input:  page text + story brief + style bible
 *   Output: SceneDirection — the art direction decision for each page:
 *     · moment        — which exact frozen split-second to illustrate
 *     · emotion_for_viewer — what the reader should FEEL (not the character)
 *     · key_physical_detail — the one body-language detail that carries the emotion
 *     · visual_hook   — the compositional/lighting choice that makes it memorable
 *     · camera        — where the viewer stands, how far, what angle
 *
 * Call 2 — PROMPT CONVERTER (technical)
 *   Input:  SceneDirection + style bible + page text
 *   Output: ScenePromptSections (the existing 5-section format used by the assembler)
 *
 * The output of Call 2 feeds directly into assembleStyleBiblePagePrompt, so
 * the rest of the pipeline (assembly → Seedream) is unchanged.
 */

import "./bootstrap";
import { Anthropic } from "@anthropic-ai/sdk";
import type { PageIllustration } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { AGE_RANGE_LABELS } from "@/models/storyBrief.model";
import type { StyleBible, ScenePromptSections } from "./style-bible.types";

const client = new Anthropic({ maxRetries: 0 });

/**
 * Prompt-style mode used by both scene-director and prompt-converter calls.
 *
 *   "literal"     — pushes Claude to describe only what is physically visible
 *                   and measurable; forbids metaphor/simile. Matches exp-09d.
 *   "figurative"  — allows cinematic / atmospheric language in the scene
 *                   directions. Matches the original exp-09c behaviour.
 *
 * Both modes share the same JSON output shape so the rest of the pipeline
 * (assembler, Seedream) doesn't care which mode produced the input.
 */
export type SceneDirectorMode = "literal" | "figurative";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneDirection {
  /** The exact visual moment frozen in this illustration. Present tense, active verb. */
  moment: string;
  /** What the reader/viewer should feel — stated from the reader's perspective. */
  emotion_for_viewer: string;
  /** One specific physical detail (grip, gaze, posture) — no emotion words. */
  key_physical_detail: string;
  /** One compositional or lighting decision that makes this image impossible to forget. */
  visual_hook: string;
  /** Where the viewer stands, angle, proximity. */
  camera: string;
}

// ---------------------------------------------------------------------------
// Call 1: Creative scene direction
// ---------------------------------------------------------------------------

function buildSceneDirectorPrompt(
  allPages: PageIllustration[],
  targetPages: PageIllustration[],
  brief: StoryBrief,
  bible: StyleBible,
  mode: SceneDirectorMode,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];

  const envSummary = Object.entries(bible.environmentRegistry)
    .map(([key, entry]) => `  ${key}: ${entry.atmosphere}`)
    .join("\n");

  const fullStoryText = allPages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  const targetPageNumbers = targetPages.map((p) => p.pageNumber).join(", ");
  const targetPagesText = targetPages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  // Literal mode adds four extra rules at the top of CRITICAL RULES that push
  // Claude to write only what is physically visible (no metaphor / simile),
  // require visually-distinct framing across pages, and forbid text-bearing
  // visual elements. Figurative mode omits them, allowing cinematic language.
  const literalRulesBlock =
    mode === "literal"
      ? `— Every page must show a VISUALLY DISTINCT moment. If page 1 is a wide shot from behind, page 2 must be a close-up or a different angle entirely. Camera, proximity, and composition must vary across pages — never repeat the same framing.
— The camera can exclude the door, the hallway, or any fixed element when it is not relevant to this moment. A close-up of hands needs no background detail.
— LITERAL LANGUAGE ONLY in moment, key_physical_detail, visual_hook, and camera. No metaphors, no similes, no poetic expressions. Image models interpret text literally — figurative language produces wrong images. Write only what is physically visible.
  BAD: "the door looms like a wall of fear" → GOOD: "a closed wooden door filling the upper half of the frame"
  BAD: "her courage gathers like a held breath" → GOOD: "her chin lifted, eyes closed, one hand flat on her chest"
  BAD: "light falls like a spotlight on her isolation" → GOOD: "overhead fluorescent light illuminates the top of her head and her open hand"
`
      : "";

  const textLabelsRule =
    mode === "literal"
      ? `— Avoid visual elements that would require text labels to read (door numbers, signs, classroom labels). The image must work without any text.
`
      : "";

  return `You are a children's book art director making creative decisions BEFORE the illustrator draws anything.

Your job is NOT to describe what happens on the page. Your job is to DIRECT the illustration — to decide what moment to freeze and what makes that moment visually unforgettable.

A great children's book illustration:
• Shows ONE precise frozen moment — not a summary of the whole page
• Uses body language, space, and light to carry emotion — no words, no captions
• Has ONE thing that makes the reader pause — an unexpected angle, a telling shadow, an expressive emptiness
• Feels like a decision, not a transcript

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}
Character: ${bible.characterAnchor}
Style: ${bible.styleGuide}
Environments:
${envSummary}

FULL STORY — read all pages to understand the complete arc, emotional journey, and where each illustrated page sits in the narrative:
${fullStoryText}

PAGES TO ILLUSTRATE — produce one scene direction for each of these pages only (${targetPageNumbers}):
${targetPagesText}

For each page produce a SCENE DIRECTION. Read the full story first so you understand what came before and after this moment. Think like a film director choosing the exact frame to freeze.

moment (1 sentence, present tense, active verb):
The exact split-second being frozen. NOT "Jana approaches the door." INSTEAD: "Jana's hand hovers two inches from the cold handle, fingers curled but not yet touching, her whole body leaning forward while her feet stay planted." Be that specific.

emotion_for_viewer (1 sentence):
What the reader should feel — stated from the reader's perspective, not the character's. NOT "Jana is scared." INSTEAD: "The reader feels the unbearable gap between wanting to go in and not being able to move."

key_physical_detail (under 15 words, NO emotion words):
The single physical specific that carries the whole emotion. Grip pressure. Gaze direction. Where the weight sits. Which muscle is locked.

visual_hook (1 sentence):
The one unexpected compositional or lighting choice that makes this image memorable. Consider: what is in shadow, what catches the only light, where the empty space is, what surprising angle or proximity does the viewer have.

camera (under 12 words):
Where the viewer is. Distance. Angle. Eye level or above or below.

CRITICAL RULES:
${literalRulesBlock}— Never carry story metaphors literally into your directions. "A knot in her stomach" must NOT become a knot shape.
— Never name emotions in key_physical_detail ("tight with fear" is wrong; "fingers white at the knuckle" is right).
— moment must be a single frozen instant, not a sequence.
— Think about what a child looking at this page will notice first.
${textLabelsRule}

OUTPUT: Reply with ONLY valid JSON (no markdown fences, no explanation):
{
  "sceneDirections": [
    {
      "moment": "string",
      "emotion_for_viewer": "string",
      "key_physical_detail": "string",
      "visual_hook": "string",
      "camera": "string"
    }
  ]
}

The sceneDirections array must have exactly ${targetPages.length} elements, one per page in order.`;
}

/**
 * @param allPages   Every page of the story — gives Claude the full narrative arc.
 * @param targetPages The subset of pages to illustrate — Claude produces one direction per entry.
 * @param mode       "literal" (default — exp-09d behaviour) or "figurative" (exp-09c).
 */
export async function callClaudeForSceneDirections(
  allPages: PageIllustration[],
  targetPages: PageIllustration[],
  brief: StoryBrief,
  bible: StyleBible,
  model = "claude-sonnet-4-6",
  mode: SceneDirectorMode = "literal",
): Promise<SceneDirection[]> {
  const prompt = buildSceneDirectorPrompt(allPages, targetPages, brief, bible, mode);

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForSceneDirections: no text block in response");
  }

  const raw = textBlock.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: { sceneDirections: SceneDirection[] };
  try {
    parsed = JSON.parse(raw) as { sceneDirections: SceneDirection[] };
  } catch {
    throw new Error(
      `callClaudeForSceneDirections: failed to parse JSON. Raw: ${raw.slice(0, 400)}`,
    );
  }

  if (!Array.isArray(parsed.sceneDirections) || parsed.sceneDirections.length !== targetPages.length) {
    throw new Error(
      `callClaudeForSceneDirections: expected ${targetPages.length} directions, got ${parsed.sceneDirections?.length}`,
    );
  }

  const required: (keyof SceneDirection)[] = [
    "moment",
    "emotion_for_viewer",
    "key_physical_detail",
    "visual_hook",
    "camera",
  ];
  for (const dir of parsed.sceneDirections) {
    for (const key of required) {
      if (!dir[key]) {
        throw new Error(`callClaudeForSceneDirections: direction missing field "${key}"`);
      }
    }
  }

  return parsed.sceneDirections;
}

// ---------------------------------------------------------------------------
// Call 2: Convert creative scene directions → structured Seedream prompt sections
// ---------------------------------------------------------------------------

function buildPromptConverterPrompt(
  pages: PageIllustration[],
  directions: SceneDirection[],
  bible: StyleBible,
  mode: SceneDirectorMode,
): string {
  const envJson = Object.entries(bible.environmentRegistry)
    .map(
      ([key, entry]) =>
        `  ${key}:\n    atmosphere: ${entry.atmosphere}\n    spatialLayout: ${entry.spatialLayout}`,
    )
    .join("\n");

  const pageBlocks = pages
    .map((p, i) => {
      const dir = directions[i]!;
      return `[Page ${p.pageNumber}]
Story text: ${p.text}

Art direction:
  Moment: ${dir.moment}
  Viewer feels: ${dir.emotion_for_viewer}
  Key physical detail: ${dir.key_physical_detail}
  Visual hook: ${dir.visual_hook}
  Camera: ${dir.camera}`;
    })
    .join("\n\n---\n\n");

  // Literal mode pushes Claude to write only what is physically visible in the
  // current camera frame and removes the requirement that the character be on
  // a named piece of furniture (close-ups don't need backgrounds). Figurative
  // mode keeps the older rules which require spatialLayout props and furniture
  // anchoring — this matches exp-09c output before the literal-language fix.
  const settingDescription =
    mode === "literal"
      ? `"<registry key> | <light state> | <only props VISIBLE in this specific camera frame>"
Use the EXACT registry key from the environment registry. ONLY list props that would actually be visible given this shot's camera angle and distance. A floor-level close-up on feet shows tiles and maybe a door base — not the whole hallway. A tight face shot shows nothing behind the character. NEVER include room numbers, door numbers, signs, or any element that would require text to read. Props are described by appearance, not by label ("closed wooden door" not "door to Room 4").`
      : `"<registry key> | <light state> | <2–3 props from spatialLayout with their positions>"
Use the EXACT registry key from the environment registry. Only reference props that appear in spatialLayout.`;

  const characterDescription =
    mode === "literal"
      ? `"<body position and surface contact> | <exact limb positions, weight distribution, gaze direction — NO emotion words>"
Translate key_physical_detail directly. Do not require a named piece of furniture if the camera frame doesn't show one.`
      : `"<furniture or surface the character is on/in> | <body language: translate key_physical_detail into exact limb positions, weight, gaze — NO emotion words>"
This field must reflect the moment and key_physical_detail precisely.`;

  const focalPointDescription =
    mode === "literal"
      ? `The one element the viewer's eye reaches first. Must reflect the visual_hook.`
      : `The one element the viewer's eye reaches first. Should reflect the visual_hook.`;

  const compositionDescription =
    mode === "literal"
      ? `Translate the camera field exactly: "<framing> | <angle> | <foreground/midground/background>"`
      : `Translate the camera field: "<framing> | <angle> | <foreground/midground/background>"`;

  const criticalRules =
    mode === "literal"
      ? `— LITERAL LANGUAGE ONLY in every output field. No metaphors, no similes, no figurative expressions. Image generation models read text literally — "a shadow of doubt" would produce a literal shadow shaped like doubt; "arms hanging like weights" would produce arms shaped like weights. Write only what is physically visible and measurable.
  BAD: "the vast emptiness between them" → GOOD: "an empty stretch of hallway tile between the two children"
  BAD: "light catching the only hope in the room" → GOOD: "pale light from the corridor window falling on her open hand"
  BAD: "she stands rooted to the spot" → GOOD: "both feet flat on the floor, knees slightly bent, no forward lean"
— Translate moment into exact body positions — never paraphrase, never emotion words.
— setting must only describe what is VISIBLE in this specific frame — not the whole room.
— Never mention room numbers, door numbers, signs, or any text-based identifier.
— Each page's setting must feel like a different visual environment even if in the same room — vary what's in frame.`
      : `— Translate moment into exact body positions — not paraphrase, not emotion words.
— setting positions must match spatialLayout exactly — do not move furniture.
— Never use metaphors from the story text literally.
— The character field must always place the character on/in a named piece of furniture.`;

  return `You are a technical image-prompt writer for an AI illustration system (Seedream 4.0).

You receive a creative SCENE DIRECTION from an art director and convert it into a precise 5-section SCENE PROMPT.

Your job is TRANSLATION, not creativity. The creative decisions are already made. Your job is to translate them into exact visual instructions that an image model can execute.

STYLE BIBLE:
Character anchor: ${bible.characterAnchor}
Style: ${bible.styleGuide}
Environments:
${envJson}
Avoid: ${bible.avoidList.join(", ")}

SCENE DIRECTIONS (one per page):
${pageBlocks}

For each page, produce the 5 sections. Every field has a strict word budget — stay under it.

setting (under 20 words):
${settingDescription}

character (under 20 words):
${characterDescription}

focalPoint (under 10 words):
${focalPointDescription}

composition (under 15 words):
${compositionDescription}

lighting (under 25 words):
Translate the visual_hook's lighting decision: "<source + position> | <quality> | <what it illuminates> | <what it leaves in shadow> | mood: <one word>"

CRITICAL RULES:
${criticalRules}

OUTPUT: Reply with ONLY valid JSON (no markdown fences):
{
  "scenePrompts": [
    {
      "setting": "string",
      "character": "string",
      "focalPoint": "string",
      "composition": "string",
      "lighting": "string"
    }
  ]
}

The scenePrompts array must have exactly ${pages.length} elements, one per page in order.`;
}

export async function callClaudeForPromptsFromDirections(
  pages: PageIllustration[],
  directions: SceneDirection[],
  bible: StyleBible,
  model = "claude-sonnet-4-6",
  mode: SceneDirectorMode = "literal",
): Promise<ScenePromptSections[]> {
  const prompt = buildPromptConverterPrompt(pages, directions, bible, mode);

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForPromptsFromDirections: no text block in response");
  }

  const raw = textBlock.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: { scenePrompts: ScenePromptSections[] };
  try {
    parsed = JSON.parse(raw) as { scenePrompts: ScenePromptSections[] };
  } catch {
    throw new Error(
      `callClaudeForPromptsFromDirections: failed to parse JSON. Raw: ${raw.slice(0, 400)}`,
    );
  }

  if (!Array.isArray(parsed.scenePrompts) || parsed.scenePrompts.length !== pages.length) {
    throw new Error(
      `callClaudeForPromptsFromDirections: expected ${pages.length} prompts, got ${parsed.scenePrompts?.length}`,
    );
  }

  return parsed.scenePrompts;
}

// ---------------------------------------------------------------------------
// Utility: format a SceneDirection for report output
// ---------------------------------------------------------------------------

export function formatSceneDirectionForReport(dir: SceneDirection): string {
  return [
    `MOMENT:      ${dir.moment}`,
    `VIEWER FEELS: ${dir.emotion_for_viewer}`,
    `KEY DETAIL:  ${dir.key_physical_detail}`,
    `VISUAL HOOK: ${dir.visual_hook}`,
    `CAMERA:      ${dir.camera}`,
  ].join("\n");
}
