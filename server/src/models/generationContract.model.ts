// server/src/models/generationContract.model.ts
import type { FieldValue, Timestamp } from "firebase-admin/firestore";

// ============================================================================
// Type Definitions
// ============================================================================

export interface LengthBudget {
  minScenes: number;
  maxScenes: number;
  maxWords: number;
  targetWords?: number;
}

export interface StyleRules {
  maxSentenceWords: number;
  dialoguePolicy: "none" | "minimal" | "allowed";
  abstractConcepts: "no" | "limited" | "yes";
  emotionalTone: string;
  languageComplexity: string;
}

export interface EndingContract {
  endingStyle: string;
  mustInclude: string[];
  mustAvoid: string[];
  requiresEmotionalStability: boolean;
  requiresSuccessMoment: boolean;
  requiresSafeClosure: boolean;
}

export interface ContractWarning {
  code: string;
  message: string;
}

export interface ContractError {
  code: string;
  message: string;
}

export interface GenerationContract {
  briefId: string;
  rulesVersionUsed: string;
  topic: string;
  situation: string;
  ageBand: string;
  caregiverPresence: string;
  emotionalSensitivity: string;
  lengthBudget: LengthBudget;
  styleRules: StyleRules;
  requiredElements: string[];
  allowedCopingTools: string[];
  mustAvoid: string[];
  endingContract: EndingContract;
  overrideUsed: boolean;
  overrideDetails?: Record<string, unknown>;
  keyMessage?: string;
  warnings: ContractWarning[];
  errors: ContractError[];
  createdAt: FieldValue | Timestamp | string;
  updatedAt?: FieldValue | Timestamp | string;
  status?: "valid" | "invalid";
  validationSummary?: {
    errorCount: number;
    warningCount: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deduplicates an array while preserving order (first occurrence wins)
 */
export function deduplicateArray<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Merges multiple arrays and deduplicates the result
 */
export function mergeAndDeduplicateArrays<T>(...arrays: T[][]): T[] {
  const merged: T[] = [];
  for (const arr of arrays) {
    merged.push(...arr);
  }
  return deduplicateArray(merged);
}
