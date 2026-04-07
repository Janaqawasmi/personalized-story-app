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
  STORY_LENGTH_LABELS,
  SUPPORTING_CHARACTER_LABELS,
} from "../models/storyBrief.model";
import type { PreCheckResult } from "./types";

/** Brief spec §14 — Agent Internal: Priority Rules (verbatim list). */
export const BRIEF_PRIORITY_RULES_MARKDOWN = `
PRIORITY RULES (when fields conflict):
1. Cross-field validations — passed combinations are intentional
2. Therapeutic mechanism (Field 3.1) — defines the arc, overrides creative vision
3. Therapeutic intention (Field 2.3) — defines the destination
4. Coping tool (Field 3.5) — defines therapeutic delivery
5. Structured field selections — define architecture
6. Clinical creative vision (Field 2.4) — enriches, does not override
7. Free text fields — add texture within the architecture
`.trim();

export function formatStoryBriefAsMarkdown(brief: Agent1StoryBriefPayload): string {
  const s1 = brief.ageAndScope;
  const s2 = brief.clinicalFoundation;
  const s3 = brief.therapeuticArchitecture;
  const s4 = brief.storyWorld;
  const s5 = brief.personalizationConfig;

  const intention = s2.therapeuticIntention;
  const tsf = s3.typeSpecificField;

  let somaticBlock = "";
  if (tsf.fieldType === "somatic_expression") {
    const labels = tsf.selections.map((s) => SOMATIC_EXPRESSION_LABELS[s]).join("; ");
    somaticBlock = `- Somatic selections: ${labels}\n- Somatic free text: ${tsf.freeText ?? "(none)"}\n`;
  } else {
    somaticBlock = `- Type-specific clinical field (non–Fear & Anxiety shape in pilot): ${JSON.stringify(tsf)}\n`;
  }

  const supportingChars =
    s4.supportingCharacters
      ?.map(
        (c) =>
          `- ${SUPPORTING_CHARACTER_LABELS[c.type]}${c.functionalRole ? ` — at key moment: "${c.functionalRole}"` : ""}`,
      )
      .join("\n") ?? "(none)";

  return `
## Story type
${brief.storyType}

## Section 1 — Age & story scope
- Age range: ${AGE_RANGE_LABELS[s1.ageRange]} (${s1.ageRange})
- Peak intensity: ${PEAK_INTENSITY_LABELS[s1.peakIntensity]} (${s1.peakIntensity})
- Story length: ${STORY_LENGTH_LABELS[s1.storyLength]} (${s1.storyLength})

## Section 2 — Clinical foundation
- Emotional world (population): ${s2.population}
- Specific trigger: ${s2.trigger}
- Therapeutic intention — feel: ${intention.feel}
- Therapeutic intention — because: ${intention.because}
- Clinical creative vision: ${s2.creativeVision}
- One true thing: ${s2.oneTrueThing ?? "(none)"}

## Section 3 — Therapeutic architecture
- Primary approach: ${s3.primaryApproach}
- Supporting approach: ${s3.supportingApproach ?? "(none)"}
- Shame dimension: ${SHAME_DIMENSION_LABELS[s3.shameDimension]} (${s3.shameDimension})
${somaticBlock}
- Coping tool: ${FEAR_ANXIETY_COPING_TOOL_LABELS[s3.copingTool]} (${s3.copingTool})
- Resolution completeness: ${RESOLUTION_LABELS[s3.resolutionCompleteness]} (${s3.resolutionCompleteness})
- Must-never list:
${s3.mustNeverList.map((x) => `  - ${x}`).join("\n")}

## Section 4 — Story world
- Personalization: ${s4.personalization ? "on" : "off"}
- Protagonist gender: ${s4.protagonistGender ? PROTAGONIST_GENDER_LABELS[s4.protagonistGender] : "(hidden / from parent when on)"}
- Protagonist type: ${PROTAGONIST_TYPE_LABELS[s4.protagonistType]} (${s4.protagonistType})
- Protagonist age relative: ${s4.protagonistAge ? PROTAGONIST_AGE_LABELS[s4.protagonistAge] : "(default/hidden)"}
- Caregiver presence: ${CAREGIVER_PRESENCE_LABELS[s4.caregiverPresence]} (${s4.caregiverPresence})
- Narrative distance: ${NARRATIVE_DISTANCE_LABELS[s4.narrativeDistance]} (${s4.narrativeDistance})
- Parallel equivalent challenge: ${s4.parallelChallenge ?? "(none)"}
- Supporting characters:
${supportingChars}
- Character notes: ${s4.characterNotes ?? "(none)"}

## Section 5 — Personalization configuration
- Personalization constraints: ${s5.personalizationConstraints?.join("; ") ?? "(none)"}
- Why not personalized: ${s5.whyNot ?? "(none)"}
`.trim();
}
