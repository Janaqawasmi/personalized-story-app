// server/src/services/clinicalRules.service.ts
import { db } from "../config/firebase";
import admin from "firebase-admin";

// ============================================================================
// Type Definitions
// ============================================================================

export interface AgeRule {
  maxWords: number;
  minScenes: number;
  maxScenes: number;
  maxSentenceWords: number;
  dialoguePolicy: "none" | "minimal" | "allowed";
  abstractConcepts: "no" | "limited" | "yes";
}

export interface GoalMapping {
  requiredElements: string[];
  allowedCopingTools: string[];
  avoidPatterns: string[];
  requiresClosure: boolean;
}

export interface CopingTool {
  displayName?: string;
  allowedAges: string[];
  repetitionRequired: number;
  contraindications?: string[];
}

export interface EndingRule {
  mustInclude: string[];
  mustAvoid: string[];
  requiresEmotionalStability: boolean;
  requiresSuccessMoment: boolean;
}

export interface ExclusionRule {
  banned: string[];
}

export interface SensitivityRule {
  addMustAvoid: string[];
  forceSafeClosure: boolean;
}

export interface ClinicalRules {
  version: string;
  ageRules: Record<string, AgeRule>;
  goalMappings: Record<string, GoalMapping>;
  copingTools: Record<string, CopingTool>;
  endingRules: Record<string, EndingRule>;
  exclusions: Record<string, ExclusionRule>;
  sensitivityRules: Record<string, SensitivityRule>;
}

// ============================================================================
// Cache Configuration
// ============================================================================

interface CacheEntry {
  rules: ClinicalRules;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

// ============================================================================
// Helper Functions
// ============================================================================

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Gets the default rules version from settings
 * 
 * @param fs - Optional Firestore instance (defaults to db)
 * @returns Default version string (e.g., "v1")
 */
export async function getDefaultRulesVersion(
  fs?: admin.firestore.Firestore
): Promise<string> {
  const firestore = fs ?? db;
  
  try {
    const settingsDoc = await firestore.collection("settings").doc("rules").get();
    
    if (!settingsDoc.exists) {
      throw new Error("settings/rules document not found. Run seed:clinicalRules first.");
    }
    
    const data = settingsDoc.data();
    const defaultVersion = data?.defaultVersion;
    
    if (!defaultVersion || typeof defaultVersion !== "string") {
      throw new Error("settings/rules.defaultVersion is missing or invalid");
    }
    
    return defaultVersion;
  } catch (error: any) {
    console.error("Error getting default rules version:", error);
    throw new Error(`Failed to get default rules version: ${error.message}`);
  }
}

/**
 * Loads clinical rules for a specific version
 * 
 * @param version - Optional version string (defaults to defaultVersion from settings)
 * @param fs - Optional Firestore instance (defaults to db)
 * @returns ClinicalRules object with all rule collections
 */
export async function loadClinicalRules(
  version?: string,
  fs?: admin.firestore.Firestore
): Promise<ClinicalRules> {
  const firestore = fs ?? db;
  
  // Get version if not provided
  const rulesVersion = version ?? (await getDefaultRulesVersion(firestore));
  
  // Check cache
  const cached = cache.get(rulesVersion);
  if (cached && isCacheValid(cached)) {
    return cached.rules;
  }
  
  try {
    // Verify version document exists
    const versionDoc = await firestore
      .collection("clinicalRules")
      .doc("versions")
      .collection("versions")
      .doc(rulesVersion)
      .get();
    
    if (!versionDoc.exists) {
      throw new Error(`Clinical rules version "${rulesVersion}" not found. Run seed:clinicalRules first.`);
    }
    
    const versionData = versionDoc.data();
    if (versionData?.status !== "active") {
      console.warn(`Warning: Clinical rules version "${rulesVersion}" status is "${versionData?.status}", not "active"`);
    }
    
    // Load all subcollections in parallel
    // Path: clinicalRules/versions/versions/{version}/subcollections
    const versionRef = firestore
      .collection("clinicalRules")
      .doc("versions")
      .collection("versions")
      .doc(rulesVersion);
    
    const [
      ageRulesSnapshot,
      goalMappingsSnapshot,
      copingToolsSnapshot,
      endingRulesSnapshot,
      exclusionsSnapshot,
      sensitivityRulesSnapshot,
    ] = await Promise.all([
      versionRef.collection("ageRules").get(),
      versionRef.collection("goalMappings").get(),
      versionRef.collection("copingTools").get(),
      versionRef.collection("endingRules").get(),
      versionRef.collection("exclusions").get(),
      versionRef.collection("sensitivityRules").get(),
    ]);
    
    // Build ageRules record
    const ageRules: Record<string, AgeRule> = {};
    ageRulesSnapshot.forEach((doc) => {
      const data = doc.data();
      ageRules[doc.id] = {
        maxWords: data.maxWords,
        minScenes: data.minScenes,
        maxScenes: data.maxScenes,
        maxSentenceWords: data.maxSentenceWords,
        dialoguePolicy: data.dialoguePolicy,
        abstractConcepts: data.abstractConcepts,
      };
    });
    
    // Build goalMappings record
    const goalMappings: Record<string, GoalMapping> = {};
    goalMappingsSnapshot.forEach((doc) => {
      const data = doc.data();
      goalMappings[doc.id] = {
        requiredElements: data.requiredElements || [],
        allowedCopingTools: data.allowedCopingTools || [],
        avoidPatterns: data.avoidPatterns || [],
        requiresClosure: data.requiresClosure === true,
      };
    });
    
    // Build copingTools record
    const copingTools: Record<string, CopingTool> = {};
    copingToolsSnapshot.forEach((doc) => {
      const data = doc.data();
      copingTools[doc.id] = {
        displayName: data.displayName,
        allowedAges: data.allowedAges || [],
        repetitionRequired: data.repetitionRequired || 0,
        contraindications: data.contraindications,
      };
    });
    
    // Build endingRules record
    const endingRules: Record<string, EndingRule> = {};
    endingRulesSnapshot.forEach((doc) => {
      const data = doc.data();
      endingRules[doc.id] = {
        mustInclude: data.mustInclude || [],
        mustAvoid: data.mustAvoid || [],
        requiresEmotionalStability: data.requiresEmotionalStability === true,
        requiresSuccessMoment: data.requiresSuccessMoment === true,
      };
    });
    
    // Build exclusions record
    const exclusions: Record<string, ExclusionRule> = {};
    exclusionsSnapshot.forEach((doc) => {
      const data = doc.data();
      exclusions[doc.id] = {
        banned: data.banned || [],
      };
    });
    
    // Build sensitivityRules record
    const sensitivityRules: Record<string, SensitivityRule> = {};
    sensitivityRulesSnapshot.forEach((doc) => {
      const data = doc.data();
      sensitivityRules[doc.id] = {
        addMustAvoid: data.addMustAvoid || [],
        forceSafeClosure: data.forceSafeClosure === true,
      };
    });
    
    // Validate that we have at least some rules
    if (
      Object.keys(ageRules).length === 0 ||
      Object.keys(goalMappings).length === 0 ||
      Object.keys(copingTools).length === 0 ||
      Object.keys(endingRules).length === 0 ||
      Object.keys(exclusions).length === 0 ||
      Object.keys(sensitivityRules).length === 0
    ) {
      throw new Error(
        `Clinical rules version "${rulesVersion}" is incomplete. ` +
        `Required subcollections are missing or empty. Run seed:clinicalRules first.`
      );
    }
    
    const rules: ClinicalRules = {
      version: rulesVersion,
      ageRules,
      goalMappings,
      copingTools,
      endingRules,
      exclusions,
      sensitivityRules,
    };
    
    // Cache the result
    cache.set(rulesVersion, {
      rules,
      timestamp: Date.now(),
    });
    
    return rules;
  } catch (error: any) {
    console.error(`Error loading clinical rules version "${rulesVersion}":`, error);
    throw new Error(`Failed to load clinical rules: ${error.message}`);
  }
}

/**
 * Clears the in-memory cache (useful for testing or forced refresh)
 */
export function clearClinicalRulesCache(): void {
  cache.clear();
}
