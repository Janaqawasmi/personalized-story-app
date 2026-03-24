// server/src/services/contractPromptBuilder.ts
//
// Builds the LLM prompt from an approved GenerationContract.
// Replaces storyPromptBuilder.ts as the prompt source for story generation.

import type { GenerationContract } from "../models/generationContract.model";

function formatDisplayText(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Builds a production-grade, deterministic prompt for LLM story generation
 * using the approved Generation Contract as the single source of truth.
 *
 * Prompt architecture (3 sections):
 *   1. System Role
 *   2. Generation Contract Data (context fields)
 *   3. Output Contract (structure, format, clinical constraints)
 */
export function buildPromptFromContract(
  contract: GenerationContract,
): string {
  const s: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: SYSTEM ROLE
  // ─────────────────────────────────────────────────────────────────────────
  s.push("═══════════════════════════════════════════════════════════");
  s.push("SYSTEM ROLE");
  s.push("═══════════════════════════════════════════════════════════");
  s.push("");
  s.push("You are a professional therapeutic children's story writer.");
  s.push("Your role is to generate structured story drafts for specialist review.");
  s.push("This story is NOT shown to users without approval.");
  s.push("Your output must be safe, therapeutically sound, and emotionally gentle.");
  s.push("You may be creative ONLY in storytelling details.");
  s.push("You must NOT be creative with therapeutic rules, safety constraints, structure, or output format.");
  s.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: GENERATION CONTRACT DATA
  // ─────────────────────────────────────────────────────────────────────────
  s.push("═══════════════════════════════════════════════════════════");
  s.push("GENERATION CONTRACT DATA");
  s.push("═══════════════════════════════════════════════════════════");
  s.push("");
  s.push(`Primary Topic: ${formatDisplayText(contract.topic)}`);
  s.push(`Specific Situation: ${formatDisplayText(contract.situation)}`);
  s.push(`Age Band: ${formatDisplayText(contract.ageBand)}`);
  s.push(`Emotional Sensitivity: ${formatDisplayText(contract.emotionalSensitivity)}`);
  s.push(`Language Complexity: ${formatDisplayText(contract.styleRules.languageComplexity)}`);
  s.push(`Emotional Tone: ${formatDisplayText(contract.styleRules.emotionalTone)}`);
  s.push(`Caregiver Presence: ${formatDisplayText(contract.caregiverPresence)}`);
  s.push(`Ending Style: ${formatDisplayText(contract.endingContract.endingStyle)}`);

  if (contract.keyMessage) {
    s.push(`Core Message: ${contract.keyMessage}`);
  }
  s.push("");

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: OUTPUT CONTRACT (STRUCTURE, FORMAT & CLINICAL CONSTRAINTS)
  // ─────────────────────────────────────────────────────────────────────────
  const minScenes = contract.lengthBudget.minScenes;
  const maxScenes = contract.lengthBudget.maxScenes;
  const maxWords = contract.lengthBudget.maxWords;
  const targetWords = contract.lengthBudget.targetWords;

  s.push("═══════════════════════════════════════════════════════════");
  s.push("OUTPUT CONTRACT (STRUCTURE, FORMAT & CLINICAL CONSTRAINTS)");
  s.push("═══════════════════════════════════════════════════════════");
  s.push("");

  // 4a — Length Budget
  s.push("LENGTH BUDGET:");
  s.push(`  - Minimum scenes (pages): ${minScenes}`);
  s.push(`  - Maximum scenes (pages): ${maxScenes}`);
  s.push(`  - Maximum total words: ${maxWords}`);
  if (targetWords) {
    s.push(`  - Target total words: ${targetWords}`);
  }
  s.push("");

  // 4b — Required Elements
  if (contract.requiredElements.length > 0) {
    s.push("REQUIRED STORY ELEMENTS (mandatory — the story MUST include every one):");
    for (const el of contract.requiredElements) {
      s.push(`  • ${el}`);
    }
    s.push("");
  }

  // 4c — Coping Tool (single tool selected by specialist)
  if (contract.allowedCopingTools.length > 0) {
    const tool = contract.allowedCopingTools[0];
    if (tool) {
      s.push("COPING TOOL (use this tool in the story — weave it naturally into the narrative):");
      s.push(`  ${formatDisplayText(tool)}`);
      s.push("");
    }
  }

  // 4d — Must-Avoid Patterns
  if (contract.mustAvoid.length > 0) {
    s.push("MUST-AVOID PATTERNS (the story must NEVER include — directly, indirectly, symbolically, or metaphorically):");
    for (const item of contract.mustAvoid) {
      s.push(`  ✗ ${item}`);
    }
    s.push("");
  }

  // 4e — Style Rules
  s.push("STYLE RULES:");
  s.push(`  - Maximum words per sentence: ${contract.styleRules.maxSentenceWords}`);
  s.push(`  - Dialogue policy: ${contract.styleRules.dialoguePolicy}`);
  s.push(`  - Abstract concepts: ${contract.styleRules.abstractConcepts}`);
  s.push("");

  // 4f — Ending Contract
  s.push("ENDING CONTRACT:");
  s.push(`  - Ending style: ${formatDisplayText(contract.endingContract.endingStyle)}`);
  if (contract.endingContract.mustInclude.length > 0) {
    s.push("  - Ending MUST include:");
    for (const inc of contract.endingContract.mustInclude) {
      s.push(`      • ${inc}`);
    }
  }
  if (contract.endingContract.mustAvoid.length > 0) {
    s.push("  - Ending must NOT include:");
    for (const av of contract.endingContract.mustAvoid) {
      s.push(`      ✗ ${av}`);
    }
  }
  s.push(`  - Requires emotional stability: ${contract.endingContract.requiresEmotionalStability ? "YES" : "NO"}`);
  s.push(`  - Requires success moment: ${contract.endingContract.requiresSuccessMoment ? "YES" : "NO"}`);
  s.push(`  - Requires safe closure: ${contract.endingContract.requiresSafeClosure ? "YES" : "NO"}`);
  s.push("");

  // 4g — JSON Output Format
  s.push("REQUIRED OUTPUT FORMAT:");
  s.push("");
  s.push("1. Output MUST be valid JSON only. No markdown, no explanations, no text outside JSON.");
  s.push("");
  s.push("2. JSON Structure:");
  s.push("   {");
  s.push('     "title": "string (English only, 2-6 words, no punctuation, no emojis, no subtitles)",');
  s.push('     "pages": [');
  s.push("       {");
  s.push('         "pageNumber": number (1-based, sequential),');
  s.push('         "text": "string (English only, use {{child_name}} placeholder)",');
  s.push('         "emotionalTone": "string (MUST be exactly one of: gentle | reassuring | calm - no other values allowed)"');
  s.push("       }");
  s.push("     ]");
  s.push("   }");
  s.push("");
  s.push("IMPORTANT CONSTRAINTS:");
  s.push("- Title: English only, 2-6 words, no punctuation, no emojis, no subtitles");
  s.push("- emotionalTone: MUST be exactly one of: gentle | reassuring | calm");
  s.push("  DO NOT invent new emotionalTone values. Use only the three values listed above.");
  s.push(`- Page count MUST be between ${minScenes} and ${maxScenes} pages.`);
  s.push(`- Total word count across all pages MUST NOT exceed ${maxWords} words.`);
  s.push("");
  s.push("3. PAGE REQUIREMENTS:");
  s.push("   - Each page MUST include: pageNumber, text, emotionalTone");
  s.push("   - Use {{child_name}} placeholder in text (never actual names)");
  s.push("   - All story text MUST be in English");
  s.push("");
  s.push("4. EMOTIONAL PROGRESSION:");
  s.push("   - Early pages (first 25%): Familiar setting, emotional safety");
  s.push("   - Middle pages (middle 50%): Gentle emergence of difficulty and emotional validation");
  s.push("   - Final pages (last 25%): Support, reassurance, calm resolution");
  s.push("");
  s.push("5. STORY STRUCTURE:");
  if (contract.caregiverPresence === "included") {
    s.push("   - Caregiver presence is included: show emotional support through presence, tone, and proximity (not advice)");
  } else {
    s.push("   - Self-guided: show reassurance through environment and internal calm");
  }
  s.push("");
  s.push("6. LANGUAGE CONSTRAINTS:");
  s.push("   - Story text: English ONLY");
  s.push("   - Title: English ONLY");
  s.push("   - Use clear, simple English suitable for young children");
  s.push("   - Use standard English, avoid complex vocabulary or overly formal language");
  s.push("");
  s.push("CRITICAL LANGUAGE RULE:");
  s.push("If Arabic or other languages appear, revise silently and re-output once.");
  s.push("Repeat self-verification and revise silently until ALL checks pass.");
  s.push("");

  return s.join("\n").trim();
}
