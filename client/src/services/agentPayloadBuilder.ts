// client/src/services/agentPayloadBuilder.ts
//
// Takes a completed story brief and produces the structured payload that
// story generation consumes. Enriches the psychologist's selections with all
// pipeline-internal context from the spec: structural parameters (§10),
// age adaptation rules (§11), narrative arc (§12), approach definitions
// (§13), priority rules (§14), and obligation tiers (§15).

import type {
  StoryType,
  AgeRange,
  PeakIntensity,
  StoryLength,
  TherapeuticApproach,
  ShameDimension,
  SomaticExpression,
  CopingTool,
  ResolutionCompleteness,
  ProtagonistType,
  ProtagonistGender,
  ProtagonistAgeRelative,
  CaregiverPresence,
  NarrativeDistance,
  SupportingCharacter,
  CompleteBrief,
  AgeAndScope,
  ClinicalFoundation,
  TherapeuticArchitecture,
  StoryWorld,
  PersonalizationConfig,
} from "../types/storyBrief";

import {
  STORY_TYPE_LABELS,
  AGE_RANGE_LABELS,
  PEAK_INTENSITY_LABELS,
  STORY_LENGTH_LABELS,
  THERAPEUTIC_APPROACH_LABELS,
  SHAME_DIMENSION_LABELS,
  SOMATIC_EXPRESSION_LABELS,
  COPING_TOOL_LABELS,
  RESOLUTION_LABELS,
  RESOLUTION_DESCRIPTIONS,
  PROTAGONIST_TYPE_LABELS,
  PROTAGONIST_GENDER_LABELS,
  PROTAGONIST_AGE_RELATIVE_LABELS,
  CAREGIVER_PRESENCE_LABELS,
  NARRATIVE_DISTANCE_LABELS,
  NARRATIVE_DISTANCE_DEFINITIONS,
  SUPPORTING_CHARACTER_LABELS,
} from "../types/storyBrief";

// ============================================================================
// §10 — Structural Parameters (agent-internal, never shown to psychologist)
// ============================================================================

interface StructuralParameters {
  pages: [number, number];
  sentencesPerPage: [number, number];
  wordsPerSentence: [number, number];
  totalWords: [number, number];
}

const STRUCTURAL_PARAMS: Record<AgeRange, Record<StoryLength, StructuralParameters>> = {
  "3-5": {
    short:    { pages: [6, 8],   sentencesPerPage: [1, 2], wordsPerSentence: [8, 12],  totalWords: [150, 250] },
    standard: { pages: [8, 12],  sentencesPerPage: [2, 3], wordsPerSentence: [8, 12],  totalWords: [300, 450] },
    extended: { pages: [12, 16], sentencesPerPage: [2, 3], wordsPerSentence: [8, 12],  totalWords: [450, 600] },
  },
  "5-7": {
    short:    { pages: [8, 10],  sentencesPerPage: [2, 3], wordsPerSentence: [10, 15], totalWords: [300, 450] },
    standard: { pages: [10, 14], sentencesPerPage: [3, 4], wordsPerSentence: [10, 15], totalWords: [500, 800] },
    extended: { pages: [14, 18], sentencesPerPage: [3, 4], wordsPerSentence: [10, 15], totalWords: [800, 1100] },
  },
  "7-9": {
    short:    { pages: [10, 12], sentencesPerPage: [3, 5], wordsPerSentence: [12, 18], totalWords: [600, 900] },
    standard: { pages: [12, 16], sentencesPerPage: [4, 6], wordsPerSentence: [12, 18], totalWords: [900, 1400] },
    extended: { pages: [16, 22], sentencesPerPage: [4, 6], wordsPerSentence: [12, 18], totalWords: [1400, 2000] },
  },
  "9-12": {
    short:    { pages: [12, 15], sentencesPerPage: [5, 7], wordsPerSentence: [15, 20], totalWords: [1000, 1500] },
    standard: { pages: [15, 20], sentencesPerPage: [5, 8], wordsPerSentence: [15, 20], totalWords: [1500, 2500] },
    extended: { pages: [20, 28], sentencesPerPage: [5, 8], wordsPerSentence: [15, 20], totalWords: [2500, 3500] },
  },
};

// ============================================================================
// §11 — Age-Range Adaptation Rules (agent-internal)
// ============================================================================

interface AgeAdaptationRuleSet {
  vocabulary: string;
  emotionalPacing: string;
  copingToolPresentation: string;
  narrativeComplexity: string;
  caregiverRole: string;
  repetition?: string;
}

const AGE_ADAPTATION_RULES: Record<AgeRange, AgeAdaptationRuleSet> = {
  "3-5": {
    vocabulary:
      "Concrete, physical, sensory words. No emotional abstraction. " +
      '"Scared" not "anxious." "Tummy felt funny" not "a wave of nausea."',
    emotionalPacing:
      "Fast return to safety. The dark moment is brief — 1–2 pages at most. Reassurance arrives quickly.",
    copingToolPresentation:
      "Shown as a physical action. The rabbit takes three big breaths. The bear squeezes his special stone. " +
      "Never verbal self-talk or internal monologue.",
    narrativeComplexity:
      "Strictly linear. One character, one problem, one resolution. No subplots, no flashbacks, no parallel threads.",
    caregiverRole:
      "Almost always present or returning. Stories where the protagonist is fully alone for extended periods " +
      "are inappropriate for this age.",
    repetition:
      "Use rhythmic repetition — repeated phrases, predictable patterns. This is soothing and aids comprehension.",
  },
  "5-7": {
    vocabulary:
      'Still concrete but can include simple emotional words. "Worried" is acceptable. "Overwhelmed" is not.',
    emotionalPacing:
      "Moderate. The dark moment can be sustained for 2–3 pages. The child can hold mild discomfort.",
    copingToolPresentation:
      'Can be shown as a deliberate choice the character makes. "She decided to count the blue things she could see." ' +
      "Simple internal narration is acceptable.",
    narrativeComplexity:
      "Linear with one minor complication allowed. A friend who has the same problem. A first attempt that doesn't fully work.",
    caregiverRole:
      '"Waiting at the end" works well. "Not present" is possible if a supporting adult character exists.',
  },
  "7-9": {
    vocabulary:
      '"Anxious," "embarrassed," "frustrated" are appropriate. Can use simile: "it felt like a rock in her chest."',
    emotionalPacing:
      "Can sustain tension across multiple scenes. The resolution can be gradual rather than sudden.",
    copingToolPresentation:
      '"He reminded himself that the last time felt scary too, and he got through it." ' +
      "Visualization and self-talk are shown naturally.",
    narrativeComplexity:
      "Can handle secondary character arcs, a brief flashback, or a moment of reflection. " +
      "Two-scene structure (attempt → setback → new attempt) works well.",
    caregiverRole:
      "Protagonist can be independent. Caregiver presence is a design choice, not a developmental necessity.",
  },
  "9-12": {
    vocabulary:
      'Full emotional range. "She felt the weight of everyone\'s expectations." Abstract emotional concepts are accessible.',
    emotionalPacing:
      "Can sustain extended tension. The dark moment can be the emotional center of the story. " +
      "Resolution unfolds over multiple pages.",
    copingToolPresentation:
      "Can show full internal process — recognition, choice, effort, partial success. " +
      "The tool can be shown failing the first time and working the second.",
    narrativeComplexity:
      "Subplots, secondary character perspectives, non-linear moments (flashback to a previous success or failure), " +
      "and thematic layering are all appropriate.",
    caregiverRole:
      "Fully optional. The protagonist's journey can be entirely self-directed. " +
      "Caregiver presence, when chosen, represents a thematic choice rather than a safety need.",
  },
};

// ============================================================================
// §12 — Narrative Arc Template (agent-internal)
// ============================================================================

interface ArcPhase {
  phase: number;
  name: string;
  description: string;
}

const CORE_ARC: ArcPhase[] = [
  {
    phase: 1,
    name: "Safe beginning",
    description:
      "The world before the trigger. The protagonist in their normal state. Establish who they are and " +
      "what they care about. For stories involving separation or relational fears, this phase must establish " +
      "the specific relationship that will be tested — not just the protagonist's world, but who they feel " +
      "safe with and how that safety feels.",
  },
  {
    phase: 2,
    name: "The trigger moment",
    description:
      "The inciting event (from Field 2.2). Tension rises. The protagonist encounters the difficulty.",
  },
  {
    phase: 3,
    name: "The body feels it",
    description:
      "Somatic mirroring (from Field 3.4). The protagonist's physical anxiety response. " +
      "The child reading recognizes their own body.",
  },
  {
    phase: 4,
    name: "The difficult peak",
    description:
      "The protagonist at their most stuck. This is the moment of maximum emotional intensity " +
      "(calibrated by Field 1.2). The protagonist does not yet have access to the coping tool.",
  },
  {
    phase: 5,
    name: "The tool in action",
    description:
      "The protagonist uses the coping tool (from Field 3.5). Shown in action, never named. " +
      "This is the story's therapeutic delivery.",
  },
  {
    phase: 6,
    name: "The shift",
    description:
      "Something changes. The tool doesn't fix everything — but it moves the needle. " +
      "The protagonist feels different from how they felt at the peak.",
  },
  {
    phase: 7,
    name: "The landing",
    description:
      "Emotional resolution matching the therapeutic intention (Field 2.3) and resolution completeness " +
      "(Field 3.6). The story closes with the emotional signature appropriate to the chosen resolution type.",
  },
];

const ARC_AGE_ADAPTATIONS: Record<AgeRange, string> = {
  "3-5":
    "Phases 1–3 are brief (1–2 pages each). Phase 4 is short — the protagonist is stuck but not for long. " +
    "Phase 5 may be facilitated by another character. Phases 6–7 merge into a single warm resolution. " +
    "Total: 7 phases compressed into a simple, reassuring arc.",
  "5-7":
    "All phases present. Phase 4 can be sustained slightly longer. " +
    "Phase 5 can include a first attempt that partially works. Phases 6–7 are distinct.",
  "7-9":
    "Phases 4–5 can include a setback (attempt → fail → second attempt). " +
    "Phase 6 can be gradual. Phase 7 can include reflection.",
  "9-12":
    "Full arc with possible non-linear elements. Phase 1 can include foreshadowing. " +
    "Phase 4 can be the emotional center of the story. Phase 5 can show the tool failing before working. " +
    "Phase 7 can be open-ended or contemplative.",
};

// ============================================================================
// §13 — Therapeutic Approach Agent Instructions (agent-internal)
//
// These are the agent-side instructions, NOT the psychologist-facing defs.
// The psychologist-facing definitions are in storyBrief.ts as
// THERAPEUTIC_APPROACH_DEFINITIONS.
// ============================================================================

const APPROACH_AGENT_INSTRUCTIONS: Record<TherapeuticApproach, string> = {
  normalization:
    "The story world treats the fear as unremarkable. Other characters (peers, animals, even the " +
    "environment) reveal that they have experienced the same thing. The protagonist discovers they " +
    "are not the only one. The narrative never explicitly says \"this is normal\" — it demonstrates " +
    "it through the story world.",

  cognitive_reframing:
    "The protagonist encounters information, a perspective, or an experience that changes the meaning " +
    "of the feared situation. The fear doesn't disappear — the protagonist's interpretation of it " +
    "shifts. Example: the strict teacher is revealed to be worried about the children's safety, not " +
    "angry at them. The reframe must emerge from the story, never from a lecture or explanation.",

  graduated_exposure:
    "The protagonist faces the feared situation in increments. First a small version, then a slightly " +
    "bigger version. Each step is uncomfortable but survivable. The story shows that the feared " +
    "consequence does not happen — or is less bad than expected. The caregiver or supporting character " +
    "may encourage but does not do it for the protagonist.",

  modeling:
    "A supporting character (or the protagonist observing another character) demonstrates coping with " +
    "the same or similar fear. The protagonist watches, learns, and then tries it themselves. The " +
    "model character should show effort, not effortlessness — coping is hard and the model character " +
    "shows it is possible, not easy.",

  reassurance_predictability:
    "The story world has structure and repetition. Events follow a predictable sequence. Trusted " +
    "characters behave consistently. The protagonist discovers that the world has patterns they can " +
    "rely on. The coping comes primarily from external stability and the reliable behavior of trusted " +
    "characters. However, the story must include at least one moment where the protagonist notices " +
    "the pattern themselves — recognizing the predictability rather than only receiving it. This seeds " +
    "internal capacity without requiring the protagonist to self-regulate.",

  self_regulation:
    "The protagonist learns to use an internal resource (the coping tool) to shift their own emotional " +
    "state. No one rescues them. The story shows the protagonist noticing their own state, making a " +
    "choice, applying the tool, and experiencing a shift. The emphasis is on agency and internal capacity.",

  psychoeducation:
    "The protagonist (or a trusted character) names the feeling or the body's response in simple, " +
    "age-appropriate language embedded in the story's natural flow. This is not a lecture or a lesson " +
    "— it is a moment of recognition where the experience is given a name or an explanation that " +
    "makes it less frightening. Example: \"That's your worry feeling,\" said the bear. \"It comes " +
    "when something is new. It doesn't mean something bad is happening — it means your body is paying " +
    "extra attention.\" The explanation must emerge from a character's voice or the protagonist's " +
    "discovery, never from narrator exposition. For ages 3–5, the naming should be concrete and " +
    "physical (\"your tummy does that when it's worried\"). For ages 7+, it can include simple " +
    "cause-and-effect (\"when your brain thinks something might be scary, it sends a signal to your " +
    "body to get ready\").",
};

// ============================================================================
// §14 — Priority Rules (agent-internal)
// ============================================================================

interface PriorityRule {
  priority: number;
  rule: string;
}

const PRIORITY_RULES: PriorityRule[] = [
  { priority: 1, rule: "Cross-field validations (Section 8) — any combination that was validated at submission is treated as intentional" },
  { priority: 2, rule: "Therapeutic mechanism (Field 3.1) — defines the story's arc. Overrides creative vision if they conflict" },
  { priority: 3, rule: "Therapeutic intention (Field 2.3) — defines the story's destination. Shapes the resolution" },
  { priority: 4, rule: "Coping tool (Field 3.5) — defines the story's therapeutic delivery moment" },
  { priority: 5, rule: "Structured field selections (all dropdowns and single-choice fields) — define the story's architecture" },
  { priority: 6, rule: "Clinical creative vision (Field 2.4) — enriches the arc, does not override it" },
  { priority: 7, rule: "Free text fields (population, trigger, one true thing, character notes) — add texture and specificity within the architecture defined by structured fields" },
];

const SPECIFIC_PRIORITY_RULES: string[] = [
  "Character notes (Field 4.7): Structured fields define the story's architecture. Character notes add texture within that architecture. If character notes contradict a structured field (caregiver presence, protagonist type, narrative distance, character roles), the structured field wins.",
  "Creative vision (Field 2.4): If the creative vision conflicts with the therapeutic mechanism, the agent adapts the vision to serve the mechanism. Example: if the mechanism is graduated exposure and the vision describes a safe hiding place, the hiding place becomes the starting point from which the protagonist gradually ventures out — not the resolution.",
  "Weak therapeutic intention (Field 2.3): If the therapeutic intention is vague or generic, the agent infers a more specific intention from Fields 2.2 + 3.1 + 3.5. The inferred intention is flagged in the output for psychologist review.",
];

// ============================================================================
// §15 — Narrative Obligation Tiers (agent-internal)
// ============================================================================

interface ObligationTier {
  tier: number;
  label: string;
  instruction: string;
  obligations: string[];
}

const OBLIGATION_TIERS: ObligationTier[] = [
  {
    tier: 1,
    label: "Must appear as fully realized scenes (non-negotiable)",
    instruction: "These elements must always appear as fully realized scenes.",
    obligations: [
      "The trigger moment (from Field 2.2)",
      "Somatic mirroring — at least one expression shown physically (from Field 3.4, first selection)",
      "The coping tool in action (from Field 3.5)",
      "The resolution matching the chosen completeness level (from Field 3.6)",
    ],
  },
  {
    tier: 2,
    label: "Must appear, but can be compressed into fewer beats",
    instruction: "These elements must appear but can be compressed into fewer beats.",
    obligations: [
      "The primary therapeutic approach — defines the arc (from Field 3.1)",
      "The caregiver's presence at the specified role (from Field 4.4)",
      "Shame rules when shame = Central (from Field 3.3) — all three rules must be honored but can be served through a single scene rather than multiple scenes",
    ],
  },
  {
    tier: 3,
    label: "Should appear if space permits, can be reduced to a single beat",
    instruction: "These elements should appear if space permits but can be reduced to a single sentence or a background detail.",
    obligations: [
      "The supporting approach — can become a tonal quality that flavors the story rather than a distinct scene (from Field 3.2)",
      "Supporting characters — can appear in a single interaction rather than a developed role (from Field 4.6)",
      "The second somatic expression, if two were selected — the first is Tier 1, the second is Tier 3 (from Field 3.4)",
      "The \"One true thing\" detail (from Field 2.5)",
    ],
  },
  {
    tier: 4,
    label: "Enrichment, omit if space is tight",
    instruction: "Include these only if they don't compress other tiers.",
    obligations: [
      "The creative vision as a distinct set piece — can be reduced to a visual detail or atmospheric element rather than a full scene (from Field 2.4)",
      "Character notes details (from Field 4.7)",
      "Second supporting character's functional role, if two characters were selected (from Field 4.6)",
    ],
  },
];

const OBLIGATION_TIER_GLOBAL_INSTRUCTION =
  "When the brief's obligations exceed the available word count, follow the priority tiers. " +
  "Tier 1 elements must always appear as fully realized scenes. Tier 2 elements must appear but " +
  "can be compressed into fewer beats. Tier 3 elements should appear if space permits but can be " +
  "reduced to a single sentence or a background detail. Tier 4 elements are enrichment — include " +
  "them only if they don't compress other tiers. Never flatten a Tier 1 element to make room for " +
  "a Tier 3 element.";

const OUTPUT_METADATA_REQUIREMENT =
  "When any element is compressed or omitted due to space constraints, output a metadata section " +
  "(not shown in the story, shown to the psychologist during review) listing: what was fully " +
  "included, what was compressed (and how), and what was omitted (and why).";

// ============================================================================
// Shame handling rules (derived from §5 Field 3.3 + §15 Tier 2)
// ============================================================================

const SHAME_AGENT_RULES: Record<ShameDimension, string | null> = {
  not_significant: null,
  present:
    "Shame is present in this story. The agent avoids anything implying fault but does not override " +
    "the primary therapeutic mechanism.",
  central:
    "Shame is central to this story. The agent prioritizes normalization and follows three hard rules: " +
    "(1) the story must demonstrate the child is not alone; " +
    "(2) it must never imply the child should have known better; " +
    "(3) at least one character must respond with acceptance, not correction.",
};

// ============================================================================
// Agent Payload — the typed output interface
// ============================================================================

export interface AgentPayload {
  /** Identifies this payload format version. */
  formatVersion: "1.2";

  // --- Brief metadata ---
  storyType: { key: StoryType; label: string };

  // --- Section 1: Age & Story Scope ---
  ageRange: { key: AgeRange; label: string };
  peakIntensity: { key: PeakIntensity; label: string };
  storyLength: { key: StoryLength; label: string };

  // --- Section 2: Clinical Foundation ---
  population: string;
  trigger: string;
  therapeuticIntention: { feel: string; because: string };
  creativeVision: string;
  oneTrueThing: string | null;

  // --- Section 3: Therapeutic Architecture ---
  primaryApproach: {
    key: TherapeuticApproach;
    label: string;
    agentInstruction: string;
  };
  supportingApproach: {
    key: TherapeuticApproach;
    label: string;
    agentInstruction: string;
  } | null;
  shameDimension: {
    key: ShameDimension;
    label: string;
    agentRules: string | null;
  };
  somaticExpressions: Array<{ key: SomaticExpression; label: string }>;
  somaticOther: string | null;
  copingTool: { key: CopingTool; label: string };
  resolutionCompleteness: {
    key: ResolutionCompleteness;
    label: string;
    description: string;
  };
  mustNeverList: string[];

  // --- Section 4: Story World ---
  personalization: boolean;
  protagonist: {
    type: { key: ProtagonistType; label: string };
    gender: { key: ProtagonistGender; label: string } | null;
    ageRelativeToReader: { key: ProtagonistAgeRelative; label: string };
  };
  caregiverPresence: { key: CaregiverPresence; label: string };
  narrativeDistance: {
    key: NarrativeDistance;
    label: string;
    definition: string;
  };
  parallelChallenge: string | null;
  supportingCharacters: Array<{
    key: SupportingCharacter;
    label: string;
    functionalRoleNote: string | null;
  }>;
  characterNotes: string | null;

  // --- Section 5: Personalization Configuration ---
  whyNotPersonalized: string | null;

  // === Agent-Internal Context (not shown to psychologist) ===

  structuralParameters: {
    pages: [number, number];
    sentencesPerPage: [number, number];
    wordsPerSentence: [number, number];
    totalWords: [number, number];
  };

  ageAdaptationRules: AgeAdaptationRuleSet;

  narrativeArc: {
    phases: ArcPhase[];
    ageAdaptation: string;
  };

  priorityRules: {
    hierarchy: PriorityRule[];
    specificRules: string[];
  };

  obligationTiers: {
    tiers: ObligationTier[];
    globalInstruction: string;
    outputMetadataRequirement: string;
  };
}

// ============================================================================
// Builder
// ============================================================================

/**
 * Validates that a section is fully populated, narrowing from Partial<T> to T.
 * Throws if the brief is incomplete.
 */
function requireSection<T>(section: Partial<T>, name: string): T {
  for (const [key, value] of Object.entries(section)) {
    if (value === undefined) {
      throw new Error(`Incomplete brief: ${name}.${key} is missing`);
    }
  }
  return section as T;
}

/**
 * Takes a completed CompleteBrief and produces the structured payload for
 * story generation, including all pipeline-internal context from spec §§10–15.
 *
 * Throws if the brief is incomplete (missing required fields or storyType).
 */
export function buildAgentPayload(brief: CompleteBrief): AgentPayload {
  if (!brief.storyType) {
    throw new Error("Cannot build agent payload: storyType is not set");
  }

  const storyType = brief.storyType;
  const s1 = requireSection<AgeAndScope>(brief.section1, "section1");
  const s2 = requireSection<ClinicalFoundation>(brief.section2, "section2");
  const s3 = requireSection<TherapeuticArchitecture>(brief.section3, "section3");
  const s4 = requireSection<StoryWorld>(brief.section4, "section4");

  const isPersonalized = s4.personalization === "yes";
  const s5 = isPersonalized
    ? (brief.section5 as Partial<PersonalizationConfig>)
    : requireSection<PersonalizationConfig>(brief.section5, "section5");

  return {
    formatVersion: "1.2",

    // --- Brief metadata ---
    storyType: { key: storyType, label: STORY_TYPE_LABELS[storyType] },

    // --- Section 1 ---
    ageRange: { key: s1.ageRange, label: AGE_RANGE_LABELS[s1.ageRange] },
    peakIntensity: { key: s1.peakIntensity, label: PEAK_INTENSITY_LABELS[s1.peakIntensity] },
    storyLength: { key: s1.storyLength, label: STORY_LENGTH_LABELS[s1.storyLength] },

    // --- Section 2 ---
    population: s2.population,
    trigger: s2.trigger,
    therapeuticIntention: {
      feel: s2.intentionFeel,
      because: s2.intentionBecause,
    },
    creativeVision: s2.creativeVision,
    oneTrueThing: s2.oneTrueThing?.trim() || null,

    // --- Section 3 ---
    primaryApproach: {
      key: s3.primaryApproach,
      label: THERAPEUTIC_APPROACH_LABELS[s3.primaryApproach],
      agentInstruction: APPROACH_AGENT_INSTRUCTIONS[s3.primaryApproach],
    },
    supportingApproach: s3.supportingApproach
      ? {
          key: s3.supportingApproach,
          label: THERAPEUTIC_APPROACH_LABELS[s3.supportingApproach],
          agentInstruction: APPROACH_AGENT_INSTRUCTIONS[s3.supportingApproach],
        }
      : null,
    shameDimension: {
      key: s3.shameDimension,
      label: SHAME_DIMENSION_LABELS[s3.shameDimension],
      agentRules: SHAME_AGENT_RULES[s3.shameDimension],
    },
    somaticExpressions: s3.somaticExpressions.map((expr) => ({
      key: expr,
      label: SOMATIC_EXPRESSION_LABELS[expr],
    })),
    somaticOther: s3.somaticOther?.trim() || null,
    copingTool: {
      key: s3.copingTool,
      label: COPING_TOOL_LABELS[s3.copingTool],
    },
    resolutionCompleteness: {
      key: s3.resolutionCompleteness,
      label: RESOLUTION_LABELS[s3.resolutionCompleteness],
      description: RESOLUTION_DESCRIPTIONS[s3.resolutionCompleteness],
    },
    mustNeverList: s3.mustNeverList.filter((item) => item.trim()),

    // --- Section 4 ---
    personalization: isPersonalized,
    protagonist: {
      type: {
        key: s4.protagonistType,
        label: PROTAGONIST_TYPE_LABELS[s4.protagonistType],
      },
      gender:
        !isPersonalized && s4.protagonistGender
          ? {
              key: s4.protagonistGender,
              label: PROTAGONIST_GENDER_LABELS[s4.protagonistGender],
            }
          : null,
      ageRelativeToReader: {
        key: s4.protagonistAgeRelative,
        label: PROTAGONIST_AGE_RELATIVE_LABELS[s4.protagonistAgeRelative],
      },
    },
    caregiverPresence: {
      key: s4.caregiverPresence,
      label: CAREGIVER_PRESENCE_LABELS[s4.caregiverPresence],
    },
    narrativeDistance: {
      key: s4.narrativeDistance,
      label: NARRATIVE_DISTANCE_LABELS[s4.narrativeDistance],
      definition: NARRATIVE_DISTANCE_DEFINITIONS[s4.narrativeDistance],
    },
    parallelChallenge:
      s4.narrativeDistance === "parallel" && s4.parallelChallenge?.trim()
        ? s4.parallelChallenge.trim()
        : null,
    supportingCharacters: s4.supportingCharacters.map((char) => ({
      key: char,
      label: SUPPORTING_CHARACTER_LABELS[char],
      functionalRoleNote: s4.characterRoleNotes[char]?.trim() || null,
    })),
    characterNotes: s4.characterNotes?.trim() || null,

    // --- Section 5 ---
    whyNotPersonalized: !isPersonalized ? (s5 as PersonalizationConfig).whyNot : null,

    // === Agent-Internal Context ===

    structuralParameters: STRUCTURAL_PARAMS[s1.ageRange][s1.storyLength],

    ageAdaptationRules: AGE_ADAPTATION_RULES[s1.ageRange],

    narrativeArc: {
      phases: CORE_ARC,
      ageAdaptation: ARC_AGE_ADAPTATIONS[s1.ageRange],
    },

    priorityRules: {
      hierarchy: PRIORITY_RULES,
      specificRules: SPECIFIC_PRIORITY_RULES,
    },

    obligationTiers: {
      tiers: OBLIGATION_TIERS,
      globalInstruction: OBLIGATION_TIER_GLOBAL_INSTRUCTION,
      outputMetadataRequirement: OUTPUT_METADATA_REQUIREMENT,
    },
  };
}
