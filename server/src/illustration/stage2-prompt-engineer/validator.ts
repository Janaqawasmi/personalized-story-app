import type { StructuredPrompt } from "@/illustration/types";

export interface StructuredPromptValidation {
  ok: boolean;
  reasons: string[];
}

/** Word caps for each structured-prompt field (Stage 2 model must stay within; we clamp if it drifts). */
export const STRUCTURED_PROMPT_WORD_LIMITS: Record<keyof StructuredPrompt, number> = {
  setting: 25,
  character: 30,
  focalPoint: 10,
  composition: 20,
  lighting: 30,
};

const METAPHOR_SUBSTRINGS = ["metaphorically", " as if "] as const;

function hasStandaloneLike(s: string): boolean {
  return /\blike\b/i.test(s);
}

function hasMetaphorFlags(s: string): boolean {
  const lower = s.toLowerCase();
  for (const frag of METAPHOR_SUBSTRINGS) {
    if (lower.includes(frag)) return true;
  }
  return hasStandaloneLike(s);
}

/** Split on whitespace; drop empty segments (handles odd spacing from model output). */
function splitIntoWords(s: string): string[] {
  return s.trim().split(/\s+/u).filter((w) => w.length > 0);
}

function wordCount(s: string): number {
  return splitIntoWords(s).length;
}

/** Keep the first `maxWords` words; guarantees result has ≤ maxWords by the same counter as validation. */
function truncateToWordCount(s: string, maxWords: number): string {
  const words = splitIntoWords(s);
  if (words.length <= maxWords) {
    return s.trim();
  }
  return words.slice(0, maxWords).join(" ");
}

/** Trims each field to its word budget (first N words). Used when the Stage 2 model exceeds limits. */
export function clampStructuredPromptToWordLimits(parsed: StructuredPrompt): StructuredPrompt {
  const out = { ...parsed };
  (Object.keys(STRUCTURED_PROMPT_WORD_LIMITS) as (keyof StructuredPrompt)[]).forEach((key) => {
    const max = STRUCTURED_PROMPT_WORD_LIMITS[key];
    out[key] = truncateToWordCount(parsed[key], max);
  });
  return out;
}

export function validateStructuredPrompt(parsed: StructuredPrompt): StructuredPromptValidation {
  const reasons: string[] = [];
  (Object.keys(STRUCTURED_PROMPT_WORD_LIMITS) as (keyof StructuredPrompt)[]).forEach((key) => {
    const v = parsed[key].trim();
    if (!v) reasons.push(`empty:${key}`);
    if (wordCount(v) > STRUCTURED_PROMPT_WORD_LIMITS[key]) {
      reasons.push(`${key} exceeds ${STRUCTURED_PROMPT_WORD_LIMITS[key]} words`);
    }
    if (hasMetaphorFlags(v)) {
      reasons.push(`${key} contains disallowed figurative phrasing`);
    }
  });
  return { ok: reasons.length === 0, reasons };
}
