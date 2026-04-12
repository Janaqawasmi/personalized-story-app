/**
 * Section 16 / §10 — age and length keys used in page budget tables.
 */
export type Section16AgeRange = "3-5" | "5-7" | "7-9" | "9-12";
export type Section16StoryLength = "short" | "standard" | "extended";

/** Canonical caregiver enum (matches server `StoryBrief` / Firestore model). */
export type CanonicalCaregiverPresence =
  | "present_and_comforting"
  | "guides_from_the_side"
  | "leaves_and_returns"
  | "waiting_at_the_end"
  | "not_present";

export const CANONICAL_CAREGIVER_PRESENCE_LIST: readonly CanonicalCaregiverPresence[] = [
  "present_and_comforting",
  "guides_from_the_side",
  "leaves_and_returns",
  "waiting_at_the_end",
  "not_present",
] as const;

/**
 * Normalized obligation inputs — same semantics from client `CompleteBrief` or server `StoryBrief`
 * after adapter mapping (spec §16).
 */
export interface NormalizedComplexityParts {
  ageRange: Section16AgeRange;
  storyLength: Section16StoryLength;
  somaticSelectionCount: number;
  hasSupportingApproach: boolean;
  shameDimension: "not_significant" | "present" | "central";
  supportingCharacterCount: number;
  caregiverPresence: CanonicalCaregiverPresence;
  narrativeDistance: "direct" | "parallel" | "metaphorical";
}

export type ComplexityLoadState = "green" | "yellow" | "red";

export interface ComplexityBreakdownEntry {
  id: string;
  name: string;
  displayLabel: string;
  rawCost: number;
  scaledCost: number;
}

export interface ServerObligationRow {
  label: string;
  baseCost: number;
}

export interface ComplexityEngineResult {
  totalPageCost: number;
  ageMultiplier: number;
  budget: { min: number; max: number };
  loadState: ComplexityLoadState;
  clientBreakdown: ComplexityBreakdownEntry[];
  serverObligations: ServerObligationRow[];
}
