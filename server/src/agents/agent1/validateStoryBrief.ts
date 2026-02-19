// server/src/agents/agent1/validateStoryBrief.ts
import { firestore } from "../../config/firebase";
import {
  checkReferenceItem,
  getSituationItem,
} from "../../services/referenceData.service";
import type {
  StoryBriefInput,
  AgeGroup,
  EmotionalSensitivity,
  Complexity,
  EmotionalTone,
  CaregiverPresence,
  EndingStyle,
} from "../../models/storyBrief.model";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationError {
  code: string;
  field: string;
  message: string;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalizedBrief?: StoryBriefInput;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_AGE_GROUPS: AgeGroup[] = ["0_3", "3_6", "6_9", "9_12"];
const ALLOWED_EMOTIONAL_SENSITIVITY: EmotionalSensitivity[] = ["low", "medium", "high"];
const ALLOWED_COMPLEXITY: Complexity[] = ["very_simple", "simple", "moderate"];
const ALLOWED_EMOTIONAL_TONE: EmotionalTone[] = ["very_gentle", "calm", "encouraging"];
const ALLOWED_CAREGIVER_PRESENCE: CaregiverPresence[] = ["included", "self_guided"];
const ALLOWED_ENDING_STYLE: EndingStyle[] = ["calm_resolution", "open_ended", "empowering"];

// ============================================================================
// Error Codes
// ============================================================================

const ERROR_CODES = {
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_GOALS_COUNT: "INVALID_GOALS_COUNT",
  KEY_MESSAGE_INVALID_TYPE: "KEY_MESSAGE_INVALID_TYPE",
  KEY_MESSAGE_TOO_LONG: "KEY_MESSAGE_TOO_LONG",
  TOPIC_NOT_FOUND_OR_INACTIVE: "TOPIC_NOT_FOUND_OR_INACTIVE",
  SITUATION_NOT_FOUND_OR_INACTIVE: "SITUATION_NOT_FOUND_OR_INACTIVE",
  SITUATION_TOPIC_MISMATCH: "SITUATION_TOPIC_MISMATCH",
  GOAL_NOT_FOUND_OR_INACTIVE: "GOAL_NOT_FOUND_OR_INACTIVE",
  EXCLUSION_NOT_FOUND_OR_INACTIVE: "EXCLUSION_NOT_FOUND_OR_INACTIVE",
  INVALID_AGE_GROUP: "INVALID_AGE_GROUP",
  INVALID_EMOTIONAL_SENSITIVITY: "INVALID_EMOTIONAL_SENSITIVITY",
  INVALID_COMPLEXITY: "INVALID_COMPLEXITY",
  INVALID_EMOTIONAL_TONE: "INVALID_EMOTIONAL_TONE",
  INVALID_CAREGIVER_PRESENCE: "INVALID_CAREGIVER_PRESENCE",
  INVALID_ENDING_STYLE: "INVALID_ENDING_STYLE",
} as const;

const WARNING_CODES = {
  AGE_SELF_GUIDED_WARNING: "AGE_SELF_GUIDED_WARNING",
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function addError(
  errors: ValidationError[],
  code: string,
  field: string,
  message: string
): void {
  errors.push({ code, field, message });
}

function addWarning(
  warnings: ValidationWarning[],
  code: string,
  field: string,
  message: string
): void {
  warnings.push({ code, field, message });
}

function normalizeString(value: any): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeArray(value: any): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates a StoryBrief input with hard checks and referenceData verification
 * 
 * @param brief - The story brief input to validate
 * @param deps - Optional dependencies (Firestore instance)
 * @returns Validation result with errors, warnings, and normalized brief
 */
export async function validateStoryBriefInput(
  brief: any,
  deps?: { firestore?: typeof firestore }
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fs = deps?.firestore || firestore;

  // Normalize the brief
  const normalized: any = {};

  // ==========================================================================
  // 1. Required Fields Validation
  // ==========================================================================

  // createdBy
  const createdBy = normalizeString(brief?.createdBy);
  if (!createdBy) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "createdBy",
      "createdBy is required and must be a non-empty string"
    );
  } else {
    normalized.createdBy = createdBy;
  }

  // therapeuticFocus
  // Store normalized values separately to allow independent reference data validation
  let normalizedPrimaryTopic: string | undefined = undefined;
  let normalizedSpecificSituation: string | undefined = undefined;
  let isPrimaryTopicValid = false;
  let isSpecificSituationValid = false;

  if (!brief?.therapeuticFocus) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "therapeuticFocus",
      "therapeuticFocus is required"
    );
  } else {
    const primaryTopic = normalizeString(brief.therapeuticFocus.primaryTopic);
    const specificSituation = normalizeString(brief.therapeuticFocus.specificSituation);

    if (!primaryTopic) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticFocus.primaryTopic",
        "therapeuticFocus.primaryTopic is required"
      );
    } else {
      isPrimaryTopicValid = true;
      normalizedPrimaryTopic = primaryTopic.toLowerCase();
    }

    if (!specificSituation) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticFocus.specificSituation",
        "therapeuticFocus.specificSituation is required"
      );
    } else {
      isSpecificSituationValid = true;
      normalizedSpecificSituation = specificSituation.toLowerCase();
    }

    // Only assign to normalized if both values are valid
    if (isPrimaryTopicValid && isSpecificSituationValid) {
      normalized.therapeuticFocus = {
        primaryTopic: normalizedPrimaryTopic,
        specificSituation: normalizedSpecificSituation,
      };
    }
  }

  // childProfile
  if (!brief?.childProfile) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "childProfile",
      "childProfile is required"
    );
  } else {
    const ageGroup = brief.childProfile.ageGroup;
    const emotionalSensitivity = brief.childProfile.emotionalSensitivity;

    let isAgeGroupValid = false;
    let isEmotionalSensitivityValid = false;

    if (!ageGroup) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "childProfile.ageGroup",
        "childProfile.ageGroup is required"
      );
    } else if (!ALLOWED_AGE_GROUPS.includes(ageGroup)) {
      addError(
        errors,
        ERROR_CODES.INVALID_AGE_GROUP,
        "childProfile.ageGroup",
        `childProfile.ageGroup must be one of: ${ALLOWED_AGE_GROUPS.join(", ")}`
      );
    } else {
      isAgeGroupValid = true;
    }

    if (!emotionalSensitivity) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "childProfile.emotionalSensitivity",
        "childProfile.emotionalSensitivity is required"
      );
    } else if (!ALLOWED_EMOTIONAL_SENSITIVITY.includes(emotionalSensitivity)) {
      addError(
        errors,
        ERROR_CODES.INVALID_EMOTIONAL_SENSITIVITY,
        "childProfile.emotionalSensitivity",
        `childProfile.emotionalSensitivity must be one of: ${ALLOWED_EMOTIONAL_SENSITIVITY.join(", ")}`
      );
    } else {
      isEmotionalSensitivityValid = true;
    }

    // Only assign to normalized if both values are valid
    if (isAgeGroupValid && isEmotionalSensitivityValid) {
      normalized.childProfile = {
        ageGroup: ageGroup as AgeGroup,
        emotionalSensitivity: emotionalSensitivity as EmotionalSensitivity,
      };
    }
  }

  // therapeuticIntent
  if (!brief?.therapeuticIntent) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "therapeuticIntent",
      "therapeuticIntent is required"
    );
  } else {
    const emotionalGoals = normalizeArray(brief.therapeuticIntent.emotionalGoals);
    
    // Validate keyMessage type if provided
    let keyMessage: string | undefined = undefined;
    if (brief.therapeuticIntent.keyMessage !== undefined && brief.therapeuticIntent.keyMessage !== null) {
      if (typeof brief.therapeuticIntent.keyMessage !== "string") {
        addError(
          errors,
          ERROR_CODES.KEY_MESSAGE_INVALID_TYPE,
          "therapeuticIntent.keyMessage",
          "therapeuticIntent.keyMessage must be a string if provided"
        );
      } else {
        keyMessage = normalizeString(brief.therapeuticIntent.keyMessage);
      }
    }

    if (emotionalGoals.length === 0) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticIntent.emotionalGoals",
        "therapeuticIntent.emotionalGoals must contain at least one goal"
      );
    } else if (emotionalGoals.length > 3) {
      addError(
        errors,
        ERROR_CODES.INVALID_GOALS_COUNT,
        "therapeuticIntent.emotionalGoals",
        "therapeuticIntent.emotionalGoals must contain at most 3 goals"
      );
    }

    if (keyMessage && keyMessage.length > 200) {
      addError(
        errors,
        ERROR_CODES.KEY_MESSAGE_TOO_LONG,
        "therapeuticIntent.keyMessage",
        "therapeuticIntent.keyMessage must be at most 200 characters"
      );
    }

    normalized.therapeuticIntent = {
      emotionalGoals,
      ...(keyMessage && { keyMessage }),
    };
  }

  // languageTone
  if (!brief?.languageTone) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "languageTone",
      "languageTone is required"
    );
  } else {
    const complexity = brief.languageTone.complexity;
    const emotionalTone = brief.languageTone.emotionalTone;

    let isComplexityValid = false;
    let isEmotionalToneValid = false;

    if (!complexity) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "languageTone.complexity",
        "languageTone.complexity is required"
      );
    } else if (!ALLOWED_COMPLEXITY.includes(complexity)) {
      addError(
        errors,
        ERROR_CODES.INVALID_COMPLEXITY,
        "languageTone.complexity",
        `languageTone.complexity must be one of: ${ALLOWED_COMPLEXITY.join(", ")}`
      );
    } else {
      isComplexityValid = true;
    }

    if (!emotionalTone) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "languageTone.emotionalTone",
        "languageTone.emotionalTone is required"
      );
    } else if (!ALLOWED_EMOTIONAL_TONE.includes(emotionalTone)) {
      addError(
        errors,
        ERROR_CODES.INVALID_EMOTIONAL_TONE,
        "languageTone.emotionalTone",
        `languageTone.emotionalTone must be one of: ${ALLOWED_EMOTIONAL_TONE.join(", ")}`
      );
    } else {
      isEmotionalToneValid = true;
    }

    // Only assign to normalized if both values are valid
    if (isComplexityValid && isEmotionalToneValid) {
      normalized.languageTone = {
        complexity: complexity as Complexity,
        emotionalTone: emotionalTone as EmotionalTone,
      };
    }
  }

  // safetyConstraints
  if (!brief?.safetyConstraints) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "safetyConstraints",
      "safetyConstraints is required"
    );
  } else {
    const exclusions = normalizeArray(brief.safetyConstraints.exclusions);
    normalized.safetyConstraints = {
      exclusions,
    };
  }

  // storyPreferences
  if (!brief?.storyPreferences) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "storyPreferences",
      "storyPreferences is required"
    );
  } else {
    const caregiverPresence = brief.storyPreferences.caregiverPresence;
    const endingStyle = brief.storyPreferences.endingStyle;

    let isCaregiverPresenceValid = false;
    let isEndingStyleValid = false;

    if (!caregiverPresence) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyPreferences.caregiverPresence",
        "storyPreferences.caregiverPresence is required"
      );
    } else if (!ALLOWED_CAREGIVER_PRESENCE.includes(caregiverPresence)) {
      addError(
        errors,
        ERROR_CODES.INVALID_CAREGIVER_PRESENCE,
        "storyPreferences.caregiverPresence",
        `storyPreferences.caregiverPresence must be one of: ${ALLOWED_CAREGIVER_PRESENCE.join(", ")}`
      );
    } else {
      isCaregiverPresenceValid = true;
    }

    if (!endingStyle) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyPreferences.endingStyle",
        "storyPreferences.endingStyle is required"
      );
    } else if (!ALLOWED_ENDING_STYLE.includes(endingStyle)) {
      addError(
        errors,
        ERROR_CODES.INVALID_ENDING_STYLE,
        "storyPreferences.endingStyle",
        `storyPreferences.endingStyle must be one of: ${ALLOWED_ENDING_STYLE.join(", ")}`
      );
    } else {
      isEndingStyleValid = true;
    }

    // Only assign to normalized if both values are valid
    if (isCaregiverPresenceValid && isEndingStyleValid) {
      normalized.storyPreferences = {
        caregiverPresence: caregiverPresence as CaregiverPresence,
        endingStyle: endingStyle as EndingStyle,
      };
    }
  }

  // ==========================================================================
  // 2. Reference Data Verification (only if basic structure is valid)
  // ==========================================================================

  // Track topic validity to avoid misleading situation-topic mismatch errors
  let isTopicValid = false;

  // Check topic reference data if it passed structural validation
  // This allows checking even if specificSituation failed validation
  if (normalizedPrimaryTopic && isPrimaryTopicValid) {
    try {
      const topicCheck = await checkReferenceItem(
        "topics",
        normalizedPrimaryTopic,
        fs
      );

      if (!topicCheck.exists) {
        addError(
          errors,
          ERROR_CODES.TOPIC_NOT_FOUND_OR_INACTIVE,
          "therapeuticFocus.primaryTopic",
          `Topic "${normalizedPrimaryTopic}" not found in referenceData`
        );
      } else if (!topicCheck.active) {
        addError(
          errors,
          ERROR_CODES.TOPIC_NOT_FOUND_OR_INACTIVE,
          "therapeuticFocus.primaryTopic",
          `Topic "${normalizedPrimaryTopic}" exists but is inactive`
        );
      } else {
        // Topic is valid (exists and is active)
        isTopicValid = true;
      }
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.TOPIC_NOT_FOUND_OR_INACTIVE,
        "therapeuticFocus.primaryTopic",
        `Failed to verify topic: ${error.message}`
      );
    }
  }

  // Check situation reference data if it passed structural validation
  // This allows checking even if primaryTopic failed validation
  if (normalizedSpecificSituation && isSpecificSituationValid) {
    try {
      const situationItem = await getSituationItem(
        normalizedSpecificSituation,
        fs
      );

      if (!situationItem) {
        addError(
          errors,
          ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
          "therapeuticFocus.specificSituation",
          `Situation "${normalizedSpecificSituation}" not found in referenceData`
        );
      } else if (!situationItem.active) {
        addError(
          errors,
          ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
          "therapeuticFocus.specificSituation",
          `Situation "${normalizedSpecificSituation}" exists but is inactive`
        );
      } else if (
        isTopicValid &&
        normalizedPrimaryTopic &&
        situationItem.topicKey !== normalizedPrimaryTopic
      ) {
        // Only check topic mismatch if the topic itself is valid
        // This prevents misleading errors when the topic is invalid
        addError(
          errors,
          ERROR_CODES.SITUATION_TOPIC_MISMATCH,
          "therapeuticFocus.specificSituation",
          `Situation "${normalizedSpecificSituation}" belongs to topic "${situationItem.topicKey}", but selected topic is "${normalizedPrimaryTopic}"`
        );
      }
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
        "therapeuticFocus.specificSituation",
        `Failed to verify situation: ${error.message}`
      );
    }
  }

  if (normalized.therapeuticIntent?.emotionalGoals) {
    for (const goal of normalized.therapeuticIntent.emotionalGoals) {
      try {
        const goalCheck = await checkReferenceItem("emotionalGoals", goal, fs);

        if (!goalCheck.exists) {
          addError(
            errors,
            ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
            "therapeuticIntent.emotionalGoals",
            `Emotional goal "${goal}" not found in referenceData`
          );
        } else if (!goalCheck.active) {
          addError(
            errors,
            ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
            "therapeuticIntent.emotionalGoals",
            `Emotional goal "${goal}" exists but is inactive`
          );
        }
      } catch (error: any) {
        addError(
          errors,
          ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
          "therapeuticIntent.emotionalGoals",
          `Failed to verify emotional goal "${goal}": ${error.message}`
        );
      }
    }
  }

  if (normalized.safetyConstraints?.exclusions) {
    for (const exclusion of normalized.safetyConstraints.exclusions) {
      try {
        const exclusionCheck = await checkReferenceItem("exclusions", exclusion, fs);

        if (!exclusionCheck.exists) {
          addError(
            errors,
            ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
            "safetyConstraints.exclusions",
            `Exclusion "${exclusion}" not found in referenceData`
          );
        } else if (!exclusionCheck.active) {
          addError(
            errors,
            ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
            "safetyConstraints.exclusions",
            `Exclusion "${exclusion}" exists but is inactive`
          );
        }
      } catch (error: any) {
        addError(
          errors,
          ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
          "safetyConstraints.exclusions",
          `Failed to verify exclusion "${exclusion}": ${error.message}`
        );
      }
    }
  }

  // ==========================================================================
  // 3. Warnings
  // ==========================================================================

  if (
    normalized.childProfile?.ageGroup === "0_3" &&
    normalized.storyPreferences?.caregiverPresence === "self_guided"
  ) {
    addWarning(
      warnings,
      WARNING_CODES.AGE_SELF_GUIDED_WARNING,
      "storyPreferences.caregiverPresence",
      "Age group 0-3 with self-guided caregiver presence may not be appropriate for very young children"
    );
  }

  // ==========================================================================
  // 4. Return Result
  // ==========================================================================

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    normalizedBrief: isValid ? (normalized as StoryBriefInput) : undefined,
  };
}

// ============================================================================
// Example Usage (Unit Test-like Examples)
// ============================================================================

/*
// Example 1: Valid Brief
const validBrief = {
  createdBy: "specialist_123",
  therapeuticFocus: {
    primaryTopic: "fear_anxiety",
    specificSituation: "fear_of_school",
  },
  childProfile: {
    ageGroup: "3_6",
    emotionalSensitivity: "medium",
  },
  therapeuticIntent: {
    emotionalGoals: ["reduce_fear", "build_trust"],
    keyMessage: "You are safe at school",
  },
  languageTone: {
    complexity: "simple",
    emotionalTone: "calm",
  },
  safetyConstraints: {
    exclusions: ["medical_imagery"],
  },
  storyPreferences: {
    caregiverPresence: "included",
    endingStyle: "calm_resolution",
  },
};

const result1 = await validateStoryBriefInput(validBrief);
// Expected output:
// {
//   isValid: true,
//   errors: [],
//   warnings: [],
//   normalizedBrief: {
//     createdBy: "specialist_123",
//     therapeuticFocus: {
//       primaryTopic: "fear_anxiety",
//       specificSituation: "fear_of_school",
//     },
//     childProfile: { ageGroup: "3_6", emotionalSensitivity: "medium" },
//     therapeuticIntent: {
//       emotionalGoals: ["reduce_fear", "build_trust"],
//       keyMessage: "You are safe at school",
//     },
//     languageTone: { complexity: "simple", emotionalTone: "calm" },
//     safetyConstraints: { exclusions: ["medical_imagery"] },
//     storyPreferences: {
//       caregiverPresence: "included",
//       endingStyle: "calm_resolution",
//     },
//   },
// }

// Example 2: Invalid Brief (multiple errors)
const invalidBrief = {
  createdBy: "", // Missing
  therapeuticFocus: {
    primaryTopic: "invalid_topic", // Doesn't exist
    specificSituation: "fear_of_school",
  },
  childProfile: {
    ageGroup: "0_3",
    emotionalSensitivity: "invalid", // Invalid value
  },
  therapeuticIntent: {
    emotionalGoals: ["reduce_fear", "build_trust", "invalid_goal", "extra_goal"], // Too many + invalid
    keyMessage: "A".repeat(201), // Too long
  },
  languageTone: {
    complexity: "simple",
    emotionalTone: "calm",
  },
  safetyConstraints: {
    exclusions: [],
  },
  storyPreferences: {
    caregiverPresence: "self_guided", // Warning for age 0_3
    endingStyle: "calm_resolution",
  },
};

const result2 = await validateStoryBriefInput(invalidBrief);
// Expected output:
// {
//   isValid: false,
//   errors: [
//     { code: "REQUIRED_FIELD_MISSING", field: "createdBy", message: "..." },
//     { code: "TOPIC_NOT_FOUND_OR_INACTIVE", field: "therapeuticFocus.primaryTopic", message: "..." },
//     { code: "INVALID_EMOTIONAL_SENSITIVITY", field: "childProfile.emotionalSensitivity", message: "..." },
//     { code: "INVALID_GOALS_COUNT", field: "therapeuticIntent.emotionalGoals", message: "..." },
//     { code: "GOAL_NOT_FOUND_OR_INACTIVE", field: "therapeuticIntent.emotionalGoals", message: "..." },
//     { code: "KEY_MESSAGE_TOO_LONG", field: "therapeuticIntent.keyMessage", message: "..." },
//   ],
//   warnings: [
//     { code: "AGE_SELF_GUIDED_WARNING", field: "storyPreferences.caregiverPresence", message: "..." },
//   ],
//   normalizedBrief: undefined,
// }
*/
