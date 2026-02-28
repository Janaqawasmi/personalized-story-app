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
  SpecialistOverrides,
  AuditContext,
  ReviewRecord,
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
 * Builds a generation contract from a brief ID by loading the brief from Firestore.
 * Every saved contract is automatically approved (no separate review step).
 * An audit record is written on every save.
 *
 * @param briefId - The brief ID
 * @param deps - Optional dependencies (firestore instance)
 * @param options - Optional configuration (skipSave, rulesVersion)
 * @param auditContext - Optional metadata (reviewerId, clinicalRationale) for the audit record
 */
export async function buildGenerationContractFromBriefId(
  briefId: string,
  deps?: { firestore?: Firestore },
  options?: { skipSave?: boolean; rulesVersion?: string },
  auditContext?: AuditContext
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

  return buildGenerationContract(briefId, briefRaw, deps, options, auditContext);
}

/**
 * Builds a generation contract from a raw brief object.
 * Every saved contract is automatically approved.
 *
 * @param briefId - The brief ID
 * @param briefRaw - The raw brief object
 * @param deps - Optional dependencies (firestore instance)
 * @param options - Optional configuration (skipSave, rulesVersion)
 * @param auditContext - Optional metadata for the audit record
 */
export async function buildGenerationContract(
  briefId: string,
  briefRaw: any,
  deps?: { firestore?: Firestore },
  options?: { skipSave?: boolean; rulesVersion?: string },
  auditContext?: AuditContext
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
      // All contracts are auto-approved (generation gate also checks status === "valid")
      reviewStatus: "approved" as const,
    };

    // Save invalid contract for debugging (unless skipSave is true)
    if (!options?.skipSave) {
      await saveContractToFirestore(contract, fs, auditContext);
      await fs.collection("storyBriefs").doc(briefId).update({
        status: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return contract;
  }

  const normalized = validationResult.normalizedBrief;

  // 2. Decide rules version
  // Priority: options.rulesVersion > briefRaw.rulesVersion > default version
  const rulesVersion =
    options?.rulesVersion ??
    briefRaw.rulesVersion ??
    (await getDefaultRulesVersion(fs));

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

  // (G) Specialist overrides — apply all delta-based overrides from the brief
  let overrideUsed = false;
  let specialistOverrides: SpecialistOverrides | undefined = undefined;
  const ov: SpecialistOverrides | undefined = briefRaw.overrides;

  // Track effective values that may be overridden
  let effectiveSensitivity = sensitivity;
  let effectiveCaregiverPresence = caregiverPresence;
  let effectiveKeyMessage = keyMessage;
  let effectiveEndingStyle = endingStyle;
  let effectiveEndingContract = endingContract;

  if (ov && typeof ov === "object") {
    // --- Coping tool override (existing behaviour) ---
    if (ov.copingToolId) {
      const overrideToolId = ov.copingToolId;
      const overrideTool = rules.copingTools[overrideToolId];

      if (overrideTool && overrideTool.allowedAges.includes(ageBand)) {
        overrideUsed = true;
        if (!filteredCopingTools.includes(overrideToolId)) {
          filteredCopingTools.push(overrideToolId);
        }
      } else {
        addWarning(
          warnings,
          WARNING_CODES.INVALID_OVERRIDE_COPING_TOOL,
          `Override coping tool "${overrideToolId}" is invalid or not allowed for age band "${ageBand}", ignoring override`
        );
      }
    }

    // --- Required elements add/remove ---
    if (Array.isArray(ov.addRequiredElements) && ov.addRequiredElements.length > 0) {
      requiredElements = deduplicateArray([...requiredElements, ...ov.addRequiredElements]);
      overrideUsed = true;
    }
    if (Array.isArray(ov.removeRequiredElements) && ov.removeRequiredElements.length > 0) {
      const removeSet = new Set(ov.removeRequiredElements);
      requiredElements = requiredElements.filter((e) => !removeSet.has(e));
      overrideUsed = true;
    }

    // --- Must-avoid add/remove ---
    if (Array.isArray(ov.addMustAvoid) && ov.addMustAvoid.length > 0) {
      mustAvoid = deduplicateArray([...mustAvoid, ...ov.addMustAvoid]);
      overrideUsed = true;
    }
    if (Array.isArray(ov.removeMustAvoid) && ov.removeMustAvoid.length > 0) {
      const removeSet = new Set(ov.removeMustAvoid);
      mustAvoid = mustAvoid.filter((e) => !removeSet.has(e));
      overrideUsed = true;
    }

    // --- Sensitivity override (re-applies sensitivity rules with new level) ---
    if (ov.emotionalSensitivity && ov.emotionalSensitivity !== sensitivity) {
      effectiveSensitivity = ov.emotionalSensitivity;
      const newSensRule = rules.sensitivityRules[effectiveSensitivity];
      if (newSensRule) {
        mustAvoid = mergeAndDeduplicateArrays(mustAvoid, newSensRule.addMustAvoid);
      }
      overrideUsed = true;
    }

    // --- Ending style override (re-applies ending rules with new style) ---
    if (ov.endingStyle && ov.endingStyle !== endingStyle) {
      effectiveEndingStyle = ov.endingStyle;
      const newEndingRule = rules.endingRules[effectiveEndingStyle];
      if (newEndingRule) {
        effectiveEndingContract = {
          endingStyle: effectiveEndingStyle,
          mustInclude: [...newEndingRule.mustInclude],
          mustAvoid: mergeAndDeduplicateArrays(newEndingRule.mustAvoid, mustAvoid),
          requiresEmotionalStability: newEndingRule.requiresEmotionalStability,
          requiresSuccessMoment: newEndingRule.requiresSuccessMoment,
          requiresSafeClosure,
        };
      }
      overrideUsed = true;
    }

    // --- Caregiver presence override ---
    if (ov.caregiverPresence && ov.caregiverPresence !== caregiverPresence) {
      effectiveCaregiverPresence = ov.caregiverPresence;
      overrideUsed = true;
    }

    // --- Key message override ---
    if (ov.keyMessage !== undefined && ov.keyMessage !== "") {
      effectiveKeyMessage = ov.keyMessage;
      overrideUsed = true;
    }

    // --- Length budget overrides ---
    const originalMaxScenes = lengthBudget.maxScenes;
    const originalMaxWords = lengthBudget.maxWords;

    if (typeof ov.minScenes === "number" && ov.minScenes > 0) {
      lengthBudget.minScenes = ov.minScenes;
      overrideUsed = true;
    }
    if (typeof ov.maxScenes === "number" && ov.maxScenes > 0) {
      lengthBudget.maxScenes = ov.maxScenes;
      overrideUsed = true;
    }

    // Explicit maxWords override takes priority
    if (typeof ov.maxWords === "number" && ov.maxWords > 0) {
      lengthBudget.maxWords = ov.maxWords;
      overrideUsed = true;
    } else if (
      lengthBudget.maxScenes !== originalMaxScenes &&
      originalMaxScenes > 0
    ) {
      // Auto-scale maxWords proportionally to scene count change
      const scaleFactor = lengthBudget.maxScenes / originalMaxScenes;
      lengthBudget.maxWords = Math.round(originalMaxWords * scaleFactor);
      // Note: overrideUsed already set by maxScenes override above
    }

    // Persist the overrides snapshot on the contract for audit
    if (overrideUsed) {
      specialistOverrides = { ...ov };
    }
  }

  // 6. Build final contract — all contracts are auto-approved
  const allWarnings = [...validationResult.warnings.map((w) => ({ code: w.code, message: w.message })), ...warnings];

  const contract: GenerationContract = {
    briefId,
    rulesVersionUsed: rulesVersion,
    topic,
    situation,
    ageBand,
    caregiverPresence: effectiveCaregiverPresence,
    emotionalSensitivity: effectiveSensitivity,
    lengthBudget,
    styleRules,
    requiredElements: deduplicateArray(requiredElements),
    allowedCopingTools: deduplicateArray(filteredCopingTools),
    mustAvoid: deduplicateArray(mustAvoid),
    endingContract: effectiveEndingContract,
    overrideUsed,
    warnings: allWarnings,
    errors,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: errors.length === 0 ? "valid" : "invalid",
    validationSummary: {
      errorCount: errors.length,
      warningCount: allWarnings.length,
    },
    // All contracts auto-approved (generation gate also checks status === "valid")
    reviewStatus: "approved" as const,
  };

  // Conditionally add optional fields only if defined (for exactOptionalPropertyTypes)
  if (specialistOverrides !== undefined) {
    contract.specialistOverrides = specialistOverrides;
  }
  if (effectiveKeyMessage !== undefined && effectiveKeyMessage !== "") {
    contract.keyMessage = effectiveKeyMessage;
  }

  // 7. Save to Firestore (unless skipSave is true)
  if (!options?.skipSave) {
    await saveContractToFirestore(contract, fs, auditContext);
    await fs.collection("storyBriefs").doc(briefId).update({
      status: "approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return contract;
}

/**
 * Saves a generation contract to Firestore and writes an audit record.
 * Every save produces a review record in the append-only audit trail.
 */
async function saveContractToFirestore(
  contract: GenerationContract,
  fs: Firestore,
  auditContext?: AuditContext
): Promise<void> {
  const contractRef = fs
    .collection("generationContracts")
    .doc(contract.briefId);

  const contractData: any = {
    ...contract,
    reviewedBy: auditContext?.reviewerId || "system",
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await contractRef.set(contractData, { merge: false });

  // Write audit record on every save
  const reviewRecord: ReviewRecord = {
    briefId: contract.briefId,
    contractId: contract.briefId,
    rulesVersionUsed: contract.rulesVersionUsed || "",
    reviewerId: auditContext?.reviewerId || "system",
    overrideApplied: contract.overrideUsed,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Include specialist overrides snapshot if present
  if (contract.overrideUsed && contract.specialistOverrides) {
    reviewRecord.specialistOverrides = { ...contract.specialistOverrides };
  }

  // Include clinical rationale if provided
  if (auditContext?.clinicalRationale && auditContext.clinicalRationale.trim().length > 0) {
    reviewRecord.clinicalRationale = auditContext.clinicalRationale.trim();
  }

  // Include contract snapshot for audit
  const {
    createdAt: _ca,
    updatedAt: _ua,
    reviewStatus: _rs,
    reviewedBy: _rb,
    reviewedAt: _ra,
    ...contractCore
  } = contract;
  reviewRecord.contractSnapshot = contractCore;

  const reviewRef = contractRef.collection("reviews").doc();
  await reviewRef.set(reviewRecord);
}
