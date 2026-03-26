//server/src/models/storyBrief.model.ts
import admin from "firebase-admin";

/**
 * Story Brief Firestore Data Model
 * 
 * Represents a structured therapeutic intention defined by a specialist
 * before any AI story draft is generated.
 */

// ============================================================================
// Constants
// ============================================================================

// TODO: Replace hardcoded emotionalGoals validation
//       with dynamic validation against referenceData collection
const ALLOWED_EMOTIONAL_GOALS = [
  "normalize_emotions",
  "reduce_fear",
  "build_trust",
  "self_confidence",
  "emotional_regulation"
];

// ============================================================================
// Type Definitions
// ============================================================================

export type StoryBriefStatus = "draft" | "in_review" | "approved" | "in_generation" | "generated" | "published" | "archived";

export type ReviewDecision = "approved" | "approved_with_changes" | "rejected" | "needs_revision";

/** @deprecated Use TargetAgeRange instead. Kept for clinical-rules age-band lookups. */
export type AgeGroup = "0_3" | "3_6" | "6_9" | "9_12";

/** @deprecated Use TopicSensitivity instead */
export type EmotionalSensitivity = "low" | "medium" | "high";

export type TopicSensitivity = "low" | "medium" | "high";

export type Complexity = "very_simple" | "simple" | "moderate";

export type EmotionalTone = "very_gentle" | "calm" | "encouraging";

/** @deprecated Replaced by CaregiverRole in CharacterDesign */
export type CaregiverPresence = "included" | "self_guided";

export type CaregiverRole = "comfort_presence" | "active_guide" | "mentioned_not_present" | "absent";

export type ProtagonistType = "child_character" | "animal_character" | "fantasy_character";

export type ProtagonistAgeRelation = "same_age" | "slightly_older" | "unspecified";

export type ProtagonistGender = "male" | "female" | "neutral";

export type SupportCharacterType = "peer" | "sibling" | "teacher" | "animal_friend";

export type SupportCharacterRole = "mirror" | "model" | "supporter" | "companion";

export type EndingStyle = "calm_resolution" | "open_ended" | "empowering";

export type EmotionalArc = "gentle_progression" | "acknowledge_then_resolve" | "discovery_journey" | "supported_transition";

export type PeakIntensity = "minimal" | "mild" | "moderate";

export type GenderAdaptation = "allowed" | "not_allowed" | "requires_review";

// ============================================================================
// Nested Interfaces
// ============================================================================

export interface TargetAgeRange {
  /** Minimum age (integer, 0–12) */
  min: number;
  /** Maximum age (integer, 0–12, must be > min) */
  max: number;
}

export interface StoryContext {
  /** Primary topic enum key (e.g. "school_fears") */
  primaryTopic: string;
  /** General situation category within the topic (e.g. "separation") */
  generalSituation: string;
  /** Specific situation enum key (e.g. "afraid_parent_wont_return") */
  specificSituation: string;
  /** Target age range for the child */
  targetAgeRange: TargetAgeRange;
  /** Language complexity level */
  languageComplexity: Complexity;
}

/** @deprecated Absorbed into EmotionalDesign (topicSensitivity) */
export interface ChildProfile {
  emotionalSensitivity: EmotionalSensitivity;
}

/** @deprecated Use TherapeuticDesign instead */
export interface TherapeuticIntent {
  emotionalGoals: string[];
  keyMessage?: string;
}

export interface TherapeuticDesign {
  /** Array of emotional goal enum keys (max 3) */
  emotionalGoals: string[];
  /** Optional key message, max 200 characters */
  keyMessage?: string;
  /** Primary therapeutic approach(es), max 2 */
  therapeuticMechanism: string[];
  /** Specific coping strategies to model/teach, max 3 */
  copingTools: string[];
  /** Things the story must NEVER say, promise, suggest, or imply */
  therapeuticBoundaries: string[];
}

/** @deprecated Absorbed into EmotionalDesign (emotionalTone) */
export interface LanguageTone {
  emotionalTone: EmotionalTone;
}

export interface EmotionalDesign {
  /** Emotional tone level */
  emotionalTone: EmotionalTone;
  /** How sensitive the topic is (renamed from emotionalSensitivity) */
  topicSensitivity: TopicSensitivity;
  /** Preferred ending style */
  endingStyle: EndingStyle;
  /** Shape of the emotional journey through the story */
  emotionalArc: EmotionalArc;
  /** How intense the most challenging emotional moment should be */
  peakIntensity: PeakIntensity;
}

export interface SafetyConstraintsEnforced {
  /** Must always be true - not editable by clients */
  noThreateningImagery: true;
  /** Must always be true - not editable by clients */
  noShameLanguage: true;
  /** Must always be true - not editable by clients */
  noMoralizing: true;
  /** Must always be true - not editable by clients */
  validateEmotions: true;
  /** Must always be true - not editable by clients */
  externalizeProblem: true;
}

/** @deprecated Use SafetyBoundaries instead */
export interface SafetyConstraints {
  enforced: SafetyConstraintsEnforced;
  exclusions: string[];
}

export interface SafetyBoundaries {
  /** Content exclusion enum keys (renamed from exclusions) */
  contentExclusions: string[];
  /** Specific clinical cautions beyond standard exclusions */
  clinicalCautions?: string[];
  /** Always true — every generated story requires specialist review (system-controlled) */
  requiresSpecialistReview: true;
}

/** @deprecated Absorbed into CharacterDesign (caregiverRole) */
export interface StoryPreferences {
  caregiverPresence: CaregiverPresence;
}

export interface SupportCharacter {
  type: SupportCharacterType;
  role: SupportCharacterRole;
}

export interface CharacterDesign {
  /** What kind of character the protagonist is */
  protagonistType: ProtagonistType;
  /** How protagonist's age relates to target child's age */
  protagonistAgeRelation: ProtagonistAgeRelation;
  /** Gender of protagonist */
  protagonistGender: ProtagonistGender;
  /** Therapeutic role of caregiver in the story */
  caregiverRole: CaregiverRole;
  /** Optional support characters (max 3) */
  supportCharacters?: SupportCharacter[];
  /** Optional clinical notes about character design (max 500 chars) */
  characterNotes?: string;
}

export interface PersonalizationConfig {
  /** Master switch — whether this story can be personalized */
  personalizationAllowed: boolean;
  /** Why personalization is not allowed (required when personalizationAllowed is false, max 300 chars) */
  personalizationReason?: string;
  /** Whether child's name can be inserted into the story */
  namePersonalization: boolean;
  /** Whether AI illustrations can use the child's likeness */
  illustrationPersonalization: boolean;
  /** Rules about what cannot be changed during personalization */
  personalizationConstraints?: string[];
  /** Whether the protagonist's gender can change to match the child */
  genderAdaptation?: GenderAdaptation;
}

// ============================================================================
// Main Interface
// ============================================================================

export interface StoryBrief {
  /** Firestore document ID (auto-generated) */
  id?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata (system controlled)
  // ─────────────────────────────────────────────────────────────────────────
  /** Creation timestamp (Firestore Timestamp) */
  createdAt: admin.firestore.Timestamp;
  /** Last update timestamp (Firestore Timestamp) */
  updatedAt: admin.firestore.Timestamp;
  /** ID of the specialist who created this brief */
  createdBy: string;
  /** Lifecycle status of this brief */
  status: StoryBriefStatus;
  /** Optional timestamp when brief was locked for generation */
  lockedAt?: admin.firestore.Timestamp;
  /** ID of the draft that locked this brief */
  lockedByDraftId?: string;
  /** Document version number (starts at 1) */
  version: number;
  /** User ID of the psychologist who reviewed this brief */
  reviewedBy?: string;
  /** When the brief was reviewed */
  reviewedAt?: admin.firestore.Timestamp;
  /** Review outcome */
  reviewDecision?: ReviewDecision;
  /** Psychologist's review notes (immutable once set) */
  reviewComments?: string;
  /** Links this brief to its downstream Generation Contract */
  generationContractId?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Story Context (v2.0 — replaces therapeuticFocus, absorbs age + complexity)
  // ─────────────────────────────────────────────────────────────────────────
  /** Story context: topic hierarchy, target age range, and language complexity */
  storyContext: StoryContext;

  // ─────────────────────────────────────────────────────────────────────────
  // Therapeutic Design (v2.0 — replaces therapeuticIntent)
  // ─────────────────────────────────────────────────────────────────────────
  /** Therapeutic design: goals, mechanisms, coping tools, boundaries */
  therapeuticDesign: TherapeuticDesign;

  // ─────────────────────────────────────────────────────────────────────────
  // Emotional Design (v2.0 — absorbs childProfile, languageTone, endingStyle)
  // ─────────────────────────────────────────────────────────────────────────
  /** Emotional design: tone, sensitivity, ending style, arc, peak intensity */
  emotionalDesign: EmotionalDesign;

  // ─────────────────────────────────────────────────────────────────────────
  // Safety & Boundaries (v2.0 — replaces safetyConstraints)
  // ─────────────────────────────────────────────────────────────────────────
  /** Safety boundaries: enforced rules, content exclusions, clinical cautions, review settings */
  safetyBoundaries: SafetyBoundaries;

  // ─────────────────────────────────────────────────────────────────────────
  // Character Design (v2.0 — new section, absorbs caregiverPresence)
  // ─────────────────────────────────────────────────────────────────────────
  /** Character design: protagonist, caregiver role, support characters */
  characterDesign: CharacterDesign;

  // ─────────────────────────────────────────────────────────────────────────
  // Personalization Configuration (v2.0 — new section)
  // ─────────────────────────────────────────────────────────────────────────
  /** Personalization config: controls whether and how a story can be personalized */
  personalizationConfig: PersonalizationConfig;
}

// ============================================================================
// Input/Output Types
// ============================================================================

/**
 * Input type for creating a new story brief
 * Excludes system-controlled fields (createdAt, status, version)
 */
export interface StoryBriefInput {
  createdBy: string;
  storyContext: StoryContext;
  therapeuticDesign: TherapeuticDesign;
  emotionalDesign: EmotionalDesign;
  characterDesign: CharacterDesign;
  safetyBoundaries: {
    contentExclusions: string[];
    clinicalCautions?: string[];
  };
  personalizationConfig: PersonalizationConfig;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a validated StoryBrief document for Firestore
 * 
 * @param data - Input data for the story brief
 * @returns Validated StoryBrief document ready for Firestore
 * @throws Error if validation fails
 */
export function createStoryBrief(data: StoryBriefInput): Omit<StoryBrief, "id"> {
  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────
  
  if (!data.createdBy || typeof data.createdBy !== "string" || data.createdBy.trim() === "") {
    throw new Error("createdBy is required and must be a non-empty string");
  }

  if (!data.storyContext) {
    throw new Error("storyContext is required");
  }

  if (!data.storyContext.primaryTopic || typeof data.storyContext.primaryTopic !== "string") {
    throw new Error("storyContext.primaryTopic is required and must be a string");
  }

  if (!data.storyContext.generalSituation || typeof data.storyContext.generalSituation !== "string") {
    throw new Error("storyContext.generalSituation is required and must be a string");
  }

  if (!data.storyContext.specificSituation || typeof data.storyContext.specificSituation !== "string") {
    throw new Error("storyContext.specificSituation is required and must be a string");
  }

  if (!data.storyContext.targetAgeRange || typeof data.storyContext.targetAgeRange !== "object") {
    throw new Error("storyContext.targetAgeRange is required and must be an object with min and max");
  }

  const { min, max } = data.storyContext.targetAgeRange;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 12 || min >= max) {
    throw new Error("storyContext.targetAgeRange must satisfy: 0 ≤ min < max ≤ 12, both integers");
  }

  if (!data.storyContext.languageComplexity || typeof data.storyContext.languageComplexity !== "string") {
    throw new Error("storyContext.languageComplexity is required and must be a string");
  }

  if (!data.emotionalDesign) {
    throw new Error("emotionalDesign is required");
  }

  if (!data.emotionalDesign.emotionalTone || typeof data.emotionalDesign.emotionalTone !== "string") {
    throw new Error("emotionalDesign.emotionalTone is required and must be a string");
  }

  if (!data.emotionalDesign.topicSensitivity || typeof data.emotionalDesign.topicSensitivity !== "string") {
    throw new Error("emotionalDesign.topicSensitivity is required and must be a string");
  }

  if (!data.emotionalDesign.endingStyle || typeof data.emotionalDesign.endingStyle !== "string") {
    throw new Error("emotionalDesign.endingStyle is required and must be a string");
  }

  if (!data.emotionalDesign.emotionalArc || !["gentle_progression", "acknowledge_then_resolve", "discovery_journey", "supported_transition"].includes(data.emotionalDesign.emotionalArc)) {
    throw new Error("emotionalDesign.emotionalArc is required and must be one of: gentle_progression, acknowledge_then_resolve, discovery_journey, supported_transition");
  }

  if (!data.emotionalDesign.peakIntensity || typeof data.emotionalDesign.peakIntensity !== "string") {
    throw new Error("emotionalDesign.peakIntensity is required and must be a string");
  }

  if (!data.therapeuticDesign) {
    throw new Error("therapeuticDesign is required");
  }

  if (!Array.isArray(data.therapeuticDesign.emotionalGoals)) {
    throw new Error("therapeuticDesign.emotionalGoals is required and must be an array");
  }

  if (data.therapeuticDesign.emotionalGoals.length === 0) {
    throw new Error("therapeuticDesign.emotionalGoals must contain at least one goal");
  }

  if (data.therapeuticDesign.emotionalGoals.length > 3) {
    throw new Error("therapeuticDesign.emotionalGoals must contain at most 3 goals");
  }

  for (const goal of data.therapeuticDesign.emotionalGoals) {
    if (!ALLOWED_EMOTIONAL_GOALS.includes(goal.trim().toLowerCase())) {
      throw new Error(`Invalid emotional goal: ${goal}`);
    }
  }

  if (data.therapeuticDesign.keyMessage && data.therapeuticDesign.keyMessage.length > 200) {
    throw new Error("therapeuticDesign.keyMessage must be at most 200 characters");
  }

  if (!Array.isArray(data.therapeuticDesign.therapeuticMechanism) || data.therapeuticDesign.therapeuticMechanism.length === 0) {
    throw new Error("therapeuticDesign.therapeuticMechanism is required and must contain at least one mechanism");
  }

  if (data.therapeuticDesign.therapeuticMechanism.length > 2) {
    throw new Error("therapeuticDesign.therapeuticMechanism must contain at most 2 mechanisms");
  }

  if (!Array.isArray(data.therapeuticDesign.copingTools) || data.therapeuticDesign.copingTools.length === 0) {
    throw new Error("therapeuticDesign.copingTools is required and must contain at least one tool");
  }

  if (data.therapeuticDesign.copingTools.length > 3) {
    throw new Error("therapeuticDesign.copingTools must contain at most 3 tools");
  }

  if (!Array.isArray(data.therapeuticDesign.therapeuticBoundaries) || data.therapeuticDesign.therapeuticBoundaries.length === 0) {
    throw new Error("therapeuticDesign.therapeuticBoundaries is required and must contain at least one boundary");
  }

  if (!data.safetyBoundaries) {
    throw new Error("safetyBoundaries is required");
  }

  if (!Array.isArray(data.safetyBoundaries.contentExclusions)) {
    throw new Error("safetyBoundaries.contentExclusions is required and must be an array");
  }

  if (data.safetyBoundaries.clinicalCautions !== undefined) {
    if (!Array.isArray(data.safetyBoundaries.clinicalCautions)) {
      throw new Error("safetyBoundaries.clinicalCautions must be an array if provided");
    }
  }

  if (!data.characterDesign) {
    throw new Error("characterDesign is required");
  }

  if (!data.characterDesign.protagonistType || typeof data.characterDesign.protagonistType !== "string") {
    throw new Error("characterDesign.protagonistType is required and must be a string");
  }

  if (!data.characterDesign.protagonistAgeRelation || typeof data.characterDesign.protagonistAgeRelation !== "string") {
    throw new Error("characterDesign.protagonistAgeRelation is required and must be a string");
  }

  if (!data.characterDesign.protagonistGender || typeof data.characterDesign.protagonistGender !== "string") {
    throw new Error("characterDesign.protagonistGender is required and must be a string");
  }

  if (!data.characterDesign.caregiverRole || typeof data.characterDesign.caregiverRole !== "string") {
    throw new Error("characterDesign.caregiverRole is required and must be a string");
  }

  if (data.characterDesign.supportCharacters !== undefined) {
    if (!Array.isArray(data.characterDesign.supportCharacters)) {
      throw new Error("characterDesign.supportCharacters must be an array if provided");
    }
    if (data.characterDesign.supportCharacters.length > 3) {
      throw new Error("characterDesign.supportCharacters must contain at most 3 characters");
    }
    const validTypes = ["peer", "sibling", "teacher", "animal_friend"];
    const validRoles = ["mirror", "model", "supporter", "companion"];
    for (const sc of data.characterDesign.supportCharacters) {
      if (!sc.type || !validTypes.includes(sc.type)) {
        throw new Error(`characterDesign.supportCharacters[].type must be one of: ${validTypes.join(", ")}`);
      }
      if (!sc.role || !validRoles.includes(sc.role)) {
        throw new Error(`characterDesign.supportCharacters[].role must be one of: ${validRoles.join(", ")}`);
      }
    }
  }

  if (data.characterDesign.characterNotes !== undefined && data.characterDesign.characterNotes !== null) {
    if (typeof data.characterDesign.characterNotes !== "string") {
      throw new Error("characterDesign.characterNotes must be a string if provided");
    }
    if (data.characterDesign.characterNotes.length > 500) {
      throw new Error("characterDesign.characterNotes must be at most 500 characters");
    }
  }

  if (!data.personalizationConfig) {
    throw new Error("personalizationConfig is required");
  }

  if (typeof data.personalizationConfig.personalizationAllowed !== "boolean") {
    throw new Error("personalizationConfig.personalizationAllowed is required and must be a boolean");
  }

  if (typeof data.personalizationConfig.namePersonalization !== "boolean") {
    throw new Error("personalizationConfig.namePersonalization is required and must be a boolean");
  }

  if (typeof data.personalizationConfig.illustrationPersonalization !== "boolean") {
    throw new Error("personalizationConfig.illustrationPersonalization is required and must be a boolean");
  }

  if (!data.personalizationConfig.personalizationAllowed && !data.personalizationConfig.personalizationReason?.trim()) {
    throw new Error("personalizationConfig.personalizationReason is required when personalizationAllowed is false");
  }

  if (data.personalizationConfig.personalizationReason !== undefined) {
    if (typeof data.personalizationConfig.personalizationReason !== "string") {
      throw new Error("personalizationConfig.personalizationReason must be a string if provided");
    }
    if (data.personalizationConfig.personalizationReason.length > 300) {
      throw new Error("personalizationConfig.personalizationReason must be at most 300 characters");
    }
  }

  if (data.personalizationConfig.personalizationConstraints !== undefined) {
    if (!Array.isArray(data.personalizationConfig.personalizationConstraints)) {
      throw new Error("personalizationConfig.personalizationConstraints must be an array if provided");
    }
  }

  if (data.personalizationConfig.genderAdaptation !== undefined) {
    if (!["allowed", "not_allowed", "requires_review"].includes(data.personalizationConfig.genderAdaptation)) {
      throw new Error("personalizationConfig.genderAdaptation must be one of: allowed, not_allowed, requires_review");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build Document
  // ─────────────────────────────────────────────────────────────────────────
  
  const now = admin.firestore.Timestamp.now();

  return {
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy.trim(),
    status: "draft" as StoryBriefStatus,
    version: 1,
    storyContext: {
      primaryTopic: data.storyContext.primaryTopic.trim().toLowerCase(),
      generalSituation: data.storyContext.generalSituation.trim().toLowerCase(),
      specificSituation: data.storyContext.specificSituation.trim().toLowerCase(),
      targetAgeRange: {
        min: data.storyContext.targetAgeRange.min,
        max: data.storyContext.targetAgeRange.max,
      },
      languageComplexity: data.storyContext.languageComplexity,
    },
    therapeuticDesign: {
      emotionalGoals: data.therapeuticDesign.emotionalGoals.map((goal) =>
        goal.trim().toLowerCase()
      ),
      ...(data.therapeuticDesign.keyMessage && { keyMessage: data.therapeuticDesign.keyMessage.trim() }),
      therapeuticMechanism: data.therapeuticDesign.therapeuticMechanism.map((m) =>
        m.trim().toLowerCase()
      ),
      copingTools: data.therapeuticDesign.copingTools.map((t) =>
        t.trim().toLowerCase()
      ),
      therapeuticBoundaries: data.therapeuticDesign.therapeuticBoundaries.map((b) =>
        b.trim()
      ),
    },
    emotionalDesign: {
      emotionalTone: data.emotionalDesign.emotionalTone,
      topicSensitivity: data.emotionalDesign.topicSensitivity,
      endingStyle: data.emotionalDesign.endingStyle,
      emotionalArc: data.emotionalDesign.emotionalArc,
      peakIntensity: data.emotionalDesign.peakIntensity,
    },
    safetyBoundaries: (() => {
      const sb: SafetyBoundaries = {
        contentExclusions: data.safetyBoundaries.contentExclusions.map((e) =>
          e.trim().toLowerCase()
        ),
        requiresSpecialistReview: true,
      };
      if (data.safetyBoundaries.clinicalCautions && data.safetyBoundaries.clinicalCautions.length > 0) {
        sb.clinicalCautions = data.safetyBoundaries.clinicalCautions.map((c) => c.trim());
      }
      return sb;
    })(),
    characterDesign: (() => {
      const cd: CharacterDesign = {
        protagonistType: data.characterDesign.protagonistType,
        protagonistAgeRelation: data.characterDesign.protagonistAgeRelation,
        protagonistGender: data.characterDesign.protagonistGender,
        caregiverRole: data.characterDesign.caregiverRole,
      };
      if (data.characterDesign.supportCharacters && data.characterDesign.supportCharacters.length > 0) {
        cd.supportCharacters = data.characterDesign.supportCharacters;
      }
      if (data.characterDesign.characterNotes && data.characterDesign.characterNotes.trim()) {
        cd.characterNotes = data.characterDesign.characterNotes.trim();
      }
      return cd;
    })(),
    personalizationConfig: (() => {
      const pc: PersonalizationConfig = {
        personalizationAllowed: data.personalizationConfig.personalizationAllowed,
        namePersonalization: data.personalizationConfig.namePersonalization,
        illustrationPersonalization: data.personalizationConfig.illustrationPersonalization,
      };
      if (data.personalizationConfig.personalizationReason && data.personalizationConfig.personalizationReason.trim()) {
        pc.personalizationReason = data.personalizationConfig.personalizationReason.trim();
      }
      if (data.personalizationConfig.personalizationConstraints && data.personalizationConfig.personalizationConstraints.length > 0) {
        pc.personalizationConstraints = data.personalizationConfig.personalizationConstraints.map((c) => c.trim()).filter(Boolean);
      }
      if (data.personalizationConfig.genderAdaptation) {
        pc.genderAdaptation = data.personalizationConfig.genderAdaptation;
      }
      return pc;
    })(),
  };
}
