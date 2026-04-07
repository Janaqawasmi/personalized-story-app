import Anthropic from "@anthropic-ai/sdk";

import type { Agent1StoryBriefPayload } from "../models/storyBrief.schema";
import {
  AGE_RANGE_LABELS,
  CAREGIVER_PRESENCE_LABELS,
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  NARRATIVE_DISTANCE_LABELS,
  PEAK_INTENSITY_LABELS,
  PROTAGONIST_AGE_LABELS,
  PROTAGONIST_GENDER_LABELS,
  PROTAGONIST_TYPE_LABELS,
  RESOLUTION_LABELS,
  SHAME_DIMENSION_LABELS,
  SOMATIC_EXPRESSION_LABELS,
  STRUCTURAL_PARAMS,
  SUPPORTING_CHARACTER_LABELS,
} from "../models/storyBrief.model";
import { getAgeDerivedRulesForAuthor } from "./ageDerivedRules";
import type { ObligationTiersConfig } from "./config/types";
import { readAgentJson } from "./loadJson";
import { OPUS_MODEL } from "./models";
import { loadPromptTemplate, substitutePlaceholders } from "./promptUtils";
import type { AuthorOutput, StoryArchitectOutput } from "./types";

const obligationTiers: ObligationTiersConfig = readAgentJson("config/obligationTiers.json");

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for Agent 1");
  }
  return new Anthropic({ apiKey: key });
}

function formatShameRulesForAuthor(brief: Agent1StoryBriefPayload): string {
  const level = brief.therapeuticArchitecture.shameDimension;
  const label = SHAME_DIMENSION_LABELS[level];
  if (level === "present") {
    return `${label}: Never put protagonist in position of being observed in their shame.`;
  }
  if (level === "central") {
    return `${label}: (1) Story demonstrates child is not alone in this feeling. (2) Never implies child should have known/done/felt differently. (3) At least one character witnesses the protagonist's difficulty and responds with acceptance, not correction.`;
  }
  return `${label}: (no special shame handling required beyond brief constraints)`;
}

function formatResolutionSignature(brief: Agent1StoryBriefPayload): string {
  const r = brief.therapeuticArchitecture.resolutionCompleteness;
  if (r === "full") return "relief, accomplishment, safety restored. Ends on a high.";
  if (r === "partial") {
    return "cautious hope — tool helped but feeling lingers gently. Ends warm but honest.";
  }
  return "Something new — tool, friend, understanding — but journey unfinished. Courage without certainty. Ends looking forward.";
}

function buildCuratedAppendix(brief: Agent1StoryBriefPayload, architect: StoryArchitectOutput): string {
  const s3 = brief.therapeuticArchitecture;
  const s4 = brief.storyWorld;
  const s1 = brief.ageAndScope;
  const struct = STRUCTURAL_PARAMS[s1.ageRange][s1.storyLength];

  const tsf = s3.typeSpecificField;
  let somaticLines = "";
  if (tsf.fieldType === "somatic_expression") {
    const s1Label = tsf.selections[0] ? SOMATIC_EXPRESSION_LABELS[tsf.selections[0]] : "";
    const s2Label =
      tsf.selections.length > 1 && tsf.selections[1] ? SOMATIC_EXPRESSION_LABELS[tsf.selections[1]] : "";
    somaticLines = `- ${s1Label}\n${s2Label ? `- ${s2Label}\n` : ""}${tsf.freeText ? `- Other: ${tsf.freeText}\n` : ""}`;
  }

  const supporting =
    s4.supportingCharacters
      ?.map(
        (c) =>
          `- ${SUPPORTING_CHARACTER_LABELS[c.type]}${c.functionalRole ? ` — at key moment: "${c.functionalRole}"` : ""}`,
      )
      .join("\n") ?? "(none)";

  const copingLabel = FEAR_ANXIETY_COPING_TOOL_LABELS[s3.copingTool];
  const compression = architect.compression_metadata
    ? `SPACE CONSTRAINTS:\nThe story architect noted the following compression decisions:\n${architect.compression_metadata}\n\nHonor these decisions. Do not attempt to restore omitted elements.\n`
    : "";

  const personalizationOn = s4.personalization;
  let protagonistBlock = "";
  if (personalizationOn) {
    protagonistBlock = `Personalization ON: use [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders as required.`;
  } else {
    protagonistBlock = `Personalization OFF: protagonist type ${PROTAGONIST_TYPE_LABELS[s4.protagonistType]}; gender ${
      s4.protagonistGender ? PROTAGONIST_GENDER_LABELS[s4.protagonistGender] : "n/a"
    }; age relation ${s4.protagonistAge ? PROTAGONIST_AGE_LABELS[s4.protagonistAge] : "same_age"}. If gender is Kept open: use character's name, avoid pronouns. No they/them under 7.`;
  }

  return `
## Section C — The blueprint (from Story Architect)
EMOTIONAL TRUTH:
${architect.emotional_truth}

NARRATIVE BLUEPRINT (6 points):
${architect.blueprint_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

COPING TOOL PLACEMENT NOTE:
${architect.coping_tool_placement_note}

The coping tool is ${copingLabel}. Show it happening. Do not name it.
${s3.copingTool === "comfort_object_or_memory" ? "This recalls another person's presence — a physical object for younger children, a memory or internalized voice for older children. It is NOT self-generated encouragement." : ""}

HOW THE APPROACH WORKS IN THIS STORY:
${architect.approach_instruction}

## Section B — Heart of the story (from brief; curated)
THE IMAGE AT THE CENTER:
${brief.clinicalFoundation.creativeVision}

${brief.clinicalFoundation.oneTrueThing ? `AND SOMETHING REAL:\n${brief.clinicalFoundation.oneTrueThing}` : ""}

## Section D — The body's language
This child's anxiety lives in their body as:
${somaticLines || "(see type-specific field in runtime JSON if non-somatic)"}

${s4.narrativeDistance === "metaphorical" ? "Translate these somatic experiences into the metaphorical world — the sensation should feel equivalent even if the body is different." : ""}

## Section E — Structural parameters
AGE RANGE: ${AGE_RANGE_LABELS[s1.ageRange]} (${s1.ageRange})
STORY LENGTH: ${s1.storyLength}

Target word count: ${struct.totalWords[0]}–${struct.totalWords[1]}
Target page count: ${struct.pages[0]}–${struct.pages[1]}

VOCABULARY AND COMPLEXITY:
${getAgeDerivedRulesForAuthor(s1.ageRange)}

PEAK EMOTIONAL INTENSITY: ${PEAK_INTENSITY_LABELS[s1.peakIntensity]} (${s1.peakIntensity})

RESOLUTION: ${RESOLUTION_LABELS[s3.resolutionCompleteness]} (${s3.resolutionCompleteness})
Expected emotional signature: ${formatResolutionSignature(brief)}

CAREGIVER: ${CAREGIVER_PRESENCE_LABELS[s4.caregiverPresence]} (${s4.caregiverPresence})

NARRATIVE DISTANCE: ${NARRATIVE_DISTANCE_LABELS[s4.narrativeDistance]} (${s4.narrativeDistance})
${s4.narrativeDistance === "parallel" && s4.parallelChallenge ? `Equivalent challenge: "${s4.parallelChallenge}"` : ""}

PERSONALIZATION: ${personalizationOn ? "yes" : "no"}
${protagonistBlock}

SUPPORTING CHARACTERS:
${supporting}

${s4.characterNotes ? `CHARACTER NOTES: ${s4.characterNotes}` : ""}

## Section F — Pacing principle
The emotional peak and the coping tool scene are the heart of this story. They should receive the most narrative space. If the opening takes more than a few sentences, you started too far back. Do not rush the resolution — difficulty must feel real before the shift feels earned.

## Section G — Narrative obligation tiers
${compression}
PRIORITY TIERS (JSON):
${JSON.stringify(obligationTiers, null, 2)}

## Section H — Hard constraints
WHAT THIS STORY MUST NEVER DO:
${s3.mustNeverList.map((x) => `- ${x}`).join("\n")}

SHAME RULES:
${formatShameRulesForAuthor(brief)}

## Section I — Few-shot (cold start)
Standards: specificity, restraint, concrete detail, coping tool shown not named, body experience specific to provided expressions.
`.trim();
}

export function parseAuthorModelText(raw: string): AuthorOutput {
  const idxStory = raw.indexOf("<<<STORY>>>");
  const idxTitle = raw.indexOf("<<<TITLE>>>");
  if (idxTitle < 0 || idxStory < 0 || idxStory < idxTitle) {
    throw new Error("Author output must include <<<TITLE>>> and <<<STORY>>> delimiters in order");
  }
  const titlePart = raw.slice(idxTitle + "<<<TITLE>>>".length, idxStory).trim();
  const storyPart = raw.slice(idxStory + "<<<STORY>>>".length).trim();
  if (!titlePart || !storyPart) {
    throw new Error("Author output missing title or story body");
  }
  return { title: titlePart, story: storyPart };
}

export async function runAuthor(
  brief: Agent1StoryBriefPayload,
  architect: StoryArchitectOutput,
): Promise<AuthorOutput> {
  const base = loadPromptTemplate("author");
  const appendix = buildCuratedAppendix(brief, architect);
  const userContent = substitutePlaceholders(base, { RUNTIME_APPENDIX: appendix });

  const client = getAnthropicClient();

  const runOnce = async (userText: string): Promise<AuthorOutput> => {
    const response = await client.messages.create({
      model: OPUS_MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: userText }],
    });
    const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    const raw = textBlocks.map((b) => b.text).join("\n");
    return parseAuthorModelText(raw);
  };

  try {
    return await runOnce(userContent);
  } catch (first) {
    const msg = first instanceof Error ? first.message : String(first);
    return await runOnce(
      `${userContent}\n\nYour previous output failed parsing (need <<<TITLE>>> then <<<STORY>>>). Fix and try again. Error: ${msg}`,
    );
  }
}
