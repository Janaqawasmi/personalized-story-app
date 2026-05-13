import { randomUUID } from "crypto";
import type { EnvironmentEntry } from "@/illustration/types/visual-bible";
import type { FinalPromptArtefact, ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";

const NO_TEXT_LEAD =
  "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.";

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

  const anchors = visualBible.consistencyAnchors.slice(0, 2).join(" | ");
  const palette = visualBible.palette
    .split(",")
    .slice(0, 4)
    .map((c) => c.trim())
    .join(", ");
  const avoid = visualBible.avoidList.slice(0, 3).join("; ");

  const envEntry = resolveEnvironmentEntry(sp.setting, visualBible.environmentRegistry);
  const settingSection = envEntry
    ? `Setting: ${sp.setting}. Spatial layout (fixed for this location): ${envEntry.spatialLayout}.`
    : `Setting: ${sp.setting}.`;

  const promptOrder = [
    "no-text",
    "consistency",
    "setting",
    "character",
    "focal",
    "lighting",
    "palette",
    "avoid",
    "footer",
  ] as const;

  const parts = [
    NO_TEXT_LEAD,
    `${anchors}.`,
    settingSection,
    `${visualBible.characterAnchor} In this scene: ${sp.character}.`,
    `Focal point: ${sp.focalPoint}.`,
    `Lighting: ${sp.lighting}.`,
    `Color palette: ${palette}.`,
    `Avoid: ${avoid}.`,
    "Children's book illustration.",
  ];

  const finalPromptString = parts.join(" ");
  const charCount = finalPromptString.length;
  const warnings: string[] = [];
  if (charCount > 1200) {
    warnings.push("prompt exceeds 1200 chars");
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
