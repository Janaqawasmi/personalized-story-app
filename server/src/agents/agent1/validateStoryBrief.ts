// server/src/agents/agent1/validateStoryBrief.ts
import { db } from "../../config/firebase";
import type { Firestore } from "firebase-admin/firestore";
import {
  checkReferenceItem,
  getSituationItem,
} from "../../services/referenceData.service";
import type { StoryBriefInput, GenderAdaptation, SupportCharacter } from "../../models/storyBrief.model";

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

const ALLOWED_GENDER_ADAPTATION: GenderAdaptation[] = ["allowed", "not_allowed", "requires_review"];

// ============================================================================
// Error Codes
// ============================================================================

const ERROR_CODES = {
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_GOALS_COUNT: "INVALID_GOALS_COUNT",
  KEY_MESSAGE_INVALID_TYPE: "KEY_MESSAGE_INVALID_TYPE",
  KEY_MESSAGE_TOO_LONG: "KEY_MESSAGE_TOO_LONG",
  INVALID_MECHANISM_COUNT: "INVALID_MECHANISM_COUNT",
  MECHANISM_NOT_FOUND_OR_INACTIVE: "MECHANISM_NOT_FOUND_OR_INACTIVE",
  INVALID_COPING_TOOLS_COUNT: "INVALID_COPING_TOOLS_COUNT",
  COPING_TOOL_NOT_FOUND_OR_INACTIVE: "COPING_TOOL_NOT_FOUND_OR_INACTIVE",
  INVALID_BOUNDARIES: "INVALID_BOUNDARIES",
  CONTENT_EXCLUSIONS_INVALID_TYPE: "CONTENT_EXCLUSIONS_INVALID_TYPE",
  TOPIC_NOT_FOUND_OR_INACTIVE: "TOPIC_NOT_FOUND_OR_INACTIVE",
  GENERAL_SITUATION_NOT_FOUND_OR_INACTIVE: "GENERAL_SITUATION_NOT_FOUND_OR_INACTIVE",
  GENERAL_SITUATION_TOPIC_MISMATCH: "GENERAL_SITUATION_TOPIC_MISMATCH",
  SITUATION_NOT_FOUND_OR_INACTIVE: "SITUATION_NOT_FOUND_OR_INACTIVE",
  SITUATION_TOPIC_MISMATCH: "SITUATION_TOPIC_MISMATCH",
  SITUATION_GENERAL_MISMATCH: "SITUATION_GENERAL_MISMATCH",
  GOAL_NOT_FOUND_OR_INACTIVE: "GOAL_NOT_FOUND_OR_INACTIVE",
  EXCLUSION_NOT_FOUND_OR_INACTIVE: "EXCLUSION_NOT_FOUND_OR_INACTIVE",
  INVALID_TARGET_AGE_RANGE: "INVALID_TARGET_AGE_RANGE",
  INVALID_TOPIC_SENSITIVITY: "INVALID_TOPIC_SENSITIVITY",
  INVALID_COMPLEXITY: "INVALID_COMPLEXITY",
  INVALID_EMOTIONAL_TONE: "INVALID_EMOTIONAL_TONE",
  INVALID_ENDING_STYLE: "INVALID_ENDING_STYLE",
  INVALID_EMOTIONAL_ARC: "INVALID_EMOTIONAL_ARC",
  INVALID_PEAK_INTENSITY: "INVALID_PEAK_INTENSITY",
  EMOTIONAL_ARC_NOT_FOUND_OR_INACTIVE: "EMOTIONAL_ARC_NOT_FOUND_OR_INACTIVE",
  INVALID_PROTAGONIST_TYPE: "INVALID_PROTAGONIST_TYPE",
  INVALID_PROTAGONIST_AGE_RELATION: "INVALID_PROTAGONIST_AGE_RELATION",
  INVALID_PROTAGONIST_GENDER: "INVALID_PROTAGONIST_GENDER",
  INVALID_CAREGIVER_ROLE: "INVALID_CAREGIVER_ROLE",
  INVALID_SUPPORT_CHARACTERS: "INVALID_SUPPORT_CHARACTERS",
  CHARACTER_NOTES_TOO_LONG: "CHARACTER_NOTES_TOO_LONG",
  INVALID_PERSONALIZATION_CONFIG: "INVALID_PERSONALIZATION_CONFIG",
  PERSONALIZATION_REASON_REQUIRED: "PERSONALIZATION_REASON_REQUIRED",
  PERSONALIZATION_REASON_TOO_LONG: "PERSONALIZATION_REASON_TOO_LONG",
  INVALID_GENDER_ADAPTATION: "INVALID_GENDER_ADAPTATION",
} as const;

const WARNING_CODES = {
  AGE_ABSENT_CAREGIVER_WARNING: "AGE_ABSENT_CAREGIVER_WARNING",
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

/**
 * Normalizes an array of strings: filters non-strings, trims, and removes empty values.
 * Does NOT lowercase - callers should lowercase if needed for Firestore lookups.
 * 
 * @param value - The value to normalize
 * @returns Array of trimmed, non-empty strings
 */
function normalizeArray(value: any): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Deduplicates an array while preserving order (first occurrence wins)
 * 
 * @param arr - Array to deduplicate
 * @returns Deduplicated array
 */
function deduplicateArray(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
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
  deps?: { firestore?: Firestore }
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fs = deps?.firestore ?? db;

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

  // storyContext (v2.0 — replaces therapeuticFocus, absorbs age + complexity)
  let normalizedPrimaryTopic: string | undefined = undefined;
  let normalizedGeneralSituation: string | undefined = undefined;
  let normalizedSpecificSituation: string | undefined = undefined;
  let isPrimaryTopicValid = false;
  let isGeneralSituationValid = false;
  let isSpecificSituationValid = false;
  let isTargetAgeRangeValid = false;
  let isLanguageComplexityValid = false;

  if (!brief?.storyContext) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "storyContext",
      "storyContext is required"
    );
  } else {
    const primaryTopic = normalizeString(brief.storyContext.primaryTopic);
    const generalSituation = normalizeString(brief.storyContext.generalSituation);
    const specificSituation = normalizeString(brief.storyContext.specificSituation);

    if (!primaryTopic) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyContext.primaryTopic",
        "storyContext.primaryTopic is required"
      );
    } else {
      isPrimaryTopicValid = true;
      normalizedPrimaryTopic = primaryTopic.toLowerCase();
    }

    if (!generalSituation) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyContext.generalSituation",
        "storyContext.generalSituation is required"
      );
    } else {
      isGeneralSituationValid = true;
      normalizedGeneralSituation = generalSituation.toLowerCase();
    }

    if (!specificSituation) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyContext.specificSituation",
        "storyContext.specificSituation is required"
      );
    } else {
      isSpecificSituationValid = true;
      normalizedSpecificSituation = specificSituation.toLowerCase();
    }

    // targetAgeRange validation: 0 ≤ min < max ≤ 12, both integers
    const ageRange = brief.storyContext.targetAgeRange;
    if (!ageRange || typeof ageRange !== "object") {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyContext.targetAgeRange",
        "storyContext.targetAgeRange is required and must be an object with min and max"
      );
    } else {
      const { min, max } = ageRange;
      if (
        !Number.isInteger(min) || !Number.isInteger(max) ||
        min < 0 || max > 12 || min >= max
      ) {
        addError(
          errors,
          ERROR_CODES.INVALID_TARGET_AGE_RANGE,
          "storyContext.targetAgeRange",
          "storyContext.targetAgeRange must satisfy: 0 ≤ min < max ≤ 12, both integers"
        );
      } else {
        isTargetAgeRangeValid = true;
      }
    }

    // languageComplexity
    const complexity = brief.storyContext.languageComplexity;
    if (!complexity) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "storyContext.languageComplexity",
        "storyContext.languageComplexity is required"
      );
    } else if (typeof complexity !== "string") {
      addError(
        errors,
        ERROR_CODES.INVALID_COMPLEXITY,
        "storyContext.languageComplexity",
        "storyContext.languageComplexity must be a string"
      );
    } else {
      isLanguageComplexityValid = true;
    }

    if (
      isPrimaryTopicValid && isGeneralSituationValid && isSpecificSituationValid &&
      isTargetAgeRangeValid && isLanguageComplexityValid
    ) {
      normalized.storyContext = {
        primaryTopic: normalizedPrimaryTopic,
        generalSituation: normalizedGeneralSituation,
        specificSituation: normalizedSpecificSituation,
        targetAgeRange: {
          min: brief.storyContext.targetAgeRange.min,
          max: brief.storyContext.targetAgeRange.max,
        },
        languageComplexity: complexity.toLowerCase(),
      };
    }
  }

  // emotionalDesign (v2.0 — absorbs childProfile, languageTone, endingStyle; adds arc + peak)
  if (!brief?.emotionalDesign) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "emotionalDesign",
      "emotionalDesign is required"
    );
  } else {
    const emotionalTone = brief.emotionalDesign.emotionalTone;
    const topicSensitivity = brief.emotionalDesign.topicSensitivity;
    const endingStyle = brief.emotionalDesign.endingStyle;
    const emotionalArc = brief.emotionalDesign.emotionalArc;
    const peakIntensity = brief.emotionalDesign.peakIntensity;

    let isEmotionalToneValid = false;
    let isTopicSensitivityValid = false;
    let isEndingStyleValid = false;
    let isEmotionalArcValid = false;
    let isPeakIntensityValid = false;

    if (!emotionalTone) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "emotionalDesign.emotionalTone", "emotionalDesign.emotionalTone is required");
    } else if (typeof emotionalTone !== "string") {
      addError(errors, ERROR_CODES.INVALID_EMOTIONAL_TONE, "emotionalDesign.emotionalTone", "emotionalDesign.emotionalTone must be a string");
    } else {
      isEmotionalToneValid = true;
    }

    if (!topicSensitivity) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "emotionalDesign.topicSensitivity", "emotionalDesign.topicSensitivity is required");
    } else if (typeof topicSensitivity !== "string") {
      addError(errors, ERROR_CODES.INVALID_TOPIC_SENSITIVITY, "emotionalDesign.topicSensitivity", "emotionalDesign.topicSensitivity must be a string");
    } else {
      isTopicSensitivityValid = true;
    }

    if (!endingStyle) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "emotionalDesign.endingStyle", "emotionalDesign.endingStyle is required");
    } else if (typeof endingStyle !== "string") {
      addError(errors, ERROR_CODES.INVALID_ENDING_STYLE, "emotionalDesign.endingStyle", "emotionalDesign.endingStyle must be a string");
    } else {
      isEndingStyleValid = true;
    }

    if (!emotionalArc) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "emotionalDesign.emotionalArc", "emotionalDesign.emotionalArc is required");
    } else if (typeof emotionalArc !== "string") {
      addError(errors, ERROR_CODES.INVALID_EMOTIONAL_ARC, "emotionalDesign.emotionalArc", "emotionalDesign.emotionalArc must be a string");
    } else {
      isEmotionalArcValid = true;
    }

    if (!peakIntensity) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "emotionalDesign.peakIntensity", "emotionalDesign.peakIntensity is required");
    } else if (typeof peakIntensity !== "string") {
      addError(errors, ERROR_CODES.INVALID_PEAK_INTENSITY, "emotionalDesign.peakIntensity", "emotionalDesign.peakIntensity must be a string");
    } else {
      isPeakIntensityValid = true;
    }

    if (isEmotionalToneValid && isTopicSensitivityValid && isEndingStyleValid && isEmotionalArcValid && isPeakIntensityValid) {
      normalized.emotionalDesign = {
        emotionalTone: emotionalTone.toLowerCase(),
        topicSensitivity: topicSensitivity.toLowerCase(),
        endingStyle: endingStyle.toLowerCase(),
        emotionalArc: emotionalArc.toLowerCase(),
        peakIntensity: peakIntensity.toLowerCase(),
      };
    }
  }

  // therapeuticDesign (v2.0 — replaces therapeuticIntent)
  if (!brief?.therapeuticDesign) {
    addError(
      errors,
      ERROR_CODES.REQUIRED_FIELD_MISSING,
      "therapeuticDesign",
      "therapeuticDesign is required"
    );
  } else {
    let emotionalGoals = normalizeArray(brief.therapeuticDesign.emotionalGoals);
    emotionalGoals = emotionalGoals.map((goal) => goal.toLowerCase());
    emotionalGoals = deduplicateArray(emotionalGoals);
    
    let keyMessage: string | undefined = undefined;
    if (brief.therapeuticDesign.keyMessage !== undefined && brief.therapeuticDesign.keyMessage !== null) {
      if (typeof brief.therapeuticDesign.keyMessage !== "string") {
        addError(
          errors,
          ERROR_CODES.KEY_MESSAGE_INVALID_TYPE,
          "therapeuticDesign.keyMessage",
          "therapeuticDesign.keyMessage must be a string if provided"
        );
      } else {
        keyMessage = normalizeString(brief.therapeuticDesign.keyMessage);
      }
    }

    if (emotionalGoals.length === 0) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticDesign.emotionalGoals",
        "therapeuticDesign.emotionalGoals must contain at least one goal"
      );
    } else if (emotionalGoals.length > 3) {
      addError(
        errors,
        ERROR_CODES.INVALID_GOALS_COUNT,
        "therapeuticDesign.emotionalGoals",
        "therapeuticDesign.emotionalGoals must contain at most 3 goals"
      );
    }

    if (keyMessage && keyMessage.length > 200) {
      addError(
        errors,
        ERROR_CODES.KEY_MESSAGE_TOO_LONG,
        "therapeuticDesign.keyMessage",
        "therapeuticDesign.keyMessage must be at most 200 characters"
      );
    }

    // therapeuticMechanism (required, max 2)
    let therapeuticMechanism = normalizeArray(brief.therapeuticDesign.therapeuticMechanism);
    therapeuticMechanism = therapeuticMechanism.map((m) => m.toLowerCase());
    therapeuticMechanism = deduplicateArray(therapeuticMechanism);

    if (therapeuticMechanism.length === 0) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticDesign.therapeuticMechanism",
        "therapeuticDesign.therapeuticMechanism must contain at least one mechanism"
      );
    } else if (therapeuticMechanism.length > 2) {
      addError(
        errors,
        ERROR_CODES.INVALID_MECHANISM_COUNT,
        "therapeuticDesign.therapeuticMechanism",
        "therapeuticDesign.therapeuticMechanism must contain at most 2 mechanisms"
      );
    }

    // copingTools (required, max 3)
    let copingTools = normalizeArray(brief.therapeuticDesign.copingTools);
    copingTools = copingTools.map((t) => t.toLowerCase());
    copingTools = deduplicateArray(copingTools);

    if (copingTools.length === 0) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "therapeuticDesign.copingTools",
        "therapeuticDesign.copingTools must contain at least one coping tool"
      );
    } else if (copingTools.length > 3) {
      addError(
        errors,
        ERROR_CODES.INVALID_COPING_TOOLS_COUNT,
        "therapeuticDesign.copingTools",
        "therapeuticDesign.copingTools must contain at most 3 coping tools"
      );
    }

    // therapeuticBoundaries (required, free-text strings)
    let therapeuticBoundaries = normalizeArray(brief.therapeuticDesign.therapeuticBoundaries);

    if (therapeuticBoundaries.length === 0) {
      addError(
        errors,
        ERROR_CODES.INVALID_BOUNDARIES,
        "therapeuticDesign.therapeuticBoundaries",
        "therapeuticDesign.therapeuticBoundaries must contain at least one boundary"
      );
    }

    normalized.therapeuticDesign = {
      emotionalGoals,
      ...(keyMessage && { keyMessage }),
      therapeuticMechanism,
      copingTools,
      therapeuticBoundaries,
    };
  }

  // safetyBoundaries (v2.0 — replaces safetyConstraints)
  let contentExclusions: string[] = [];
  if (brief?.safetyBoundaries?.contentExclusions !== undefined) {
    if (!Array.isArray(brief.safetyBoundaries.contentExclusions)) {
      addError(
        errors,
        ERROR_CODES.CONTENT_EXCLUSIONS_INVALID_TYPE,
        "safetyBoundaries.contentExclusions",
        "safetyBoundaries.contentExclusions must be an array if provided"
      );
    } else {
      contentExclusions = normalizeArray(brief.safetyBoundaries.contentExclusions);
      contentExclusions = contentExclusions.map((e) => e.toLowerCase());
      contentExclusions = deduplicateArray(contentExclusions);
    }
  }

  if (brief?.safetyBoundaries?.clinicalCautions !== undefined && brief.safetyBoundaries.clinicalCautions !== null) {
    if (!Array.isArray(brief.safetyBoundaries.clinicalCautions)) {
      addError(
        errors,
        ERROR_CODES.REQUIRED_FIELD_MISSING,
        "safetyBoundaries.clinicalCautions",
        "safetyBoundaries.clinicalCautions must be an array if provided"
      );
    }
  }

  const normalizedSb: Record<string, unknown> = {
    contentExclusions,
  };
  if (Array.isArray(brief?.safetyBoundaries?.clinicalCautions)) {
    const trimmed = brief.safetyBoundaries.clinicalCautions.filter((c: unknown) => typeof c === "string" && c.trim()).map((c: string) => c.trim());
    if (trimmed.length > 0) {
      normalizedSb.clinicalCautions = trimmed;
    }
  }
  normalized.safetyBoundaries = normalizedSb as StoryBriefInput["safetyBoundaries"];

  // characterDesign (v2.0 — new section, absorbs caregiverPresence → caregiverRole)
  if (!brief?.characterDesign) {
    addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "characterDesign", "characterDesign is required");
  } else {
    const cd = brief.characterDesign;
    let cdValid = true;

    if (!cd.protagonistType) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "characterDesign.protagonistType", "characterDesign.protagonistType is required");
      cdValid = false;
    } else if (typeof cd.protagonistType !== "string") {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_TYPE, "characterDesign.protagonistType", "characterDesign.protagonistType must be a string");
      cdValid = false;
    }

    if (!cd.protagonistAgeRelation) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "characterDesign.protagonistAgeRelation", "characterDesign.protagonistAgeRelation is required");
      cdValid = false;
    } else if (typeof cd.protagonistAgeRelation !== "string") {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_AGE_RELATION, "characterDesign.protagonistAgeRelation", "characterDesign.protagonistAgeRelation must be a string");
      cdValid = false;
    }

    if (!cd.protagonistGender) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "characterDesign.protagonistGender", "characterDesign.protagonistGender is required");
      cdValid = false;
    } else if (typeof cd.protagonistGender !== "string") {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_GENDER, "characterDesign.protagonistGender", "characterDesign.protagonistGender must be a string");
      cdValid = false;
    }

    if (!cd.caregiverRole) {
      addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "characterDesign.caregiverRole", "characterDesign.caregiverRole is required");
      cdValid = false;
    } else if (typeof cd.caregiverRole !== "string") {
      addError(errors, ERROR_CODES.INVALID_CAREGIVER_ROLE, "characterDesign.caregiverRole", "characterDesign.caregiverRole must be a string");
      cdValid = false;
    }

    if (cd.supportCharacters !== undefined && cd.supportCharacters !== null) {
      if (!Array.isArray(cd.supportCharacters)) {
        addError(errors, ERROR_CODES.INVALID_SUPPORT_CHARACTERS, "characterDesign.supportCharacters", "characterDesign.supportCharacters must be an array if provided");
        cdValid = false;
      } else if (cd.supportCharacters.length > 3) {
        addError(errors, ERROR_CODES.INVALID_SUPPORT_CHARACTERS, "characterDesign.supportCharacters", "characterDesign.supportCharacters must contain at most 3 characters");
        cdValid = false;
      } else {
        for (let i = 0; i < cd.supportCharacters.length; i++) {
          const sc = cd.supportCharacters[i];
          if (!sc.type || typeof sc.type !== "string") {
            addError(errors, ERROR_CODES.INVALID_SUPPORT_CHARACTERS, `characterDesign.supportCharacters[${i}].type`, "supportCharacters[].type is required and must be a string");
            cdValid = false;
          }
          if (!sc.role || typeof sc.role !== "string") {
            addError(errors, ERROR_CODES.INVALID_SUPPORT_CHARACTERS, `characterDesign.supportCharacters[${i}].role`, "supportCharacters[].role is required and must be a string");
            cdValid = false;
          }
        }
      }
    }

    if (cd.characterNotes !== undefined && cd.characterNotes !== null) {
      if (typeof cd.characterNotes !== "string") {
        addError(errors, ERROR_CODES.CHARACTER_NOTES_TOO_LONG, "characterDesign.characterNotes", "characterDesign.characterNotes must be a string");
        cdValid = false;
      } else if (cd.characterNotes.length > 500) {
        addError(errors, ERROR_CODES.CHARACTER_NOTES_TOO_LONG, "characterDesign.characterNotes", "characterDesign.characterNotes must be at most 500 characters");
        cdValid = false;
      }
    }

    if (cdValid) {
      const normalizedCd: StoryBriefInput["characterDesign"] = {
        protagonistType: cd.protagonistType.toLowerCase(),
        protagonistAgeRelation: cd.protagonistAgeRelation.toLowerCase(),
        protagonistGender: cd.protagonistGender.toLowerCase(),
        caregiverRole: cd.caregiverRole.toLowerCase(),
      };
      if (Array.isArray(cd.supportCharacters) && cd.supportCharacters.length > 0) {
        normalizedCd.supportCharacters = cd.supportCharacters.map((sc: SupportCharacter) => ({
          type: sc.type.toLowerCase(),
          role: sc.role.toLowerCase(),
        }));
      }
      if (typeof cd.characterNotes === "string" && cd.characterNotes.trim()) {
        normalizedCd.characterNotes = cd.characterNotes.trim();
      }
      normalized.characterDesign = normalizedCd;
    }
  }

  // personalizationConfig (v2.0 — new section)
  if (!brief?.personalizationConfig) {
    addError(errors, ERROR_CODES.REQUIRED_FIELD_MISSING, "personalizationConfig", "personalizationConfig is required");
  } else {
    const pc = brief.personalizationConfig;
    let pcValid = true;

    if (typeof pc.personalizationAllowed !== "boolean") {
      addError(errors, ERROR_CODES.INVALID_PERSONALIZATION_CONFIG, "personalizationConfig.personalizationAllowed", "personalizationConfig.personalizationAllowed is required and must be a boolean");
      pcValid = false;
    }

    if (typeof pc.namePersonalization !== "boolean") {
      addError(errors, ERROR_CODES.INVALID_PERSONALIZATION_CONFIG, "personalizationConfig.namePersonalization", "personalizationConfig.namePersonalization is required and must be a boolean");
      pcValid = false;
    }

    if (typeof pc.illustrationPersonalization !== "boolean") {
      addError(errors, ERROR_CODES.INVALID_PERSONALIZATION_CONFIG, "personalizationConfig.illustrationPersonalization", "personalizationConfig.illustrationPersonalization is required and must be a boolean");
      pcValid = false;
    }

    if (pc.personalizationAllowed === false && (!pc.personalizationReason || (typeof pc.personalizationReason === "string" && !pc.personalizationReason.trim()))) {
      addError(errors, ERROR_CODES.PERSONALIZATION_REASON_REQUIRED, "personalizationConfig.personalizationReason", "personalizationConfig.personalizationReason is required when personalizationAllowed is false");
      pcValid = false;
    }

    if (pc.personalizationReason !== undefined && pc.personalizationReason !== null) {
      if (typeof pc.personalizationReason !== "string") {
        addError(errors, ERROR_CODES.PERSONALIZATION_REASON_TOO_LONG, "personalizationConfig.personalizationReason", "personalizationConfig.personalizationReason must be a string");
        pcValid = false;
      } else if (pc.personalizationReason.length > 300) {
        addError(errors, ERROR_CODES.PERSONALIZATION_REASON_TOO_LONG, "personalizationConfig.personalizationReason", "personalizationConfig.personalizationReason must be at most 300 characters");
        pcValid = false;
      }
    }

    if (pc.personalizationConstraints !== undefined && pc.personalizationConstraints !== null) {
      if (!Array.isArray(pc.personalizationConstraints)) {
        addError(errors, ERROR_CODES.INVALID_PERSONALIZATION_CONFIG, "personalizationConfig.personalizationConstraints", "personalizationConfig.personalizationConstraints must be an array if provided");
        pcValid = false;
      }
    }

    if (pc.genderAdaptation !== undefined && pc.genderAdaptation !== null) {
      if (!ALLOWED_GENDER_ADAPTATION.includes(pc.genderAdaptation as GenderAdaptation)) {
        addError(errors, ERROR_CODES.INVALID_GENDER_ADAPTATION, "personalizationConfig.genderAdaptation", `personalizationConfig.genderAdaptation must be one of: ${ALLOWED_GENDER_ADAPTATION.join(", ")}`);
        pcValid = false;
      }
    }

    if (pcValid) {
      const normalizedPc: StoryBriefInput["personalizationConfig"] = {
        personalizationAllowed: pc.personalizationAllowed,
        namePersonalization: pc.namePersonalization,
        illustrationPersonalization: pc.illustrationPersonalization,
      };
      if (typeof pc.personalizationReason === "string" && pc.personalizationReason.trim()) {
        normalizedPc.personalizationReason = pc.personalizationReason.trim();
      }
      if (Array.isArray(pc.personalizationConstraints) && pc.personalizationConstraints.length > 0) {
        const trimmed = pc.personalizationConstraints.filter((c: unknown) => typeof c === "string" && (c as string).trim()).map((c: string) => c.trim());
        if (trimmed.length > 0) {
          normalizedPc.personalizationConstraints = trimmed;
        }
      }
      if (pc.genderAdaptation && ALLOWED_GENDER_ADAPTATION.includes(pc.genderAdaptation as GenderAdaptation)) {
        normalizedPc.genderAdaptation = pc.genderAdaptation as GenderAdaptation;
      }
      normalized.personalizationConfig = normalizedPc;
    }
  }

  // ==========================================================================
  // 2. Reference Data Verification (only if basic structure is valid)
  // ==========================================================================

  let isTopicValid = false;

  // Check topic reference data
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
          "storyContext.primaryTopic",
          `Topic "${normalizedPrimaryTopic}" not found in referenceData`
        );
      } else if (!topicCheck.active) {
        addError(
          errors,
          ERROR_CODES.TOPIC_NOT_FOUND_OR_INACTIVE,
          "storyContext.primaryTopic",
          `Topic "${normalizedPrimaryTopic}" exists but is inactive`
        );
      } else {
        isTopicValid = true;
      }
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.TOPIC_NOT_FOUND_OR_INACTIVE,
        "storyContext.primaryTopic",
        `Failed to verify topic: ${error.message}`
      );
    }
  }

  // Check generalSituation reference data (v2.0 — new generalSituations collection)
  let isGeneralSituationRefValid = false;
  if (normalizedGeneralSituation && isGeneralSituationValid) {
    try {
      const gsItem = await getSituationItem(
        normalizedGeneralSituation,
        fs,
        "generalSituations"
      );

      if (!gsItem) {
        addError(
          errors,
          ERROR_CODES.GENERAL_SITUATION_NOT_FOUND_OR_INACTIVE,
          "storyContext.generalSituation",
          `General situation "${normalizedGeneralSituation}" not found in referenceData`
        );
      } else if (!gsItem.active) {
        addError(
          errors,
          ERROR_CODES.GENERAL_SITUATION_NOT_FOUND_OR_INACTIVE,
          "storyContext.generalSituation",
          `General situation "${normalizedGeneralSituation}" exists but is inactive`
        );
      } else if (
        isTopicValid &&
        normalizedPrimaryTopic &&
        gsItem.topicKey !== normalizedPrimaryTopic
      ) {
        addError(
          errors,
          ERROR_CODES.GENERAL_SITUATION_TOPIC_MISMATCH,
          "storyContext.generalSituation",
          `General situation "${normalizedGeneralSituation}" belongs to topic "${gsItem.topicKey}", but selected topic is "${normalizedPrimaryTopic}"`
        );
      } else {
        isGeneralSituationRefValid = true;
      }
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.GENERAL_SITUATION_NOT_FOUND_OR_INACTIVE,
        "storyContext.generalSituation",
        `Failed to verify general situation: ${error.message}`
      );
    }
  }

  // Check specificSituation reference data (v2.0 — new specificSituations collection)
  if (normalizedSpecificSituation && isSpecificSituationValid) {
    try {
      const situationItem = await getSituationItem(
        normalizedSpecificSituation,
        fs,
        "specificSituations"
      );

      if (!situationItem) {
        addError(
          errors,
          ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
          "storyContext.specificSituation",
          `Specific situation "${normalizedSpecificSituation}" not found in referenceData`
        );
      } else if (!situationItem.active) {
        addError(
          errors,
          ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
          "storyContext.specificSituation",
          `Specific situation "${normalizedSpecificSituation}" exists but is inactive`
        );
      } else if (
        isTopicValid &&
        normalizedPrimaryTopic &&
        situationItem.topicKey !== normalizedPrimaryTopic
      ) {
        addError(
          errors,
          ERROR_CODES.SITUATION_TOPIC_MISMATCH,
          "storyContext.specificSituation",
          `Specific situation "${normalizedSpecificSituation}" belongs to topic "${situationItem.topicKey}", but selected topic is "${normalizedPrimaryTopic}"`
        );
      } else if (
        isGeneralSituationRefValid &&
        normalizedGeneralSituation &&
        situationItem.generalSituationKey &&
        situationItem.generalSituationKey !== normalizedGeneralSituation
      ) {
        addError(
          errors,
          ERROR_CODES.SITUATION_GENERAL_MISMATCH,
          "storyContext.specificSituation",
          `Specific situation "${normalizedSpecificSituation}" belongs to general situation "${situationItem.generalSituationKey}", but selected general situation is "${normalizedGeneralSituation}"`
        );
      }
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.SITUATION_NOT_FOUND_OR_INACTIVE,
        "storyContext.specificSituation",
        `Failed to verify specific situation: ${error.message}`
      );
    }
  }

  // Parallelize Firestore checks for emotional goals
  if (normalized.therapeuticDesign?.emotionalGoals && normalized.therapeuticDesign.emotionalGoals.length > 0) {
    try {
      const goalChecks = await Promise.all(
        normalized.therapeuticDesign.emotionalGoals.map((goal: string) =>
          checkReferenceItem("emotionalGoals", goal, fs).catch((error: any) => ({
            goal,
            error: error.message,
            exists: false,
            active: false,
          }))
        )
      );

      goalChecks.forEach((goalCheck, index) => {
        const goal = normalized.therapeuticDesign!.emotionalGoals[index];
        if ("error" in goalCheck) {
          addError(
            errors,
            ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.emotionalGoals",
            `Failed to verify emotional goal "${goal}": ${goalCheck.error}`
          );
        } else if (!goalCheck.exists) {
          addError(
            errors,
            ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.emotionalGoals",
            `Emotional goal "${goal}" not found in referenceData`
          );
        } else if (!goalCheck.active) {
          addError(
            errors,
            ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.emotionalGoals",
            `Emotional goal "${goal}" exists but is inactive`
          );
        }
      });
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.GOAL_NOT_FOUND_OR_INACTIVE,
        "therapeuticDesign.emotionalGoals",
        `Failed to verify emotional goals: ${error.message}`
      );
    }
  }

  // Parallelize Firestore checks for therapeutic mechanisms
  if (normalized.therapeuticDesign?.therapeuticMechanism && normalized.therapeuticDesign.therapeuticMechanism.length > 0) {
    try {
      const mechanismChecks = await Promise.all(
        normalized.therapeuticDesign.therapeuticMechanism.map((mechanism: string) =>
          checkReferenceItem("therapeuticMechanisms", mechanism, fs).catch((error: any) => ({
            mechanism,
            error: error.message,
            exists: false,
            active: false,
          }))
        )
      );

      mechanismChecks.forEach((check, index) => {
        const mechanism = normalized.therapeuticDesign!.therapeuticMechanism[index];
        if ("error" in check) {
          addError(
            errors,
            ERROR_CODES.MECHANISM_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.therapeuticMechanism",
            `Failed to verify therapeutic mechanism "${mechanism}": ${check.error}`
          );
        } else if (!check.exists) {
          addError(
            errors,
            ERROR_CODES.MECHANISM_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.therapeuticMechanism",
            `Therapeutic mechanism "${mechanism}" not found in referenceData`
          );
        } else if (!check.active) {
          addError(
            errors,
            ERROR_CODES.MECHANISM_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.therapeuticMechanism",
            `Therapeutic mechanism "${mechanism}" exists but is inactive`
          );
        }
      });
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.MECHANISM_NOT_FOUND_OR_INACTIVE,
        "therapeuticDesign.therapeuticMechanism",
        `Failed to verify therapeutic mechanisms: ${error.message}`
      );
    }
  }

  // Parallelize Firestore checks for coping tools
  if (normalized.therapeuticDesign?.copingTools && normalized.therapeuticDesign.copingTools.length > 0) {
    try {
      const toolChecks = await Promise.all(
        normalized.therapeuticDesign.copingTools.map((tool: string) =>
          checkReferenceItem("copingTools", tool, fs).catch((error: any) => ({
            tool,
            error: error.message,
            exists: false,
            active: false,
          }))
        )
      );

      toolChecks.forEach((check, index) => {
        const tool = normalized.therapeuticDesign!.copingTools[index];
        if ("error" in check) {
          addError(
            errors,
            ERROR_CODES.COPING_TOOL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.copingTools",
            `Failed to verify coping tool "${tool}": ${check.error}`
          );
        } else if (!check.exists) {
          addError(
            errors,
            ERROR_CODES.COPING_TOOL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.copingTools",
            `Coping tool "${tool}" not found in referenceData`
          );
        } else if (!check.active) {
          addError(
            errors,
            ERROR_CODES.COPING_TOOL_NOT_FOUND_OR_INACTIVE,
            "therapeuticDesign.copingTools",
            `Coping tool "${tool}" exists but is inactive`
          );
        }
      });
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.COPING_TOOL_NOT_FOUND_OR_INACTIVE,
        "therapeuticDesign.copingTools",
        `Failed to verify coping tools: ${error.message}`
      );
    }
  }

  // Parallelize Firestore checks for content exclusions
  if (normalized.safetyBoundaries?.contentExclusions && normalized.safetyBoundaries.contentExclusions.length > 0) {
    try {
      const exclusionChecks = await Promise.all(
        normalized.safetyBoundaries.contentExclusions.map((exclusion: string) =>
          checkReferenceItem("contentExclusions", exclusion, fs).catch((error: any) => ({
            exclusion,
            error: error.message,
            exists: false,
            active: false,
          }))
        )
      );

      exclusionChecks.forEach((exclusionCheck, index) => {
        const exclusion = normalized.safetyBoundaries!.contentExclusions[index];
        if ("error" in exclusionCheck) {
          addError(
            errors,
            ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
            "safetyBoundaries.contentExclusions",
            `Failed to verify exclusion "${exclusion}": ${exclusionCheck.error}`
          );
        } else if (!exclusionCheck.exists) {
          addError(
            errors,
            ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
            "safetyBoundaries.contentExclusions",
            `Exclusion "${exclusion}" not found in referenceData`
          );
        } else if (!exclusionCheck.active) {
          addError(
            errors,
            ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
            "safetyBoundaries.contentExclusions",
            `Exclusion "${exclusion}" exists but is inactive`
          );
        }
      });
    } catch (error: any) {
      addError(
        errors,
        ERROR_CODES.EXCLUSION_NOT_FOUND_OR_INACTIVE,
        "safetyBoundaries.contentExclusions",
        `Failed to verify exclusions: ${error.message}`
      );
    }
  }

  // Firestore check for emotionalArc
  if (normalized.emotionalDesign?.emotionalArc) {
    try {
      const arcCheck = await checkReferenceItem(
        "emotionalArcs",
        normalized.emotionalDesign.emotionalArc,
        fs
      );
      if (!arcCheck.exists) {
        addError(errors, ERROR_CODES.EMOTIONAL_ARC_NOT_FOUND_OR_INACTIVE, "emotionalDesign.emotionalArc", `Emotional arc "${normalized.emotionalDesign.emotionalArc}" not found in referenceData`);
      } else if (!arcCheck.active) {
        addError(errors, ERROR_CODES.EMOTIONAL_ARC_NOT_FOUND_OR_INACTIVE, "emotionalDesign.emotionalArc", `Emotional arc "${normalized.emotionalDesign.emotionalArc}" exists but is inactive`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.EMOTIONAL_ARC_NOT_FOUND_OR_INACTIVE, "emotionalDesign.emotionalArc", `Failed to verify emotional arc: ${error.message}`);
    }
  }

  // Firestore checks for configurable enum-like fields moved to referenceData
  if (normalized.storyContext?.languageComplexity) {
    try {
      const check = await checkReferenceItem("languageComplexities", normalized.storyContext.languageComplexity, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_COMPLEXITY, "storyContext.languageComplexity", `languageComplexity "${normalized.storyContext.languageComplexity}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_COMPLEXITY, "storyContext.languageComplexity", `Failed to verify languageComplexity: ${error.message}`);
    }
  }

  if (normalized.emotionalDesign?.emotionalTone) {
    try {
      const check = await checkReferenceItem("emotionalTones", normalized.emotionalDesign.emotionalTone, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_EMOTIONAL_TONE, "emotionalDesign.emotionalTone", `emotionalTone "${normalized.emotionalDesign.emotionalTone}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_EMOTIONAL_TONE, "emotionalDesign.emotionalTone", `Failed to verify emotionalTone: ${error.message}`);
    }
  }

  if (normalized.emotionalDesign?.topicSensitivity) {
    try {
      const check = await checkReferenceItem("topicSensitivities", normalized.emotionalDesign.topicSensitivity, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_TOPIC_SENSITIVITY, "emotionalDesign.topicSensitivity", `topicSensitivity "${normalized.emotionalDesign.topicSensitivity}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_TOPIC_SENSITIVITY, "emotionalDesign.topicSensitivity", `Failed to verify topicSensitivity: ${error.message}`);
    }
  }

  if (normalized.emotionalDesign?.endingStyle) {
    try {
      const check = await checkReferenceItem("endingStyles", normalized.emotionalDesign.endingStyle, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_ENDING_STYLE, "emotionalDesign.endingStyle", `endingStyle "${normalized.emotionalDesign.endingStyle}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_ENDING_STYLE, "emotionalDesign.endingStyle", `Failed to verify endingStyle: ${error.message}`);
    }
  }

  if (normalized.emotionalDesign?.peakIntensity) {
    try {
      const check = await checkReferenceItem("peakIntensities", normalized.emotionalDesign.peakIntensity, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_PEAK_INTENSITY, "emotionalDesign.peakIntensity", `peakIntensity "${normalized.emotionalDesign.peakIntensity}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_PEAK_INTENSITY, "emotionalDesign.peakIntensity", `Failed to verify peakIntensity: ${error.message}`);
    }
  }

  if (normalized.characterDesign?.protagonistType) {
    try {
      const check = await checkReferenceItem("protagonistTypes", normalized.characterDesign.protagonistType, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_PROTAGONIST_TYPE, "characterDesign.protagonistType", `protagonistType "${normalized.characterDesign.protagonistType}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_TYPE, "characterDesign.protagonistType", `Failed to verify protagonistType: ${error.message}`);
    }
  }

  if (normalized.characterDesign?.protagonistAgeRelation) {
    try {
      const check = await checkReferenceItem("protagonistAgeRelations", normalized.characterDesign.protagonistAgeRelation, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_PROTAGONIST_AGE_RELATION, "characterDesign.protagonistAgeRelation", `protagonistAgeRelation "${normalized.characterDesign.protagonistAgeRelation}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_AGE_RELATION, "characterDesign.protagonistAgeRelation", `Failed to verify protagonistAgeRelation: ${error.message}`);
    }
  }

  if (normalized.characterDesign?.protagonistGender) {
    try {
      const check = await checkReferenceItem("protagonistGenders", normalized.characterDesign.protagonistGender, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_PROTAGONIST_GENDER, "characterDesign.protagonistGender", `protagonistGender "${normalized.characterDesign.protagonistGender}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_PROTAGONIST_GENDER, "characterDesign.protagonistGender", `Failed to verify protagonistGender: ${error.message}`);
    }
  }

  if (normalized.characterDesign?.caregiverRole) {
    try {
      const check = await checkReferenceItem("caregiverRoles", normalized.characterDesign.caregiverRole, fs);
      if (!check.exists || !check.active) {
        addError(errors, ERROR_CODES.INVALID_CAREGIVER_ROLE, "characterDesign.caregiverRole", `caregiverRole "${normalized.characterDesign.caregiverRole}" is not an active referenceData item`);
      }
    } catch (error: any) {
      addError(errors, ERROR_CODES.INVALID_CAREGIVER_ROLE, "characterDesign.caregiverRole", `Failed to verify caregiverRole: ${error.message}`);
    }
  }

  if (normalized.characterDesign?.supportCharacters?.length) {
    for (let i = 0; i < normalized.characterDesign.supportCharacters.length; i++) {
      const sc = normalized.characterDesign.supportCharacters[i];
      try {
        const typeCheck = await checkReferenceItem("supportCharacterTypes", sc.type, fs);
        if (!typeCheck.exists || !typeCheck.active) {
          addError(
            errors,
            ERROR_CODES.INVALID_SUPPORT_CHARACTERS,
            `characterDesign.supportCharacters[${i}].type`,
            `supportCharacters[].type "${sc.type}" is not an active referenceData item`,
          );
        }
      } catch (error: any) {
        addError(
          errors,
          ERROR_CODES.INVALID_SUPPORT_CHARACTERS,
          `characterDesign.supportCharacters[${i}].type`,
          `Failed to verify support character type: ${error.message}`,
        );
      }
      try {
        const roleCheck = await checkReferenceItem("supportCharacterRoles", sc.role, fs);
        if (!roleCheck.exists || !roleCheck.active) {
          addError(
            errors,
            ERROR_CODES.INVALID_SUPPORT_CHARACTERS,
            `characterDesign.supportCharacters[${i}].role`,
            `supportCharacters[].role "${sc.role}" is not an active referenceData item`,
          );
        }
      } catch (error: any) {
        addError(
          errors,
          ERROR_CODES.INVALID_SUPPORT_CHARACTERS,
          `characterDesign.supportCharacters[${i}].role`,
          `Failed to verify support character role: ${error.message}`,
        );
      }
    }
  }

  // ==========================================================================
  // 3. Warnings
  // ==========================================================================

  if (
    normalized.storyContext?.targetAgeRange &&
    normalized.storyContext.targetAgeRange.max <= 3 &&
    normalized.characterDesign?.caregiverRole === "absent"
  ) {
    addWarning(
      warnings,
      WARNING_CODES.AGE_ABSENT_CAREGIVER_WARNING,
      "characterDesign.caregiverRole",
      "Target age range 0-3 with absent caregiver role may not be appropriate for very young children"
    );
  }

  // ==========================================================================
  // 4. Return Result
  // ==========================================================================

  const isValid = errors.length === 0;

  const result: ValidationResult = {
    isValid,
    errors,
    warnings,
  };

  if (isValid) {
    result.normalizedBrief = normalized as StoryBriefInput;
  }

  return result;
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
  safetyBoundaries: {
    contentExclusions: ["medical_imagery"],
  },
  characterDesign: {
    protagonistType: "child_character",
    protagonistAgeRelation: "same_age",
    protagonistGender: "neutral",
    caregiverRole: "comfort_presence",
  },
  personalizationConfig: {
    personalizationAllowed: true,
    namePersonalization: true,
    illustrationPersonalization: false,
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
//     safetyBoundaries: { contentExclusions: ["medical_imagery"] },
//     characterDesign: {
//       protagonistType: "child_character",
//       protagonistAgeRelation: "same_age",
//       protagonistGender: "neutral",
//       caregiverRole: "comfort_presence",
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
  safetyBoundaries: {
    contentExclusions: [],
  },
  characterDesign: {
    protagonistType: "child_character",
    protagonistAgeRelation: "same_age",
    protagonistGender: "neutral",
    caregiverRole: "absent", // Warning for age 0_3
  },
  personalizationConfig: {
    personalizationAllowed: false,
    personalizationReason: "Animal protagonist required for therapeutic mechanism",
    namePersonalization: false,
    illustrationPersonalization: false,
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
//     { code: "AGE_ABSENT_CAREGIVER_WARNING", field: "characterDesign.caregiverRole", message: "..." },
//   ],
//   normalizedBrief: undefined,
// }
*/
