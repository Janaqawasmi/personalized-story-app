import type { AgeRange, StoryLength, StoryType, TherapeuticApproach } from "../../models/storyBrief.model";

export interface ApproachInstructionEntry {
  psychologistFacing: string;
  agentInstruction: string;
}

/**
 * Only Fear & Anxiety is populated in pilot; other story types will be added
 * once their approaches are defined in the brief spec and implemented.
 */
export interface ApproachInstructionsConfig extends Partial<Record<StoryType, Record<TherapeuticApproach, ApproachInstructionEntry>>> {
  fear_anxiety: Record<TherapeuticApproach, ApproachInstructionEntry>;
}

export interface ObligationTierConfig {
  label: string;
  description: string;
  elements: string[];
}

export interface ObligationTiersConfig {
  tier_1: ObligationTierConfig;
  tier_2: ObligationTierConfig;
  tier_3: ObligationTierConfig;
  tier_4: ObligationTierConfig;
  agent_instruction: string;
  output_metadata_requirement: string;
}

export interface BudgetWeightsConfig {
  obligationWeights: {
    core_arc: number;
    somatic_expression_each: number;
    supporting_approach_selected: number;
    shame_central: number;
    shame_present: number;
    supporting_character_each: number;
    caregiver_leaves_and_returns: number;
    caregiver_waiting_at_the_end: number;
    narrative_distance_parallel: number;
    narrative_distance_metaphorical: number;
  };
  ageMultipliers: Record<AgeRange, number>;
  pageBudgets: Record<AgeRange, Record<StoryLength, [number, number]>>;
}

