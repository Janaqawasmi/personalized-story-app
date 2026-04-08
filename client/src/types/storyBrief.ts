// client/src/types/storyBrief.ts
//
// Client-side Story Brief types and constants.
//
// These mirror the canonical definitions in server/src/models/storyBrief.model.ts
// but carry no server-only dependencies (firebase-admin, etc.).
// The spec source is /docs/dammah-story-brief-spec-v1.3.md.

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
// Section 2 — Clinical Foundation
// ============================================================================

// ---------------------------------------------------------------------------
// Field 2.1 — Emotional World of the Population
// ---------------------------------------------------------------------------

export const POPULATION_CHAR_LIMIT = 600;

/**
 * Collapsible thinking scaffold for Field 2.1 — not persisted, not sent to the agent.
 * Sub-questions guide the psychologist only.
 */
export interface PopulationThinkingScaffold {
  /** Header text when the panel is collapsed */
  summaryTitle: string;
  subQuestions: string[];
}

export const POPULATION_THINKING_SCAFFOLDS: Partial<
  Record<StoryType, PopulationThinkingScaffold>
> = {
  fear_anxiety: {
    summaryTitle: "Thinking scaffold — what to consider",
    subQuestions: [
      "What are they afraid will happen?",
      "What do they do to avoid it?",
      "What do adults misunderstand about this fear?",
    ],
  },
};

// ---------------------------------------------------------------------------
// Field 2.2 — The Specific Trigger
// ---------------------------------------------------------------------------

export const TRIGGER_CHAR_LIMIT = 400;

/** Character threshold below which the specificity nudge is shown. */
export const TRIGGER_NUDGE_THRESHOLD = 80;

export const TRIGGER_NUDGE =
  "Can you add what the child sees, hears, or feels in this moment?";

/** Label text adapts per story type (pilot: fear_anxiety only). */
export const TRIGGER_LABELS: Partial<Record<StoryType, string>> = {
  fear_anxiety: "The specific trigger",
};

// ---------------------------------------------------------------------------
// Field 2.3 — Therapeutic Intention
// ---------------------------------------------------------------------------

/** Character threshold (both halves combined) below which the nudge is shown. */
export const INTENTION_NUDGE_THRESHOLD = 60;

export const INTENTION_NUDGE =
  "This may be too brief for the agent to work with. Can you make the second half more specific?";

export interface IntentionExample {
  feel: string;
  because: string;
  /** Only set on bad examples — explains the problem. */
  note?: string;
}

/** Two good examples per story type, shown inline. */
export const INTENTION_GOOD_EXAMPLES: Partial<Record<StoryType, IntentionExample[]>> = {
  fear_anxiety: [
    {
      feel: "quietly brave",
      because: "they have discovered that asking for help is something brave people do",
    },
    {
      feel: "safely held",
      because:
        "they have experienced that the people who love them always come back, even when it doesn't feel that way",
    },
  ],
};

/** Two bad examples per story type, shown inline. */
export const INTENTION_BAD_EXAMPLES: Partial<Record<StoryType, IntentionExample[]>> = {
  fear_anxiety: [
    {
      feel: "better",
      because: "there's nothing to be scared of",
      note: "dismisses the fear",
    },
    {
      feel: "safe",
      because: "anxiety is a normal neurological response",
      note: "too clinical for a children's story",
    },
  ],
};

// ---------------------------------------------------------------------------
// Field 2.4 — Clinical Creative Vision
// ---------------------------------------------------------------------------

export const CREATIVE_VISION_CHAR_LIMIT = 400;

// ---------------------------------------------------------------------------
// Field 2.5 — One True Thing
// ---------------------------------------------------------------------------

export const ONE_TRUE_THING_CHAR_LIMIT = 300;

// ---------------------------------------------------------------------------
// Section 2 data shape
// ---------------------------------------------------------------------------

export interface ClinicalFoundation {
  /** 2.1 — required, max 600 chars */
  population: string;
  /** 2.2 — required, max 400 chars */
  trigger: string;
  /** 2.3 first half — required */
  intentionFeel: string;
  /** 2.3 second half — required */
  intentionBecause: string;
  /** 2.4 — required, max 400 chars */
  creativeVision: string;
  /** 2.5 — optional, max 300 chars */
  oneTrueThing: string;
}

// ============================================================================
// Section 3 — Therapeutic Architecture
// ============================================================================

// ---------------------------------------------------------------------------
// Field 3.1 / 3.2 — Therapeutic Approach (Fear & Anxiety options)
// ---------------------------------------------------------------------------

export const THERAPEUTIC_APPROACHES_FEAR_ANXIETY = [
  "normalization",
  "cognitive_reframing",
  "graduated_exposure",
  "modeling",
  "reassurance_predictability",
  "self_regulation",
  "psychoeducation",
] as const;

export type TherapeuticApproach = (typeof THERAPEUTIC_APPROACHES_FEAR_ANXIETY)[number];

export const THERAPEUTIC_APPROACHES_BY_TYPE: Partial<
  Record<StoryType, readonly TherapeuticApproach[]>
> = {
  fear_anxiety: THERAPEUTIC_APPROACHES_FEAR_ANXIETY,
};

export const THERAPEUTIC_APPROACH_LABELS: Record<TherapeuticApproach, string> = {
  normalization: "Normalization",
  cognitive_reframing: "Cognitive reframing",
  graduated_exposure: "Graduated exposure",
  modeling: "Modeling",
  reassurance_predictability: "Reassurance & predictability",
  self_regulation: "Self-regulation",
  psychoeducation: "Psychoeducation (age-appropriate)",
};

/** Psychologist-facing 1-sentence definitions from spec Section 13. */
export const THERAPEUTIC_APPROACH_DEFINITIONS: Record<TherapeuticApproach, string> = {
  normalization:
    "The story shows the child that their fear is common and shared — they are not alone or broken.",
  cognitive_reframing:
    "The story helps the child see the situation from a new angle — changing how they think about what scares them.",
  graduated_exposure:
    "The story walks the child through approaching the feared situation step by step — each step a little braver.",
  modeling:
    "The story shows another character successfully navigating the same fear — giving the child a model to follow.",
  reassurance_predictability:
    "The story creates safety through routine, predictability, and the reliable presence of trusted people.",
  self_regulation:
    "The story focuses on the child's ability to manage their own response — building internal capacity.",
  psychoeducation:
    "The story helps the child understand what is happening in their body or mind — naming the experience within the narrative, not as a lesson.",
};

/**
 * Pairs that trigger a conflict warning when selected together (primary + supporting).
 * Direction does not matter — check both orderings.
 */
/** Matches server `storyBrief.model` — unordered pairs for primary + supporting conflict (spec §8). */
export const CONFLICTING_APPROACH_PAIRS: Array<[TherapeuticApproach, TherapeuticApproach]> = [
  ["graduated_exposure", "reassurance_predictability"],
  ["self_regulation", "reassurance_predictability"],
  ["graduated_exposure", "normalization"],
];

// ---------------------------------------------------------------------------
// Field 3.3 — Shame Dimension
// ---------------------------------------------------------------------------

export const SHAME_DIMENSIONS = ["not_significant", "present", "central"] as const;
export type ShameDimension = (typeof SHAME_DIMENSIONS)[number];

export const SHAME_DIMENSION_LABELS: Record<ShameDimension, string> = {
  not_significant: "Not a significant factor in this story",
  present: "Present — handle with care",
  central: "Central to the experience",
};

export const SHAME_DIMENSION_DESCRIPTIONS: Record<ShameDimension, string> = {
  not_significant: "The agent does not need to address shame.",
  present:
    "The agent avoids anything implying fault but does not override the primary mechanism.",
  central:
    "The agent prioritizes normalization and follows three hard rules: the story must demonstrate the child is not alone; it must never imply the child should have known better; at least one character must respond with acceptance, not correction.",
};

// ---------------------------------------------------------------------------
// Field 3.4 — Somatic Expression (Fear & Anxiety)
// ---------------------------------------------------------------------------

export const SOMATIC_EXPRESSIONS = [
  "freezing",
  "crying_clinging",
  "stomach_ache",
  "heart_racing",
  "restless",
  "going_quiet",
  "tension",
  "sweating",
] as const;

export type SomaticExpression = (typeof SOMATIC_EXPRESSIONS)[number];

export const SOMATIC_EXPRESSION_LABELS: Record<SomaticExpression, string> = {
  freezing: "Freezing / going still",
  crying_clinging: "Crying / clinging",
  stomach_ache: "Stomach ache / feeling sick",
  heart_racing: "Heart racing / can't breathe",
  restless: "Restless / fidgety / can't sit still",
  going_quiet: "Going quiet / shutting down",
  tension: "Tension / clenching (jaw, fists, shoulders)",
  sweating: "Sweating / feeling hot",
};

export const SOMATIC_MAX_SELECT = 2;
export const SOMATIC_OTHER_CHAR_LIMIT = 150;

// ---------------------------------------------------------------------------
// Field 3.5 — Coping Tool
// ---------------------------------------------------------------------------

export const COPING_TOOLS = [
  "deep_breathing",
  "counting",
  "grounding_senses",
  "positive_self_talk",
  "visualization",
  "routine_awareness",
  "safe_person",
  "comfort_object",
  "asking_for_help",
] as const;

export type CopingTool = (typeof COPING_TOOLS)[number];

export const COPING_TOOL_LABELS: Record<CopingTool, string> = {
  deep_breathing: "Deep breathing",
  counting: "Counting",
  grounding_senses: "Grounding through senses",
  positive_self_talk: "Positive self-talk",
  visualization: "Visualization",
  routine_awareness: "Routine awareness",
  safe_person: "Safe person",
  comfort_object: "Comfort object or memory",
  asking_for_help: "Asking for help",
};

export interface CopingToolCategory {
  label: string;
  tools: CopingTool[];
}

/** Grouped coping tool options for Fear & Anxiety (Body / Mind / Connection). */
export const COPING_TOOL_CATEGORIES_FEAR_ANXIETY: CopingToolCategory[] = [
  { label: "Body", tools: ["deep_breathing", "counting", "grounding_senses"] },
  { label: "Mind", tools: ["positive_self_talk", "visualization", "routine_awareness"] },
  { label: "Connection", tools: ["safe_person", "comfort_object", "asking_for_help"] },
];

/** Abstract tools — trigger an age note when age range is 3–5. */
export const ABSTRACT_COPING_TOOLS: readonly CopingTool[] = [
  "routine_awareness",
  "visualization",
  "positive_self_talk",
];

// ---------------------------------------------------------------------------
// Field 3.6 — Resolution Completeness
// ---------------------------------------------------------------------------

export const RESOLUTION_OPTIONS = ["full", "partial", "open"] as const;
export type ResolutionCompleteness = (typeof RESOLUTION_OPTIONS)[number];

export const RESOLUTION_LABELS: Record<ResolutionCompleteness, string> = {
  full: "Full resolution",
  partial: "Partial resolution",
  open: "Open",
};

export const RESOLUTION_DESCRIPTIONS: Record<ResolutionCompleteness, string> = {
  full: "The protagonist overcomes the difficulty.",
  partial: "The protagonist takes a brave step but the feeling is not gone.",
  open: "The protagonist is better equipped but the journey continues.",
};

/** Default resolution per story type (spec §5 Field 3.6). Fear & Anxiety = partial. */
export const RESOLUTION_DEFAULTS: Partial<Record<StoryType, ResolutionCompleteness>> = {
  fear_anxiety: "partial",
};

// ---------------------------------------------------------------------------
// Field 3.7 — Must-Never List pre-filled defaults (spec Section 9)
//
// All 5 story types are defined here so the data model is complete even though
// the pilot UI only loads Fear & Anxiety. Each set contains exactly the 3 items
// listed in spec §9, verbatim.
// ---------------------------------------------------------------------------

export const MUST_NEVER_DEFAULTS: Record<StoryType, string[]> = {
  fear_anxiety: [
    "Never imply the child's fear is silly, irrational, or something to be ashamed of",
    `Never resolve the fear by someone else fixing the situation for the child (unless "Asking for help" is the selected coping tool)`,
    "Never depict the feared situation as actually dangerous or confirm the child's worst-case scenario",
  ],
  big_emotions: [
    "Never label the child's emotion as \"bad\" or \"wrong\"",
    "Never resolve the emotion by suppressing it — the emotion must be felt before it passes",
    "Never show other characters punishing or rejecting the child for their emotional expression",
  ],
  loss_grief: [
    "Never suggest the child should be \"over it\" or that the grief has a timeline",
    "Never replace what was lost — the story honors the loss, it does not undo it",
    "Never use euphemisms that obscure what happened (unless age-appropriate language requires softening)",
  ],
  identity_self_worth: [
    "Never reinforce the negative self-belief, even temporarily as a narrative device",
    "Never resolve the story by external validation alone — the shift must include internal recognition",
    "Never compare the child to others as a way to demonstrate their worth",
  ],
  life_transitions: [
    "Never dismiss what the child is losing in the transition",
    "Never suggest the child should be excited or grateful for the change",
    "Never present the old situation as inferior to the new one",
  ],
};

// ---------------------------------------------------------------------------
// Section 3 data shape
// ---------------------------------------------------------------------------

export interface TherapeuticArchitecture {
  /** 3.1 — required */
  primaryApproach: TherapeuticApproach;
  /** 3.2 — optional, must not equal primaryApproach */
  supportingApproach: TherapeuticApproach | null;
  /** 3.3 — required */
  shameDimension: ShameDimension;
  /** 3.4 — required for Fear & Anxiety, 1–2 items */
  somaticExpressions: SomaticExpression[];
  /** 3.4 free text — optional, max 150 chars */
  somaticOther: string;
  /** 3.5 — required */
  copingTool: CopingTool;
  /** 3.6 — required; defaults to partial for Fear & Anxiety */
  resolutionCompleteness: ResolutionCompleteness;
  /** 3.7 — required, min 1 non-empty item */
  mustNeverList: string[];
}

// ============================================================================
// Section 4 — Story World
// ============================================================================

// ---------------------------------------------------------------------------
// Field 4.0 — Personalization Decision
// ---------------------------------------------------------------------------

/** Default is "yes" for the pilot (Fear & Anxiety, ages 3–7). */
export const PERSONALIZATION_DEFAULT = "yes" as const;

export const PERSONALIZATION_OPTION_DESCRIPTIONS = {
  yes: "Parents add their child's name, gender, and photo. The protagonist is their child. Strongest identification.",
  no: "You design the protagonist fully. The child reads about someone else. Protective distance.",
} as const;

// ---------------------------------------------------------------------------
// Field 4.1 — Protagonist Gender (visible only when personalization is OFF)
// ---------------------------------------------------------------------------

export const PROTAGONIST_GENDERS = ["boy", "girl", "kept_open"] as const;
export type ProtagonistGender = (typeof PROTAGONIST_GENDERS)[number];

export const PROTAGONIST_GENDER_LABELS: Record<ProtagonistGender, string> = {
  boy: "Boy",
  girl: "Girl",
  kept_open: "Kept open",
};

export const PROTAGONIST_GENDER_NOTE: Record<ProtagonistGender, string | null> = {
  boy: null,
  girl: null,
  kept_open:
    "Agent uses a neutral animal name or ungendered fantasy character. No they/them pronouns for ages under 7.",
};

// ---------------------------------------------------------------------------
// Field 4.2 — Protagonist Type
// ---------------------------------------------------------------------------

export const PROTAGONIST_TYPES = ["child", "animal", "fantasy"] as const;
export type ProtagonistType = (typeof PROTAGONIST_TYPES)[number];

export const PROTAGONIST_TYPE_LABELS: Record<ProtagonistType, string> = {
  child: "Child character",
  animal: "Animal character",
  fantasy: "Fantasy character",
};

/** Non-binding age-range guidance notes shown below the selection. */
export const PROTAGONIST_TYPE_AGE_GUIDANCE: Partial<Record<AgeRange, string>> = {
  "3-5": "Animal characters are recommended for this age — they provide protective distance.",
  "5-7": "Both animal and child characters work well at this age.",
  "7-9": "Child characters enable stronger identification for older readers.",
  "9-12": "Child characters enable stronger identification for older readers.",
};

// ---------------------------------------------------------------------------
// Field 4.3 — Protagonist Age Relative to Reader (visible only if pers. OFF)
// ---------------------------------------------------------------------------

export const PROTAGONIST_AGE_RELATIVES = ["same_age", "slightly_older"] as const;
export type ProtagonistAgeRelative = (typeof PROTAGONIST_AGE_RELATIVES)[number];

export const PROTAGONIST_AGE_RELATIVE_DEFAULT: ProtagonistAgeRelative = "same_age";

export const PROTAGONIST_AGE_RELATIVE_LABELS: Record<ProtagonistAgeRelative, string> = {
  same_age: "Same age",
  slightly_older: "Slightly older",
};

// ---------------------------------------------------------------------------
// Field 4.4 — Caregiver's Presence
// ---------------------------------------------------------------------------

export const CAREGIVER_PRESENCES = [
  "present_comforting",
  "guides_side",
  "leaves_returns",
  "waiting_end",
  "not_present",
] as const;
export type CaregiverPresence = (typeof CAREGIVER_PRESENCES)[number];

export const CAREGIVER_PRESENCE_LABELS: Record<CaregiverPresence, string> = {
  present_comforting: "Present and comforting",
  guides_side: "Guides from the side",
  leaves_returns: "Leaves and returns",
  waiting_end: "Waiting at the end",
  not_present: "Not present",
};

/** Extra clarifying description shown only for certain options. */
export const CAREGIVER_PRESENCE_DESCRIPTIONS: Partial<Record<CaregiverPresence, string>> = {
  leaves_returns:
    "The caregiver departs during the story and comes back. The story includes both the goodbye and the reunion.",
};

// ---------------------------------------------------------------------------
// Field 4.5 — Narrative Distance
// ---------------------------------------------------------------------------

export const NARRATIVE_DISTANCES = ["direct", "parallel", "metaphorical"] as const;
export type NarrativeDistance = (typeof NARRATIVE_DISTANCES)[number];

export const NARRATIVE_DISTANCE_LABELS: Record<NarrativeDistance, string> = {
  direct: "Direct",
  parallel: "Parallel",
  metaphorical: "Metaphorical",
};

export const NARRATIVE_DISTANCE_DEFINITIONS: Record<NarrativeDistance, string> = {
  direct:
    "Story mirrors the real situation closely. Same setting, same challenge, recognizable world.",
  parallel:
    "Similar situation with softened or shifted details. Different setting, same emotional core.",
  metaphorical:
    "Situation represented symbolically. The challenge is abstracted into a fantasy or symbolic scenario.",
};

export const PARALLEL_CHALLENGE_CHAR_LIMIT = 200;

// ---------------------------------------------------------------------------
// Field 4.6 — Supporting Characters (multi-select up to 2)
// ---------------------------------------------------------------------------

export const SUPPORTING_CHARACTERS = [
  "peer_shows_possible",
  "peer_alongside",
  "teacher_adult_guides",
  "animal_friend",
  "sibling_perspective",
] as const;
export type SupportingCharacter = (typeof SUPPORTING_CHARACTERS)[number];

export const SUPPORTING_CHARACTER_LABELS: Record<SupportingCharacter, string> = {
  peer_shows_possible: "A peer who shows it's possible",
  peer_alongside: "A peer who goes through it alongside",
  teacher_adult_guides: "A teacher or adult who guides",
  animal_friend: "An animal friend who accompanies",
  sibling_perspective: "A sibling who offers perspective",
};

export const SUPPORTING_CHARACTER_MAX_SELECT = 2;
export const CHARACTER_ROLE_NOTE_CHAR_LIMIT = 150;

// ---------------------------------------------------------------------------
// Field 4.7 — Character Notes
// ---------------------------------------------------------------------------

export const CHARACTER_NOTES_CHAR_LIMIT = 300;

// ---------------------------------------------------------------------------
// Section 4 data shape
// ---------------------------------------------------------------------------

export interface StoryWorld {
  /** 4.0 — required, default "yes" */
  personalization: "yes" | "no";
  /** 4.1 — required if personalization OFF, otherwise ignored */
  protagonistGender: ProtagonistGender | null;
  /** 4.2 — required; locked to "child" if personalization ON */
  protagonistType: ProtagonistType;
  /** 4.3 — required if personalization OFF, default "same_age" */
  protagonistAgeRelative: ProtagonistAgeRelative;
  /** 4.4 — required */
  caregiverPresence: CaregiverPresence;
  /** 4.5 — required */
  narrativeDistance: NarrativeDistance;
  /** 4.5 sub-field — optional, max 200 chars; only meaningful when narrativeDistance = "parallel" */
  parallelChallenge: string;
  /** 4.6 — optional, up to 2 */
  supportingCharacters: SupportingCharacter[];
  /** 4.6 sub-field — optional role note per selected character, max 150 chars each */
  characterRoleNotes: Partial<Record<SupportingCharacter, string>>;
  /** 4.7 — optional, max 300 chars */
  characterNotes: string;
}

// ============================================================================
// Section 5 — Personalization Configuration
// ============================================================================

// ---------------------------------------------------------------------------
// Field 5.2 — Why Not (shown when personalization OFF, required)
// ---------------------------------------------------------------------------

export const WHY_NOT_CHAR_LIMIT = 400;

// ---------------------------------------------------------------------------
// Section 5 data shape
// ---------------------------------------------------------------------------

export interface PersonalizationConfig {
  /** 5.2 — required when personalization OFF, max 400 chars */
  whyNot: string;
}

// ============================================================================
// Full brief aggregate — used by BriefForm orchestrator
// ============================================================================

export interface CompleteBrief {
  storyType: StoryType | null;
  section1: Partial<AgeAndScope>;
  section2: Partial<ClinicalFoundation>;
  section3: Partial<TherapeuticArchitecture>;
  section4: Partial<StoryWorld>;
  section5: Partial<PersonalizationConfig>;
  /**
   * IDs of cross-field hard warnings the psychologist acknowledged before submit (spec §8).
   * Mirrors server `StoryBrief.acknowledgedWarnings`.
   */
  acknowledgedWarnings?: string[];
  /** Unix timestamp (ms) set by auto-save. */
  savedAt?: number;
  /**
   * Highest section index (1–5) the specialist has navigated to in this session.
   * Used to show progress completion state.
   */
  highestSectionVisited?: number;
}

export function createEmptyBrief(): CompleteBrief {
  return {
    storyType: null,
    section1: {},
    section2: {},
    section3: {},
    section4: {},
    section5: {},
  };
}

// ---------------------------------------------------------------------------
// Default persistence — UI shows spec defaults before they are written to
// `draft`. Progress and submit must treat them like saved values (see BriefForm).
// ---------------------------------------------------------------------------

/** Persist Field 1.3 default once 1.1+1.2 are set (same rule as BriefForm). */
export function withSection1StoryLengthDefault(d: CompleteBrief): CompleteBrief {
  const s1 = d.section1;
  if (!s1.ageRange || !s1.peakIntensity) return d;
  if (s1.storyLength != null) return d;
  return {
    ...d,
    section1: { ...s1, storyLength: STORY_LENGTH_DEFAULT },
  };
}

/** Optional locale-specific string lists for UI defaults (e.g. Hebrew brief copy). */
export interface BriefDefaultsLocaleOptions {
  mustNeverDefaults?: Record<StoryType, string[]>;
}

/** Commit Field 3.6 / 3.7 defaults when still absent (matches Section 3 UI). */
export function mergeSection3UiDefaultsIntoDraft(
  draft: CompleteBrief,
  locale?: BriefDefaultsLocaleOptions,
): CompleteBrief {
  const st = draft.storyType;
  if (!st) return draft;
  const s = draft.section3;
  let changed = false;
  const next: typeof s = { ...s };

  if (s.resolutionCompleteness == null) {
    const def = RESOLUTION_DEFAULTS[st];
    if (def != null) {
      next.resolutionCompleteness = def;
      changed = true;
    }
  }

  if (!s.mustNeverList?.length) {
    const defs = locale?.mustNeverDefaults?.[st] ?? MUST_NEVER_DEFAULTS[st];
    if (defs?.length) {
      next.mustNeverList = [...defs];
      changed = true;
    }
  }

  if (!changed) return draft;
  return { ...draft, section3: next };
}

/** Commit Section 4 defaults shown in UI but not yet written to draft (personalization on, Field 4.3). */
export function mergeSection4PersonalizationDefaults(draft: CompleteBrief): CompleteBrief {
  const s = draft.section4;
  const personalized = (s.personalization ?? PERSONALIZATION_DEFAULT) === "yes";
  let changed = false;
  const next: typeof s = { ...s };

  if (personalized && s.protagonistType == null) {
    next.protagonistType = "child";
    changed = true;
  }
  if (s.protagonistAgeRelative == null) {
    next.protagonistAgeRelative = PROTAGONIST_AGE_RELATIVE_DEFAULT;
    changed = true;
  }

  if (!changed) return draft;
  return { ...draft, section4: next };
}

/** Apply all UI defaults so draft, progress, and storage stay aligned. */
export function normalizeBriefDefaults(
  draft: CompleteBrief,
  locale?: BriefDefaultsLocaleOptions,
): CompleteBrief {
  let d = draft;
  d = withSection1StoryLengthDefault(d);
  d = mergeSection3UiDefaultsIntoDraft(d, locale);
  d = mergeSection4PersonalizationDefaults(d);
  return d;
}

/** Remove client-only metadata before API submit or canonical JSON export. */
export function omitUiOnlyBriefFields(brief: CompleteBrief): CompleteBrief {
  const { savedAt: _savedAt, highestSectionVisited: _vis, ...rest } = brief;
  return rest;
}

/** Returns true when the given section has all required fields filled. */
export function isSectionComplete(section: number, draft: CompleteBrief): boolean {
  switch (section) {
    case 1: {
      const s = draft.section1;
      // 1.1–1.3 all required; 1.3 defaults to Standard in UI (see BriefForm)
      const storyLength = s.storyLength ?? STORY_LENGTH_DEFAULT;
      return !!(s.ageRange && s.peakIntensity && storyLength);
    }
    case 2: {
      const s = draft.section2;
      return !!(
        s.population?.trim() &&
        s.trigger?.trim() &&
        s.intentionFeel?.trim() &&
        s.intentionBecause?.trim() &&
        s.creativeVision?.trim()
      );
    }
    case 3: {
      const s = draft.section3;
      const st = draft.storyType;
      if (!st) return false;
      const resolution =
        s.resolutionCompleteness ?? RESOLUTION_DEFAULTS[st] ?? null;
      const mustNever =
        s.mustNeverList != null && s.mustNeverList.length > 0
          ? s.mustNeverList
          : (MUST_NEVER_DEFAULTS[st] ?? []);
      return !!(
        s.primaryApproach &&
        s.shameDimension &&
        s.somaticExpressions?.length &&
        s.copingTool &&
        resolution &&
        mustNever.length > 0 &&
        mustNever.every((item) => item.trim())
      );
    }
    case 4: {
      const s = draft.section4;
      const personalized = (s.personalization ?? PERSONALIZATION_DEFAULT) === "yes";
      const protagonistType = personalized ? (s.protagonistType ?? "child") : s.protagonistType;
      return !!(
        s.caregiverPresence &&
        s.narrativeDistance &&
        protagonistType &&
        (personalized || s.protagonistGender)
      );
    }
    case 5: {
      const personalized = (draft.section4.personalization ?? PERSONALIZATION_DEFAULT) === "yes";
      if (personalized) {
        // Confirmation-only step (no extra inputs). Do not mark complete until Story World is
        // satisfied — otherwise default personalization ("yes") makes the stepper show step 5
        // green before the user has filled earlier sections.
        return isSectionComplete(4, draft);
      }
      return !!(draft.section5.whyNot?.trim());
    }
    default:
      return false;
  }
}

// ============================================================================
// Section 1 cross-field warnings (referenced by Section 1 component)
// ============================================================================

/** The spec cross-field warning message for significant intensity + ages 3–5. */
export const WARN_SIGNIFICANT_YOUNG_AGE =
  "Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?";
