import type { Gender, AgeGroup } from "@/shared/types/common";
import type { IllustrationStyleId } from "@/shared/types/visualStyles";
import type { ArtDirectionSnapshot, TemplatePageArtDirection } from "@/shared/types/storyTemplate";
import { resolveEnvironmentEntry } from "./index";
import { STYLE_INSTRUCTIONS } from "./styleInstructions";

const NO_TEXT_LEAD =
  "No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration.";

const AGE_LABELS: Record<AgeGroup, string> = {
  "0_3": "a toddler",
  "3_6": "a young child aged 3 to 6",
  "6_9": "a child aged 6 to 9",
  "9_12": "a child aged 9 to 12",
};

const GENDER_LABELS: Record<Gender, string> = {
  male: "boy",
  female: "girl",
};

export class MissingStructuredPromptError extends Error {
  constructor(pageNumber: number) {
    super(
      `assemblePersonalizedPrompt: page ${pageNumber} has no structuredPrompt in the art-direction snapshot`,
    );
    this.name = "MissingStructuredPromptError";
  }
}

export interface AssemblePersonalizedPromptInput {
  /** Per-page art-direction for this specific page (from the template snapshot). */
  pageArtDirection: TemplatePageArtDirection;
  /**
   * Visual Bible–level fields from the template art-direction snapshot.
   * The sample protagonist appearance (protagonistSlot.sampleCharacterDescription /
   * characterAnchor) is intentionally NOT included here. Callers must not pass it
   * in; the appearance leak is prevented by construction.
   */
  snapshot: Pick<ArtDirectionSnapshot, "consistencyAnchors" | "environmentRegistry" | "palette" | "avoidList">;
  child: {
    firstName: string;
    gender: Gender;
    ageGroup: AgeGroup;
  };
  selectedIllustrationStyle: IllustrationStyleId;
}

/**
 * Assembles a personalized image prompt for a single preview page.
 *
 * Preserves the approved scene (setting, character pose, focal point, composition,
 * lighting, palette, avoid list) while replacing only:
 *   - protagonist identity: specialist characterAnchor is excluded; a child-identity
 *     anchor derived from the child's name / gender / age is injected instead.
 *   - art style: specialist styleGuide is replaced by the parent-selected style
 *     instruction from STYLE_INSTRUCTIONS.
 *
 * The child photo is NOT embedded in the prompt string; callers pass it separately
 * as `referenceImage` to the ImageGenerationProvider.
 */
export function assemblePersonalizedPrompt(input: AssemblePersonalizedPromptInput): string {
  const { pageArtDirection, snapshot, child, selectedIllustrationStyle } = input;
  const sp = pageArtDirection.structuredPrompt;
  if (!sp) {
    throw new MissingStructuredPromptError(pageArtDirection.pageNumber);
  }

  const anchors = snapshot.consistencyAnchors.slice(0, 2).join(" | ");
  const palette = snapshot.palette
    .split(",")
    .slice(0, 4)
    .map((c) => c.trim())
    .join(", ");
  const avoid = snapshot.avoidList.slice(0, 3).join("; ");

  const envEntry = resolveEnvironmentEntry(sp.setting, snapshot.environmentRegistry);
  const settingSection = envEntry
    ? `Setting: ${sp.setting}. Spatial layout (fixed for this location): ${envEntry.spatialLayout}.`
    : `Setting: ${sp.setting}.`;

  // Child identity anchor — replaces the specialist characterAnchor.
  // Sample protagonist appearance is intentionally excluded from this function's
  // inputs so the appearance leak is prevented by construction.
  const ageLabel = AGE_LABELS[child.ageGroup];
  const genderLabel = GENDER_LABELS[child.gender];
  const childIdentity =
    `Child: ${ageLabel} ${genderLabel} named ${child.firstName}. ` +
    `This child is the protagonist in every frame; use the reference photo for their facial identity.`;

  const styleInstruction = STYLE_INSTRUCTIONS[selectedIllustrationStyle];

  const parts: string[] = [
    NO_TEXT_LEAD,
    ...(anchors ? [`${anchors}.`] : []),
    settingSection,
    `${childIdentity} In this scene: ${sp.character}.`,
    `Focal point: ${sp.focalPoint}.`,
    `Lighting: ${sp.lighting}.`,
    `Color palette: ${palette}.`,
    `Style: ${styleInstruction}`,
    `Avoid: ${avoid}.`,
    "Children's book illustration.",
  ];

  return parts.join(" ");
}
