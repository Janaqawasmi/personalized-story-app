// server/src/services/promptPreviewBuilder.service.ts
import { StoryBrief } from "../models/storyBrief.model";
import { formatAgeGroupLabel } from "../data/categories";

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
  parts.push(`Primary Topic: ${formatDisplayText(brief.therapeuticFocus.primaryTopic)}`);
  parts.push(`Situation: ${formatDisplayText(brief.therapeuticFocus.specificSituation)}`);
  parts.push(`Age Group: ${formatAgeGroupLabel(brief.childProfile.ageGroup)}`);
  parts.push(`Emotional Sensitivity: ${formatDisplayText(brief.childProfile.emotionalSensitivity)}`);
  parts.push(`Tone: ${formatDisplayText(brief.languageTone.emotionalTone)}`);
  parts.push(`Complexity: ${formatDisplayText(brief.languageTone.complexity)}`);
  
  // Emotional Goals
  if (brief.therapeuticIntent.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0) {
    parts.push(`Emotional Goals: ${brief.therapeuticIntent.emotionalGoals.map(goal => formatDisplayText(goal)).join(", ")}`);
  }

  // Caregiver Presence
  parts.push(`Caregiver Presence: ${formatDisplayText(brief.storyPreferences.caregiverPresence)}`);
  
  // Ending Style
  parts.push(`Ending Style: ${formatDisplayText(brief.storyPreferences.endingStyle)}`);
  
  // Core Message
  if (brief.therapeuticIntent.keyMessage) {
    parts.push(`Core Message: ${brief.therapeuticIntent.keyMessage}`);
  }

  return parts.join("\n");
}

