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
  pages: PageIllustration[],
  brief: StoryBrief,
  bible: StyleBible,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];

  const envSummary = Object.entries(bible.environmentRegistry)
    .map(([key, entry]) => `  ${key}: ${entry.atmosphere}`)
    .join("\n");

  const pagesText = pages.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n");

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

STORY PAGES:
${pagesText}

For each page produce a SCENE DIRECTION. Think like a film director choosing the exact frame to freeze.

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
— Never carry story metaphors literally into your directions. "A knot in her stomach" must NOT become a knot shape.
— Never name emotions in key_physical_detail ("tight with fear" is wrong; "fingers white at the knuckle" is right).
— moment must be a single frozen instant, not a sequence.
— Think about what a child looking at this page will notice first.

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

The sceneDirections array must have exactly ${pages.length} elements, one per page in order.`;
}

export async function callClaudeForSceneDirections(
  pages: PageIllustration[],
  brief: StoryBrief,
  bible: StyleBible,
  model = "claude-sonnet-4-6",
): Promise<SceneDirection[]> {
  const prompt = buildSceneDirectorPrompt(pages, brief, bible);

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

  if (!Array.isArray(parsed.sceneDirections) || parsed.sceneDirections.length !== pages.length) {
    throw new Error(
      `callClaudeForSceneDirections: expected ${pages.length} directions, got ${parsed.sceneDirections?.length}`,
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
"<registry key> | <light state> | <2–3 props from spatialLayout with their positions>"
Use the EXACT registry key from the environment registry. Only reference props that appear in spatialLayout.

character (under 20 words):
"<furniture or surface the character is on/in> | <body language: translate key_physical_detail into exact limb positions, weight, gaze — NO emotion words>"
This field must reflect the moment and key_physical_detail precisely.

focalPoint (under 10 words):
The one element the viewer's eye reaches first. Should reflect the visual_hook.

composition (under 15 words):
Translate the camera field: "<framing> | <angle> | <foreground/midground/background>"

lighting (under 25 words):
Translate the visual_hook's lighting decision: "<source + position> | <quality> | <what it illuminates> | <what it leaves in shadow> | mood: <one word>"

CRITICAL RULES:
— Translate moment into exact body positions — not paraphrase, not emotion words.
— setting positions must match spatialLayout exactly — do not move furniture.
— Never use metaphors from the story text literally.
— The character field must always place the character on/in a named piece of furniture.

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
): Promise<ScenePromptSections[]> {
  const prompt = buildPromptConverterPrompt(pages, directions, bible);

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
