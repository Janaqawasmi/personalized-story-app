import type { EnvironmentEntry } from "@/illustration/types";

export interface ParsedVisualBible {
  characterSheet: string;
  characterAnchor: string;
  styleGuide: string;
  consistencyAnchors: string[];
  environmentRegistry: Record<string, EnvironmentEntry>;
  palette: string;
  avoidList: string[];
}

export class VisualBibleParseError extends Error {
  readonly rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = "VisualBibleParseError";
    this.rawText = rawText;
  }
}

export function parseVisualDirectorOutput(raw: string): ParsedVisualBible {
  const trimmed = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new VisualBibleParseError("Response was not valid JSON", raw);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new VisualBibleParseError("JSON root must be an object", raw);
  }
  const o = parsed as Record<string, unknown>;
  return {
    characterSheet: String(o.characterSheet ?? ""),
    characterAnchor: String(o.characterAnchor ?? ""),
    styleGuide: String(o.styleGuide ?? ""),
    consistencyAnchors: Array.isArray(o.consistencyAnchors)
      ? o.consistencyAnchors.map((x) => String(x))
      : [],
    environmentRegistry:
      o.environmentRegistry && typeof o.environmentRegistry === "object"
        ? (o.environmentRegistry as Record<string, EnvironmentEntry>)
        : {},
    palette: String(o.palette ?? ""),
    avoidList: Array.isArray(o.avoidList) ? o.avoidList.map((x) => String(x)) : [],
  };
}
