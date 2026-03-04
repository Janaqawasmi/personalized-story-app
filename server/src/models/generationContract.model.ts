// server/src/models/generationContract.model.ts
//
// PHASE 1 UPDATE:
//   - Added "pending_review" | "approved" | "rejected" to ContractStatus
//   - Added ApprovalRecord interface
//   - Added approval fields to GenerationContract
//   - Existing interfaces and helpers are unchanged
//
import type { FieldValue, Timestamp } from "firebase-admin/firestore";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Contract status lifecycle:
 *   "invalid"         → Contract has errors, cannot be approved
 *   "valid"           → Contract built successfully, awaiting review
 *   "pending_review"  → Alias for valid, explicitly entered review queue
 *   "approved"        → Specialist approved — generation is allowed
 *   "rejected"        → Specialist rejected — generation is blocked
 */
export type ContractStatus =
  | "invalid"
  | "valid"
  | "pending_review"
  | "approved"
  | "rejected";

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

/**
 * Records a specialist's approval or rejection decision.
 * Stored directly on the contract for quick access,
 * and also logged to the audit trail for immutability.
 */
export interface ApprovalRecord {
  /** "approved" or "rejected" */
  decision: "approved" | "rejected";

  /** UID of the specialist who made the decision */
  decidedBy: string;

  /** Display name of the specialist */
  decidedByName: string;

  /** Email of the specialist */
  decidedByEmail: string;

  /** When the decision was made */
  decidedAt: FieldValue | Timestamp | string;

  /** Optional notes from the specialist (required for rejection) */
  notes?: string;
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

  /** Contract lifecycle status — see ContractStatus type */
  status?: ContractStatus;

  validationSummary?: {
    errorCount: number;
    warningCount: number;
  };

  /** Populated when a specialist approves or rejects the contract */
  approval?: ApprovalRecord;
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
