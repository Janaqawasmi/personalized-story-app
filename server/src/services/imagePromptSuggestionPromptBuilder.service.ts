// server/src/services/imagePromptSuggestionPromptBuilder.service.ts

/**
 * Builds a prompt for generating AI suggestions for image prompt alignment.
 * 
 * @param params - Parameters for building the image prompt suggestion
 * @returns Formatted prompt string ready for LLM
 */
export function buildImagePromptSuggestionPrompt(params: {
  currentText: string;
  currentImagePrompt: string;
}): string {
  const { currentText, currentImagePrompt } = params;
  
  const sections: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: SYSTEM ROLE
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("SYSTEM ROLE");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("You are updating an image prompt for a children's story illustration.");
  sections.push("The image must visually represent the story text faithfully.");
  sections.push("Do not add new characters, events, emotions, or narrative elements.");
  sections.push("Do not rewrite the story. Only update the visual description.");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: STORY TEXT AND CURRENT PROMPT
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("STORY TEXT");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push(currentText);
  sections.push("");

  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("CURRENT IMAGE PROMPT");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push(currentImagePrompt);
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: INSTRUCTION
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("TASK");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("Align the image prompt with the story text.");
  sections.push("The updated image prompt should:");
  sections.push("- Accurately reflect the visual elements in the story text");
  sections.push("- Maintain children's illustration tone");
  sections.push("- NOT introduce new characters, events, or emotions");
  sections.push("- NOT expand or rewrite the narrative");
  sections.push("- Focus on visual composition, characters, setting, and mood");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: OUTPUT FORMAT
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("OUTPUT FORMAT (STRICT JSON)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("You MUST respond with a JSON object containing two fields:");
  sections.push("1. `suggestedImagePrompt`: A string containing the updated image prompt.");
  sections.push("2. `rationale`: A brief string (1 sentence) explaining the alignment.");
  sections.push("");
  sections.push("Example JSON output:");
  sections.push("```json");
  sections.push("{");
  sections.push(`  "suggestedImagePrompt": "A gentle scene with...",`);
  sections.push(`  "rationale": "Updated to reflect the calmer tone in the story text."`);
  sections.push("}");
  sections.push("```");
  sections.push("");
  sections.push("Do NOT include any other text or markdown outside the JSON block.");

  return sections.join("\n");
}

