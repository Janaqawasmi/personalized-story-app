// server/src/validation/crossFieldValidation.ts
//
// Cross-field validation engine for the Story Brief (spec v1.2, Section 8).
//
// Implements 12 rules:
//   1 hard block   — prevents submission
//   3 hard warnings — require explicit acknowledgment to proceed
//   8 soft warnings — shown but do not block
//
// Each rule is a standalone function for testability. The main entry point
// `validateBriefCrossFields` runs all rules against a complete brief.

import type {
  StoryBrief,
  TherapeuticApproach,
  ValidationSeverity,
} from "../models/storyBrief.model";
import {
  RELATIONAL_COPING_TOOLS,
  NON_PRESENT_CAREGIVERS,
  RESPONDING_CHARACTERS,
  ABSTRACT_COPING_TOOLS,
  CONFLICTING_APPROACH_PAIRS,
  CROSS_FIELD_VALIDATIONS,
} from "../models/storyBrief.model";

// ============================================================================
// Types
// ============================================================================

export interface TriggeredValidation {
  id: string;
  severity: ValidationSeverity;
  message: string;
  /** Spec field IDs involved in this validation (for UI highlighting). */
  fields: string[];
}

export interface CrossFieldValidationResult {
  hardBlocks: TriggeredValidation[];
  hardWarnings: TriggeredValidation[];
  softWarnings: TriggeredValidation[];
  /** True only when there are zero hard blocks. */
  canSubmit: boolean;
  /**
   * True when all hard blocks are clear AND every hard warning has been
   * acknowledged in `brief.acknowledgedWarnings`.
   */
  canSubmitWithAcknowledgments: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getRuleMeta(id: string) {
  return CROSS_FIELD_VALIDATIONS.find((v) => v.id === id)!;
}

function trigger(id: string, fields: string[]): TriggeredValidation {
  const meta = getRuleMeta(id);
  return { id: meta.id, severity: meta.severity, message: meta.message, fields };
}

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

function isConflictingPair(
  a: TherapeuticApproach,
  b: TherapeuticApproach,
): boolean {
  return CONFLICTING_APPROACH_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}

// ============================================================================
// Individual Rule Implementations
// ============================================================================

// ── Hard block #1 ──────────────────────────────────────────────────────────

function checkRelationalToolNoResponder(
  brief: StoryBrief,
): TriggeredValidation | null {
  const tool = brief.therapeuticArchitecture.copingTool;
  const caregiver = brief.storyWorld.caregiverPresence;
  const characters = brief.storyWorld.supportingCharacters ?? [];

  const isRelational = (RELATIONAL_COPING_TOOLS as readonly string[]).includes(tool);
  const caregiverAbsent = (NON_PRESENT_CAREGIVERS as readonly string[]).includes(caregiver);

  if (!isRelational || !caregiverAbsent) return null;

  const hasResponder = characters.some((c) =>
    (RESPONDING_CHARACTERS as readonly string[]).includes(c.type),
  );

  if (hasResponder) return null;

  return trigger("relational_tool_no_responder", ["3.5", "4.4", "4.6"]);
}

// ── Hard warning #2 ────────────────────────────────────────────────────────

function checkSignificantIntensityYoungAge(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (
    brief.ageAndScope.peakIntensity === "significant" &&
    brief.ageAndScope.ageRange === "3-5"
  ) {
    return trigger("significant_intensity_young_age", ["1.1", "1.2"]);
  }
  return null;
}

// ── Hard warning #3 ────────────────────────────────────────────────────────

function checkGraduatedExposureComfortingCaregiver(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (
    brief.therapeuticArchitecture.primaryApproach === "graduated_exposure" &&
    brief.storyWorld.caregiverPresence === "present_and_comforting"
  ) {
    return trigger("graduated_exposure_comforting_caregiver", ["3.1", "4.4"]);
  }
  return null;
}

// ── Hard warning #4 ────────────────────────────────────────────────────────

function checkConflictingApproachPair(
  brief: StoryBrief,
): TriggeredValidation | null {
  const primary = brief.therapeuticArchitecture.primaryApproach;
  const supporting = brief.therapeuticArchitecture.supportingApproach;

  if (!supporting) return null;

  if (isConflictingPair(primary, supporting)) {
    return trigger("conflicting_approach_pair", ["3.1", "3.2"]);
  }
  return null;
}

// ── Soft warning #1 ────────────────────────────────────────────────────────

function checkSelfRegulationComfortingCaregiver(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (
    brief.therapeuticArchitecture.primaryApproach === "self_regulation" &&
    brief.storyWorld.caregiverPresence === "present_and_comforting"
  ) {
    return trigger("self_regulation_comforting_caregiver", ["3.1", "4.4"]);
  }
  return null;
}

// ── Soft warning #2 ────────────────────────────────────────────────────────

function checkShameCentralNoNormalization(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (brief.therapeuticArchitecture.shameDimension !== "central") return null;

  const primary = brief.therapeuticArchitecture.primaryApproach;
  const supporting = brief.therapeuticArchitecture.supportingApproach;

  if (primary === "normalization" || supporting === "normalization") return null;

  return trigger("shame_central_no_normalization", ["3.3", "3.1", "3.2"]);
}

// ── Soft warning #3 ────────────────────────────────────────────────────────

function checkSeparationAnxietyNoCaregiver(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (brief.storyWorld.caregiverPresence !== "not_present") return null;

  const triggerText = brief.clinicalFoundation.trigger;
  if (containsSeparationKeywords(triggerText)) {
    return trigger("separation_anxiety_no_caregiver", ["2.2", "4.4"]);
  }
  return null;
}

// ── Soft warning #4 ────────────────────────────────────────────────────────

function checkAbstractToolYoungAge(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (brief.ageAndScope.ageRange !== "3-5") return null;

  if (
    (ABSTRACT_COPING_TOOLS as readonly string[]).includes(
      brief.therapeuticArchitecture.copingTool,
    )
  ) {
    return trigger("abstract_tool_young_age", ["1.1", "3.5"]);
  }
  return null;
}

// ── Soft warning #5 ────────────────────────────────────────────────────────

function checkCognitiveReframingYoungAge(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (
    brief.therapeuticArchitecture.primaryApproach === "cognitive_reframing" &&
    brief.ageAndScope.ageRange === "3-5"
  ) {
    return trigger("cognitive_reframing_young_age", ["1.1", "3.1"]);
  }
  return null;
}

// ── Soft warning #6 ────────────────────────────────────────────────────────

function checkTriggerLacksSpecificity(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (brief.clinicalFoundation.trigger.length < 80) {
    return trigger("trigger_lacks_specificity", ["2.2"]);
  }
  return null;
}

// ── Soft warning #7 ────────────────────────────────────────────────────────

function checkIntentionTooBrief(
  brief: StoryBrief,
): TriggeredValidation | null {
  const { feel, because } = brief.clinicalFoundation.therapeuticIntention;
  const combinedLength = feel.length + because.length;

  if (combinedLength < 60) {
    return trigger("intention_too_brief", ["2.3"]);
  }
  return null;
}

// ── Soft warning #8 ────────────────────────────────────────────────────────

function checkPersonalizationDirectIntensity(
  brief: StoryBrief,
): TriggeredValidation | null {
  if (
    brief.storyWorld.personalization &&
    brief.storyWorld.narrativeDistance === "direct"
  ) {
    return trigger("personalization_direct_intensity", ["4.0", "4.5"]);
  }
  return null;
}

// ============================================================================
// Rule Registry (ordered by severity, then by spec order)
// ============================================================================

type RuleChecker = (brief: StoryBrief) => TriggeredValidation | null;

const RULE_CHECKERS: RuleChecker[] = [
  // Hard blocks
  checkRelationalToolNoResponder,
  // Hard warnings
  checkSignificantIntensityYoungAge,
  checkGraduatedExposureComfortingCaregiver,
  checkConflictingApproachPair,
  // Soft warnings
  checkSelfRegulationComfortingCaregiver,
  checkShameCentralNoNormalization,
  checkSeparationAnxietyNoCaregiver,
  checkAbstractToolYoungAge,
  checkCognitiveReframingYoungAge,
  checkTriggerLacksSpecificity,
  checkIntentionTooBrief,
  checkPersonalizationDirectIntensity,
];

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Runs all cross-field validation rules against a complete Story Brief.
 *
 * Returns categorized results. The caller decides how to surface them:
 * - `canSubmit` is false if any hard block fires.
 * - `canSubmitWithAcknowledgments` is false if canSubmit is false OR any
 *   hard warning has not been acknowledged via `brief.acknowledgedWarnings`.
 */
export function validateBriefCrossFields(
  brief: StoryBrief,
): CrossFieldValidationResult {
  const hardBlocks: TriggeredValidation[] = [];
  const hardWarnings: TriggeredValidation[] = [];
  const softWarnings: TriggeredValidation[] = [];

  for (const checker of RULE_CHECKERS) {
    const result = checker(brief);
    if (!result) continue;

    switch (result.severity) {
      case "hard_block":
        hardBlocks.push(result);
        break;
      case "hard_warning":
        hardWarnings.push(result);
        break;
      case "soft_warning":
        softWarnings.push(result);
        break;
    }
  }

  const canSubmit = hardBlocks.length === 0;

  const acknowledged = new Set(brief.acknowledgedWarnings ?? []);
  const allWarningsAcknowledged = hardWarnings.every((w) =>
    acknowledged.has(w.id),
  );

  return {
    hardBlocks,
    hardWarnings,
    softWarnings,
    canSubmit,
    canSubmitWithAcknowledgments: canSubmit && allWarningsAcknowledged,
  };
}
