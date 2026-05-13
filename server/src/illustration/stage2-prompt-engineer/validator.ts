import type { StructuredPrompt } from "@/illustration/types";

export interface StructuredPromptValidation {
  ok: boolean;
  reasons: string[];
}

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

function wordCount(s: string): number {
  return s.trim().length === 0 ? 0 : s.trim().split(/\s+/).length;
}

export function validateStructuredPrompt(parsed: StructuredPrompt): StructuredPromptValidation {
  const reasons: string[] = [];
  const limits: Record<keyof StructuredPrompt, number> = {
    setting: 25,
    character: 30,
    focalPoint: 10,
    composition: 20,
    lighting: 30,
  };
  (Object.keys(limits) as (keyof StructuredPrompt)[]).forEach((key) => {
    const v = parsed[key].trim();
    if (!v) reasons.push(`empty:${key}`);
    if (wordCount(v) > limits[key]) {
      reasons.push(`${key} exceeds ${limits[key]} words`);
    }
    if (hasMetaphorFlags(v)) {
      reasons.push(`${key} contains disallowed figurative phrasing`);
    }
  });
  return { ok: reasons.length === 0, reasons };
}
