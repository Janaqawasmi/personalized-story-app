// src/services/storyPromptBuilder.ts
import { StoryBrief } from "../models/storyBrief.model";

export function buildStoryDraftPrompt(
  brief: StoryBrief,
  ragContext: string
): string {
  return `
You are a professional therapeutic children's story writer.

You are generating a STORY DRAFT for specialist review.
This story is NOT shown to users without approval.

IMPORTANT:
- The entire story MUST be written in ARABIC.
- Do NOT mix languages.
- Do NOT use English words inside the story text or title.

────────────────────────────────
THERAPEUTIC KNOWLEDGE (RAG)
────────────────────────────────
${ragContext}

────────────────────────────────
STORY BRIEF (HUMAN-DEFINED)
────────────────────────────────
Topic: ${brief.topicKey}
Target Age Group: ${brief.targetAgeGroup}

Therapeutic Intent:
${brief.therapeuticIntent.map(i => `- ${i}`).join("\n")}

Topic Tags:
${brief.topicTags.map(t => `- ${t}`).join("\n")}

Constraints:
${brief.constraints?.avoidMetaphors?.length
  ? `Avoid metaphors:\n${brief.constraints.avoidMetaphors.map(m => `- ${m}`).join("\n")}`
  : "- No metaphor restrictions"}

${brief.constraints?.avoidLanguage?.length
  ? `Avoid language:\n${brief.constraints.avoidLanguage.map(l => `- ${l}`).join("\n")}`
  : "- No language restrictions"}

────────────────────────────────
CRITICAL SAFETY RULES
────────────────────────────────
- The main character MUST be a HUMAN child.
- No monsters, no threatening fantasy.
- Do NOT shame, lecture, or pressure the child.
- Use {{child_name}} placeholders only.
- ALL story content MUST be written in ARABIC.

────────────────────────────────
STORY STRUCTURE
────────────────────────────────
1. Familiar setting
2. Gentle emergence of difficulty
3. Emotional validation
4. Small supportive step
5. Mild setback
6. Support and retry
7. Balance restored
8. Calm ending

────────────────────────────────
OUTPUT FORMAT (JSON ONLY)
────────────────────────────────
Return ONLY valid JSON in the following structure:

{
  "title": "string (Arabic)",
  "pages": [
    {
      "pageNumber": number,
      "text": "Arabic story text using {{child_name}} and pronoun tokens",
      "imagePrompt": "scene description for image generation (English allowed)"
    }
  ]
}

Do NOT include explanations, markdown, or text outside the JSON.
`.trim();
}
