import { randomUUID } from "crypto";
import type { EnvironmentEntry } from "@/illustration/types/visual-bible";
import type { FinalPromptArtefact, ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";

const CLOSE_FRAMING_RE = /close.?up|extreme close|detail shot|tight frame|macro/i;
const CHAR_COUNT_WARNING_THRESHOLD = 900;

/** Match `setting` text from Stage 2 to a Visual Bible registry entry so spatial layout can be injected verbatim. */
export function resolveEnvironmentEntry(
  setting: string,
  registry: Record<string, EnvironmentEntry>,
): EnvironmentEntry | null {
  const trimmed = setting.trim();
  if (!trimmed || Object.keys(registry).length === 0) {
    return null;
  }

  const firstSegment =
    trimmed.split("|")[0]?.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? trimmed;

  if (registry[firstSegment]) {
    return registry[firstSegment]!;
  }

  const normalized = firstSegment.toLowerCase().replace(/\s+/g, "_");
  if (registry[normalized]) {
    return registry[normalized]!;
  }

  const lower = trimmed.toLowerCase();
  let bestKey: string | null = null;
  let bestLen = -1;
  for (const key of Object.keys(registry)) {
    const kl = key.toLowerCase();
    if (!kl.length) continue;
    if (lower.startsWith(kl)) {
      const rest = lower.slice(kl.length);
      if (rest.length === 0 || /^[\s,|:\-—]/.test(rest)) {
        if (kl.length > bestLen) {
          bestLen = kl.length;
          bestKey = key;
        }
      }
    }
  }
  if (bestKey) {
    return registry[bestKey]!;
  }

  return null;
}

function resolveEnvironmentKey(
  setting: string,
  registry: Record<string, EnvironmentEntry>,
): string | null {
  const trimmed = setting.trim();
  if (!trimmed || Object.keys(registry).length === 0) {
    return null;
  }

  const firstSegment =
    trimmed.split("|")[0]?.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? trimmed;

  if (registry[firstSegment]) {
    return firstSegment;
  }

  const normalized = firstSegment.toLowerCase().replace(/\s+/g, "_");
  if (registry[normalized]) {
    return normalized;
  }

  const lower = trimmed.toLowerCase();
  let bestKey: string | null = null;
  let bestLen = -1;
  for (const key of Object.keys(registry)) {
    const kl = key.toLowerCase();
    if (!kl.length) continue;
    if (lower.startsWith(kl)) {
      const rest = lower.slice(kl.length);
      if (rest.length === 0 || /^[\s,|:\-—]/.test(rest)) {
        if (kl.length > bestLen) {
          bestLen = kl.length;
          bestKey = key;
        }
      }
    }
  }

  return bestKey;
}

function stripRegistryKeyPrefix(setting: string, registryKey: string | null): string {
  const trimmed = setting.trim();
  if (!registryKey) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const keyLower = registryKey.toLowerCase();
  if (lower.startsWith(keyLower)) {
    const rest = trimmed.slice(registryKey.length);
    if (rest.length === 0 || /^[\s,|:\-—]/.test(rest)) {
      return rest.replace(/^[\s,|:\-—]+/, "").trim();
    }
  }

  const humanKey = registryKey.replace(/_/g, " ");
  const humanLower = humanKey.toLowerCase();
  if (lower.startsWith(humanLower)) {
    const rest = trimmed.slice(humanKey.length);
    if (rest.length === 0 || /^[\s,|:\-—]/.test(rest)) {
      return rest.replace(/^[\s,|:\-—]+/, "").trim();
    }
  }

  return trimmed;
}

function firstSpatialSentence(spatialLayout: string): string {
  const trimmed = spatialLayout.trim();
  if (!trimmed) {
    return "";
  }
  const periodFirst = trimmed.split(". ").find((s) => s.trim().length > 0) ?? trimmed;
  const clause = periodFirst.split(";")[0]?.trim() ?? periodFirst;
  if (!clause) {
    return "";
  }
  if (periodFirst.includes(";") && !clause.endsWith(";")) {
    return `${clause};`;
  }
  return clause.endsWith(".") ? clause : `${clause}.`;
}

function buildSettingSentence(
  setting: string,
  composition: string,
  registry: Record<string, EnvironmentEntry>,
): string {
  const registryKey = resolveEnvironmentKey(setting, registry);
  const envEntry = registryKey ? registry[registryKey]! : resolveEnvironmentEntry(setting, registry);
  const settingText = stripRegistryKeyPrefix(setting, registryKey);

  if (!settingText) {
    return "";
  }

  if (isCloseFraming(composition) || !envEntry) {
    return settingText.endsWith(".") ? settingText : `${settingText}.`;
  }

  const layoutLead = firstSpatialSentence(envEntry.spatialLayout);
  if (!layoutLead) {
    return settingText.endsWith(".") ? settingText : `${settingText}.`;
  }

  const settingSentence = settingText.endsWith(".") ? settingText : `${settingText}.`;
  return `${settingSentence} ${layoutLead}`;
}

function isCloseFraming(composition: string): boolean {
  return CLOSE_FRAMING_RE.test(composition);
}

export interface AssembleFinalPromptInput {
  scenePlan: ScenePlanArtefact;
  visualBible: VisualBibleArtefact;
  version: number;
  parentScenePlanVersion: number;
  parentVisualBibleVersion: number;
}

export function assembleFinalPrompt(input: AssembleFinalPromptInput): FinalPromptArtefact {
  const { scenePlan, visualBible, version, parentScenePlanVersion, parentVisualBibleVersion } =
    input;
  const sp = scenePlan.structuredPrompt;
  if (!sp) {
    throw new Error("assembleFinalPrompt: scene plan missing structuredPrompt");
  }

  const [anchor1, anchor2] = visualBible.consistencyAnchors.slice(0, 2);
  const anchorPhrase =
    anchor1 && anchor2 ? `${anchor1} and ${anchor2}` : anchor1 || anchor2 || "";
  const palette = visualBible.palette
    .split(",")
    .slice(0, 4)
    .map((c) => c.trim())
    .filter(Boolean)
    .join(", ");

  const promptOrder = [
    "style-lead",
    "character",
    "focal",
    "setting",
    "lighting",
    "composition",
    "palette",
  ] as const;

  const parts: string[] = [
    `Wordless children's book illustration in ${visualBible.styleGuide}, ${anchorPhrase}.`,
    `${visualBible.characterAnchor} ${sp.character}.`,
  ];

  const focal = sp.focalPoint.trim();
  if (focal) {
    parts.push(`The eye is drawn to ${focal}.`);
  }

  const settingSentence = buildSettingSentence(
    sp.setting,
    sp.composition,
    visualBible.environmentRegistry,
  );
  if (settingSentence) {
    parts.push(settingSentence);
  }

  parts.push(`${sp.lighting}.`, `${sp.composition}.`, `Color palette limited to ${palette}.`);

  const finalPromptString = parts.join(" ");
  const charCount = finalPromptString.length;
  const warnings: string[] = [];
  if (charCount > CHAR_COUNT_WARNING_THRESHOLD) {
    warnings.push(`prompt exceeds ${CHAR_COUNT_WARNING_THRESHOLD} chars`);
  }

  return {
    id: randomUUID(),
    storyId: scenePlan.storyId,
    pageNumber: scenePlan.pageNumber,
    version,
    createdAt: Date.now(),
    parentScenePlanVersion,
    parentVisualBibleVersion,
    finalPromptString,
    promptOrder: [...promptOrder],
    charCount,
    warnings,
  };
}
