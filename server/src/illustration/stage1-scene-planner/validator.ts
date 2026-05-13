import type { ParsedScenePlan } from "./output-parser";

const EMOTION_WORDS =
  /\b(scared|afraid|fear|fearful|anxious|anxiety|worried|worry|sad|angry|happy|nervous|terrified|upset)\b/i;

export function validateScenePlan(
  parsed: ParsedScenePlan,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];

  if (!parsed.title.trim()) reasons.push("title is empty");

  const prose = parsed.prose.trim();
  if (!prose) {
    reasons.push("prose is empty");
  } else {
    const periods = (prose.match(/\./g) ?? []).length;
    if (periods < 1 || periods > 4) {
      reasons.push(`prose must contain 1-4 periods as a 2-4 sentence heuristic (got ${periods})`);
    }
  }

  if (!parsed.emotionalIntent.trim()) reasons.push("emotionalIntent is empty");
  if (!parsed.keyVisibleDetail.trim()) reasons.push("keyVisibleDetail is empty");

  const d = parsed.director;
  const dirFields: [string, string][] = [
    ["moment", d.moment],
    ["cameraSpec", d.cameraSpec],
    ["lightingChoice", d.lightingChoice],
    ["visualHook", d.visualHook],
    ["keyPhysicalDetail", d.keyPhysicalDetail],
  ];
  for (const [k, v] of dirFields) {
    if (!String(v).trim()) reasons.push(`director.${k} is empty`);
  }

  if (EMOTION_WORDS.test(parsed.director.keyPhysicalDetail)) {
    reasons.push("director.keyPhysicalDetail must not name emotions");
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}
