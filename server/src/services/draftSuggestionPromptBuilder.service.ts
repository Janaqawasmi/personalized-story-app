// server/src/services/draftSuggestionPromptBuilder.service.ts
import { StoryBrief } from "../models/storyBrief.model";

/**
 * Helper: Format enum key to readable text
 * Converts underscores to spaces and capitalizes words
 */
function formatDisplayText(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Builds a prompt for generating AI suggestions for draft edits.
 * 
 * @param params - Parameters for building the suggestion prompt
 * @returns Formatted prompt string ready for LLM
 */
export function buildDraftSuggestionPrompt(params: {
  language: "ar" | "he";
  ragRulesText: string;
  brief: StoryBrief;
  pageNumber?: number;
  originalText: string;
  instruction: string;
}): string {
  const { language, ragRulesText, brief, pageNumber, originalText, instruction } = params;
  
  const sections: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: SYSTEM ROLE
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("SYSTEM ROLE");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("You are a professional therapeutic children's story editor.");
  sections.push("You provide suggestions to specialists for improving story drafts.");
  sections.push("Your suggestions must maintain therapeutic safety and intent.");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: NON-NEGOTIABLE THERAPEUTIC RULES (RAG)
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("NON-NEGOTIABLE THERAPEUTIC RULES");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  if (ragRulesText && ragRulesText.trim()) {
    sections.push(ragRulesText);
  } else {
    sections.push("No specific writing rules provided.");
  }
  sections.push("");
  sections.push("These rules are MANDATORY. If the instruction conflicts with these rules,");
  sections.push("you MUST comply with the rules and explain the conflict in your rationale.");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: STORY CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("STORY CONTEXT");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("Primary Topic: " + formatDisplayText(brief.storyContext.primaryTopic));
  sections.push("Specific Situation: " + formatDisplayText(brief.storyContext.specificSituation));
  sections.push(
    "Age Group: " +
      `${brief.storyContext.targetAgeRange.min}–${brief.storyContext.targetAgeRange.max} years`
  );
  sections.push("Topic Sensitivity: " + formatDisplayText(brief.emotionalDesign.topicSensitivity));
  sections.push("Language Complexity: " + formatDisplayText(brief.storyContext.languageComplexity));
  sections.push("Emotional Tone: " + formatDisplayText(brief.emotionalDesign.emotionalTone));
  sections.push("Emotional Arc: " + formatDisplayText(brief.emotionalDesign.emotionalArc));
  sections.push("Peak Intensity: " + formatDisplayText(brief.emotionalDesign.peakIntensity));
  
  if (brief.therapeuticDesign.emotionalGoals && brief.therapeuticDesign.emotionalGoals.length > 0) {
    sections.push("Emotional Goals: " + brief.therapeuticDesign.emotionalGoals.map(g => formatDisplayText(g)).join(", "));
  }
  
  if (brief.characterDesign.caregiverRole) {
    sections.push("Caregiver Role: " + formatDisplayText(brief.characterDesign.caregiverRole));
  }
  
  sections.push("Ending Style: " + formatDisplayText(brief.emotionalDesign.endingStyle));
  
  if (brief.therapeuticDesign.keyMessage) {
    sections.push("Core Message: " + brief.therapeuticDesign.keyMessage);
  }
  
  if (pageNumber !== undefined) {
    sections.push(`Page Number: ${pageNumber}`);
  }
  
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: EDIT REQUEST
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("EDIT REQUEST");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("ORIGINAL TEXT:");
  sections.push(originalText);
  sections.push("");
  sections.push("SPECIALIST INSTRUCTION:");
  sections.push(instruction);
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: OUTPUT CONTRACT (STRICT JSON)
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("OUTPUT FORMAT (STRICT JSON)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("You MUST return ONLY valid JSON in this exact format:");
  sections.push("{");
  sections.push('  "suggestedText": "string",');
  sections.push('  "rationale": "string"');
  sections.push("}");
  sections.push("");
  sections.push("REQUIREMENTS:");
  sections.push("- suggestedText: The improved text following the instruction");
  sections.push("- rationale: A brief explanation (1-2 sentences) of why you made this suggestion");
  sections.push("");
  sections.push("CONSTRAINTS:");
  sections.push(`- Language: ${language === "ar" ? "Arabic (Modern Standard Arabic)" : "Hebrew"}`);
  sections.push("- Preserve {{child_name}} placeholders exactly as they appear");
  sections.push("- Maintain the same therapeutic intent and meaning");
  sections.push("- Do NOT add moralizing, threats, shaming, or direct advice");
  sections.push("- Do NOT violate any therapeutic rules");
  sections.push("- Keep the suggested text within reasonable length (similar to original)");
  sections.push("");
  sections.push("IMPORTANT:");
  sections.push("- If the instruction conflicts with therapeutic rules, comply with rules");
  sections.push("- Explain any conflicts or limitations in the rationale");
  sections.push("- Return ONLY the JSON object, no markdown, no code blocks, no explanations");
  sections.push("");

  return sections.join("\n");
}

