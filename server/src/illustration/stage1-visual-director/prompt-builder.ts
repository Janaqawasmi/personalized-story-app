import { AGE_RANGE_LABELS } from "@/models/storyBrief.model";
import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import type { VisualDirectorInput } from "./types";

export function buildVisualDirectorPrompt(
  input: VisualDirectorInput,
): { systemPrompt: string; userPrompt: string } {
  const { story, manuscriptText } = input;
  const brief = story.brief;
  const ageLabel = story.ageRange
    ? AGE_RANGE_LABELS[story.ageRange]
    : "unspecified";
  const intentionFeel = brief.clinicalFoundation?.therapeuticIntention?.feel ?? "";
  const intentionBecause =
    brief.clinicalFoundation?.therapeuticIntention?.because ?? "";
  const therapeuticIntention = [intentionFeel, intentionBecause]
    .filter(Boolean)
    .join(" ");
  const creativeVision = brief.clinicalFoundation?.creativeVision ?? "";

  const systemPrompt = `You are an art director for illustrated children's books. You produce structured
"Visual Bibles" that ensure every illustration in a story is visually consistent
in character, environment, and style.

Your output must be a single JSON object matching the schema provided in the user message.
Return only JSON — no commentary, no markdown fences.`;

  const userPrompt = `## Story brief
- Title: ${story.title}
- Age range: ${ageLabel}
- Story type: ${String(story.storyType).replace(/_/g, " ")}
- Therapeutic intention: ${therapeuticIntention}
- Creative vision: ${creativeVision}

## Manuscript
${manuscriptText}

## Output schema (JSON)
{
  "characterSheet": "5-7 sentences. Full physical description of the protagonist — species/age/build, face, hair/fur, wardrobe, signature props, default posture. Be highly specific.",
  "characterAnchor": "1-2 sentences. Verbatim compact anchor that will be embedded in every page prompt — face, eyes, clothing colours.",
  "styleGuide": "Medium, line quality, palette mood, level of stylisation.",
  "consistencyAnchors": ["3 to 5 short phrases, 4-6 words each, each repeatable in a 1200-char prompt."],
  "environmentRegistry": {
    "<envKey>": {
      "atmosphere": "1 sentence: feeling, light quality, visual tone.",
      "spatialLayout": "2-3 sentences: name at least three fixed props or fixtures per environment (furniture, windows, boards, doors) with compass or wall references (north wall, left of window). This text is injected verbatim into every illustration of this location — be specific and stable."
    }
  },
  "palette": "5-7 comma-separated colour names.",
  "avoidList": [
    "${MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID}",
    "5 to 7 more short phrases of things to avoid"
  ]
}

## Critical rules
- avoidList[0] MUST be exactly this string (the no-text constraint):
  ${MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID}
- consistencyAnchors must each be short enough to embed verbatim in every page prompt.
- Identify every distinct location in the manuscript and add an entry to environmentRegistry.
- Use literal descriptive language — no metaphors, no similes, no emotional adjectives in spatial descriptions.`;

  return { systemPrompt, userPrompt };
}
