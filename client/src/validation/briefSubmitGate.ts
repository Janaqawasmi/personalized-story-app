// client/src/validation/briefSubmitGate.ts
//
// Pre-submit gate: hard blocks and hard warnings (spec §8), aligned with
// server/src/validation/crossFieldValidation.ts

import type { CompleteBrief } from "../types/storyBrief";
import {
  CONFLICTING_APPROACH_PAIRS,
  type CaregiverPresence,
  type CopingTool,
  type SupportingCharacter,
  type TherapeuticApproach,
} from "../types/storyBrief";

// ── Constants (mirror server storyBrief.model) ─────────────────────────────

const RELATIONAL_COPING_TOOLS: readonly CopingTool[] = ["safe_person", "asking_for_help"];

const NON_PRESENT_CAREGIVERS: readonly CaregiverPresence[] = ["waiting_end", "not_present"];

const RESPONDING_CHARACTERS: readonly SupportingCharacter[] = [
  "peer_shows_possible",
  "teacher_adult_guides",
];

// ── Copy (messages match server CROSS_FIELD_VALIDATIONS) ─────────────────────

export interface SubmitGateItem {
  id: string;
  severity: "hard_block" | "hard_warning";
  title: string;
  message: string;
  /** Shown in the acknowledgment modal to explain clinical risk. */
  clinicalNote: string;
}

const GATE_META: Record<
  string,
  { title: string; message: string; clinicalNote: string; severity: "hard_block" | "hard_warning" }
> = {
  relational_tool_no_responder: {
    severity: "hard_block",
    title: "Someone to turn to is required",
    message:
      "The coping tool requires someone the protagonist can turn to. Please add a present caregiver or a supporting character who can respond.",
    clinicalNote:
      "Relational coping tools assume a responsive figure in the story. Without that anchor, the narrative can contradict the therapeutic mechanism or leave the child without a modeled path to safety.",
  },
  significant_intensity_young_age: {
    severity: "hard_warning",
    title: "High intensity for young children",
    message:
      "Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?",
    clinicalNote:
      "Younger children have less capacity to regulate when stories stay in high arousal for long stretches. If you proceed, ensure pacing, co-regulation, and resolution still protect the reader.",
  },
  graduated_exposure_comforting_caregiver: {
    severity: "hard_warning",
    title: "Graduated exposure with a comforting caregiver",
    message:
      "A consistently comforting caregiver may reduce the therapeutic effect of graduated exposure. Is this intentional?",
    clinicalNote:
      "Graduated exposure relies on manageable doses of discomfort. Constant soothing can short-circuit the approach unless you have structured that dynamic intentionally for this case.",
  },
  conflicting_approach_pair: {
    severity: "hard_warning",
    title: "Potentially conflicting therapeutic approaches",
    message: "These approaches can pull in different directions. Is this intentional?",
    clinicalNote:
      "Mixed mechanisms can confuse the story’s emotional arc. Proceed only if you are deliberately layering approaches and know how the draft should prioritize them.",
  },
};

function isConflictingPair(a: TherapeuticApproach, b: TherapeuticApproach): boolean {
  return CONFLICTING_APPROACH_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}

function checkRelationalToolNoResponder(brief: CompleteBrief): SubmitGateItem | null {
  const tool = brief.section3.copingTool;
  const caregiver = brief.section4.caregiverPresence;
  const characters = brief.section4.supportingCharacters ?? [];

  if (!tool || !caregiver) return null;

  const isRelational = (RELATIONAL_COPING_TOOLS as readonly string[]).includes(tool);
  const caregiverAbsent = (NON_PRESENT_CAREGIVERS as readonly string[]).includes(caregiver);
  if (!isRelational || !caregiverAbsent) return null;

  const hasResponder = characters.some((c) =>
    (RESPONDING_CHARACTERS as readonly string[]).includes(c),
  );
  if (hasResponder) return null;

  const m = GATE_META.relational_tool_no_responder;
  return {
    id: "relational_tool_no_responder",
    severity: m.severity,
    title: m.title,
    message: m.message,
    clinicalNote: m.clinicalNote,
  };
}

function checkSignificantIntensityYoungAge(brief: CompleteBrief): SubmitGateItem | null {
  if (
    brief.section1.peakIntensity === "significant" &&
    brief.section1.ageRange === "3-5"
  ) {
    const m = GATE_META.significant_intensity_young_age;
    return {
      id: "significant_intensity_young_age",
      severity: m.severity,
      title: m.title,
      message: m.message,
      clinicalNote: m.clinicalNote,
    };
  }
  return null;
}

function checkGraduatedExposureComfortingCaregiver(brief: CompleteBrief): SubmitGateItem | null {
  if (
    brief.section3.primaryApproach === "graduated_exposure" &&
    brief.section4.caregiverPresence === "present_comforting"
  ) {
    const m = GATE_META.graduated_exposure_comforting_caregiver;
    return {
      id: "graduated_exposure_comforting_caregiver",
      severity: m.severity,
      title: m.title,
      message: m.message,
      clinicalNote: m.clinicalNote,
    };
  }
  return null;
}

function checkConflictingApproachPair(brief: CompleteBrief): SubmitGateItem | null {
  const primary = brief.section3.primaryApproach;
  const supporting = brief.section3.supportingApproach;
  if (!primary || !supporting) return null;
  if (!isConflictingPair(primary, supporting)) return null;
  const m = GATE_META.conflicting_approach_pair;
  return {
    id: "conflicting_approach_pair",
    severity: m.severity,
    title: m.title,
    message: m.message,
    clinicalNote: m.clinicalNote,
  };
}

/**
 * Evaluates hard block + hard warning rules for a draft ready for final submit.
 * Callers should run this only when all sections are complete.
 */
export function evaluateBriefSubmitGate(brief: CompleteBrief): {
  hardBlocks: SubmitGateItem[];
  hardWarnings: SubmitGateItem[];
  /** Warning IDs already stored on the brief */
  acknowledgedWarningIds: Set<string>;
} {
  const hardBlocks: SubmitGateItem[] = [];
  const hardWarnings: SubmitGateItem[] = [];

  const relational = checkRelationalToolNoResponder(brief);
  if (relational) hardBlocks.push(relational);

  const sigYoung = checkSignificantIntensityYoungAge(brief);
  if (sigYoung) hardWarnings.push(sigYoung);

  const gradComfort = checkGraduatedExposureComfortingCaregiver(brief);
  if (gradComfort) hardWarnings.push(gradComfort);

  const conflict = checkConflictingApproachPair(brief);
  if (conflict) hardWarnings.push(conflict);

  return {
    hardBlocks,
    hardWarnings,
    acknowledgedWarningIds: new Set(brief.acknowledgedWarnings ?? []),
  };
}

