/**
 * Centralized contract state machine.
 *
 * Defines every valid status transition for a GenerationContract,
 * so precondition checks in individual endpoints are consistent.
 *
 * Status lifecycle:
 *   "invalid"  → Contract has errors, cannot be approved
 *   "valid"    → Contract built successfully, awaiting review
 *   "approved" → Specialist approved — generation is allowed
 *   "rejected" → Specialist rejected — generation is blocked
 *
 * Transition table:
 *   build     :  any status             →  "valid" | "invalid"  (rebuilds from scratch)
 *   approve   :  "valid"                →  "approved"           (expired "approved" also qualifies)
 *   reject    :  "valid"                →  "rejected"           (reason required)
 *   override  :  any status             →  "valid" | "invalid"  (revokes approval, rebuilds)
 *   generate  :  "approved"             →  (no change)          (gate only, checked by guard)
 */

import type { ContractStatus } from "../models/generationContract.model";

// ── Actions ──────────────────────────────────────────────────────────────────

export type ContractAction =
  | "build"
  | "approve"
  | "reject"
  | "override"
  | "generate";

// ── Transition rules ─────────────────────────────────────────────────────────

interface TransitionRule {
  /** Statuses from which this action is allowed */
  allowedFrom: readonly ContractStatus[];
  /** The status the contract will move to (for build/override, actual status depends on errors) */
  targetStatus: ContractStatus;
}

const TRANSITIONS: Record<ContractAction, TransitionRule> = {
  build: {
    allowedFrom: ["invalid", "valid", "approved", "rejected"],
    targetStatus: "valid",
  },
  approve: {
    allowedFrom: ["valid"],
    targetStatus: "approved",
  },
  reject: {
    allowedFrom: ["valid"],
    targetStatus: "rejected",
  },
  override: {
    allowedFrom: ["invalid", "valid", "approved", "rejected"],
    targetStatus: "valid",
  },
  generate: {
    allowedFrom: ["approved"],
    targetStatus: "approved", // No transition — gate only
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

export interface TransitionCheckOptions {
  /** If true, treats an expired "approved" contract as eligible for re-approval */
  isExpiredApproval?: boolean;
}

/**
 * Checks whether the given `action` is allowed when the contract
 * currently has `currentStatus`.
 *
 * Special case: an expired "approved" contract can be re-approved
 * if `options.isExpiredApproval` is true.
 */
export function canTransition(
  currentStatus: ContractStatus,
  action: ContractAction,
  options?: TransitionCheckOptions
): boolean {
  const rule = TRANSITIONS[action];
  if (rule.allowedFrom.includes(currentStatus)) return true;

  // Special case: expired approved contracts can be re-approved
  if (
    action === "approve" &&
    currentStatus === "approved" &&
    options?.isExpiredApproval
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the expected target status for an action.
 * Note: `build` and `override` may produce `"invalid"` at runtime if errors are found.
 */
export function getTargetStatus(action: ContractAction): ContractStatus {
  return TRANSITIONS[action].targetStatus;
}

/**
 * Returns a user-facing error message explaining why the transition is blocked.
 */
export function getTransitionError(
  currentStatus: ContractStatus,
  action: ContractAction
): string {
  const rule = TRANSITIONS[action];
  const allowed = rule.allowedFrom.map((s) => `"${s}"`).join(", ");
  return `Cannot ${action} a contract with status "${currentStatus}". Allowed from: ${allowed}.`;
}
