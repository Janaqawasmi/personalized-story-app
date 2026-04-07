import Anthropic from "@anthropic-ai/sdk";

import type { Agent1StoryBriefPayload } from "../models/storyBrief.schema";
import {
  AGE_RANGE_LABELS,
  FEAR_ANXIETY_COPING_TOOL_LABELS,
  PEAK_INTENSITY_LABELS,
  RESOLUTION_LABELS,
  SHAME_DIMENSION_LABELS,
  SOMATIC_EXPRESSION_LABELS,
} from "../models/storyBrief.model";
import { SONNET_MODEL } from "./models";
import { loadPromptTemplate, substitutePlaceholders } from "./promptUtils";
import { PostValidationResultSchema, type AuthorOutput, type PostValidationResult, type StoryArchitectOutput } from "./types";

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for Agent 1");
  }
  return new Anthropic({ apiKey: key });
}

const POST_VALIDATION_INPUT_SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["pass", "flagged"] },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          check: {
            type: "string",
            enum: ["must_never", "shame", "coping_tool", "age_appropriateness"],
          },
          passage: { type: "string" },
          reasoning: { type: "string" },
          severity: { type: "string", enum: ["likely_violation", "borderline"] },
        },
        required: ["check", "passage", "reasoning", "severity"],
      },
    },
    alignment_note: { type: "string" },
  },
  required: ["status", "flags", "alignment_note"],
};

const POST_VALIDATION_TOOL: Anthropic.Tool = {
  name: "emit_post_validation_result",
  description: "Structured post-validation result per DAMMAH Agent 1 spec v3 §7.3",
  input_schema: POST_VALIDATION_INPUT_SCHEMA,
};

function extractToolInput(content: Anthropic.Messages.ContentBlock[]): unknown {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "emit_post_validation_result") {
      return block.input;
    }
  }
  throw new Error("No emit_post_validation_result tool_use in model response");
}

function formatSomaticList(brief: Agent1StoryBriefPayload): string {
  const tsf = brief.therapeuticArchitecture.typeSpecificField;
  if (tsf.fieldType !== "somatic_expression") {
    return "(non-somatic field type)";
  }
  return tsf.selections.map((s) => SOMATIC_EXPRESSION_LABELS[s]).join(", ");
}

function buildPostValidationBody(
  brief: Agent1StoryBriefPayload,
  author: AuthorOutput,
  architect: StoryArchitectOutput,
): string {
  const mustNever = brief.therapeuticArchitecture.mustNeverList.map((x, i) => `${i + 1}. ${x}`).join("\n");
  const shame = brief.therapeuticArchitecture.shameDimension;
  const shameLabel = SHAME_DIMENSION_LABELS[shame];
  const copingName = FEAR_ANXIETY_COPING_TOOL_LABELS[brief.therapeuticArchitecture.copingTool];
  const resolution = RESOLUTION_LABELS[brief.therapeuticArchitecture.resolutionCompleteness];
  const sig = formatResolutionSignatureLine(brief);

  return `
You are a clinical safety reviewer. Two jobs: check hard constraints,
write an alignment note.

NOT judging quality. NOT judging whether the story lectures.
Checking specific rules and providing a clinical read.

THE STORY:
${author.title}

${author.story}

===== PART 1: CONSTRAINT CHECK =====

1. MUST-NEVER LIST:
${mustNever}
Violations? Quote passage (max 15 words), name the rule.

2. SHAME HANDLING:
${shameLabel} (${shame})
${shame === "central" ? `Check all three rules — (1) not alone demonstrated, (2) no implication of should-have-known, (3) witnessing character responds with acceptance not correction.` : ""}
${shame === "present" ? `Is protagonist observed in their shame?` : ""}

3. COPING TOOL:
Tool: ${copingName}. Should appear at emotional peak.
Present? Shown in action or explained/named?

4. AGE APPROPRIATENESS:
Age: ${AGE_RANGE_LABELS[brief.ageAndScope.ageRange]}. Intensity: ${PEAK_INTENSITY_LABELS[brief.ageAndScope.peakIntensity]}.
Any scene exceeds specified intensity?

Somatic context (for review): ${formatSomaticList(brief)}

OUTPUT:
Use semantic checks (must_never, shame, coping_tool, age_appropriateness). Severity must be exactly "likely_violation" or "borderline".

===== PART 2: ALIGNMENT NOTE =====

2–3 sentences. What therapeutic mechanism is embodied. Where the
coping tool appears. What the emotional arc achieves.

Resolution type: ${resolution}
Expected signature: ${sig}
Approach instruction: ${architect.approach_instruction}

Describe what you see, not what should be there.
`.trim();
}

function formatResolutionSignatureLine(brief: Agent1StoryBriefPayload): string {
  const r = brief.therapeuticArchitecture.resolutionCompleteness;
  if (r === "full") return "relief, accomplishment, safety restored";
  if (r === "partial") return "cautious hope — tool helped but feeling lingers gently";
  return "something new — journey unfinished";
}

export async function runPostValidation(
  brief: Agent1StoryBriefPayload,
  author: AuthorOutput,
  architect: StoryArchitectOutput,
): Promise<PostValidationResult> {
  const body = buildPostValidationBody(brief, author, architect);
  const header = loadPromptTemplate("postValidation");
  const userContent = substitutePlaceholders(header, { RUNTIME_APPENDIX: body });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: userContent }],
    tools: [POST_VALIDATION_TOOL],
    tool_choice: { type: "tool", name: "emit_post_validation_result" },
  });

  const raw = extractToolInput(response.content);
  return PostValidationResultSchema.parse(raw);
}
