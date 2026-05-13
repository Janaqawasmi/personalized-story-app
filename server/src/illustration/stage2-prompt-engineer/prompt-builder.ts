import type { ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";

export function buildPromptEngineerPrompt(
  scenePlan: ScenePlanArtefact,
  visualBible: VisualBibleArtefact,
): { systemPrompt: string; userPrompt: string } {
  const envJson = Object.entries(visualBible.environmentRegistry)
    .map(
      ([key, entry]) =>
        `  ${key}:\n    atmosphere: ${entry.atmosphere}\n    spatialLayout: ${entry.spatialLayout}`,
    )
    .join("\n");

  const dir = scenePlan.director;

  const systemPrompt = `You are a technical image-prompt writer for an AI illustration system (Seedream 4.0).
You convert a creative SCENE PLAN into a precise 5-section SCENE PROMPT.
Your job is TRANSLATION, not creativity. Use literal, camera-visible language only — no metaphors, no emotion words, no body coordinates the camera cannot see.
Stay within each field's word budget. Reply with JSON only when asked in the user message.`;

  const userPrompt = `STYLE BIBLE:
Character anchor: ${visualBible.characterAnchor}
Style: ${visualBible.styleGuide}
Environments:
${envJson}
Avoid list: ${visualBible.avoidList.join(", ")}

PAGE SCENE PLAN (creative layer — translate, do not invent new story beats):
Title: ${scenePlan.title}
Prose: ${scenePlan.prose}
Emotional intent (do not copy emotion words into output): ${scenePlan.emotionalIntent}
Key visible detail: ${scenePlan.keyVisibleDetail}

Scene direction:
  moment: ${dir.moment}
  camera: ${dir.cameraSpec}
  lighting choice: ${dir.lightingChoice}
  visual hook: ${dir.visualHook}
  key physical detail: ${dir.keyPhysicalDetail}

Produce exactly these 5 sections as JSON with keys setting, character, focalPoint, composition, lighting.

Word budgets (strict):
- setting: ≤25 words — registry key if applicable, light state, only props visible in this camera frame.
- character: ≤30 words — body position, limb positions, gaze; NO emotion words.
- focalPoint: ≤10 words — single visual anchor the eye hits first.
- composition: ≤20 words — framing, angle, foreground/midground/background.
- lighting: ≤30 words — source, quality, what is lit vs shadow; at most one neutral mood word at the end.

CRITICAL:
- Literal language only. No similes, no "like a …", no figurative phrasing.
- No external image attachments — text-only prompts for the model.

Return only JSON (no markdown fences):
{
  "setting": "string",
  "character": "string",
  "focalPoint": "string",
  "composition": "string",
  "lighting": "string"
}`;

  return { systemPrompt, userPrompt };
}
