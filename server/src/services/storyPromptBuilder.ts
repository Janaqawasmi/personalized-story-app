// src/services/storyPromptBuilder.ts
import { StoryBrief } from "../models/storyBrief.model";
import { formatAgeGroupLabel } from "../data/categories";

/**
 * Helper: Format enum key to readable text
 * Converts underscores to spaces and capitalizes words
 */
function formatDisplayText(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Helper: Derive page count from age group (default heuristic)
 */
function derivePageCount(ageGroup: string): number {
  // Always return 10 pages for all stories
  return 10;
}

/**
 * Builds a production-grade, deterministic prompt for LLM story generation.
 * Follows strict 5-section prompt architecture for therapeutic story creation.
 * 
 * @param brief - StoryBrief containing all therapeutic parameters
 * @param ragContext - Therapeutic writing rules from RAG (mandatory constraints)
 * @returns Formatted prompt string ready for LLM
 */
export function buildStoryDraftPrompt(
  brief: StoryBrief,
  ragContext: string
): string {
  const sections: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: SYSTEM ROLE
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("SYSTEM ROLE");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("You are a professional therapeutic children's story writer.");
  sections.push("Your role is to generate structured story drafts for specialist review.");
  sections.push("This story is NOT shown to users without approval.");
  sections.push("Your output must be safe, therapeutically sound, and emotionally gentle.");
  sections.push("You may be creative ONLY in storytelling details.");
  sections.push("You must NOT be creative with therapeutic rules, safety constraints, structure, or output format.");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: NON-NEGOTIABLE THERAPEUTIC RULES (RAG)
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("NON-NEGOTIABLE THERAPEUTIC RULES (RAG)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  if (ragContext && ragContext.trim()) {
    sections.push("The following rules are MANDATORY. Do not violate, reinterpret, or soften them:");
    sections.push("");
    sections.push(ragContext);
  } else {
    sections.push("No therapeutic writing rules were loaded. Proceed with maximum caution.");
    sections.push("Apply standard therapeutic storytelling principles.");
  }
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: STORY BRIEF (FACTUAL DATA ONLY)
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("STORY BRIEF (FACTUAL DATA ONLY)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push(`Primary Topic: ${formatDisplayText(brief.therapeuticFocus.primaryTopic)}`);
  sections.push(`Specific Situation: ${formatDisplayText(brief.therapeuticFocus.specificSituation)}`);
  sections.push(`Age Group: ${formatAgeGroupLabel(brief.childProfile.ageGroup)}`);
  sections.push(`Emotional Sensitivity: ${formatDisplayText(brief.childProfile.emotionalSensitivity)}`);
  sections.push(`Language Complexity: ${formatDisplayText(brief.languageTone.complexity)}`);
  sections.push(`Emotional Tone: ${formatDisplayText(brief.languageTone.emotionalTone)}`);
  
  if (brief.therapeuticIntent.emotionalGoals && brief.therapeuticIntent.emotionalGoals.length > 0) {
    sections.push(`Emotional Goals: ${brief.therapeuticIntent.emotionalGoals.map(goal => formatDisplayText(goal)).join(", ")}`);
  } else {
    sections.push(`Emotional Goals: None specified`);
  }
  
  sections.push(`Caregiver Presence: ${formatDisplayText(brief.storyPreferences.caregiverPresence)}`);
  sections.push(`Ending Style: ${formatDisplayText(brief.storyPreferences.endingStyle)}`);
  
  if (brief.therapeuticIntent.keyMessage) {
    sections.push(`Core Message: ${brief.therapeuticIntent.keyMessage}`);
  }
  
  if (brief.safetyConstraints.exclusions && brief.safetyConstraints.exclusions.length > 0) {
    sections.push(`Safety Exclusions: ${brief.safetyConstraints.exclusions.map(exclusion => formatDisplayText(exclusion)).join(", ")}`);
  }
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: OUTPUT CONTRACT (STRUCTURE & FORMAT)
  // ─────────────────────────────────────────────────────────────────────────
  const pageCount = derivePageCount(brief.childProfile.ageGroup);
  
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("OUTPUT CONTRACT (STRUCTURE & FORMAT)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("REQUIRED OUTPUT STRUCTURE:");
  sections.push("");
  sections.push("1. Output MUST be valid JSON only. No markdown, no explanations, no text outside JSON.");
  sections.push("");
  sections.push("2. JSON Structure:");
  sections.push("   {");
  sections.push('     "title": "string (English only, 2-6 words, no punctuation, no emojis, no subtitles)",');
  sections.push('     "pages": [');
  sections.push("       {");
  sections.push('         "pageNumber": number (1-based, sequential),');
  sections.push('         "text": "string (English only, use {{child_name}} placeholder)",');
  sections.push('         "emotionalTone": "string (MUST be exactly one of: gentle | reassuring | calm - no other values allowed)",');
  sections.push('         "imagePrompt": "string (English allowed for image generation)"');
  sections.push("       }");
  sections.push("     ]");
  sections.push("   }");
  sections.push("");
  sections.push("IMPORTANT CONSTRAINTS:");
  sections.push("- Title: English only, 2-6 words, no punctuation, no emojis, no subtitles");
  sections.push("- emotionalTone: MUST be exactly one of: gentle | reassuring | calm");
  sections.push("  DO NOT invent new emotionalTone values. Use only the three values listed above.");
  sections.push("- All stories are exactly 10 pages.");
  sections.push("");
  sections.push(`3. EXACT PAGE COUNT: ${pageCount} pages (no more, no less).`);
  sections.push("");
  sections.push("4. PAGE REQUIREMENTS:");
  sections.push(`   - Total pages: ${pageCount}`);
  sections.push("   - Each page MUST include: pageNumber, text, emotionalTone, imagePrompt");
  sections.push("   - Use {{child_name}} placeholder in text (never actual names)");
  sections.push("   - All story text MUST be in English");
  sections.push("");
  sections.push("IMAGE PROMPT RULES:");
  sections.push("   - Must visually match the emotional tone of the page");
  sections.push("   - Must depict realistic, safe, non-threatening scenes");
  sections.push("   - No fantasy, no exaggeration, no symbolic fear imagery");
  sections.push("   - Focus on environment, body language, and gentle expressions");
  sections.push("   - Image prompts can be in English for technical clarity");
  sections.push("");
  sections.push("5. EMOTIONAL PROGRESSION:");
  sections.push("   - Early pages (first 25%): Familiar setting, emotional safety");
  sections.push("   - Middle pages (middle 50%): Gentle emergence of difficulty and emotional validation");
  sections.push("   - Final pages (last 25%): Support, reassurance, calm resolution");
  sections.push("");
  sections.push("6. STORY STRUCTURE:");
  if (brief.storyPreferences.caregiverPresence === "included") {
    sections.push("   - If caregiver presence is included: show emotional support through presence, tone, and proximity (not advice)");
  } else {
    sections.push("   - If self-guided: show reassurance through environment and internal calm");
  }
  sections.push("");
  sections.push("7. LANGUAGE CONSTRAINTS:");
  sections.push("   - Story text: English ONLY");
  sections.push("   - Title: English ONLY");
  sections.push("   - Use clear, simple English suitable for young children");
  sections.push("   - Use standard English, avoid complex vocabulary or overly formal language");
  sections.push("   - Image prompts: English (for technical clarity)");
  sections.push("");
  sections.push("CRITICAL LANGUAGE RULE:");
  sections.push("If Arabic or other languages appear, revise silently and re-output once.");
  sections.push("Repeat self-verification and revise silently until ALL checks pass.");
  sections.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: QUALITY CHECKLIST (SELF-VERIFICATION)
  // ─────────────────────────────────────────────────────────────────────────
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("QUALITY CHECKLIST (SELF-VERIFICATION)");
  sections.push("═══════════════════════════════════════════════════════════");
  sections.push("");
  sections.push("Before finalizing your output, verify ALL of the following:");
  sections.push("");
  sections.push("✓ THERAPEUTIC RULES COMPLIANCE:");
  sections.push("  - All RAG rules have been followed without violation");
  sections.push("  - No rule reinterpretation or softening");
  sections.push("");
  sections.push("✓ SAFETY VALIDATION:");
  sections.push("  - Main character is a HUMAN child (not an animal or fantasy creature)");
  sections.push("  - No monsters, no threatening imagery, no frightening fantasy");
  sections.push("  - No shame language, no moralizing, no lecturing");
  sections.push("  - No pressure or correction directed at the child");
  sections.push("  - No advice-giving language (e.g., \"should\", \"must\", \"learned to\", \"decided to\")");
  sections.push("  - No teaching, lessons, or moral conclusions");
  sections.push("  - Support is shown through presence and reassurance, not instruction");
  sections.push("  - Safety exclusions must not appear directly, indirectly, symbolically, or metaphorically");
  sections.push("");
  sections.push("✓ AGE-APPROPRIATE LANGUAGE:");
  sections.push(`  - Language complexity matches: ${formatDisplayText(brief.languageTone.complexity)}`);
  sections.push(`  - Appropriate for age group: ${formatAgeGroupLabel(brief.childProfile.ageGroup)}`);
  sections.push("  - Vocabulary is developmentally appropriate");
  sections.push("");
  sections.push("✓ EMOTIONAL VALIDATION (NOT FIXING):");
  sections.push("  - Emotions are validated, not solved or fixed");
  sections.push("  - Emotional tone progresses: gentle → reassuring → calm");
  sections.push(`  - Matches requested emotional tone: ${formatDisplayText(brief.languageTone.emotionalTone)}`);
  sections.push(`  - Respects emotional sensitivity: ${formatDisplayText(brief.childProfile.emotionalSensitivity)}`);
  sections.push("");
  sections.push("✓ STORY STRUCTURE:");
  sections.push("  - Familiar setting established");
  sections.push("  - Difficulty emerges gently");
  sections.push("  - Emotional validation present");
  sections.push("  - Small supportive steps included");
  sections.push("  - Mild setbacks handled appropriately");
  sections.push(`  - Ending style matches: ${formatDisplayText(brief.storyPreferences.endingStyle)}`);
  sections.push("  - Calm, non-threatening resolution");
  if (brief.storyPreferences.caregiverPresence === "included") {
    sections.push("  - Caregiver presence: emotional support shown through presence, tone, and proximity (not advice)");
  } else {
    sections.push("  - Self-guided: reassurance shown through environment and internal calm");
  }
  sections.push("");
  sections.push("✓ TECHNICAL REQUIREMENTS:");
  sections.push(`  - Exactly ${pageCount} pages in the output`);
  sections.push("  - Valid JSON structure");
  sections.push("  - All required fields present (pageNumber, text, emotionalTone, imagePrompt)");
  sections.push("  - Title: English only, 2-6 words, no punctuation, no emojis, no subtitles");
  sections.push("  - emotionalTone values are ONLY: gentle, reassuring, or calm (no other values)");
  sections.push("  - Story text is English only");
  sections.push("  - {{child_name}} placeholders used (no actual names)");
  sections.push("");
  sections.push("IF ANY CHECK FAILS:");
  sections.push("  - Revise the story silently");
  sections.push("  - Do not explain your revisions");
  sections.push("  - Output only the corrected JSON");
  sections.push("  - Ensure all checks pass before finalizing");
  sections.push("");

  return sections.join("\n").trim();
}
