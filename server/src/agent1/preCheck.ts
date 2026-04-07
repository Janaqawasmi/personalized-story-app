import type { Agent1StoryBriefPayload } from "../models/storyBrief.schema";
import type { BudgetWeightsConfig } from "./config/types";
import { readAgentJson } from "./loadJson";
import type { PreCheckQualityGateField } from "./types";
import type { PreCheckResult } from "./types";

const budgetWeights: BudgetWeightsConfig = readAgentJson("config/budgetWeights.json");

/** Agent 1 spec §4.2 — vague intention pattern list (initial). */
const VAGUE_INTENTION_PATTERNS: readonly string[] = [
  "they can be brave",
  "everything will be okay",
  "it will be fine",
  "it will be alright",
  "there's nothing to be scared of",
  "nothing to be scared of",
  "nothing to worry about",
  "they are safe",
  "they are loved",
  "they can do it",
  "they can handle it",
  "it's not that bad",
  "it's not so scary",
];

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase();
}

function findVaguePattern(because: string): string | undefined {
  const n = normalizeForMatch(because);
  for (const p of VAGUE_INTENTION_PATTERNS) {
    if (n.includes(p)) return p;
  }
  return undefined;
}

/**
 * Rule-based pre-check (Agent 1 spec §4). No LLM calls.
 */
export function runPreCheck(brief: Agent1StoryBriefPayload): PreCheckResult {
  const quality: Array<{ field: PreCheckQualityGateField; message: string }> = [];

  const creative = brief.clinicalFoundation.creativeVision.trim();
  if (creative.length < 50) {
    quality.push({
      field: "clinicalFoundation.creativeVision",
      message:
        "A specific image or moment — a sound, a gesture, a visual detail — helps produce a distinctive story. Would you like to add more?",
    });
  }

  const trigger = brief.clinicalFoundation.trigger.trim();
  if (trigger.length < 80) {
    quality.push({
      field: "clinicalFoundation.trigger",
      message:
        "A detailed trigger scene — what the child sees, hears, feels in the moment — helps the story capture the right experience. Would you like to elaborate?",
    });
  }

  const because = brief.clinicalFoundation.therapeuticIntention.because.trim();
  if (because.length < 30) {
    quality.push({
      field: "clinicalFoundation.therapeuticIntention",
      message:
        "A specific understanding helps the story land its therapeutic purpose. Would you like to be more specific?",
    });
  }

  const vagueMatch = findVaguePattern(because);
  const vague_intention_detected = vagueMatch !== undefined;

  const { total, contributors } = computeComplexityBudget(brief, budgetWeights);
  const { ageRange } = brief.ageAndScope;
  const { storyLength } = brief.ageAndScope;
  const mult = budgetWeights.ageMultipliers[ageRange];
  const weightedTotal = total * mult;

  const [minPages, maxPages] = budgetWeights.pageBudgets[ageRange][storyLength];
  const overloaded = weightedTotal > minPages;

  return {
    quality_gate_findings: quality,
    vague_intention_detection: {
      vague_intention_detected,
      matched_pattern: vagueMatch,
    },
    complexity_budget: {
      overloaded,
      total_estimated_pages: weightedTotal,
      available_pages: { min: minPages, max: maxPages },
      contributors,
    },
  };
}

function computeComplexityBudget(
  brief: Agent1StoryBriefPayload,
  w: BudgetWeightsConfig,
): { total: number; contributors: Array<{ obligation: string; estimated_pages: number }> } {
  const ow = w.obligationWeights;
  const contributors: Array<{ obligation: string; estimated_pages: number }> = [];

  let total = ow.core_arc;
  contributors.push({ obligation: "Core arc (safe beginning + trigger + peak + tool + landing)", estimated_pages: ow.core_arc });

  const tsf = brief.therapeuticArchitecture.typeSpecificField;
  if (tsf.fieldType === "somatic_expression") {
    const n = tsf.selections.length;
    const add = n * ow.somatic_expression_each;
    total += add;
    contributors.push({
      obligation: `Somatic expressions (${n} × ${ow.somatic_expression_each} pages each)`,
      estimated_pages: add,
    });
  }

  if (brief.therapeuticArchitecture.supportingApproach) {
    total += ow.supporting_approach_selected;
    contributors.push({
      obligation: "Supporting approach selected",
      estimated_pages: ow.supporting_approach_selected,
    });
  }

  const shame = brief.therapeuticArchitecture.shameDimension;
  if (shame === "central") {
    total += ow.shame_central;
    contributors.push({ obligation: "Shame = Central", estimated_pages: ow.shame_central });
  } else if (shame === "present") {
    total += ow.shame_present;
    contributors.push({ obligation: "Shame = Present", estimated_pages: ow.shame_present });
  }

  const chars = brief.storyWorld.supportingCharacters ?? [];
  if (chars.length > 0) {
    const add = chars.length * ow.supporting_character_each;
    total += add;
    contributors.push({
      obligation: `Supporting characters (${chars.length} × ${ow.supporting_character_each} page each)`,
      estimated_pages: add,
    });
  }

  const cg = brief.storyWorld.caregiverPresence;
  if (cg === "leaves_and_returns") {
    total += ow.caregiver_leaves_and_returns;
    contributors.push({
      obligation: 'Caregiver = "Leaves and returns"',
      estimated_pages: ow.caregiver_leaves_and_returns,
    });
  } else if (cg === "waiting_at_the_end") {
    total += ow.caregiver_waiting_at_the_end;
    contributors.push({
      obligation: 'Caregiver = "Waiting at the end" (needs return scene)',
      estimated_pages: ow.caregiver_waiting_at_the_end,
    });
  }

  const nd = brief.storyWorld.narrativeDistance;
  if (nd === "parallel") {
    total += ow.narrative_distance_parallel;
    contributors.push({
      obligation: "Parallel narrative distance (world-building overhead)",
      estimated_pages: ow.narrative_distance_parallel,
    });
  } else if (nd === "metaphorical") {
    total += ow.narrative_distance_metaphorical;
    contributors.push({
      obligation: "Metaphorical narrative distance (symbolic mapping overhead)",
      estimated_pages: ow.narrative_distance_metaphorical,
    });
  }

  return { total, contributors };
}
