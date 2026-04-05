// client/src/types/storyBrief.ts
//
// Client-side Story Brief types and constants.
//
// These mirror the canonical definitions in server/src/models/storyBrief.model.ts
// but carry no server-only dependencies (firebase-admin, etc.).
// The spec source is /docs/dammah-story-brief-spec-v1.2.md.

// ============================================================================
// Pre-brief: Story Type Selector
// ============================================================================

export const STORY_TYPES = [
  "fear_anxiety",
  "big_emotions",
  "loss_grief",
  "identity_self_worth",
  "life_transitions",
] as const;

export type StoryType = (typeof STORY_TYPES)[number];

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  fear_anxiety: "Fear & Anxiety",
  big_emotions: "Big Emotions",
  loss_grief: "Loss & Grief",
  identity_self_worth: "Identity & Self-Worth",
  life_transitions: "Life Transitions",
};

export const STORY_TYPE_DESCRIPTIONS: Record<StoryType, string> = {
  fear_anxiety: "Stories about specific fears, worries, anxious responses to situations",
  big_emotions:
    "Stories about overwhelming emotions — anger, frustration, sadness, overstimulation",
  loss_grief: "Stories about losing someone or something important",
  identity_self_worth: "Stories about how a child sees themselves, feels about themselves",
  life_transitions:
    "Stories about major changes — new sibling, moving, starting school, divorce",
};

// ============================================================================
// Section 1 — Age & Story Scope
// ============================================================================

// ---------------------------------------------------------------------------
// Field 1.1 — Target Age Range
// ---------------------------------------------------------------------------

export const AGE_RANGES = ["3-5", "5-7", "7-9", "9-12"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "3-5": "3–5",
  "5-7": "5–7",
  "7-9": "7–9",
  "9-12": "9–12",
};

// ---------------------------------------------------------------------------
// Field 1.2 — Peak Emotional Intensity
// ---------------------------------------------------------------------------

export const PEAK_INTENSITIES = ["very_gentle", "moderate", "significant"] as const;
export type PeakIntensity = (typeof PEAK_INTENSITIES)[number];

export const PEAK_INTENSITY_LABELS: Record<PeakIntensity, string> = {
  very_gentle: "Very gentle",
  moderate: "Moderate",
  significant: "Significant",
};

export const PEAK_INTENSITY_DEFINITIONS: Record<PeakIntensity, string> = {
  very_gentle:
    "The protagonist feels uneasy or uncertain; discomfort is brief",
  moderate:
    "The protagonist experiences real distress but within a contained arc",
  significant:
    "The protagonist is genuinely overwhelmed before the resolution",
};

// ---------------------------------------------------------------------------
// Field 1.3 — Story Length
// ---------------------------------------------------------------------------

export const STORY_LENGTHS = ["short", "standard", "extended"] as const;
export type StoryLength = (typeof STORY_LENGTHS)[number];

export const STORY_LENGTH_DEFAULT: StoryLength = "standard";

export const STORY_LENGTH_LABELS: Record<StoryLength, string> = {
  short: "Short",
  standard: "Standard",
  extended: "Extended",
};

/** Preview description shown after selecting age range + story length. */
export const STORY_LENGTH_PREVIEWS: Record<AgeRange, Record<StoryLength, string>> = {
  "3-5": {
    short: "A brief story of about 6–8 pages, read aloud in 3–5 minutes",
    standard: "A bedtime-length story of about 8–12 pages, read aloud in 5–7 minutes",
    extended: "A longer story of about 12–16 pages, read aloud in 8–10 minutes",
  },
  "5-7": {
    short: "A brief story of about 8–10 pages, read aloud in 4–6 minutes",
    standard: "A bedtime-length story of about 10–14 pages, read aloud in 6–9 minutes",
    extended: "A longer story of about 14–18 pages, read aloud in 9–12 minutes",
  },
  "7-9": {
    short: "A short chapter of about 10–12 pages, read aloud in 6–8 minutes",
    standard: "A standard chapter of about 12–16 pages, read aloud in 8–12 minutes",
    extended: "A longer chapter of about 16–22 pages, read aloud in 12–16 minutes",
  },
  "9-12": {
    short: "A short story of about 12–15 pages, read aloud in 8–12 minutes",
    standard: "A standard story of about 15–20 pages, read aloud in 12–18 minutes",
    extended: "A longer story of about 20–28 pages, read aloud in 18–25 minutes",
  },
};

// ---------------------------------------------------------------------------
// Section 1 data shape
// ---------------------------------------------------------------------------

export interface AgeAndScope {
  ageRange: AgeRange;
  peakIntensity: PeakIntensity;
  storyLength: StoryLength;
}

// ============================================================================
// Section 3 constants referenced by Section 1 warnings
// ============================================================================

/** The spec cross-field warning message for significant intensity + ages 3–5. */
export const WARN_SIGNIFICANT_YOUNG_AGE =
  "Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?";
