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

export type StoryBriefStatus = "created" | "draft_generating" | "draft_generated" | "archived";

export type AgeGroup = "3_4" | "5_6" | "7_8" | "9_10";

export type EmotionalSensitivity = "low" | "medium" | "high";

export type Complexity = "very_simple" | "simple" | "moderate";

export type EmotionalTone = "very_gentle" | "calm" | "encouraging";

export type CaregiverPresence = "included" | "self_guided";

export type EndingStyle = "calm_resolution" | "open_ended" | "empowering";

// ============================================================================
// Nested Interfaces
// ============================================================================

export interface TherapeuticFocus {
  /** Primary topic enum key (e.g. "fear_anxiety") */
  primaryTopic: string;
  /** Specific situation enum key (e.g. "fear_of_school") */
  specificSituation: string;
}

export interface ChildProfile {
  /** Age group enum key */
  ageGroup: AgeGroup;
  /** Emotional sensitivity level */
  emotionalSensitivity: EmotionalSensitivity;
}

export interface TherapeuticIntent {
  /** Array of emotional goal enum keys (max 3) */
  emotionalGoals: string[];
  /** Optional key message, max 200 characters */
  keyMessage?: string;
}

export interface LanguageTone {
  /** Language complexity level */
  complexity: Complexity;
  /** Emotional tone level */
  emotionalTone: EmotionalTone;
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

export interface SafetyConstraints {
  /** Enforced safety rules (always true, not editable) */
  enforced: SafetyConstraintsEnforced;
  /** Array of exclusion enum keys (e.g. ["medical_imagery"]) */
  exclusions: string[];
}

export interface StoryPreferences {
  /** Caregiver presence preference */
  caregiverPresence: CaregiverPresence;
  /** Preferred ending style */
  endingStyle: EndingStyle;
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
  /** Once status becomes "draft_generated", this brief must be treated as immutable */
  status: StoryBriefStatus;
  /** Optional timestamp when brief was locked (set when status === "draft_generating" or "draft_generated") */
  lockedAt?: admin.firestore.Timestamp;
  /** ID of the draft that locked this brief (set when status === "draft_generated") */
  lockedByDraftId?: string;
  /** Document version number (starts at 1) */
  version: number;

  // ─────────────────────────────────────────────────────────────────────────
  // Therapeutic Focus
  // ─────────────────────────────────────────────────────────────────────────
  /** Therapeutic focus with primary topic and specific situation */
  therapeuticFocus: TherapeuticFocus;

  // ─────────────────────────────────────────────────────────────────────────
  // Child Profile (abstract, no PII)
  // ─────────────────────────────────────────────────────────────────────────
  /** Abstract child profile information */
  childProfile: ChildProfile;

  // ─────────────────────────────────────────────────────────────────────────
  // Therapeutic Intent
  // ─────────────────────────────────────────────────────────────────────────
  /** Therapeutic intent with emotional goals and optional key message */
  therapeuticIntent: TherapeuticIntent;

  // ─────────────────────────────────────────────────────────────────────────
  // Language & Tone Controls
  // ─────────────────────────────────────────────────────────────────────────
  /** Language complexity and emotional tone settings */
  languageTone: LanguageTone;

  // ─────────────────────────────────────────────────────────────────────────
  // Safety Constraints
  // ─────────────────────────────────────────────────────────────────────────
  /** Safety constraints with enforced rules and exclusions */
  safetyConstraints: SafetyConstraints;

  // ─────────────────────────────────────────────────────────────────────────
  // Story Preferences
  // ─────────────────────────────────────────────────────────────────────────
  /** Story preferences for caregiver presence and ending style */
  storyPreferences: StoryPreferences;
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
  therapeuticFocus: TherapeuticFocus;
  childProfile: ChildProfile;
  therapeuticIntent: TherapeuticIntent;
  languageTone: LanguageTone;
  safetyConstraints: {
    /** Only exclusions are allowed in input (enforced is set automatically) */
    exclusions: string[];
  };
  storyPreferences: StoryPreferences;
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

  if (!data.therapeuticFocus) {
    throw new Error("therapeuticFocus is required");
  }

  if (!data.therapeuticFocus.primaryTopic || typeof data.therapeuticFocus.primaryTopic !== "string") {
    throw new Error("therapeuticFocus.primaryTopic is required and must be a string");
  }

  if (!data.therapeuticFocus.specificSituation || typeof data.therapeuticFocus.specificSituation !== "string") {
    throw new Error("therapeuticFocus.specificSituation is required and must be a string");
  }

  if (!data.childProfile) {
    throw new Error("childProfile is required");
  }

  if (!data.childProfile.ageGroup || !["3_4", "5_6", "7_8", "9_10"].includes(data.childProfile.ageGroup)) {
    throw new Error("childProfile.ageGroup is required and must be one of: 3_4, 5_6, 7_8, 9_10");
  }

  if (!data.childProfile.emotionalSensitivity || !["low", "medium", "high"].includes(data.childProfile.emotionalSensitivity)) {
    throw new Error("childProfile.emotionalSensitivity is required and must be one of: low, medium, high");
  }

  if (!data.therapeuticIntent) {
    throw new Error("therapeuticIntent is required");
  }

  if (!Array.isArray(data.therapeuticIntent.emotionalGoals)) {
    throw new Error("therapeuticIntent.emotionalGoals is required and must be an array");
  }

  if (data.therapeuticIntent.emotionalGoals.length === 0) {
    throw new Error("therapeuticIntent.emotionalGoals must contain at least one goal");
  }

  if (data.therapeuticIntent.emotionalGoals.length > 3) {
    throw new Error("therapeuticIntent.emotionalGoals must contain at most 3 goals");
  }

  for (const goal of data.therapeuticIntent.emotionalGoals) {
    if (!ALLOWED_EMOTIONAL_GOALS.includes(goal.trim().toLowerCase())) {
      throw new Error(`Invalid emotional goal: ${goal}`);
    }
  }

  if (data.therapeuticIntent.keyMessage && data.therapeuticIntent.keyMessage.length > 200) {
    throw new Error("therapeuticIntent.keyMessage must be at most 200 characters");
  }

  if (!data.languageTone) {
    throw new Error("languageTone is required");
  }

  if (!data.languageTone.complexity || !["very_simple", "simple", "moderate"].includes(data.languageTone.complexity)) {
    throw new Error("languageTone.complexity is required and must be one of: very_simple, simple, moderate");
  }

  if (!data.languageTone.emotionalTone || !["very_gentle", "calm", "encouraging"].includes(data.languageTone.emotionalTone)) {
    throw new Error("languageTone.emotionalTone is required and must be one of: very_gentle, calm, encouraging");
  }

  if (!data.safetyConstraints) {
    throw new Error("safetyConstraints is required");
  }

  if (!Array.isArray(data.safetyConstraints.exclusions)) {
    throw new Error("safetyConstraints.exclusions is required and must be an array");
  }

  if (!data.storyPreferences) {
    throw new Error("storyPreferences is required");
  }

  if (!data.storyPreferences.caregiverPresence || !["included", "self_guided"].includes(data.storyPreferences.caregiverPresence)) {
    throw new Error("storyPreferences.caregiverPresence is required and must be one of: included, self_guided");
  }

  if (!data.storyPreferences.endingStyle || !["calm_resolution", "open_ended", "empowering"].includes(data.storyPreferences.endingStyle)) {
    throw new Error("storyPreferences.endingStyle is required and must be one of: calm_resolution, open_ended, empowering");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build Document
  // ─────────────────────────────────────────────────────────────────────────
  
  const now = admin.firestore.Timestamp.now();

  return {
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy.trim(),
    status: "created" as StoryBriefStatus,
    version: 1,
    therapeuticFocus: {
      primaryTopic: data.therapeuticFocus.primaryTopic.trim().toLowerCase(),
      specificSituation: data.therapeuticFocus.specificSituation.trim().toLowerCase(),
    },
    childProfile: {
      ageGroup: data.childProfile.ageGroup,
      emotionalSensitivity: data.childProfile.emotionalSensitivity,
    },
    therapeuticIntent: {
      emotionalGoals: data.therapeuticIntent.emotionalGoals.map((goal) =>
        goal.trim().toLowerCase()
      ),
      ...(data.therapeuticIntent.keyMessage && { keyMessage: data.therapeuticIntent.keyMessage.trim() }),
    },
    languageTone: {
      complexity: data.languageTone.complexity,
      emotionalTone: data.languageTone.emotionalTone,
    },
    safetyConstraints: {
      // Enforced constraints are always true and not editable
      enforced: {
        noThreateningImagery: true,
        noShameLanguage: true,
        noMoralizing: true,
        validateEmotions: true,
        externalizeProblem: true,
      },
      exclusions: data.safetyConstraints.exclusions.map((exclusion) =>
        exclusion.trim().toLowerCase()
      ),
    },
    storyPreferences: {
      caregiverPresence: data.storyPreferences.caregiverPresence,
      endingStyle: data.storyPreferences.endingStyle,
    },
  };
}
