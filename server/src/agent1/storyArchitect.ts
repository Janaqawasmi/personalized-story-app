import Anthropic from "@anthropic-ai/sdk";

import type { Agent1StoryBriefPayload } from "../models/storyBrief.schema";
import type { ApproachInstructionsConfig, ObligationTiersConfig } from "./config/types";
import { BRIEF_PRIORITY_RULES_MARKDOWN, formatStoryBriefAsMarkdown } from "./briefPromptSections";
import { readAgentJson } from "./loadJson";
import { OPUS_MODEL } from "./models";
import { loadPromptTemplate, substitutePlaceholders } from "./promptUtils";
import { StoryArchitectOutputSchema, type StoryArchitectOutput, type PreCheckResult } from "./types";

const approachInstructions: ApproachInstructionsConfig = readAgentJson("config/approachInstructions.json");
const obligationTiers: ObligationTiersConfig = readAgentJson("config/obligationTiers.json");

/** Few-shot bank (deterministic lookup; spec cold-start when `entries` is empty). */
interface ExampleBankEntry {
  storyType: string;
  ageRange: string;
  emotional_truth: string;
  blueprint_points: string[];
}

interface ExampleBank {
  entries: ExampleBankEntry[];
}

const exampleBank: ExampleBank = readAgentJson("examples/bank.json");

function formatFewShotFromBank(brief: Agent1StoryBriefPayload, coldStartFallback: string): string {
  const matches = exampleBank.entries.filter(
    (e) => e.storyType === brief.storyType && e.ageRange === brief.ageAndScope.ageRange,
  );
  if (matches.length === 0) {
    return coldStartFallback;
  }
  return matches
    .map((e, i) => {
      const pts = e.blueprint_points.map((p, j) => `${j + 1}. ${p}`).join("\n");
      return `### Example ${i + 1}\nEmotional truth:\n${e.emotional_truth}\n\nBlueprint:\n${pts}`;
    })
    .join("\n\n");
}

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for Agent 1");
  }
  return new Anthropic({ apiKey: key });
}

/** JSON Schema for Story Architect tool output (matches `StoryArchitectOutputSchema`). */
const STORY_ARCHITECT_INPUT_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  properties: {
    emotional_truth: { type: "string" },
    blueprint_points: {
      type: "array",
      items: { type: "string" },
      minItems: 6,
      maxItems: 6,
    },
    coping_tool_placement_note: { type: "string" },
    approach_instruction: { type: "string" },
    inferred_intention_flag: { type: ["string", "null"] },
    compression_metadata: { type: ["string", "null"] },
  },
  required: [
    "emotional_truth",
    "blueprint_points",
    "coping_tool_placement_note",
    "approach_instruction",
    "inferred_intention_flag",
    "compression_metadata",
  ],
};

const STORY_ARCHITECT_TOOL: Anthropic.Tool = {
  name: "emit_story_architect_output",
  description: "Emit structured Story Architect outputs per DAMMAH Agent 1 spec v3 §5.3",
  input_schema: STORY_ARCHITECT_INPUT_SCHEMA,
};

function extractStoryArchitectToolInput(content: Anthropic.Messages.ContentBlock[]): unknown {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "emit_story_architect_output") {
      return block.input;
    }
  }
  throw new Error("No emit_story_architect_output tool_use in model response");
}

function formatComplexityStatusForArchitect(preCheck: PreCheckResult): string {
  if (!preCheck.complexity_budget.overloaded) {
    return "";
  }
  const { total_estimated_pages, available_pages } = preCheck.complexity_budget;
  return `COMPLEXITY STATUS: This brief's narrative obligations exceed the selected story length. Total estimated page cost: ${total_estimated_pages.toFixed(1)} pages. Available: ${available_pages.min}–${available_pages.max} pages. Follow the narrative obligation tiers (provided below) to make compression decisions.`;
}

function buildRuntimeAppendix(brief: Agent1StoryBriefPayload, preCheck: PreCheckResult): string {
  if (brief.storyType !== "fear_anxiety") {
    throw new Error(`Pilot Agent 1 only supports story_type "fear_anxiety" (got ${brief.storyType})`);
  }

  const primary = brief.therapeuticArchitecture.primaryApproach;
  const supporting = brief.therapeuticArchitecture.supportingApproach;
  const primaryEntry = approachInstructions.fear_anxiety[primary];
  const supportingEntry = supporting !== undefined ? approachInstructions.fear_anxiety[supporting] : undefined;

  const coldStartBlueprints = `
No approved examples yet. Standards:
- Each blueprint point must be specific enough to visualize
- Emotional truth must convey felt experience, not clinical summary
- At least one structural surprise
- Coping tool must have a clear, concrete moment
`.trim();

  const complexity = formatComplexityStatusForArchitect(preCheck);

  return `
## Full brief (structured)
${formatStoryBriefAsMarkdown(brief)}

## NARRATIVE OBLIGATION TIERS (JSON)
${JSON.stringify(obligationTiers as ObligationTiersConfig, null, 2)}

## HOW THE PRIMARY APPROACH WORKS IN NARRATIVE (brief spec §13)
Psychologist-facing (primary): ${primaryEntry.psychologistFacing}

Agent instruction (primary):
${primaryEntry.agentInstruction}

${
  supportingEntry
    ? `## Supporting approach (brief spec §13)
Psychologist-facing: ${supportingEntry.psychologistFacing}
Agent instruction: ${supportingEntry.agentInstruction}`
    : ""
}

## Complexity budget status
${complexity || "(No complexity overload warning — design without forced compression.)"}

## Priority rules (brief spec §14)
${BRIEF_PRIORITY_RULES_MARKDOWN}

## Few-shot blueprint examples
${formatFewShotFromBank(brief, coldStartBlueprints)}

## Pre-check result (JSON)
${JSON.stringify(preCheck, null, 2)}
`.trim();
}

export async function runStoryArchitect(
  brief: Agent1StoryBriefPayload,
  preCheck: PreCheckResult,
): Promise<StoryArchitectOutput> {
  const base = loadPromptTemplate("storyArchitect");
  const appendix = buildRuntimeAppendix(brief, preCheck);
  const userContent = substitutePlaceholders(base, { RUNTIME_APPENDIX: appendix });

  const client = getAnthropicClient();

  const runOnce = async (userText: string): Promise<StoryArchitectOutput> => {
    const response = await client.messages.create({
      model: OPUS_MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: userText }],
      tools: [STORY_ARCHITECT_TOOL],
      tool_choice: { type: "tool", name: "emit_story_architect_output" },
    });
    const raw = extractStoryArchitectToolInput(response.content);
    return StoryArchitectOutputSchema.parse(raw);
  };

  try {
    return await runOnce(userContent);
  } catch (first) {
    const msg = first instanceof Error ? first.message : String(first);
    return await runOnce(
      `${userContent}\n\nYour previous structured output failed validation or parsing. Fix and try again. Error: ${msg}`,
    );
  }
}
