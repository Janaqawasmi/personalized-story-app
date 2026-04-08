// server/src/validation/index.ts
//
// Combined Story Brief validation entry point.
//
// Runs both the cross-field validation rules (Section 8) and the complexity
// budget calculator (Section 16) against a complete brief and returns a
// unified result.

import type { StoryBrief } from "../models/storyBrief.model";
import {
  validateBriefCrossFields,
  type CrossFieldValidationResult,
  type TriggeredValidation,
} from "./crossFieldValidation";
import {
  calculateComplexityBudget,
  type ComplexityBudgetResult,
} from "./complexityBudget";

// ============================================================================
// Re-exports (for convenience)
// ============================================================================

export {
  validateBriefCrossFields,
  type CrossFieldValidationResult,
  type TriggeredValidation,
} from "./crossFieldValidation";

export {
  calculateComplexityBudget,
  calculateComplexityBudgetFromClientWire,
  type ComplexityBudgetResult,
  type ObligationItem,
} from "./complexityBudget";

export { extractComplexityPartsFromStoryBrief } from "./complexityParts";

export {
  extractComplexityPartsFromClientWire,
  isClientWireBriefPayload,
  type NormalizedComplexityParts,
} from "@dammah/story-brief-complexity";

// ============================================================================
// Types
// ============================================================================

export interface StoryBriefValidationResult {
  crossField: CrossFieldValidationResult;
  complexityBudget: ComplexityBudgetResult;

  /**
   * True when the brief is structurally submittable:
   *   - No hard blocks
   *   - All hard warnings acknowledged
   *
   * Soft warnings and complexity budget overload do NOT prevent submission
   * — they are informational only.
   */
  canSubmit: boolean;

  /** Flat list of every triggered issue for simple iteration. */
  allIssues: TriggeredValidation[];
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Validates a complete Story Brief against all rules.
 *
 * Call this before submission. The result tells the UI:
 * - Whether to block submission (`canSubmit`)
 * - Which hard warnings still need acknowledgment
 * - Which soft warnings to display
 * - Whether the complexity budget is exceeded (and by how much)
 */
export function validateStoryBrief(
  brief: StoryBrief,
): StoryBriefValidationResult {
  const crossField = validateBriefCrossFields(brief);
  const complexityBudget = calculateComplexityBudget(brief);

  // Merge the complexity budget overload into soft warnings when triggered
  const allIssues: TriggeredValidation[] = [
    ...crossField.hardBlocks,
    ...crossField.hardWarnings,
    ...crossField.softWarnings,
  ];

  if (complexityBudget.isOverBudget) {
    allIssues.push({
      id: "complexity_budget_exceeded",
      severity: "soft_warning",
      message: complexityBudget.warningMessage!,
      fields: ["1.1", "1.3"],
    });
  }

  return {
    crossField,
    complexityBudget,
    canSubmit: crossField.canSubmitWithAcknowledgments,
    allIssues,
  };
}
