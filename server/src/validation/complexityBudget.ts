// server/src/validation/complexityBudget.ts
//
// Complexity budget calculator for the Story Brief (spec v1.3, Section 16).
// Core math lives in @dammah/story-brief-complexity; this file adds server warning copy.

import type { StoryBrief } from "../models/storyBrief.model";
import { STORY_LENGTH_LABELS } from "../models/storyBrief.model";
import {
  type NormalizedComplexityParts,
  computeComplexityFromParts,
  extractComplexityPartsFromClientWire,
  roundToHalf,
} from "@dammah/story-brief-complexity";
import { extractComplexityPartsFromStoryBrief } from "./complexityParts";

// ============================================================================
// Types
// ============================================================================

export interface ObligationItem {
  label: string;
  baseCost: number;
}

export interface ComplexityBudgetResult {
  totalPageCost: number;
  availablePages: [number, number];
  isOverBudget: boolean;
  obligations: ObligationItem[];
  ageMultiplier: number;
  warningMessage: string | null;
}

// ============================================================================
// Main
// ============================================================================

function buildComplexityBudgetResult(parts: NormalizedComplexityParts): ComplexityBudgetResult {
  const engine = computeComplexityFromParts(parts);
  const { storyLength } = parts;
  const availablePages: [number, number] = [engine.budget.min, engine.budget.max];
  const lowerBound = availablePages[0];
  const isOverBudget = engine.totalPageCost > lowerBound;

  const obligations: ObligationItem[] = engine.serverObligations.map((o) => ({
    label: o.label,
    baseCost: o.baseCost,
  }));

  let warningMessage: string | null = null;

  if (isOverBudget) {
    const lengthLabel = STORY_LENGTH_LABELS[storyLength];
    const obligationLines = obligations.map(
      (o) => `  • ${o.label}: ${roundToHalf(o.baseCost * engine.ageMultiplier)} pages`,
    );

    warningMessage =
      `Your story design requires approximately ${engine.totalPageCost} pages to include all ` +
      `elements well. You've selected ${lengthLabel} (${availablePages[0]}–${availablePages[1]} pages). ` +
      `Consider increasing the story length, or reducing complexity by removing a supporting ` +
      `character, changing the supporting approach, or adjusting the shame level.\n\n` +
      `Obligation breakdown:\n${obligationLines.join("\n")}`;
  }

  return {
    totalPageCost: engine.totalPageCost,
    availablePages,
    isOverBudget,
    obligations,
    ageMultiplier: engine.ageMultiplier,
    warningMessage,
  };
}

/**
 * Computes the complexity budget for a canonical server `StoryBrief`.
 */
export function calculateComplexityBudget(brief: StoryBrief): ComplexityBudgetResult {
  return buildComplexityBudgetResult(extractComplexityPartsFromStoryBrief(brief));
}

/**
 * Same Section 16 math as {@link calculateComplexityBudget}, for client wire JSON
 * (`CompleteBrief`: `section1`–`section5`, caregiver enums like `leaves_returns`).
 */
export function calculateComplexityBudgetFromClientWire(wire: unknown): ComplexityBudgetResult {
  return buildComplexityBudgetResult(extractComplexityPartsFromClientWire(wire));
}
