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

// ============================================================================
// Specialist Overrides (Contract Editor)
// ============================================================================

/**
 * Delta-based overrides a specialist can apply to the auto-generated contract.
 * Stored on the StoryBrief document under `overrides`.
 * Applied by Agent 1 after all automatic rules in buildGenerationContract.
 */
export interface SpecialistOverrides {
  // Coping tool selection
  copingToolId?: string;

  // Required elements: add or remove from the auto-generated list
  addRequiredElements?: string[];
  removeRequiredElements?: string[];

  // Must-avoid items: add or remove from the auto-generated list
  addMustAvoid?: string[];
  removeMustAvoid?: string[];

  // Direct field overrides
  emotionalSensitivity?: "low" | "medium" | "high";
  endingStyle?: "calm_resolution" | "open_ended" | "empowering";
  caregiverPresence?: "included" | "self_guided";
  keyMessage?: string;

  // Length adjustment
  minScenes?: number;
  maxScenes?: number;
  /** Max total words. If omitted and scenes are overridden, auto-scales proportionally. */
  maxWords?: number;

  // Audit
  reason?: string;
  updatedAt?: FieldValue | Timestamp | string;
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
  /** @deprecated Use specialistOverrides instead. Kept for backward compat with old Firestore docs. */
  overrideDetails?: Record<string, unknown>;
  /** Snapshot of all specialist overrides applied to this contract */
  specialistOverrides?: SpecialistOverrides;
  keyMessage?: string;
  warnings: ContractWarning[];
  errors: ContractError[];
  createdAt: FieldValue | Timestamp | string;
  updatedAt?: FieldValue | Timestamp | string;

  // --- REQUIRED (was optional) ---
  status: "valid" | "invalid";

  validationSummary?: {
    errorCount: number;
    warningCount: number;
  };

  // --- Review state (auto-approved on every save by Agent 1) ---
  reviewStatus: "approved";
  reviewedBy?: string;
  reviewedAt?: FieldValue | Timestamp | string;
}

// ============================================================================
// Audit Trail — Review Record
// ============================================================================

/**
 * Context passed by callers (controllers) to attach metadata to audit records.
 */
export interface AuditContext {
  reviewerId?: string;
  clinicalRationale?: string;
}

/**
 * Append-only audit record written on every contract save/regeneration.
 * Stored at: generationContracts/{briefId}/reviews/{reviewId}
 */
export interface ReviewRecord {
  briefId: string;
  contractId: string; // same as briefId
  rulesVersionUsed: string;
  reviewerId: string;
  overrideApplied: boolean;
  specialistOverrides?: SpecialistOverrides;
  clinicalRationale?: string;
  contractSnapshot?: Omit<
    GenerationContract,
    "createdAt" | "updatedAt" | "reviewStatus" | "reviewedBy" | "reviewedAt"
  >;
  createdAt: FieldValue | Timestamp | string;
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
