// server/src/agents/agent1/buildGenerationContract.ts
import { db, admin } from "../../config/firebase";
import type { Firestore } from "firebase-admin/firestore";
import { validateStoryBriefInput } from "./validateStoryBrief";
import {
  loadClinicalRules,
  getDefaultRulesVersion,
} from "../../services/clinicalRules.service";
import type {
  GenerationContract,
  ContractWarning,
  ContractError,
} from "../../models/generationContract.model";
import {
  mergeAndDeduplicateArrays,
  deduplicateArray,
} from "../../models/generationContract.model";

// ============================================================================
// Error/Warning Codes
// ============================================================================

const ERROR_CODES = {
  BRIEF_NOT_FOUND: "BRIEF_NOT_FOUND",
  MISSING_AGE_RULE: "MISSING_AGE_RULE",
  MISSING_GOAL_MAPPING: "MISSING_GOAL_MAPPING",
  MISSING_SENSITIVITY_RULE: "MISSING_SENSITIVITY_RULE",
  MISSING_ENDING_RULE: "MISSING_ENDING_RULE",
} as const;

const WARNING_CODES = {
  UNKNOWN_EXCLUSION_RULE: "UNKNOWN_EXCLUSION_RULE",
  UNKNOWN_COPING_TOOL: "UNKNOWN_COPING_TOOL",
  NO_COPING_TOOL_AVAILABLE: "NO_COPING_TOOL_AVAILABLE",
  INVALID_OVERRIDE_COPING_TOOL: "INVALID_OVERRIDE_COPING_TOOL",
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function addError(
  errors: ContractError[],
  code: string,
  message: string
): void {
  errors.push({ code, message });
}

function addWarning(
  warnings: ContractWarning[],
  code: string,
  message: string
): void {
  warnings.push({ code, message });
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Builds a generation contract from a brief ID by loading the brief from Firestore
 */
export async function buildGenerationContractFromBriefId(
  briefId: string,
  deps?: { firestore?: Firestore }
): Promise<GenerationContract> {
  const fs = deps?.firestore ?? db;

  // Load brief from Firestore
  const briefDoc = await fs.collection("storyBriefs").doc(briefId).get();

  if (!briefDoc.exists) {
    throw new Error(`Story brief "${briefId}" not found (${ERROR_CODES.BRIEF_NOT_FOUND})`);
  }

  const briefRaw = briefDoc.data();
  if (!briefRaw) {
    throw new Error(`Story brief "${briefId}" has no data (${ERROR_CODES.BRIEF_NOT_FOUND})`);
  }

  return buildGenerationContract(briefId, briefRaw, deps);
}

/**
 * Builds a generation contract from a raw brief object
 */
export async function buildGenerationContract(
  briefId: string,
  briefRaw: any,
  deps?: { firestore?: Firestore }
): Promise<GenerationContract> {
  const fs = deps?.firestore ?? db;
  const errors: ContractError[] = [];
  const warnings: ContractWarning[] = [];

  // 1. Validate brief
  const validationResult = await validateStoryBriefInput(briefRaw, {
    firestore: fs,
  });

  if (!validationResult.isValid || !validationResult.normalizedBrief) {
    // Build contract with errors only
    const contract: GenerationContract = {
      briefId,
      rulesVersionUsed: "",
      topic: "",
      situation: "",
      ageBand: "",
      caregiverPresence: "",
      emotionalSensitivity: "",
      lengthBudget: {
        minScenes: 0,
        maxScenes: 0,
        maxWords: 0,
      },
      styleRules: {
        maxSentenceWords: 0,
        dialoguePolicy: "none",
        abstractConcepts: "no",
        emotionalTone: "",
        languageComplexity: "",
      },
      requiredElements: [],
      allowedCopingTools: [],
      mustAvoid: [],
      endingContract: {
        endingStyle: "",
        mustInclude: [],
        mustAvoid: [],
        requiresEmotionalStability: false,
        requiresSuccessMoment: false,
        requiresSafeClosure: false,
      },
      overrideUsed: false,
      warnings: validationResult.warnings.map((w) => ({
        code: w.code,
        message: w.message,
      })),
      errors: validationResult.errors.map((e) => ({
        code: e.code,
        message: e.message,
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "invalid",
      validationSummary: {
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      },
    };

    // Save invalid contract for debugging
    await saveContractToFirestore(contract, fs);
    return contract;
  }

  const normalized = validationResult.normalizedBrief;

  // 2. Decide rules version
  const rulesVersion =
    briefRaw.rulesVersion ?? (await getDefaultRulesVersion(fs));

  // 3. Load clinical rules
  const rules = await loadClinicalRules(rulesVersion, fs);

  // 4. Extract normalized values
  const ageBand = normalized.childProfile.ageGroup;
  const topic = normalized.therapeuticFocus.primaryTopic;
  const situation = normalized.therapeuticFocus.specificSituation;
  const caregiverPresence = normalized.storyPreferences.caregiverPresence;
  const sensitivity = normalized.childProfile.emotionalSensitivity;
  const endingStyle = normalized.storyPreferences.endingStyle;
  const emotionalTone = normalized.languageTone.emotionalTone;
  const languageComplexity = normalized.languageTone.complexity;
  const keyMessage = normalized.therapeuticIntent.keyMessage;
  const exclusions = normalized.safetyConstraints.exclusions;
  const emotionalGoals = normalized.therapeuticIntent.emotionalGoals;

  // 5. Apply rules

  // (A) Age rules
  const ageRule = rules.ageRules[ageBand];
  if (!ageRule) {
    addError(
      errors,
      ERROR_CODES.MISSING_AGE_RULE,
      `Age rule not found for age band "${ageBand}"`
    );
  }

  const lengthBudget = ageRule
    ? {
        minScenes: ageRule.minScenes,
        maxScenes: ageRule.maxScenes,
        maxWords: ageRule.maxWords,
      }
    : {
        minScenes: 0,
        maxScenes: 0,
        maxWords: 0,
      };

  const styleRules = ageRule
    ? {
        maxSentenceWords: ageRule.maxSentenceWords,
        dialoguePolicy: ageRule.dialoguePolicy,
        abstractConcepts: ageRule.abstractConcepts,
        emotionalTone,
        languageComplexity,
      }
    : {
        maxSentenceWords: 0,
        dialoguePolicy: "none" as const,
        abstractConcepts: "no" as const,
        emotionalTone,
        languageComplexity,
      };

  // (B) Goal mappings
  let requiredElements: string[] = [];
  let allowedCopingTools: string[] = [];
  let avoidPatterns: string[] = [];
  let anyGoalRequiresClosure = false;

  for (const goalId of emotionalGoals) {
    const goalMapping = rules.goalMappings[goalId];
    if (!goalMapping) {
      addError(
        errors,
        ERROR_CODES.MISSING_GOAL_MAPPING,
        `Goal mapping not found for goal "${goalId}"`
      );
      continue;
    }

    requiredElements = mergeAndDeduplicateArrays(
      requiredElements,
      goalMapping.requiredElements
    );
    allowedCopingTools = mergeAndDeduplicateArrays(
      allowedCopingTools,
      goalMapping.allowedCopingTools
    );
    avoidPatterns = mergeAndDeduplicateArrays(
      avoidPatterns,
      goalMapping.avoidPatterns
    );
    if (goalMapping.requiresClosure) {
      anyGoalRequiresClosure = true;
    }
  }

  // (C) Sensitivity rules
  const sensitivityRule = rules.sensitivityRules[sensitivity];
  if (!sensitivityRule) {
    addError(
      errors,
      ERROR_CODES.MISSING_SENSITIVITY_RULE,
      `Sensitivity rule not found for level "${sensitivity}"`
    );
  }

  let mustAvoid = [...avoidPatterns];
  if (sensitivityRule) {
    mustAvoid = mergeAndDeduplicateArrays(
      mustAvoid,
      sensitivityRule.addMustAvoid
    );
  }

  const requiresSafeClosure =
    (sensitivityRule?.forceSafeClosure ?? false) || anyGoalRequiresClosure;

  // (D) Exclusions - apply before building endingContract
  for (const exclusionId of exclusions) {
    const exclusionRule = rules.exclusions[exclusionId];
    if (!exclusionRule) {
      addWarning(
        warnings,
        WARNING_CODES.UNKNOWN_EXCLUSION_RULE,
        `Exclusion rule not found for exclusion "${exclusionId}", treating as empty banned list`
      );
      continue;
    }

    mustAvoid = mergeAndDeduplicateArrays(mustAvoid, exclusionRule.banned);
  }

  // (E) Ending rules - mustAvoid already includes exclusions
  const endingRule = rules.endingRules[endingStyle];
  if (!endingRule) {
    addError(
      errors,
      ERROR_CODES.MISSING_ENDING_RULE,
      `Ending rule not found for style "${endingStyle}"`
    );
  }

  const endingContract = endingRule
    ? {
        endingStyle,
        mustInclude: [...endingRule.mustInclude],
        mustAvoid: mergeAndDeduplicateArrays(
          endingRule.mustAvoid,
          mustAvoid
        ),
        requiresEmotionalStability: endingRule.requiresEmotionalStability,
        requiresSuccessMoment: endingRule.requiresSuccessMoment,
        requiresSafeClosure,
      }
    : {
        endingStyle,
        mustInclude: [],
        mustAvoid: [...mustAvoid],
        requiresEmotionalStability: false,
        requiresSuccessMoment: false,
        requiresSafeClosure,
      };

  // (F) Coping tools filtering
  let filteredCopingTools: string[] = [];
  const originalCopingTools = [...allowedCopingTools];

  for (const toolId of allowedCopingTools) {
    const copingTool = rules.copingTools[toolId];
    if (!copingTool) {
      addWarning(
        warnings,
        WARNING_CODES.UNKNOWN_COPING_TOOL,
        `Coping tool "${toolId}" not found in rules`
      );
      continue;
    }

    if (copingTool.allowedAges.includes(ageBand)) {
      filteredCopingTools.push(toolId);
    }
  }

  if (filteredCopingTools.length === 0 && originalCopingTools.length > 0) {
    addWarning(
      warnings,
      WARNING_CODES.NO_COPING_TOOL_AVAILABLE,
      `No coping tools available for age band "${ageBand}" after filtering`
    );
  }

  // (G) Override hook
  let overrideUsed = false;
  let overrideDetails: Record<string, unknown> | undefined = undefined;

  if (briefRaw.overrides?.copingToolId) {
    const overrideToolId = briefRaw.overrides.copingToolId as string;
    const overrideTool = rules.copingTools[overrideToolId];

    if (
      overrideTool &&
      overrideTool.allowedAges.includes(ageBand)
    ) {
      overrideUsed = true;
      filteredCopingTools = [overrideToolId];
      overrideDetails = {
        copingToolId: overrideToolId,
        reason: "user_override",
      };
    } else {
      addWarning(
        warnings,
        WARNING_CODES.INVALID_OVERRIDE_COPING_TOOL,
        `Override coping tool "${overrideToolId}" is invalid or not allowed for age band "${ageBand}", ignoring override`
      );
    }
  }

  // 6. Build final contract
  const contract: GenerationContract = {
    briefId,
    rulesVersionUsed: rulesVersion,
    topic,
    situation,
    ageBand,
    caregiverPresence,
    emotionalSensitivity: sensitivity,
    lengthBudget,
    styleRules,
    requiredElements: deduplicateArray(requiredElements),
    allowedCopingTools: deduplicateArray(filteredCopingTools),
    mustAvoid: deduplicateArray(mustAvoid),
    endingContract,
    overrideUsed,
    warnings: [...validationResult.warnings.map((w) => ({ code: w.code, message: w.message })), ...warnings],
    errors,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: errors.length === 0 ? "valid" : "invalid",
    validationSummary: {
      errorCount: errors.length,
      warningCount: warnings.length + validationResult.warnings.length,
    },
  };

  // Conditionally add optional fields only if defined (for exactOptionalPropertyTypes)
  if (overrideDetails !== undefined) {
    contract.overrideDetails = overrideDetails;
  }
  if (keyMessage !== undefined && keyMessage !== "") {
    contract.keyMessage = keyMessage;
  }

  // 7. Save to Firestore
  await saveContractToFirestore(contract, fs);

  return contract;
}

/**
 * Saves a generation contract to Firestore
 */
async function saveContractToFirestore(
  contract: GenerationContract,
  fs: Firestore
): Promise<void> {
  const contractRef = fs
    .collection("generationContracts")
    .doc(contract.briefId);

  // Convert FieldValue to actual value for saving
  const contractData: any = {
    ...contract,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await contractRef.set(contractData, { merge: false });
}
