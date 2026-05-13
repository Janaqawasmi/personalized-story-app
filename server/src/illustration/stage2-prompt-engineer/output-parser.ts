import type { StructuredPrompt } from "@/illustration/types";

export class PromptEngineerParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptEngineerParseError";
  }
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

export function parsePromptEngineerOutput(text: string): StructuredPrompt {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new PromptEngineerParseError("Expected valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new PromptEngineerParseError("Expected JSON object");
  }
  const o = parsed as Record<string, unknown>;
  const keys = ["setting", "character", "focalPoint", "composition", "lighting"] as const;
  for (const k of keys) {
    if (typeof o[k] !== "string" || !(o[k] as string).trim()) {
      throw new PromptEngineerParseError(`Missing or empty field: ${k}`);
    }
  }
  const out: StructuredPrompt = {
    setting: (o.setting as string).trim(),
    character: (o.character as string).trim(),
    focalPoint: (o.focalPoint as string).trim(),
    composition: (o.composition as string).trim(),
    lighting: (o.lighting as string).trim(),
  };
  for (const k of keys) {
    if (hasMetaphorFlags(out[k])) {
      throw new PromptEngineerParseError(`Metaphor or figurative language in ${k}`);
    }
  }
  return out;
}
