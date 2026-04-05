// server/src/models/storyBrief.model.ts
//
// Complete data model for the DAMMAH Story Brief system (spec v1.2).
// Canonical source: /docs/dammah-story-brief-spec-v1.2.md
//
// This file defines:
//   1. Value types (union types for every constrained field)
//   2. Sub-field & section interfaces
//   3. Main StoryBrief interface
//   4. Constants: character limits, option labels, defaults
//   5. Story type routing configuration
//   6. Field registry (comprehensive field metadata)

import type { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// PART 1 — VALUE TYPES
// ============================================================================

// ---------------------------------------------------------------------------
// Pre-brief: Story Type Selector
// ---------------------------------------------------------------------------

export const STORY_TYPES = [
  "fear_anxiety",
  "big_emotions",
  "loss_grief",
  "identity_self_worth",
  "life_transitions",
] as const;

export type StoryType = (typeof STORY_TYPES)[number];

// ---------------------------------------------------------------------------
// Section 1 — Age & Story Scope
// ---------------------------------------------------------------------------

export const AGE_RANGES = ["3-5", "5-7", "7-9", "9-12"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const PEAK_INTENSITIES = ["very_gentle", "moderate", "significant"] as const;
export type PeakIntensity = (typeof PEAK_INTENSITIES)[number];

export const STORY_LENGTHS = ["short", "standard", "extended"] as const;
export type StoryLength = (typeof STORY_LENGTHS)[number];

// ---------------------------------------------------------------------------
// Section 3 — Therapeutic Architecture
// ---------------------------------------------------------------------------

// Approaches: Fear & Anxiety (pilot). Other types will add their own.
export const FEAR_ANXIETY_APPROACHES = [
  "normalization",
  "cognitive_reframing",
  "graduated_exposure",
  "modeling",
  "reassurance_predictability",
  "self_regulation",
  "psychoeducation",
] as const;

export type FearAnxietyApproach = (typeof FEAR_ANXIETY_APPROACHES)[number];

// Expands as new story types define their approach lists
export type TherapeuticApproach = FearAnxietyApproach;

export const SHAME_DIMENSIONS = ["not_significant", "present", "central"] as const;
export type ShameDimension = (typeof SHAME_DIMENSIONS)[number];

// Somatic expressions: Fear & Anxiety field 3.4
export const SOMATIC_EXPRESSIONS = [
  "freezing_going_still",
  "crying_clinging",
  "stomach_ache_feeling_sick",
  "heart_racing_cant_breathe",
  "restless_fidgety",
  "going_quiet_shutting_down",
  "tension_clenching",
  "sweating_feeling_hot",
] as const;

export type SomaticExpression = (typeof SOMATIC_EXPRESSIONS)[number];

// Coping tools: Fear & Anxiety (pilot). Other types will add their own.
export const FEAR_ANXIETY_COPING_TOOLS = [
  "deep_breathing",
  "counting",
  "grounding_through_senses",
  "positive_self_talk",
  "visualization",
  "routine_awareness",
  "safe_person",
  "comfort_object_or_memory",
  "asking_for_help",
] as const;

export type FearAnxietyCopingTool = (typeof FEAR_ANXIETY_COPING_TOOLS)[number];

export type CopingTool = FearAnxietyCopingTool;

export const COPING_TOOL_CATEGORIES = ["body", "mind", "connection"] as const;
export type CopingToolCategory = (typeof COPING_TOOL_CATEGORIES)[number];

export const RESOLUTION_OPTIONS = ["full", "partial", "open"] as const;
export type ResolutionCompleteness = (typeof RESOLUTION_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Section 4 — Story World
// ---------------------------------------------------------------------------

export const PROTAGONIST_GENDERS = ["boy", "girl", "kept_open"] as const;
export type ProtagonistGender = (typeof PROTAGONIST_GENDERS)[number];

export const PROTAGONIST_TYPES = ["child", "animal", "fantasy"] as const;
export type ProtagonistType = (typeof PROTAGONIST_TYPES)[number];

export const PROTAGONIST_AGES = ["same_age", "slightly_older"] as const;
export type ProtagonistAge = (typeof PROTAGONIST_AGES)[number];

export const CAREGIVER_PRESENCES = [
  "present_and_comforting",
  "guides_from_the_side",
  "leaves_and_returns",
  "waiting_at_the_end",
  "not_present",
] as const;

export type CaregiverPresence = (typeof CAREGIVER_PRESENCES)[number];

export const NARRATIVE_DISTANCES = ["direct", "parallel", "metaphorical"] as const;
export type NarrativeDistance = (typeof NARRATIVE_DISTANCES)[number];

export const SUPPORTING_CHARACTER_TYPES = [
  "peer_shows_possible",
  "peer_alongside",
  "teacher_adult_guides",
  "animal_friend",
  "sibling_perspective",
] as const;

export type SupportingCharacterType = (typeof SUPPORTING_CHARACTER_TYPES)[number];

// ============================================================================
// PART 2 — SUB-FIELD INTERFACES
// ============================================================================

// ---------------------------------------------------------------------------
// Field 2.3 — Therapeutic Intention (completion format)
// Format: "When a child closes this book, they should feel ___ because ___"
// ---------------------------------------------------------------------------

export interface TherapeuticIntention {
  feel: string;
  because: string;
}

// ---------------------------------------------------------------------------
// Field 4.6 — Supporting Character Selection (with optional functional role)
// ---------------------------------------------------------------------------

export interface SupportingCharacterSelection {
  type: SupportingCharacterType;
  /** Field 4.6 sub-field: "What does this character do at the story's key moment?" 150 chars */
  functionalRole?: string;
}

// ---------------------------------------------------------------------------
// Field 3.4 — Type-Specific Clinical Field (discriminated union)
//
// Each story type has an entirely different field here.
// The discriminator is the `fieldType` property.
// ---------------------------------------------------------------------------

/** Fear & Anxiety: "How does the anxiety show up in the body?" */
export interface SomaticExpressionField {
  fieldType: "somatic_expression";
  /** 1–2 selections from SOMATIC_EXPRESSIONS */
  selections: SomaticExpression[];
  /** "Anything else the body does?" — 150 chars, optional */
  freeText?: string;
}

/** Big Emotions: "What does the emotion look like?" (body, behavior, words) */
export interface EmotionAppearanceField {
  fieldType: "emotion_appearance";
  /** Free text, 300 chars */
  text: string;
}

/** Loss & Grief: "Where is the child in the grief process?" */
export interface GriefProcessField {
  fieldType: "grief_process";
  /** Single choice — options TBD for non-pilot */
  selection: string;
}

/** Identity & Self-Worth: "The negative self-belief" */
export interface NegativeSelfBeliefField {
  fieldType: "negative_self_belief";
  /** Free text, 200 chars */
  text: string;
}

/** Life Transitions: "What is being lost in this transition?" */
export interface TransitionLossField {
  fieldType: "transition_loss";
  /** Free text, 300 chars */
  text: string;
}

export type TypeSpecificClinicalField =
  | SomaticExpressionField
  | EmotionAppearanceField
  | GriefProcessField
  | NegativeSelfBeliefField
  | TransitionLossField;

// ============================================================================
// PART 3 — SECTION INTERFACES & MAIN BRIEF INTERFACE
// ============================================================================

// ---------------------------------------------------------------------------
// Section 1 — Age & Story Scope
// ---------------------------------------------------------------------------

export interface AgeAndScope {
  /** Field 1.1 — Target age range. Single choice, required. */
  ageRange: AgeRange;
  /** Field 1.2 — Peak emotional intensity. Single choice, required. */
  peakIntensity: PeakIntensity;
  /** Field 1.3 — Story length. Single choice, required. Default: "standard". */
  storyLength: StoryLength;
}

// ---------------------------------------------------------------------------
// Section 2 — Clinical Foundation
// ---------------------------------------------------------------------------

export interface ClinicalFoundation {
  /** Field 2.1 — Emotional world of the population. Free text, 600 chars, required. */
  population: string;
  /** Field 2.2 — The specific trigger. Free text, 400 chars, required. */
  trigger: string;
  /** Field 2.3 — Therapeutic intention. Completion format, both halves required. */
  therapeuticIntention: TherapeuticIntention;
  /** Field 2.4 — Clinical creative vision. Free text, 400 chars, required. */
  creativeVision: string;
  /** Field 2.5 — One true thing. Free text, 300 chars, optional. */
  oneTrueThing?: string;
}

// ---------------------------------------------------------------------------
// Section 3 — Therapeutic Architecture
// ---------------------------------------------------------------------------

export interface TherapeuticArchitecture {
  /** Field 3.1 — Primary therapeutic approach. Single choice, required. Options vary per type. */
  primaryApproach: TherapeuticApproach;
  /** Field 3.2 — Supporting approach. Single choice, optional. Same list minus primary. */
  supportingApproach?: TherapeuticApproach;
  /** Field 3.3 — Shame dimension. Single choice (3 levels), required. */
  shameDimension: ShameDimension;
  /** Field 3.4 — Type-specific clinical field. Shape varies per story type, required. */
  typeSpecificField: TypeSpecificClinicalField;
  /** Field 3.5 — The coping tool. Single choice, required. Options vary per type. */
  copingTool: CopingTool;
  /** Field 3.6 — Resolution completeness. Single choice, required. Default varies per type. */
  resolutionCompleteness: ResolutionCompleteness;
  /** Field 3.7 — What this story must never do. Free text list, min 1 item, required. */
  mustNeverList: string[];
}

// ---------------------------------------------------------------------------
// Section 4 — Story World
// ---------------------------------------------------------------------------

export interface StoryWorld {
  /** Field 4.0 — Personalization decision. Binary yes/no, required. Default: true (pilot). */
  personalization: boolean;

  /**
   * Field 4.1 — Protagonist gender. Single choice.
   * Conditional: only present when personalization is OFF.
   */
  protagonistGender?: ProtagonistGender;

  /**
   * Field 4.2 — Protagonist type. Single choice, required.
   * When personalization ON → locked to "child".
   */
  protagonistType: ProtagonistType;

  /**
   * Field 4.3 — Protagonist age relative to reader. Single choice.
   * Conditional: only present when personalization is OFF. Default: "same_age".
   */
  protagonistAge?: ProtagonistAge;

  /** Field 4.4 — Caregiver's presence. Single choice (5 options), required. */
  caregiverPresence: CaregiverPresence;

  /** Field 4.5 — Narrative distance. Single choice, required. */
  narrativeDistance: NarrativeDistance;

  /**
   * Field 4.5 sub-field — Parallel equivalent challenge. Free text, 200 chars, optional.
   * Conditional: only present when narrativeDistance is "parallel".
   */
  parallelChallenge?: string;

  /**
   * Field 4.6 — Supporting characters. Multi-choice up to 2.
   * Conditionally required: if relational coping tool + no present caregiver.
   * Each entry includes the character type and an optional functional role sub-field.
   */
  supportingCharacters?: SupportingCharacterSelection[];

  /** Field 4.7 — Character notes. Free text, 300 chars, optional. */
  characterNotes?: string;
}

// ---------------------------------------------------------------------------
// Section 5 — Personalization Configuration
// ---------------------------------------------------------------------------

export interface PersonalizationConfig {
  /**
   * Field 5.1 — Personalization constraints. Free text list with pre-filled defaults.
   * Conditional: only present when personalization is ON. Optional (defaults shown).
   */
  personalizationConstraints?: string[];

  /**
   * Field 5.2 — Why not. Free text.
   * Conditional: required when personalization is OFF.
   */
  whyNot?: string;
}

// ---------------------------------------------------------------------------
// Brief Status & Metadata
// ---------------------------------------------------------------------------

export type StoryBriefStatus =
  | "draft"
  | "complete"
  | "submitted"
  | "generating"
  | "generated"
  | "archived";

// ---------------------------------------------------------------------------
// Main StoryBrief Interface
// ---------------------------------------------------------------------------

export interface StoryBrief {
  /** Firestore document ID (auto-generated) */
  id?: string;

  // ── System metadata ──────────────────────────────────────────────────────
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** UID of the specialist who created this brief */
  createdBy: string;
  status: StoryBriefStatus;
  /** Document version, starts at 1 */
  version: number;
  lockedAt?: Timestamp;
  lockedByDraftId?: string;

  // ── Pre-brief ────────────────────────────────────────────────────────────
  /** Story type selector. Routes the entire form. */
  storyType: StoryType;

  // ── Sections ─────────────────────────────────────────────────────────────
  ageAndScope: AgeAndScope;
  clinicalFoundation: ClinicalFoundation;
  therapeuticArchitecture: TherapeuticArchitecture;
  storyWorld: StoryWorld;
  personalizationConfig: PersonalizationConfig;

  // ── Cross-field validation acknowledgments ───────────────────────────────
  /**
   * IDs of hard warnings the psychologist acknowledged before submission.
   * See CROSS_FIELD_VALIDATIONS for the full list.
   */
  acknowledgedWarnings?: string[];

  /**
   * Tracks which sections have been completed (for save/resume).
   * Key: section number (1–5), Value: true if section saved.
   */
  completedSections?: Record<string, boolean>;
}

// ============================================================================
// PART 4 — INPUT / OUTPUT TYPES
// ============================================================================

/**
 * Input type for creating or updating a story brief.
 * Excludes system-controlled fields.
 */
export type StoryBriefInput = Omit<
  StoryBrief,
  "id" | "createdAt" | "updatedAt" | "status" | "version" | "lockedAt" | "lockedByDraftId"
>;

/**
 * Partial input for saving an in-progress section.
 * Only the section being saved is required; the rest are optional.
 */
export interface StoryBriefPartialUpdate {
  storyType?: StoryType;
  ageAndScope?: Partial<AgeAndScope>;
  clinicalFoundation?: Partial<ClinicalFoundation>;
  therapeuticArchitecture?: Partial<TherapeuticArchitecture>;
  storyWorld?: Partial<StoryWorld>;
  personalizationConfig?: Partial<PersonalizationConfig>;
  acknowledgedWarnings?: string[];
  completedSections?: Record<string, boolean>;
}

// ============================================================================
// PART 5 — CHARACTER LIMITS
// ============================================================================

export const CHAR_LIMITS = {
  /** Field 2.1 — Emotional world of the population */
  population: 600,
  /** Field 2.2 — The specific trigger */
  trigger: 400,
  /** Field 2.4 — Clinical creative vision */
  creativeVision: 400,
  /** Field 2.5 — One true thing */
  oneTrueThing: 300,
  /** Field 3.4 — Somatic expression free text (Fear & Anxiety) */
  somaticFreeText: 150,
  /** Field 3.4 — Big Emotions appearance */
  emotionAppearance: 300,
  /** Field 3.4 — Identity negative self-belief */
  negativeSelfBelief: 200,
  /** Field 3.4 — Life Transitions loss */
  transitionLoss: 300,
  /** Field 4.5 sub-field — Parallel equivalent challenge */
  parallelChallenge: 200,
  /** Field 4.6 sub-field — Supporting character functional role */
  functionalRole: 150,
  /** Field 4.7 — Character notes */
  characterNotes: 300,
} as const;

/** Max selections for multi-choice fields */
export const MAX_SELECTIONS = {
  /** Field 3.4 — Somatic expressions (Fear & Anxiety) */
  somaticExpressions: 2,
  /** Field 4.6 — Supporting characters */
  supportingCharacters: 2,
} as const;

// ============================================================================
// PART 6 — OPTION LABELS (exact text from the spec)
// ============================================================================

// ---------------------------------------------------------------------------
// Story Type
// ---------------------------------------------------------------------------

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  fear_anxiety: "Fear & Anxiety",
  big_emotions: "Big Emotions",
  loss_grief: "Loss & Grief",
  identity_self_worth: "Identity & Self-Worth",
  life_transitions: "Life Transitions",
};

export const STORY_TYPE_DESCRIPTIONS: Record<StoryType, string> = {
  fear_anxiety: "Stories about specific fears, worries, anxious responses to situations",
  big_emotions: "Stories about overwhelming emotions — anger, frustration, sadness, overstimulation",
  loss_grief: "Stories about losing someone or something important",
  identity_self_worth: "Stories about how a child sees themselves, feels about themselves",
  life_transitions: "Stories about major changes — new sibling, moving, starting school, divorce",
};

// ---------------------------------------------------------------------------
// Age Range
// ---------------------------------------------------------------------------

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "3-5": "3–5",
  "5-7": "5–7",
  "7-9": "7–9",
  "9-12": "9–12",
};

// ---------------------------------------------------------------------------
// Peak Intensity
// ---------------------------------------------------------------------------

export const PEAK_INTENSITY_LABELS: Record<PeakIntensity, string> = {
  very_gentle: "Very gentle",
  moderate: "Moderate",
  significant: "Significant",
};

export const PEAK_INTENSITY_DEFINITIONS: Record<PeakIntensity, string> = {
  very_gentle: "The protagonist feels uneasy or uncertain; discomfort is brief",
  moderate: "The protagonist experiences real distress but within a contained arc",
  significant: "The protagonist is genuinely overwhelmed before the resolution",
};

// ---------------------------------------------------------------------------
// Story Length
// ---------------------------------------------------------------------------

export const STORY_LENGTH_LABELS: Record<StoryLength, string> = {
  short: "Short",
  standard: "Standard",
  extended: "Extended",
};

/** Preview descriptions shown after selecting age range + story length. */
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
// Therapeutic Approaches — Fear & Anxiety
// ---------------------------------------------------------------------------

export const FEAR_ANXIETY_APPROACH_LABELS: Record<FearAnxietyApproach, string> = {
  normalization: "Normalization",
  cognitive_reframing: "Cognitive reframing",
  graduated_exposure: "Graduated exposure",
  modeling: "Modeling",
  reassurance_predictability: "Reassurance & predictability",
  self_regulation: "Self-regulation",
  psychoeducation: "Psychoeducation (age-appropriate)",
};

export const FEAR_ANXIETY_APPROACH_DEFINITIONS: Record<
  FearAnxietyApproach,
  { psychologistFacing: string; agentInstruction: string }
> = {
  normalization: {
    psychologistFacing:
      "The story shows the child that their fear is common and shared — they are not alone or broken.",
    agentInstruction:
      "The story world treats the fear as unremarkable. Other characters reveal that they have experienced the same thing. The protagonist discovers they are not the only one. The narrative never explicitly says \"this is normal\" — it demonstrates it through the story world.",
  },
  cognitive_reframing: {
    psychologistFacing:
      "The story helps the child see the situation from a new angle — changing how they think about what scares them.",
    agentInstruction:
      "The protagonist encounters information, a perspective, or an experience that changes the meaning of the feared situation. The fear doesn't disappear — the protagonist's interpretation of it shifts. The reframe must emerge from the story, never from a lecture or explanation.",
  },
  graduated_exposure: {
    psychologistFacing:
      "The story walks the child through approaching the feared situation step by step — each step a little braver.",
    agentInstruction:
      "The protagonist faces the feared situation in increments. First a small version, then a slightly bigger version. Each step is uncomfortable but survivable. The story shows that the feared consequence does not happen — or is less bad than expected. The caregiver or supporting character may encourage but does not do it for the protagonist.",
  },
  modeling: {
    psychologistFacing:
      "The story shows another character successfully navigating the same fear — giving the child a model to follow.",
    agentInstruction:
      "A supporting character demonstrates coping with the same or similar fear. The protagonist watches, learns, and then tries it themselves. The model character should show effort, not effortlessness — coping is hard and the model character shows it is possible, not easy.",
  },
  reassurance_predictability: {
    psychologistFacing:
      "The story creates safety through routine, predictability, and the reliable presence of trusted people.",
    agentInstruction:
      "The story world has structure and repetition. Events follow a predictable sequence. Trusted characters behave consistently. The protagonist discovers that the world has patterns they can rely on. The story must include at least one moment where the protagonist notices the pattern themselves — recognizing the predictability rather than only receiving it.",
  },
  self_regulation: {
    psychologistFacing:
      "The story focuses on the child's ability to manage their own response — building internal capacity.",
    agentInstruction:
      "The protagonist learns to use an internal resource (the coping tool) to shift their own emotional state. No one rescues them. The story shows the protagonist noticing their own state, making a choice, applying the tool, and experiencing a shift. The emphasis is on agency and internal capacity.",
  },
  psychoeducation: {
    psychologistFacing:
      "The story helps the child understand what is happening in their body or mind — naming the experience within the narrative, not as a lesson.",
    agentInstruction:
      'The protagonist (or a trusted character) names the feeling or the body\'s response in simple, age-appropriate language embedded in the story\'s natural flow. This is not a lecture — it is a moment of recognition. Example: "That\'s your worry feeling," said the bear. "It comes when something is new." The explanation must emerge from a character\'s voice or the protagonist\'s discovery, never from narrator exposition.',
  },
};

// ---------------------------------------------------------------------------
// Shame Dimension
// ---------------------------------------------------------------------------

export const SHAME_DIMENSION_LABELS: Record<ShameDimension, string> = {
  not_significant: "Not a significant factor in this story",
  present: "Present — handle with care",
  central: "Central to the experience",
};

export const SHAME_DIMENSION_DEFINITIONS: Record<ShameDimension, string> = {
  not_significant: "The agent does not need to address shame",
  present:
    "The agent avoids anything implying fault but does not override the primary mechanism",
  central:
    "The agent prioritizes normalization and follows three hard rules: (1) demonstrate the child is not alone, (2) never imply the child should have known/done better, (3) at least one character witnesses and responds with acceptance, not correction",
};

// ---------------------------------------------------------------------------
// Somatic Expressions — Fear & Anxiety
// ---------------------------------------------------------------------------

export const SOMATIC_EXPRESSION_LABELS: Record<SomaticExpression, string> = {
  freezing_going_still: "Freezing / going still",
  crying_clinging: "Crying / clinging",
  stomach_ache_feeling_sick: "Stomach ache / feeling sick",
  heart_racing_cant_breathe: "Heart racing / can't breathe",
  restless_fidgety: "Restless / fidgety / can't sit still",
  going_quiet_shutting_down: "Going quiet / shutting down",
  tension_clenching: "Tension / clenching (jaw, fists, shoulders)",
  sweating_feeling_hot: "Sweating / feeling hot",
};

// ---------------------------------------------------------------------------
// Coping Tools — Fear & Anxiety
// ---------------------------------------------------------------------------

export const FEAR_ANXIETY_COPING_TOOL_LABELS: Record<FearAnxietyCopingTool, string> = {
  deep_breathing: "Deep breathing",
  counting: "Counting",
  grounding_through_senses: "Grounding through senses",
  positive_self_talk: "Positive self-talk",
  visualization: "Visualization",
  routine_awareness: "Routine awareness",
  safe_person: "Safe person",
  comfort_object_or_memory: "Comfort object or memory",
  asking_for_help: "Asking for help",
};

export const COPING_TOOL_CATEGORY_MAP: Record<FearAnxietyCopingTool, CopingToolCategory> = {
  deep_breathing: "body",
  counting: "body",
  grounding_through_senses: "body",
  positive_self_talk: "mind",
  visualization: "mind",
  routine_awareness: "mind",
  safe_person: "connection",
  comfort_object_or_memory: "connection",
  asking_for_help: "connection",
};

export const COPING_TOOL_CATEGORY_LABELS: Record<CopingToolCategory, string> = {
  body: "Body",
  mind: "Mind",
  connection: "Connection",
};

/** Coping tools considered "relational" — require a character who can respond. */
export const RELATIONAL_COPING_TOOLS: readonly CopingTool[] = [
  "safe_person",
  "asking_for_help",
];

/** Coping tools considered "abstract" — trigger age-appropriateness warning for 3–5. */
export const ABSTRACT_COPING_TOOLS: readonly CopingTool[] = [
  "routine_awareness",
  "visualization",
  "positive_self_talk",
];

// ---------------------------------------------------------------------------
// Resolution Completeness
// ---------------------------------------------------------------------------

export const RESOLUTION_LABELS: Record<ResolutionCompleteness, string> = {
  full: "Full resolution",
  partial: "Partial resolution",
  open: "Open",
};

export const RESOLUTION_DEFINITIONS: Record<ResolutionCompleteness, string> = {
  full: "The protagonist overcomes the difficulty",
  partial: "The protagonist takes a brave step but the feeling is not gone",
  open: "The protagonist is better equipped but the journey continues",
};

// ---------------------------------------------------------------------------
// Protagonist Gender
// ---------------------------------------------------------------------------

export const PROTAGONIST_GENDER_LABELS: Record<ProtagonistGender, string> = {
  boy: "Boy",
  girl: "Girl",
  kept_open: "Kept open",
};

// ---------------------------------------------------------------------------
// Protagonist Type
// ---------------------------------------------------------------------------

export const PROTAGONIST_TYPE_LABELS: Record<ProtagonistType, string> = {
  child: "Child character",
  animal: "Animal character",
  fantasy: "Fantasy character",
};

export const PROTAGONIST_TYPE_AGE_GUIDANCE: Record<AgeRange, string> = {
  "3-5": "Animal characters are recommended for this age — they provide protective distance.",
  "5-7": "Both animal and child characters work well at this age.",
  "7-9": "Child characters enable stronger identification for older readers.",
  "9-12": "Child characters enable stronger identification for older readers.",
};

// ---------------------------------------------------------------------------
// Protagonist Age
// ---------------------------------------------------------------------------

export const PROTAGONIST_AGE_LABELS: Record<ProtagonistAge, string> = {
  same_age: "Same age",
  slightly_older: "Slightly older",
};

// ---------------------------------------------------------------------------
// Caregiver Presence
// ---------------------------------------------------------------------------

export const CAREGIVER_PRESENCE_LABELS: Record<CaregiverPresence, string> = {
  present_and_comforting: "Present and comforting",
  guides_from_the_side: "Guides from the side",
  leaves_and_returns: "Leaves and returns",
  waiting_at_the_end: "Waiting at the end",
  not_present: "Not present",
};

export const CAREGIVER_PRESENCE_DESCRIPTIONS: Partial<Record<CaregiverPresence, string>> = {
  leaves_and_returns:
    "The caregiver departs during the story and comes back. The story includes both the goodbye and the reunion.",
};

/** Caregiver values that count as "no present caregiver" for relational tool validation. */
export const NON_PRESENT_CAREGIVERS: readonly CaregiverPresence[] = [
  "waiting_at_the_end",
  "not_present",
];

// ---------------------------------------------------------------------------
// Narrative Distance
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Supporting Characters
// ---------------------------------------------------------------------------

export const SUPPORTING_CHARACTER_LABELS: Record<SupportingCharacterType, string> = {
  peer_shows_possible: "A peer who shows it's possible",
  peer_alongside: "A peer who goes through it alongside",
  teacher_adult_guides: "A teacher or adult who guides",
  animal_friend: "An animal friend who accompanies",
  sibling_perspective: "A sibling who offers perspective",
};

/** Characters capable of "responding" to a relational coping tool. */
export const RESPONDING_CHARACTERS: readonly SupportingCharacterType[] = [
  "peer_shows_possible",
  "teacher_adult_guides",
];

// ============================================================================
// PART 7 — PRE-FILLED DEFAULTS
// ============================================================================

// ---------------------------------------------------------------------------
// Must-Never List Defaults (Field 3.7) — per story type (Section 9)
// ---------------------------------------------------------------------------

export const MUST_NEVER_DEFAULTS: Record<StoryType, string[]> = {
  fear_anxiety: [
    "Never imply the child's fear is silly, irrational, or something to be ashamed of",
    "Never resolve the fear by someone else fixing the situation for the child (unless \"Asking for help\" is the selected coping tool)",
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
// Personalization Constraints Defaults (Field 5.1) — Fear & Anxiety only for pilot
// ---------------------------------------------------------------------------

export const PERSONALIZATION_CONSTRAINT_DEFAULTS: Partial<Record<StoryType, string[]>> = {
  fear_anxiety: [
    "The coping tool must not be changed or removed",
    "The caregiver's role must not be altered",
  ],
};

// ---------------------------------------------------------------------------
// Resolution Completeness Defaults — per story type
// ---------------------------------------------------------------------------

export const RESOLUTION_DEFAULTS: Partial<Record<StoryType, ResolutionCompleteness>> = {
  fear_anxiety: "partial",
};

// ---------------------------------------------------------------------------
// Personalization Defaults — per story type
// ---------------------------------------------------------------------------

export const PERSONALIZATION_DEFAULTS: Partial<Record<StoryType, boolean>> = {
  fear_anxiety: true,
};

// ---------------------------------------------------------------------------
// Story Length Defaults
// ---------------------------------------------------------------------------

export const STORY_LENGTH_DEFAULT: StoryLength = "standard";

// ---------------------------------------------------------------------------
// Protagonist Age Defaults
// ---------------------------------------------------------------------------

export const PROTAGONIST_AGE_DEFAULT: ProtagonistAge = "same_age";

// ============================================================================
// PART 8 — UI PROMPTS & HINTS (per type)
// ============================================================================

export const POPULATION_PROMPTS: Record<StoryType, { prompt: string; starterPrompt?: string }> = {
  fear_anxiety: {
    prompt:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
    starterPrompt:
      "Think about: What are they afraid will happen? What do they do to avoid it? What do adults misunderstand about this fear?",
  },
  big_emotions: {
    prompt:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
  },
  loss_grief: {
    prompt:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
  },
  identity_self_worth: {
    prompt:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
  },
  life_transitions: {
    prompt:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
  },
};

export const TRIGGER_LABELS: Record<StoryType, { label: string; prompt: string }> = {
  fear_anxiety: {
    label: "The specific trigger",
    prompt: "What precise moment or situation triggers the anxiety this story addresses?",
  },
  big_emotions: {
    label: "The triggering moment",
    prompt: "What precise moment or situation triggers the emotional response this story addresses?",
  },
  loss_grief: {
    label: "The moment of loss",
    prompt: "What is the specific loss this story addresses?",
  },
  identity_self_worth: {
    label: "The triggering situation",
    prompt: "What situation triggers the negative self-belief this story addresses?",
  },
  life_transitions: {
    label: "The transition",
    prompt: "What specific life change does this story address?",
  },
};

export const INTENTION_EXAMPLES: Partial<
  Record<StoryType, { good: string[]; bad: string[] }>
> = {
  fear_anxiety: {
    good: [
      "...feel quietly brave because they have discovered that asking for help is something brave people do",
      "...feel safely held because they have experienced that the people who love them always come back, even when it doesn't feel that way",
    ],
    bad: [
      "...feel better because there's nothing to be scared of — dismisses the fear",
      "...feel safe because anxiety is a normal neurological response — too clinical for a children's story",
    ],
  },
};

// ============================================================================
// PART 9 — STORY TYPE ROUTING
// ============================================================================

/**
 * Defines which fields appear and which option sets are used for each story type.
 */
export interface StoryTypeFieldConfig {
  /** Options for field 3.1 / 3.2 */
  approaches: readonly string[];
  /** Shape of field 3.4 */
  typeSpecificFieldType:
    | "somatic_expression"
    | "emotion_appearance"
    | "grief_process"
    | "negative_self_belief"
    | "transition_loss";
  /** Options for field 3.5 */
  copingTools: readonly string[];
  /** Default for field 3.6 */
  resolutionDefault: ResolutionCompleteness;
  /** Default for field 4.0 */
  personalizationDefault: boolean;
  /** Pre-filled defaults for field 3.7 */
  mustNeverDefaults: string[];
  /** Pre-filled defaults for field 5.1 */
  personalizationConstraintDefaults: string[];
}

export const STORY_TYPE_ROUTING: Record<StoryType, StoryTypeFieldConfig> = {
  fear_anxiety: {
    approaches: FEAR_ANXIETY_APPROACHES,
    typeSpecificFieldType: "somatic_expression",
    copingTools: FEAR_ANXIETY_COPING_TOOLS,
    resolutionDefault: "partial",
    personalizationDefault: true,
    mustNeverDefaults: MUST_NEVER_DEFAULTS.fear_anxiety,
    personalizationConstraintDefaults:
      PERSONALIZATION_CONSTRAINT_DEFAULTS.fear_anxiety ?? [],
  },
  big_emotions: {
    approaches: [],
    typeSpecificFieldType: "emotion_appearance",
    copingTools: [],
    resolutionDefault: "partial",
    personalizationDefault: true,
    mustNeverDefaults: MUST_NEVER_DEFAULTS.big_emotions,
    personalizationConstraintDefaults: [],
  },
  loss_grief: {
    approaches: [],
    typeSpecificFieldType: "grief_process",
    copingTools: [],
    resolutionDefault: "partial",
    personalizationDefault: true,
    mustNeverDefaults: MUST_NEVER_DEFAULTS.loss_grief,
    personalizationConstraintDefaults: [],
  },
  identity_self_worth: {
    approaches: [],
    typeSpecificFieldType: "negative_self_belief",
    copingTools: [],
    resolutionDefault: "partial",
    personalizationDefault: true,
    mustNeverDefaults: MUST_NEVER_DEFAULTS.identity_self_worth,
    personalizationConstraintDefaults: [],
  },
  life_transitions: {
    approaches: [],
    typeSpecificFieldType: "transition_loss",
    copingTools: [],
    resolutionDefault: "partial",
    personalizationDefault: true,
    mustNeverDefaults: MUST_NEVER_DEFAULTS.life_transitions,
    personalizationConstraintDefaults: [],
  },
};

// ============================================================================
// PART 10 — CROSS-FIELD VALIDATION DEFINITIONS
// ============================================================================

export type ValidationSeverity = "hard_block" | "hard_warning" | "soft_warning";

export interface CrossFieldValidation {
  id: string;
  severity: ValidationSeverity;
  description: string;
  message: string;
}

export const CROSS_FIELD_VALIDATIONS: CrossFieldValidation[] = [
  // Hard block (#1)
  {
    id: "relational_tool_no_responder",
    severity: "hard_block",
    description:
      "Relational coping tool (Asking for help / Safe person) + caregiver not present or waiting + no responding supporting character",
    message:
      "The coping tool requires someone the protagonist can turn to. Please add a present caregiver or a supporting character who can respond.",
  },

  // Hard warnings (#2, #3)
  {
    id: "significant_intensity_young_age",
    severity: "hard_warning",
    description: 'Peak intensity = "Significant" AND age range = 3–5',
    message:
      "Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?",
  },
  {
    id: "graduated_exposure_comforting_caregiver",
    severity: "hard_warning",
    description:
      'Primary approach = "Graduated exposure" AND caregiver = "Present and comforting"',
    message:
      "A consistently comforting caregiver may reduce the therapeutic effect of graduated exposure. Is this intentional?",
  },

  // Soft warnings (#4–#8)
  {
    id: "self_regulation_comforting_caregiver",
    severity: "soft_warning",
    description:
      'Primary approach = "Self-regulation" AND caregiver = "Present and comforting"',
    message:
      'The caregiver\'s presence may reduce the protagonist\'s need to self-regulate. Consider "Guides from the side" as an alternative.',
  },
  {
    id: "shame_central_no_normalization",
    severity: "soft_warning",
    description:
      'Shame = "Central to the experience" AND normalization is NOT the primary or supporting approach',
    message:
      "Shame is central to this experience. Normalization is typically important when shame is present — consider adding it as a supporting approach.",
  },
  {
    id: "separation_anxiety_no_caregiver",
    severity: "soft_warning",
    description:
      'Trigger text contains separation-related keywords AND caregiver = "Not present"',
    message:
      "For separation anxiety, the caregiver's return is often part of the therapeutic arc. \"Waiting at the end\" may serve this story better.",
  },
  {
    id: "abstract_tool_young_age",
    severity: "soft_warning",
    description:
      'Coping tool is abstract (Routine awareness / Visualization / Positive self-talk) AND age range = 3–5',
    message:
      "For younger children, the agent will show this tool as a simple physical action or repeated pattern — not verbal self-talk.",
  },
  {
    id: "cognitive_reframing_young_age",
    severity: "soft_warning",
    description: 'Primary approach = "Cognitive reframing" AND age range = 3–5',
    message:
      "Cognitive reframing requires developmental capacity for perspective-taking. For ages 3–5, consider Normalization, Modeling, or Psychoeducation instead.",
  },
];

// ============================================================================
// PART 11 — STRUCTURAL PARAMETERS (agent-internal, derived from age + length)
// ============================================================================

export interface StructuralParameters {
  pages: [number, number];
  sentencesPerPage: [number, number];
  wordsPerSentence: [number, number];
  totalWords: [number, number];
}

export const STRUCTURAL_PARAMS: Record<AgeRange, Record<StoryLength, StructuralParameters>> = {
  "3-5": {
    short: { pages: [6, 8], sentencesPerPage: [1, 2], wordsPerSentence: [8, 12], totalWords: [150, 250] },
    standard: { pages: [8, 12], sentencesPerPage: [2, 3], wordsPerSentence: [8, 12], totalWords: [300, 450] },
    extended: { pages: [12, 16], sentencesPerPage: [2, 3], wordsPerSentence: [8, 12], totalWords: [450, 600] },
  },
  "5-7": {
    short: { pages: [8, 10], sentencesPerPage: [2, 3], wordsPerSentence: [10, 15], totalWords: [300, 450] },
    standard: { pages: [10, 14], sentencesPerPage: [3, 4], wordsPerSentence: [10, 15], totalWords: [500, 800] },
    extended: { pages: [14, 18], sentencesPerPage: [3, 4], wordsPerSentence: [10, 15], totalWords: [800, 1100] },
  },
  "7-9": {
    short: { pages: [10, 12], sentencesPerPage: [3, 5], wordsPerSentence: [12, 18], totalWords: [600, 900] },
    standard: { pages: [12, 16], sentencesPerPage: [4, 6], wordsPerSentence: [12, 18], totalWords: [900, 1400] },
    extended: { pages: [16, 22], sentencesPerPage: [4, 6], wordsPerSentence: [12, 18], totalWords: [1400, 2000] },
  },
  "9-12": {
    short: { pages: [12, 15], sentencesPerPage: [5, 7], wordsPerSentence: [15, 20], totalWords: [1000, 1500] },
    standard: { pages: [15, 20], sentencesPerPage: [5, 8], wordsPerSentence: [15, 20], totalWords: [1500, 2500] },
    extended: { pages: [20, 28], sentencesPerPage: [5, 8], wordsPerSentence: [15, 20], totalWords: [2500, 3500] },
  },
};

// ============================================================================
// PART 12 — COMPLEXITY BUDGET (Section 16 of spec)
// ============================================================================

/** Obligation page costs at 3–5 baseline. */
export const OBLIGATION_WEIGHTS = {
  coreArc: 5,
  somaticExpressionEach: 0.5,
  supportingApproach: 1,
  shameCentral: 1,
  shamePresent: 0.5,
  supportingCharacterEach: 1,
  caregiverLeavesAndReturns: 1.5,
  caregiverWaitingAtEnd: 0.5,
  narrativeParallel: 1,
  narrativeMetaphorical: 1.5,
} as const;

/** Multiplier applied to baseline weights per age range. */
export const AGE_WEIGHT_MULTIPLIERS: Record<AgeRange, number> = {
  "3-5": 1.0,
  "5-7": 0.8,
  "7-9": 0.6,
  "9-12": 0.5,
};

// ============================================================================
// PART 13 — FIELD REGISTRY (comprehensive field-level metadata)
// ============================================================================

export type BriefFieldType =
  | "single_choice"
  | "multi_choice"
  | "free_text"
  | "completion_format"
  | "free_text_list"
  | "binary";

export type RequiredStatus = true | false | "conditional";

export interface FieldDefinition {
  id: string;
  name: string;
  section: string;
  fieldType: BriefFieldType;
  required: RequiredStatus;
  charLimit?: number;
  maxSelections?: number;
  defaultValue?: unknown;
  conditionalVisibility: string | null;
  variesByType: boolean;
}

export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
  pre_brief: {
    id: "pre_brief",
    name: "Story type selector",
    section: "Pre-brief",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "1.1": {
    id: "1.1",
    name: "Target age range",
    section: "Age & Story Scope",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "1.2": {
    id: "1.2",
    name: "Peak emotional intensity",
    section: "Age & Story Scope",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "1.3": {
    id: "1.3",
    name: "Story length",
    section: "Age & Story Scope",
    fieldType: "single_choice",
    required: true,
    defaultValue: "standard",
    conditionalVisibility: null,
    variesByType: false,
  },
  "2.1": {
    id: "2.1",
    name: "Emotional world of the population",
    section: "Clinical Foundation",
    fieldType: "free_text",
    required: true,
    charLimit: 600,
    conditionalVisibility: null,
    variesByType: true,
  },
  "2.2": {
    id: "2.2",
    name: "The specific trigger",
    section: "Clinical Foundation",
    fieldType: "free_text",
    required: true,
    charLimit: 400,
    conditionalVisibility: null,
    variesByType: true,
  },
  "2.3": {
    id: "2.3",
    name: "Therapeutic intention",
    section: "Clinical Foundation",
    fieldType: "completion_format",
    required: true,
    conditionalVisibility: null,
    variesByType: true,
  },
  "2.4": {
    id: "2.4",
    name: "Clinical creative vision",
    section: "Clinical Foundation",
    fieldType: "free_text",
    required: true,
    charLimit: 400,
    conditionalVisibility: null,
    variesByType: false,
  },
  "2.5": {
    id: "2.5",
    name: "One true thing",
    section: "Clinical Foundation",
    fieldType: "free_text",
    required: false,
    charLimit: 300,
    conditionalVisibility: null,
    variesByType: false,
  },
  "3.1": {
    id: "3.1",
    name: "Primary therapeutic approach",
    section: "Therapeutic Architecture",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: true,
  },
  "3.2": {
    id: "3.2",
    name: "Supporting approach",
    section: "Therapeutic Architecture",
    fieldType: "single_choice",
    required: false,
    conditionalVisibility: null,
    variesByType: true,
  },
  "3.3": {
    id: "3.3",
    name: "Shame dimension",
    section: "Therapeutic Architecture",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "3.4": {
    id: "3.4",
    name: "Type-specific clinical field",
    section: "Therapeutic Architecture",
    fieldType: "multi_choice",
    required: true,
    maxSelections: 2,
    conditionalVisibility: null,
    variesByType: true,
  },
  "3.5": {
    id: "3.5",
    name: "The coping tool",
    section: "Therapeutic Architecture",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: true,
  },
  "3.6": {
    id: "3.6",
    name: "Resolution completeness",
    section: "Therapeutic Architecture",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "3.7": {
    id: "3.7",
    name: "What this story must never do",
    section: "Therapeutic Architecture",
    fieldType: "free_text_list",
    required: true,
    conditionalVisibility: null,
    variesByType: true,
  },
  "4.0": {
    id: "4.0",
    name: "Personalization decision",
    section: "Story World",
    fieldType: "binary",
    required: true,
    defaultValue: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "4.1": {
    id: "4.1",
    name: "Protagonist gender",
    section: "Story World",
    fieldType: "single_choice",
    required: "conditional",
    conditionalVisibility: "Only shown when personalization is OFF",
    variesByType: false,
  },
  "4.2": {
    id: "4.2",
    name: "Protagonist type",
    section: "Story World",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility:
      'Locked to "Child character" when personalization is ON; all options when OFF',
    variesByType: false,
  },
  "4.3": {
    id: "4.3",
    name: "Protagonist age relative to reader",
    section: "Story World",
    fieldType: "single_choice",
    required: "conditional",
    defaultValue: "same_age",
    conditionalVisibility: "Only shown when personalization is OFF",
    variesByType: false,
  },
  "4.4": {
    id: "4.4",
    name: "Caregiver's presence",
    section: "Story World",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "4.5": {
    id: "4.5",
    name: "Narrative distance",
    section: "Story World",
    fieldType: "single_choice",
    required: true,
    conditionalVisibility: null,
    variesByType: false,
  },
  "4.5_sub": {
    id: "4.5_sub",
    name: "Parallel equivalent challenge",
    section: "Story World",
    fieldType: "free_text",
    required: false,
    charLimit: 200,
    conditionalVisibility: 'Only shown when narrative distance is "Parallel"',
    variesByType: false,
  },
  "4.6": {
    id: "4.6",
    name: "Supporting characters",
    section: "Story World",
    fieldType: "multi_choice",
    required: "conditional",
    maxSelections: 2,
    conditionalVisibility:
      "Required if relational coping tool selected + no present caregiver",
    variesByType: false,
  },
  "4.6_sub": {
    id: "4.6_sub",
    name: "Supporting character functional role",
    section: "Story World",
    fieldType: "free_text",
    required: false,
    charLimit: 150,
    conditionalVisibility: "Shown for each selected supporting character",
    variesByType: false,
  },
  "4.7": {
    id: "4.7",
    name: "Character notes",
    section: "Story World",
    fieldType: "free_text",
    required: false,
    charLimit: 300,
    conditionalVisibility: null,
    variesByType: false,
  },
  "5.1": {
    id: "5.1",
    name: "Personalization constraints",
    section: "Personalization Configuration",
    fieldType: "free_text_list",
    required: false,
    conditionalVisibility: "Only shown when personalization is ON",
    variesByType: true,
  },
  "5.2": {
    id: "5.2",
    name: "Why not",
    section: "Personalization Configuration",
    fieldType: "free_text",
    required: "conditional",
    conditionalVisibility: "Required when personalization is OFF",
    variesByType: false,
  },
};

// ============================================================================
// PART 14 — CONDITIONAL VISIBILITY HELPERS
// ============================================================================

/**
 * Returns which protagonist fields are visible based on personalization decision.
 * Spec: personalization ON → hide 4.1, 4.3, lock 4.2 to "child".
 */
export function getPersonalizationGating(personalization: boolean) {
  return {
    showProtagonistGender: !personalization,
    showProtagonistAge: !personalization,
    protagonistTypeLocked: personalization,
    lockedProtagonistType: "child" as ProtagonistType,
  };
}

/**
 * Returns whether the parallel challenge sub-field should be visible.
 * Spec: "Parallel" → show sub-field; "Direct" or "Metaphorical" → hide.
 */
export function showParallelChallengeField(distance: NarrativeDistance): boolean {
  return distance === "parallel";
}

/**
 * Returns which Section 5 fields are visible based on personalization.
 * Spec: ON → 5.1 (constraints), OFF → 5.2 (why not).
 */
export function getSection5Visibility(personalization: boolean) {
  return {
    showPersonalizationConstraints: personalization,
    showWhyNot: !personalization,
  };
}
