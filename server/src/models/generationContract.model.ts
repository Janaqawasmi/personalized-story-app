// server/src/models/generationContract.model.ts
//
// PHASE 1 UPDATE:
//   - Added "approved" | "rejected" to ContractStatus
//   - Added ApprovalRecord interface with expiry support
//   - Added approval fields to GenerationContract
//   - Added previousApprovals array for approval history
//   - Added overrideCount and overrideHistory tracking
//   - Removed "pending_review" (was undefined alias for "valid")
//
import type { FieldValue, Timestamp } from "firebase-admin/firestore";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Contract status lifecycle:
 *   "invalid"         → Contract has errors, cannot be approved
 *   "valid"           → Contract built successfully, awaiting review
 *   "approved"        → Specialist approved — generation is allowed
 *   "rejected"        → Specialist rejected — generation is blocked
 * 
 * Note: "pending_review" was removed as it was an undefined alias for "valid".
 * All contracts awaiting review use "valid" status.
 */
export type ContractStatus =
  | "invalid"
  | "valid"
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

  /** When the approval expires (optional, for clinical governance) */
  expiresAt?: FieldValue | Timestamp | string;

  /** When this approval was revoked (if applicable) */
  revokedAt?: FieldValue | Timestamp | string;

  /** Reason for revocation (if applicable) */
  revokedReason?: string;
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

  /** Current approval/rejection record (most recent decision) */
  approval?: ApprovalRecord;

  /** Historical approval/rejection records (preserves full decision history) */
  previousApprovals?: ApprovalRecord[];

  /** Number of times override has been applied to this contract */
  overrideCount?: number;

  /** History of override applications */
  overrideHistory?: Array<{
    copingToolId: string;
    reason?: string;
    appliedAt: FieldValue | Timestamp | string;
    appliedBy: string;
    appliedByName: string;
  }>;
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
