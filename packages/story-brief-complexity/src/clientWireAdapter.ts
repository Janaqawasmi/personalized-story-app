import { AGE_RANGES, STORY_LENGTHS } from "./constants";
import type {
  CanonicalCaregiverPresence,
  NormalizedComplexityParts,
  Section16AgeRange,
  Section16StoryLength,
} from "./types";
import { CANONICAL_CAREGIVER_PRESENCE_LIST } from "./types";

const DEFAULT_AGE: Section16AgeRange = "3-5";
const DEFAULT_LENGTH: Section16StoryLength = "standard";

/** Client `CompleteBrief` caregiver strings → canonical (server) caregiver enum. */
const CLIENT_CAREGIVER_TO_CANONICAL: Record<string, CanonicalCaregiverPresence> = {
  present_comforting: "present_and_comforting",
  guides_side: "guides_from_the_side",
  leaves_returns: "leaves_and_returns",
  waiting_end: "waiting_at_the_end",
  not_present: "not_present",
};

const SERVER_CAREGIVER_SET = new Set<string>([...CANONICAL_CAREGIVER_PRESENCE_LIST]);

function coerceAgeRange(v: unknown): Section16AgeRange {
  return typeof v === "string" && (AGE_RANGES as readonly string[]).includes(v)
    ? (v as Section16AgeRange)
    : DEFAULT_AGE;
}

function coerceStoryLength(v: unknown): Section16StoryLength {
  return typeof v === "string" && (STORY_LENGTHS as readonly string[]).includes(v)
    ? (v as Section16StoryLength)
    : DEFAULT_LENGTH;
}

function normalizeCaregiver(raw: unknown): CanonicalCaregiverPresence {
  if (typeof raw !== "string") {
    return "present_and_comforting";
  }
  if (SERVER_CAREGIVER_SET.has(raw)) {
    return raw as CanonicalCaregiverPresence;
  }
  return CLIENT_CAREGIVER_TO_CANONICAL[raw] ?? "present_and_comforting";
}

function normalizeShame(raw: unknown): NormalizedComplexityParts["shameDimension"] {
  if (raw === "central" || raw === "present" || raw === "not_significant") {
    return raw;
  }
  return "not_significant";
}

function normalizeNarrative(raw: unknown): NormalizedComplexityParts["narrativeDistance"] {
  if (raw === "parallel" || raw === "metaphorical" || raw === "direct") {
    return raw;
  }
  return "direct";
}

/**
 * True when payload matches client `CompleteBrief` (section1…5), not canonical `StoryBrief`.
 */
export function isClientWireBriefPayload(b: unknown): b is Record<string, unknown> {
  if (typeof b !== "object" || b === null) return false;
  const o = b as Record<string, unknown>;
  return "section1" in o && !("ageAndScope" in o);
}

/**
 * Client / wire JSON (`CompleteBrief`, damma-story-brief-form-v1) → normalized §16 parts.
 */
export function extractComplexityPartsFromClientWire(wire: unknown): NormalizedComplexityParts {
  const w = typeof wire === "object" && wire !== null ? (wire as Record<string, unknown>) : {};

  const s1 = (w.section1 ?? {}) as Record<string, unknown>;
  const s3 = (w.section3 ?? {}) as Record<string, unknown>;
  const s4 = (w.section4 ?? {}) as Record<string, unknown>;

  const ageRange = coerceAgeRange(s1.ageRange);
  const storyLength = coerceStoryLength(s1.storyLength);

  /** Matches specialist UI: somatic for Fear & Anxiety or undecided story type (`null`). */
  const storyType = w.storyType;
  const allowSomatic = storyType === "fear_anxiety" || storyType == null;
  let somaticSelectionCount = 0;
  if (allowSomatic) {
    const som = s3.somaticExpressions;
    if (Array.isArray(som)) {
      somaticSelectionCount = som.length;
    }
  }

  const sup = s4.supportingCharacters;
  const supportingCharacterCount = Array.isArray(sup) ? sup.length : 0;

  return {
    ageRange,
    storyLength,
    somaticSelectionCount,
    hasSupportingApproach: s3.supportingApproach != null && s3.supportingApproach !== "",
    shameDimension: normalizeShame(s3.shameDimension),
    supportingCharacterCount,
    caregiverPresence: normalizeCaregiver(s4.caregiverPresence),
    narrativeDistance: normalizeNarrative(s4.narrativeDistance),
  };
}
