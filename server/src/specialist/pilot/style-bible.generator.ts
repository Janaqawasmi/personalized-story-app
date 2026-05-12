/**
 * Style Bible generation for the pilot pipeline.
 *
 * Mirrors server/experiments/src/style-bible.generator.ts (the callClaudeForStyleBible
 * portion). Pilot owns its own copy so the experiments folder can evolve
 * independently.
 *
 * One call: reads ALL story pages and the brief, returns a full StyleBible.
 */

import { Anthropic } from "@anthropic-ai/sdk";
import type { PageIllustration } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { AGE_RANGE_LABELS } from "@/models/storyBrief.model";
import type { StyleBible } from "./style-bible.types";

const client = new Anthropic({ maxRetries: 0 });

function buildStyleBiblePrompt(pages: PageIllustration[], brief: StoryBrief): string {
  const ageLabel = AGE_RANGE_LABELS[brief.ageAndScope.ageRange];
  const pagesText = pages.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n");

  return `You are a children's book art director and illustrator. Read the complete story and produce a STYLE BIBLE that will anchor all illustrations in a consistent visual world.

STORY CONTEXT:
Age range: ${ageLabel}
Story type: ${brief.storyType.replace(/_/g, " ")}

STORY PAGES:
${pagesText}

STYLE BIBLE rules — produce every field precisely as specified:

characterSheet (string, 5–7 sentences):
Describe the protagonist's permanent physical appearance. Cover in order: (1) species/age/build in precise terms, (2) face — eye shape, colour, nose, mouth, any marks, (3) hair or fur — colour, texture, style, (4) wardrobe — exact garments, colours, patterns that never change, (5) signature props or body marks, (6) default body posture that expresses personality. Be highly specific. "A small child" is wrong. "A small child of about five years, with a round face, large dark eyes with slightly visible lower lids…" is right. Specificity prevents character drift.

characterAnchor (string, 1–2 sentences):
Extract the most visually distinctive identifiers from the character sheet — the features most likely to prevent drift between pages. This compact version is embedded in every image prompt. Focus on face shape, eye characteristics, and clothing colour/type.

styleGuide (string, 1 sentence):
Art medium, line quality, colour treatment, level of stylisation, and emotional mood.

consistencyAnchors (array of 3–5 strings, each 4–6 words MAXIMUM):
Short phrases repeated verbatim in every scene prompt to lock the visual style. Very concise — they are embedded in the image prompt so every word counts. Each captures one specific thing: medium, texture, palette mood, or lighting convention. Example: "soft muted watercolour illustration".

environmentRegistry (object):
For each distinct setting in the story, provide an object with:
  atmosphere: one sentence about feeling, light quality, and visual tone.
  spatialLayout: one sentence listing every key prop/furniture with its fixed position using wall-reference directions (back wall, left wall, right corner, centre of floor, etc.). These positions must be respected by every illustration that uses this setting. Be specific about every object that appears in the story text.

palette (string):
5–7 colour names separated by commas. Compact — no role descriptions. These are the only colours that should appear.

avoidList (array of 6–8 strings, each under 8 words):
Short concrete phrases — NOT full sentences. Each names one specific thing to avoid. The FIRST item must always be "text, letters, words, or captions of any kind". Then focus on: (1) rendering errors for this character type, (2) metaphor-derived literal shapes (if story says "mountain of books" → avoid "mountain silhouette behind book pile"), (3) off-style elements, (4) props not in this story. Example first item: "text, letters, words, or captions of any kind".

OUTPUT: Reply with ONLY valid JSON (no markdown fences):
{
  "characterSheet": "string",
  "characterAnchor": "string",
  "styleGuide": "string",
  "consistencyAnchors": ["string"],
  "environmentRegistry": {
    "<scene-key>": {
      "atmosphere": "string",
      "spatialLayout": "string"
    }
  },
  "palette": "string",
  "avoidList": ["string"]
}`;
}

export async function callClaudeForStyleBible(
  pages: PageIllustration[],
  brief: StoryBrief,
  model = "claude-haiku-4-5-20251001",
): Promise<StyleBible> {
  const prompt = buildStyleBiblePrompt(pages, brief);

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("callClaudeForStyleBible: Claude returned no text block");
  }

  const raw = textBlock.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Omit<StyleBible, "generatedAt">;
  try {
    parsed = JSON.parse(raw) as Omit<StyleBible, "generatedAt">;
  } catch {
    throw new Error(
      `callClaudeForStyleBible: failed to parse JSON. Raw: ${raw.slice(0, 300)}`,
    );
  }

  const required = [
    "characterSheet",
    "characterAnchor",
    "styleGuide",
    "consistencyAnchors",
    "environmentRegistry",
    "palette",
    "avoidList",
  ];
  for (const key of required) {
    if (!(key in parsed)) {
      throw new Error(`callClaudeForStyleBible: missing field "${key}"`);
    }
  }

  return { ...parsed, generatedAt: Date.now() };
}
