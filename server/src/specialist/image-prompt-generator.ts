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
