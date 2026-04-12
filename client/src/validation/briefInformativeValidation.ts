// client/src/validation/briefInformativeValidation.ts
//
// Mirrors server/src/validation/crossFieldValidation.ts (soft rules only).
// §16 complexity uses @dammah/story-brief-complexity (same engine as the meter and server).
//
// Hard blocks and hard warnings stay in briefSubmitGate.ts + modals.

import type { CompleteBrief, BriefDefaultsLocaleOptions } from "../types/storyBrief";
import {
  ABSTRACT_COPING_TOOLS,
  PERSONALIZATION_DEFAULT,
  STORY_LENGTH_DEFAULT,
  STORY_LENGTH_LABELS,
  isSectionComplete,
  normalizeBriefDefaults,
} from "../types/storyBrief";
import {
  computeComplexityFromParts,
  extractComplexityPartsFromClientWire,
  roundToHalf,
} from "@dammah/story-brief-complexity";

// ── Copy matches server CROSS_FIELD_VALIDATIONS (soft_warning entries) ───────

const SOFT_MESSAGES: Record<string, string> = {
  self_regulation_comforting_caregiver:
    'The caregiver\'s presence may reduce the protagonist\'s need to self-regulate. Consider "Guides from the side" as an alternative.',
  shame_central_no_normalization:
    "Shame is central to this experience. Normalization is typically important when shame is present — consider adding it as a supporting approach.",
  separation_anxiety_no_caregiver:
    'For separation anxiety, the caregiver\'s return is often part of the therapeutic arc. "Waiting at the end" may serve this story better.',
  abstract_tool_young_age:
    "For younger children, the agent will show this tool as a simple physical action or repeated pattern — not verbal self-talk.",
  cognitive_reframing_young_age:
    "Cognitive reframing requires developmental capacity for perspective-taking. For ages 3–5, consider Normalization, Modeling, or Psychoeducation instead.",
};

/** Same keyword list as server crossFieldValidation.ts */
const SEPARATION_KEYWORDS = [
  "separat",
  "leaving",
  "left behind",
  "goodbye",
  "bye-bye",
  "go away",
  "going away",
  "gone",
  "apart",
  "missing",
  "abandon",
  "drop off",
  "drop-off",
  "daycare",
  "preschool",
  "kindergarten",
  "first day",
  "without me",
  "without mom",
  "without dad",
  "without mum",
  "won't come back",
  "not coming back",
];

function containsSeparationKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SEPARATION_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Public types ────────────────────────────────────────────────────────────

export interface InformativeSoftIssue {
  id: string;
  message: string;
  /** Spec field ids for accessibility / future highlight */
  fields: string[];
}

export interface ObligationLineItem {
  label: string;
  /** Cost after age scaling (display) */
  scaledCost: number;
}

export interface ComplexityInformativeResult {
  totalPageCost: number;
  availablePages: [number, number];
  ageMultiplier: number;
  obligations: ObligationLineItem[];
  /** Full paragraph + breakdown — matches server warningMessage */
  summaryText: string;
}

export interface BriefInformativeValidationResult {
  /** Non-blocking cross-field reminders (§8 soft) */
  softWarnings: InformativeSoftIssue[];
  /** Null when not applicable or inputs missing */
  complexity: ComplexityInformativeResult | null;
}

function briefFullyComplete(draft: CompleteBrief, locale?: BriefDefaultsLocaleOptions): boolean {
  const norm = normalizeBriefDefaults(draft, locale);
  return [1, 2, 3, 4, 5].every((s) => isSectionComplete(s, norm));
}

/**
 * Collects §8 soft warnings + §16 complexity overload for a **complete** brief.
 * Returns empty soft list and null complexity when the brief is still incomplete
 * (rules need full context — same as server).
 */
export function evaluateBriefInformativeValidation(
  draft: CompleteBrief,
  locale?: BriefDefaultsLocaleOptions,
): BriefInformativeValidationResult {
  const empty: BriefInformativeValidationResult = { softWarnings: [], complexity: null };

  if (!briefFullyComplete(draft, locale)) return empty;

  const b = normalizeBriefDefaults(draft, locale);
  if (!b.storyType) return empty;

  const s1 = b.section1;
  const s2 = b.section2;
  const s3 = b.section3;
  const s4 = b.section4;

  if (!s1.ageRange || !s1.peakIntensity || !(s1.storyLength ?? STORY_LENGTH_DEFAULT)) return empty;
  if (
    !s2.population?.trim() ||
    !s2.trigger?.trim() ||
    !s2.intentionFeel?.trim() ||
    !s2.intentionBecause?.trim() ||
    !s2.creativeVision?.trim()
  ) {
    return empty;
  }
  if (
    !s3.primaryApproach ||
    !s3.shameDimension ||
    !s3.somaticExpressions?.length ||
    !s3.copingTool ||
    !s3.mustNeverList?.length
  ) {
    return empty;
  }
  if (!s4.caregiverPresence || !s4.narrativeDistance) return empty;

  const personalized = (s4.personalization ?? PERSONALIZATION_DEFAULT) === "yes";
  if (!personalized && !s4.protagonistGender) return empty;
  if (!s4.protagonistType) return empty;

  if (!personalized) {
    if (!b.section5.whyNot?.trim()) return empty;
  }

  const softWarnings: InformativeSoftIssue[] = [];

  // --- Soft: self-regulation + present comforting ---
  if (s3.primaryApproach === "self_regulation" && s4.caregiverPresence === "present_and_comforting") {
    softWarnings.push({
      id: "self_regulation_comforting_caregiver",
      message: SOFT_MESSAGES.self_regulation_comforting_caregiver,
      fields: ["3.1", "4.4"],
    });
  }

  // --- Soft: shame central without normalization ---
  if (s3.shameDimension === "central") {
    const hasNorm =
      s3.primaryApproach === "normalization" || s3.supportingApproach === "normalization";
    if (!hasNorm) {
      softWarnings.push({
        id: "shame_central_no_normalization",
        message: SOFT_MESSAGES.shame_central_no_normalization,
        fields: ["3.3", "3.1", "3.2"],
      });
    }
  }

  // --- Soft: separation keywords + caregiver not present ---
  if (s4.caregiverPresence === "not_present" && containsSeparationKeywords(s2.trigger)) {
    softWarnings.push({
      id: "separation_anxiety_no_caregiver",
      message: SOFT_MESSAGES.separation_anxiety_no_caregiver,
      fields: ["2.2", "4.4"],
    });
  }

  // --- Soft: abstract tool + ages 3–5 ---
  if (s1.ageRange === "3-5" && (ABSTRACT_COPING_TOOLS as readonly string[]).includes(s3.copingTool)) {
    softWarnings.push({
      id: "abstract_tool_young_age",
      message: SOFT_MESSAGES.abstract_tool_young_age,
      fields: ["1.1", "3.5"],
    });
  }

  // --- Soft: cognitive reframing + 3–5 ---
  if (s3.primaryApproach === "cognitive_reframing" && s1.ageRange === "3-5") {
    softWarnings.push({
      id: "cognitive_reframing_young_age",
      message: SOFT_MESSAGES.cognitive_reframing_young_age,
      fields: ["1.1", "3.1"],
    });
  }

  // Field-level nudges (spec §4 / §6) are intentionally NOT included here:
  // - trigger brevity (<80 chars) is nudged inline in Section 2.2 UI
  // - intention brevity (<60 chars combined) is nudged inline in Section 2.3 UI
  // - personalization + direct note is shown inline in Section 4.5 UI

  // --- §16 Complexity (shared package — same as meter + server warning) ---
  const engine = computeComplexityFromParts(extractComplexityPartsFromClientWire(b));
  const availablePages: [number, number] = [engine.budget.min, engine.budget.max];
  const isOverBudget = engine.totalPageCost > engine.budget.min;

  const obligationLines: ObligationLineItem[] = engine.serverObligations.map((o) => ({
    label: o.label,
    scaledCost: roundToHalf(o.baseCost * engine.ageMultiplier),
  }));

  let complexity: ComplexityInformativeResult | null = null;
  if (isOverBudget) {
    const storyLength = s1.storyLength ?? STORY_LENGTH_DEFAULT;
    const lengthLabel = STORY_LENGTH_LABELS[storyLength];
    const breakdownLines = engine.serverObligations.map(
      (o) => `  • ${o.label}: ${roundToHalf(o.baseCost * engine.ageMultiplier)} pages`,
    );
    const summaryText =
      `Your story design requires approximately ${engine.totalPageCost} pages to include all ` +
      `elements well. You've selected ${lengthLabel} (${availablePages[0]}–${availablePages[1]} pages). ` +
      `Consider increasing the story length, or reducing complexity by removing a supporting ` +
      `character, changing the supporting approach, or adjusting the shame level.\n\n` +
      `Obligation breakdown:\n${breakdownLines.join("\n")}`;

    complexity = {
      totalPageCost: engine.totalPageCost,
      availablePages,
      ageMultiplier: engine.ageMultiplier,
      obligations: obligationLines,
      summaryText,
    };
  }

  return { softWarnings, complexity };
}
