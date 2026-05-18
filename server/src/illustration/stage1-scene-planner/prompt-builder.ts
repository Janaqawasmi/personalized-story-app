import type { ScenePlannerInput, ScenePlannerRegenInput } from "./types";

export function buildScenePlannerPrompt(
  input: ScenePlannerInput,
  pageNumber: number,
): { systemPrompt: string; userPrompt: string } {
  const page = input.manuscriptPages.find((p) => p.pageNumber === pageNumber);
  if (!page) {
    throw new Error(`buildScenePlannerPrompt: missing page ${pageNumber}`);
  }

  const idx = input.manuscriptPages.findIndex((p) => p.pageNumber === pageNumber);
  const prev = idx > 0 ? input.manuscriptPages[idx - 1] : null;
  const next =
    idx >= 0 && idx < input.manuscriptPages.length - 1
      ? input.manuscriptPages[idx + 1]
      : null;

  const allPages = input.manuscriptPages
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  const vb = input.visualBible;
  const visualBibleAsJson = JSON.stringify(
    {
      characterAnchor: vb.characterAnchor,
      characterSheet: vb.characterSheet,
      styleGuide: vb.styleGuide,
      consistencyAnchors: vb.consistencyAnchors,
      environmentRegistry: vb.environmentRegistry,
      palette: vb.palette,
      avoidList: vb.avoidList,
    },
    null,
    2,
  );

  const systemPrompt = `You are a scene director for illustrated children's books. For one page at a
time, you decide what is in the frame, how it's framed, the lighting, and the
single visual detail that carries the emotional weight of that page.

You always have access to the full manuscript and the Visual Bible so that
your scenes are narratively coherent across pages and visually consistent.

Return only JSON — no commentary, no markdown fences.`;

  const userPrompt = `## Visual Bible
${visualBibleAsJson}

## Full manuscript (all pages)
${allPages}

## Target page
Page number: ${pageNumber}
Text:
${page.text}

## Adjacent context
Previous page text: ${prev ? prev.text : "(none — first page)"}
Next page text: ${next ? next.text : "(none — last page)"}

## Output schema (JSON)
{
  "title": "Short label, e.g. 'Hesitation at the doorway'.",
  "prose": "2-4 sentences in plain language describing what is in the image.",
  "emotionalIntent": "1 sentence: what the reader should feel.",
  "keyVisibleDetail": "1 sentence: the one physical element that carries the scene.",
  "director": {
    "moment": "Exact split-second, present tense.",
    "cameraSpec": "Distance, angle, framing.",
    "lightingChoice": "Source, quality, mood.",
    "visualHook": "The memorable element.",
    "keyPhysicalDetail": "Single-detail body language anchor — no emotion names."
  }
}

## Critical rules
- Literal language only — no metaphors, no similes.
- No emotion names in keyPhysicalDetail (no "scared", "anxious", "worried"; only physical observations like "shoulders rolled forward, weight back on heels").
- This page must be visually distinct from the previous and next pages (different framing OR angle OR proximity).
- Reuse environment names from the Visual Bible's environmentRegistry when applicable; don't invent new keys.
- The protagonist appearance MUST match characterAnchor verbatim — do not redescribe.`;

  return { systemPrompt, userPrompt };
}

export function buildScenePlannerRegenPrompt(
  input: ScenePlannerRegenInput,
): { systemPrompt: string; userPrompt: string } {
  const { systemPrompt, userPrompt: userPromptBase } = buildScenePlannerPrompt(
    input,
    input.pageNumber,
  );
  const prev = input.previousScenePlan;
  const feedbackBlock =
    input.feedbackNote !== null && input.feedbackNote.trim().length > 0
      ? `SPECIALIST FEEDBACK (interpret as direction for the new plan):\n"${input.feedbackNote.trim()}"`
      : `SPECIALIST DIRECTION: The previous scene plan was rejected without a written note.
Produce a meaningfully different framing — change the camera distance OR angle OR
character body position OR the visible focal detail. Do NOT replicate the previous
composition.`;

  const regenAppend = `

PREVIOUS SCENE PLAN FOR THIS PAGE (do not repeat — produce a different one):
- Title: ${JSON.stringify(prev.title)}
- Prose: ${JSON.stringify(prev.prose)}
- Emotional intent: ${JSON.stringify(prev.emotionalIntent)}
- Camera: ${JSON.stringify(prev.director.cameraSpec)}
- Lighting: ${JSON.stringify(prev.director.lightingChoice)}
- Moment: ${JSON.stringify(prev.director.moment)}

${feedbackBlock}

## Output schema (JSON)
Same as above — return a fresh scene plan JSON object for this page only.`;

  return { systemPrompt, userPrompt: userPromptBase + regenAppend };
}
