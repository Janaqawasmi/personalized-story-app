import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import type { ParsedVisualBible } from "./output-parser";

export function validateVisualBible(
  parsed: ParsedVisualBible,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];

  if (!parsed.characterSheet.trim()) reasons.push("characterSheet is empty");
  const anchorParts = parsed.characterAnchor
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parsed.characterAnchor.trim() && (anchorParts.length < 1 || anchorParts.length > 2)) {
    reasons.push("characterAnchor must be 1-2 sentences");
  }

  const n = parsed.consistencyAnchors.length;
  if (n < 3 || n > 5) {
    reasons.push(`consistencyAnchors must have length 3-5 (got ${n})`);
  }

  const envKeys = Object.keys(parsed.environmentRegistry);
  if (envKeys.length < 1) reasons.push("environmentRegistry must have at least one entry");

  for (const key of envKeys) {
    const e = parsed.environmentRegistry[key];
    if (!e || typeof e !== "object") {
      reasons.push(`environmentRegistry.${key} is invalid`);
      continue;
    }
    if (!String(e.atmosphere ?? "").trim()) {
      reasons.push(`environmentRegistry.${key}.atmosphere empty`);
    }
    if (!String(e.spatialLayout ?? "").trim()) {
      reasons.push(`environmentRegistry.${key}.spatialLayout empty`);
    }
  }

  if (!parsed.styleGuide.trim()) reasons.push("styleGuide is empty");
  if (!parsed.palette.trim()) reasons.push("palette is empty");

  if (!parsed.avoidList.length) {
    reasons.push("avoidList is empty");
  } else if (parsed.avoidList[0] !== MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID) {
    reasons.push(
      `avoidList[0] must exactly match mandated no-text string (got: ${JSON.stringify(parsed.avoidList[0])})`,
    );
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}
