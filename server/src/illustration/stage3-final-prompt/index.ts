import { randomUUID } from "crypto";
import type { FinalPromptArtefact, ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";

const NO_TEXT_LEAD =
  "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.";

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
    `Setting: ${sp.setting}.`,
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
