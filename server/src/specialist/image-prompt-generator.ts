// server/src/specialist/image-prompt-generator.ts
//
// Calls Claude to produce the Visual Bible + one image prompt per page in a
// single batched API call (minimises API round-trips, enables prompt caching
// for the shared story context).
//
// Output JSON shape:
// {
//   "visualBible": {
//     "protagonist": "...",
//     "styleGuide": "...",
//     "environmentRegistry": { "bedroom": "...", ... },
//     "palette": "..."
//   },
//   "imagePrompts": ["<page 1 prompt>", "<page 2 prompt>", ...]
// }

import { Anthropic } from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { PageIllustration, VisualBible } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { AGE_RANGE_LABELS } from "@/models/storyBrief.model";

const client = new Anthropic({ maxRetries: 0 });
const LOG_PATH = path.resolve(process.cwd(), "logs", "image-prompt-calls.jsonl");

interface ImagePromptCallLogEntry {
  timestamp: string;
  model: string;
  pageCount: number;
  promptLength: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  prompt: string;
  rawText?: string;
}

function appendLogLine(entry: ImagePromptCallLogEntry): void {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("Failed to write image prompt call log:", err);
  }
}

export interface ImagePromptsResult {
  visualBible: VisualBible;
  /** imagePrompts[i] corresponds to pages[i]. */
  imagePrompts: string[];
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

export function buildImagePromptsPrompt(
  pages: PageIllustration[],
  brief: StoryBrief,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];

  const pagesText = pages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  return `You are a children's book art director. You will read a therapeutic picture-book story and produce two things:

1. A VISUAL BIBLE that anchors every illustration in a consistent visual world.
2. One SEEDREAM 4.0 IMAGE PROMPT per page — a concise natural-language scene description.

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}

STORY PAGES:
${pagesText}

INSTRUCTIONS:

VISUAL BIBLE rules:
- protagonist: one sentence describing the main character's permanent physical appearance (species, size, colour, clothing). No names.
- styleGuide: one sentence specifying art medium and mood (e.g. "Soft watercolour, warm earthy tones, gentle rounded shapes").
- environmentRegistry: an object mapping each distinct setting that appears in the story to a one-sentence visual description. Keys are lowercase scene labels (e.g. "bedroom", "garden").
- palette: a comma-separated list of 4–6 hex colours OR descriptive colour names that capture the story's emotional tone.

IMAGE PROMPT rules per page (Seedream 4.0 style):
- 1–2 sentences only. Describe the key visual moment as coherent natural language: subject + action + environment.
- Mention the specific setting from the environment registry.
- Do NOT repeat the style or character description — those are appended separately.
- Do NOT use keyword lists (e.g. "rabbit, meadow, sunshine" is wrong).
- Do NOT include text, speech bubbles, or logos.
- Do NOT reference emotions directly — show them through posture, environment, and light.
- Do NOT include anything age-inappropriate or frightening.

EXAMPLE of a good image prompt:
"A small brown rabbit sits in a sun-dappled garden clearing, reaching one paw toward a glowing firefly hovering just out of reach."

OUTPUT: Reply with ONLY valid JSON matching this exact schema (no markdown fences):
{
  "visualBible": {
    "protagonist": "string",
    "styleGuide": "string",
    "environmentRegistry": { "<scene>": "string" },
    "palette": "string"
  },
  "imagePrompts": ["string", "string", ...]
}

The imagePrompts array must have exactly ${pages.length} elements, one per page in order.`;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface RawOutput {
  visualBible: {
    protagonist: string;
    styleGuide: string;
    environmentRegistry: Record<string, string>;
    palette: string;
  };
  imagePrompts: string[];
}

function stripMarkdownFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

export function parseImagePromptsResponse(
  raw: string,
  expectedPageCount: number,
): ImagePromptsResult {
  let parsed: RawOutput;
  try {
    parsed = JSON.parse(stripMarkdownFences(raw)) as RawOutput;
  } catch {
    throw new Error(
      `ImagePromptGenerator: failed to parse Claude response as JSON. Raw: ${raw.slice(0, 200)}`,
    );
  }

  if (!parsed.visualBible || !Array.isArray(parsed.imagePrompts)) {
    throw new Error(
      "ImagePromptGenerator: response missing visualBible or imagePrompts",
    );
  }

  if (parsed.imagePrompts.length !== expectedPageCount) {
    throw new Error(
      `ImagePromptGenerator: expected ${expectedPageCount} image prompts, got ${parsed.imagePrompts.length}`,
    );
  }

  const visualBible: VisualBible = {
    protagonist: parsed.visualBible.protagonist,
    styleGuide: parsed.visualBible.styleGuide,
    environmentRegistry: parsed.visualBible.environmentRegistry ?? {},
    palette: parsed.visualBible.palette,
    generatedAt: Date.now(),
  };

  return { visualBible, imagePrompts: parsed.imagePrompts };
}

// ---------------------------------------------------------------------------
// Main call
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Visual-Bible-only generation (for cache / locked-VB workflow)
// ---------------------------------------------------------------------------

export function buildVisualBibleOnlyPrompt(
  pages: PageIllustration[],
  brief: StoryBrief,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];
  const pagesText = pages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  return `You are a children's book art director. Read the complete story and produce a VISUAL BIBLE that anchors every illustration in a consistent visual world.

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}

STORY PAGES:
${pagesText}

VISUAL BIBLE rules:
- protagonist: one sentence describing the main character's permanent physical appearance (species, size, colour, clothing). No names.
- styleGuide: one sentence specifying art medium and mood (e.g. "Soft watercolour, warm earthy tones, gentle rounded shapes").
- environmentRegistry: an object mapping each distinct setting that appears in the story to a one-sentence visual description. Keys are lowercase scene labels (e.g. "bedroom", "garden").
- palette: a comma-separated list of 4–6 descriptive colour names that capture the story's emotional tone.

OUTPUT: Reply with ONLY valid JSON (no markdown fences):
{
  "visualBible": {
    "protagonist": "string",
    "styleGuide": "string",
    "environmentRegistry": { "<scene>": "string" },
    "palette": "string"
  }
}`;
}

export async function callClaudeForVisualBible(
  pages: PageIllustration[],
  brief: StoryBrief,
): Promise<VisualBible> {
  const model = "claude-haiku-4-5-20251001";
  const prompt = buildVisualBibleOnlyPrompt(pages, brief);
  const startTime = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForVisualBible: Claude returned no text block");
  }

  let parsed: { visualBible: RawOutput["visualBible"] };
  try {
    parsed = JSON.parse(stripMarkdownFences(textBlock.text)) as {
      visualBible: RawOutput["visualBible"];
    };
  } catch {
    throw new Error(
      `callClaudeForVisualBible: failed to parse response as JSON. Raw: ${textBlock.text.slice(0, 200)}`,
    );
  }

  appendLogLine({
    timestamp: new Date().toISOString(),
    model,
    pageCount: pages.length,
    promptLength: prompt.length,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    latencyMs: Date.now() - startTime,
    success: true,
    prompt,
    rawText: textBlock.text,
  });

  return {
    protagonist: parsed.visualBible.protagonist,
    styleGuide: parsed.visualBible.styleGuide,
    environmentRegistry: parsed.visualBible.environmentRegistry ?? {},
    palette: parsed.visualBible.palette,
    generatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Prompts-only generation (when Visual Bible is already locked)
// ---------------------------------------------------------------------------

export function buildPromptsOnlyPrompt(
  pages: PageIllustration[],
  brief: StoryBrief,
  visualBible: VisualBible,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];
  const pagesText = pages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  return `You are a children's book art director. The Visual Bible for this story is locked. Generate one SEEDREAM 4.0 IMAGE PROMPT per page.

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}

VISUAL BIBLE (locked):
- Protagonist: ${visualBible.protagonist}
- Style: ${visualBible.styleGuide}
- Environments: ${JSON.stringify(visualBible.environmentRegistry)}
- Palette: ${visualBible.palette}

STORY PAGES:
${pagesText}

IMAGE PROMPT rules per page (Seedream 4.0 style):
- 1–2 sentences only. Describe the key visual moment as coherent natural language: subject + action + environment.
- Mention the specific setting from the environment registry.
- Do NOT repeat the style or character description — those are appended separately.
- Do NOT use keyword lists (e.g. "rabbit, meadow, sunshine" is wrong).
- Do NOT include text, speech bubbles, or logos.
- Do NOT reference emotions directly — show them through posture, environment, and light.
- Do NOT include anything age-inappropriate or frightening.

EXAMPLE of a good image prompt:
"A small brown rabbit sits in a sun-dappled garden clearing, reaching one paw toward a glowing firefly hovering just out of reach."

OUTPUT: Reply with ONLY valid JSON (no markdown fences):
{
  "imagePrompts": ["string", "string", ...]
}

The imagePrompts array must have exactly ${pages.length} elements, one per page in order.`;
}

// ---------------------------------------------------------------------------
// Enhanced prompts (exp-03: structured body-language + light mandate + better examples)
// ---------------------------------------------------------------------------

export function buildEnhancedPromptsOnlyPrompt(
  pages: PageIllustration[],
  brief: StoryBrief,
  visualBible: VisualBible,
): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];
  const pagesText = pages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  const envJson = JSON.stringify(visualBible.environmentRegistry, null, 2);

  return `You are a children's book art director writing image prompts for Seedream 4.0.
The Visual Bible is locked. Your only job is to write one prompt per page.

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}

VISUAL BIBLE (locked — do not repeat in prompts, it is appended automatically):
Protagonist: ${visualBible.protagonist}
Style: ${visualBible.styleGuide}
Palette: ${visualBible.palette}
Environment registry:
${envJson}

STORY PAGES:
${pagesText}

PROMPT STRUCTURE — every prompt must have exactly these three parts in order:

1. SUBJECT + BODY LANGUAGE (1 sentence)
   Describe the child's posture, limb position, and gaze direction. This is how emotion is shown — never name feelings. Use physical specifics: "arms rigid at sides", "hands pressing into mattress", "shoulders drawn inward", "gaze fixed on the corner", "sitting loose-limbed and unhurried".

2. ENVIRONMENT OBJECTS (1 sentence)
   Name the environment registry key (e.g. bedroom_dark), then list at least two specific objects from that entry's description with their visual state. Objects must match the registry — do not invent furniture. Example: "the dresser a shadowy bulk in the corner, the window a thin pale stripe, the books on the floor an indistinct dark mass."

3. LIGHT (1 sentence)
   Name the light source, its colour/warmth, and what it does or does not illuminate. Light is mandatory — it is the primary carrier of emotional atmosphere. Examples: "Warm amber lamplight pools on the blanket and dresser, casting soft upward shadows." / "The faintest grey seeps through the curtains, giving no warmth, separating nothing cleanly from the dark." / "Pale blue-grey spreads evenly through the room, steady and unhurried, giving each object back its outline."

RULES:
- 2–3 sentences total (the three parts above).
- Use the exact environment registry key name for the setting.
- Do NOT use keyword lists.
- Do NOT include text, speech bubbles, or logos.
- Do NOT name emotions (scared, anxious, calm, relieved). Physical specifics only.
- Do NOT include anything age-inappropriate or frightening.
- Do NOT repeat the style guide, protagonist description, or palette — they are appended automatically.

EXAMPLES of well-structured prompts for this story's aesthetic:

[Lit bedroom — comfort/recognition]
"A small child sits cross-legged on the bed, hands resting open on the blue blanket, gaze moving slowly around the room with unhurried ease. The bedroom_lit: the wooden dresser solid in its corner, the window letting in the last thin grey light, the pile of books settled exactly where it always is. Warm amber lamplight fills the room from a low angle, making every object cast a soft familiar shadow."

[Dark bedroom — tension/stillness]
"A small child lies flat on their back under a blue blanket, arms rigid at their sides, chest barely rising — the posture of held breath. The bedroom_dark: the dresser dissolved into a dark bulk at the edge of vision, the window a faint horizontal stripe, the books on the floor an indistinct mass with no clear edges. The faintest grey light seeps through the curtains, giving no warmth and separating nothing cleanly from the surrounding dark."

[Bedroom rediscovered — quiet relief]
"A small child sits upright in bed, palms pressing into the mattress, eyes fixed steadily on the corner where the dresser is slowly becoming itself again. The bedroom_rediscovered: the dresser solidifying back into its corner, the window releasing its quiet glow, the pile of books on the floor resolving into a recognisable dark mountain. Pale blue-grey light spreads evenly and without drama, returning each object to its proper outline."

OUTPUT: Reply with ONLY valid JSON (no markdown fences):
{
  "imagePrompts": ["string", "string", ...]
}

The imagePrompts array must have exactly ${pages.length} elements, one per page in order.`;
}

export async function callClaudeForEnhancedPrompts(
  pages: PageIllustration[],
  brief: StoryBrief,
  visualBible: VisualBible,
): Promise<string[]> {
  const model = "claude-haiku-4-5-20251001";
  const prompt = buildEnhancedPromptsOnlyPrompt(pages, brief, visualBible);
  const startTime = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForEnhancedPrompts: Claude returned no text block");
  }

  let parsed: { imagePrompts: string[] };
  try {
    parsed = JSON.parse(stripMarkdownFences(textBlock.text)) as {
      imagePrompts: string[];
    };
  } catch {
    throw new Error(
      `callClaudeForEnhancedPrompts: failed to parse response as JSON. Raw: ${textBlock.text.slice(0, 200)}`,
    );
  }

  if (!Array.isArray(parsed.imagePrompts) || parsed.imagePrompts.length !== pages.length) {
    throw new Error(
      `callClaudeForEnhancedPrompts: expected ${pages.length} prompts, got ${parsed.imagePrompts?.length}`,
    );
  }

  appendLogLine({
    timestamp: new Date().toISOString(),
    model,
    pageCount: pages.length,
    promptLength: prompt.length,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    latencyMs: Date.now() - startTime,
    success: true,
    prompt,
    rawText: textBlock.text,
  });

  return parsed.imagePrompts;
}

export async function callClaudeForPromptsOnly(
  pages: PageIllustration[],
  brief: StoryBrief,
  visualBible: VisualBible,
): Promise<string[]> {
  const model = "claude-haiku-4-5-20251001";
  const prompt = buildPromptsOnlyPrompt(pages, brief, visualBible);
  const startTime = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForPromptsOnly: Claude returned no text block");
  }

  let parsed: { imagePrompts: string[] };
  try {
    parsed = JSON.parse(stripMarkdownFences(textBlock.text)) as {
      imagePrompts: string[];
    };
  } catch {
    throw new Error(
      `callClaudeForPromptsOnly: failed to parse response as JSON. Raw: ${textBlock.text.slice(0, 200)}`,
    );
  }

  if (!Array.isArray(parsed.imagePrompts) || parsed.imagePrompts.length !== pages.length) {
    throw new Error(
      `callClaudeForPromptsOnly: expected ${pages.length} prompts, got ${parsed.imagePrompts?.length}`,
    );
  }

  appendLogLine({
    timestamp: new Date().toISOString(),
    model,
    pageCount: pages.length,
    promptLength: prompt.length,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    latencyMs: Date.now() - startTime,
    success: true,
    prompt,
    rawText: textBlock.text,
  });

  return parsed.imagePrompts;
}

// ---------------------------------------------------------------------------
// Combined call (original: VB + prompts in one shot)
// ---------------------------------------------------------------------------

export async function callClaudeForImagePrompts(
  pages: PageIllustration[],
  brief: StoryBrief,
): Promise<ImagePromptsResult> {
  const model = "claude-haiku-4-5-20251001";
  const prompt = buildImagePromptsPrompt(pages, brief);
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("ImagePromptGenerator: Claude returned no text block");
    }

    const result = parseImagePromptsResponse(textBlock.text, pages.length);
    appendLogLine({
      timestamp: new Date().toISOString(),
      model,
      pageCount: pages.length,
      promptLength: prompt.length,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs: Date.now() - startTime,
      success: true,
      prompt,
      rawText: textBlock.text,
    });
    return result;
  } catch (err) {
    appendLogLine({
      timestamp: new Date().toISOString(),
      model,
      pageCount: pages.length,
      promptLength: prompt.length,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      prompt,
    });
    throw err;
  }
}
