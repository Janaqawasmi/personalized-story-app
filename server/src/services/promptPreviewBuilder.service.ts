// server/src/services/promptPreviewBuilder.service.ts
import { StoryBrief } from "../models/storyBrief.model";

/**
 * Builds a human-readable prompt preview from a StoryBrief and RAG context.
 * This is for preview purposes only - not sent to the LLM yet.
 */
export function buildPromptPreview(
  brief: StoryBrief,
  ragRulesText: string
): string {
  // Helper to format enum keys for display
  const formatDisplayText = (text: string): string => {
    return text.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const parts: string[] = [];

  // SYSTEM section
  parts.push("SYSTEM:");
  parts.push("You are a professional therapeutic children's story writer.");
  parts.push("");

  // THERAPEUTIC WRITING RULES (RAG)
  parts.push("THERAPEUTIC WRITING RULES (RAG):");
  parts.push(ragRulesText || "No writing rules loaded.");
  parts.push("");

  // STORY BRIEF section
  parts.push("STORY BRIEF:");
  parts.push(`Primary Topic: ${formatDisplayText(brief.storyContext.primaryTopic)}`);
  parts.push(`Situation: ${formatDisplayText(brief.storyContext.specificSituation)}`);
  parts.push(
    `Age Group: ${brief.storyContext.targetAgeRange.min}–${brief.storyContext.targetAgeRange.max} years`
  );
  parts.push(`Topic Sensitivity: ${formatDisplayText(brief.emotionalDesign.topicSensitivity)}`);
  parts.push(`Tone: ${formatDisplayText(brief.emotionalDesign.emotionalTone)}`);
  parts.push(`Complexity: ${formatDisplayText(brief.storyContext.languageComplexity)}`);
  parts.push(`Emotional Arc: ${formatDisplayText(brief.emotionalDesign.emotionalArc)}`);
  parts.push(`Peak Intensity: ${formatDisplayText(brief.emotionalDesign.peakIntensity)}`);
  
  // Emotional Goals
  if (brief.therapeuticDesign.emotionalGoals && brief.therapeuticDesign.emotionalGoals.length > 0) {
    parts.push(`Emotional Goals: ${brief.therapeuticDesign.emotionalGoals.map(goal => formatDisplayText(goal)).join(", ")}`);
  }

  // Caregiver Presence
  parts.push(`Caregiver Role: ${formatDisplayText(brief.characterDesign.caregiverRole)}`);
  
  // Ending Style
  parts.push(`Ending Style: ${formatDisplayText(brief.emotionalDesign.endingStyle)}`);
  
  // Core Message
  if (brief.therapeuticDesign.keyMessage) {
    parts.push(`Core Message: ${brief.therapeuticDesign.keyMessage}`);
  }

  return parts.join("\n");
}

