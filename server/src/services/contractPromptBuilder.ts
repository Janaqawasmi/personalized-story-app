// server/src/services/contractPromptBuilder.ts
//
// Builds the LLM prompt from an approved GenerationContract.
// Replaces storyPromptBuilder.ts as the prompt source for story generation.

import type { GenerationContract } from "../models/generationContract.model";

function formatDisplayText(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatList(items: string[]): string {
  if (!items || items.length === 0) return "[]";
  return `[${items.join(", ")}]`;
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
  const minPages = contract.lengthBudget.minScenes;
  const maxPages = contract.lengthBudget.maxScenes;
  const maxWords = contract.lengthBudget.maxWords;
  const targetWords = contract.lengthBudget.targetWords;
  const copingTool = contract.allowedCopingTools[0];

  s.push("=== ROLE ===");
  s.push("");
  s.push("You are a therapeutic children's story writer.");
  s.push("Generate a draft for specialist review.");
  s.push("Follow hard constraints exactly.");
  s.push("Output JSON only.");
  s.push("");

  s.push("=== CONTRACT INPUTS (single source of truth) ===");
  s.push("");
  s.push("NARRATIVE ANCHORS:");
  s.push(`- topic: ${formatDisplayText(contract.topic)}`);
  s.push(`- situation: ${formatDisplayText(contract.situation)}`);
  s.push(`- ageBand: ${formatDisplayText(contract.ageBand)}`);
  s.push(`- caregiverRole: ${formatDisplayText(contract.caregiverRole)}`);
  s.push(`- keyMessage: ${contract.keyMessage ? contract.keyMessage : "none"}`);
  s.push("");
  s.push("DERIVED CLINICAL INSTRUCTIONS (already mapped from brief + rules):");
  s.push(`- copingTool: ${copingTool ? formatDisplayText(copingTool) : "none"}`);
  s.push(`requiredElements: ${formatList(contract.requiredElements)}`);
  s.push(`mustAvoid: ${formatList(contract.mustAvoid)}`);
  s.push(`lengthBudget.minPages: ${minPages}`);
  s.push(`lengthBudget.maxPages: ${maxPages}`);
  s.push(`lengthBudget.maxWords: ${maxWords}`);
  if (targetWords) s.push(`lengthBudget.targetWords: ${targetWords}`);
  s.push(`styleRules.languageComplexity: ${formatDisplayText(contract.styleRules.languageComplexity)}`);
  s.push(`styleRules.emotionalTone: ${formatDisplayText(contract.styleRules.emotionalTone)}`);
  s.push(`styleRules.maxSentenceWords: ${contract.styleRules.maxSentenceWords}`);
  s.push(`styleRules.dialoguePolicy: ${contract.styleRules.dialoguePolicy}`);
  s.push(`styleRules.abstractConcepts: ${contract.styleRules.abstractConcepts}`);
  s.push(`endingContract.endingStyle: ${formatDisplayText(contract.endingContract.endingStyle)}`);
  s.push(`endingContract.mustInclude: ${formatList(contract.endingContract.mustInclude)}`);
  s.push(`endingContract.mustAvoid: ${formatList(contract.endingContract.mustAvoid)}`);
  s.push(`endingContract.requiresEmotionalStability: ${contract.endingContract.requiresEmotionalStability}`);
  s.push(`endingContract.requiresSuccessMoment: ${contract.endingContract.requiresSuccessMoment}`);
  s.push(`endingContract.requiresSafeClosure: ${contract.endingContract.requiresSafeClosure}`);
  s.push("");

  s.push("=== OUTPUT CONTRACT ===");
  s.push("");
  s.push("OUTPUT SCHEMA (strict):");
  s.push("");
  s.push("   {");
  s.push('     "title": "string",');
  s.push('     "pages": [');
  s.push("       {");
  s.push('         "pageNumber": number (1-based, sequential),');
  s.push('         "text": "string",');
  s.push('         "emotionalTone": "gentle | reassuring | calm"');
  s.push("       }");
  s.push("     ]");
  s.push("   }");
  s.push("");
  s.push("HARD CONSTRAINTS (must pass):");
  s.push("1) Return valid JSON only. No markdown, no extra prose.");
  s.push(`2) Page count: between ${minPages} and ${maxPages}.`);
  s.push(`3) Total words across all pages: <= ${maxWords}.`);
  if (targetWords) s.push(`4) Aim for target words: ${targetWords}.`);
  s.push("5) Every page must include pageNumber, text, emotionalTone.");
  s.push("6) emotionalTone must be exactly one of: gentle, reassuring, calm.");
  s.push(`7) Language complexity target: ${formatDisplayText(contract.styleRules.languageComplexity)}.`);
  s.push(`8) Emotional tone target: ${formatDisplayText(contract.styleRules.emotionalTone)}.`);
  s.push(`9) Max words per sentence: ${contract.styleRules.maxSentenceWords}.`);
  s.push("10) Include all requiredElements from the contract.");
  s.push("11) Do not include any mustAvoid item (directly or indirectly).");
  if (copingTool) {
    s.push(`12) Integrate this coping tool naturally at least once: ${formatDisplayText(copingTool)}.`);
  }
  s.push("13) Ending must satisfy endingContract requirements.");
  s.push(`    - endingStyle: ${formatDisplayText(contract.endingContract.endingStyle)}`);
  s.push(`    - requiresEmotionalStability: ${contract.endingContract.requiresEmotionalStability}`);
  s.push(`    - requiresSuccessMoment: ${contract.endingContract.requiresSuccessMoment}`);
  s.push(`    - requiresSafeClosure: ${contract.endingContract.requiresSafeClosure}`);
  if (contract.endingContract.mustInclude.length > 0) {
    s.push(`    - ending must include: ${contract.endingContract.mustInclude.join(", ")}`);
  }
  if (contract.endingContract.mustAvoid.length > 0) {
    s.push(`    - ending must avoid: ${contract.endingContract.mustAvoid.join(", ")}`);
  }
  s.push("14) Dialogue policy:");
  s.push("    - none: no direct quoted dialogue.");
  s.push("    - minimal: very limited direct dialogue.");
  s.push("    - allowed: dialogue is permitted.");
  s.push(`    Current policy: ${contract.styleRules.dialoguePolicy}`);
  s.push("15) Abstract concepts policy:");
  s.push("    - no: avoid abstract explanations.");
  s.push("    - limited: only simple concrete references.");
  s.push("    - yes: abstract language allowed if age-appropriate.");
  s.push(`    Current policy: ${contract.styleRules.abstractConcepts}`);
  s.push("");
  s.push("SOFT QUALITY TARGETS:");
  s.push("- Maintain a gentle emotional arc from start to ending.");
  s.push("- Keep scenes concrete, grounded, and psychologically safe.");
  s.push("- Keep language natural and easy to read aloud.");
  s.push("- Align narrative details with topic, situation, and keyMessage.");
  s.push("");

  return s.join("\n").trim();
}
