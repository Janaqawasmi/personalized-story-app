# 02 — Data Contracts

**Audience:** Anyone reading or writing data crossing a module boundary.
**Authoritative:** Yes for everything inside `server/src/agent1/`. Not authoritative for `StoryBrief` itself — see the model file.

---

## Overview

Agent 1 has four data boundaries that matter:

1. **Input from the caller** — `briefId` (string) plus optional `feedback`.
2. **Input loaded from Firestore** — `StoryBrief` (typed by `server/src/models/storyBrief.model.ts`).
3. **Inter-step boundaries** — `PreCheckResult`, `Step1Output`, `Step2Output`, `PostValidationResult`. These never leave the agent.
4. **Output to the caller** — `Agent1Result`. This is the contract the specialist UI consumes.

Every type below is normative. If you find yourself wanting to add a field, add it here first, then add it to the code, then add a test.

---

## Imports from the model file

Agent 1 imports the following types and constants. Do not redefine any of these.

```typescript
import type {
  StoryBrief,
  StoryType,
  AgeRange,
  PeakIntensity,
  StoryLength,
  TherapeuticApproach,
  FearAnxietyApproach,
  ShameDimension,
  SomaticExpression,
  SomaticExpressionField,
  CopingTool,
  ResolutionCompleteness,
  ProtagonistGender,
  ProtagonistType,
  ProtagonistAge,
  CaregiverPresence,
  NarrativeDistance,
  SupportingCharacterType,
  SupportingCharacterSelection,
  TherapeuticIntention,
  TypeSpecificClinicalField,
  CrossFieldValidation,
} from "@/models/storyBrief.model";

import {
  STRUCTURAL_PARAMS,
  OBLIGATION_WEIGHTS,
  AGE_WEIGHT_MULTIPLIERS,
  CROSS_FIELD_VALIDATIONS,
  STORY_TYPE_ROUTING,
  FIELD_REGISTRY,
  CHAR_LIMITS,
  MAX_SELECTIONS,
} from "@/models/storyBrief.model";
```

Full enumeration of the tokens these types resolve to is in `types/model-file-reference.md`.

---

## 1. Input from the caller

```typescript
interface GenerateOptions {
  retryPolicy?: RetryPolicy;
  feedback?: RerunFeedback;
}

interface RetryPolicy {
  /** Default: 1. The number of times to retry Step 1 if parsing fails. */
  step1IncoherentRetries: number;
  /** Default: 0. We never retry Step 2 on word-count drift; we flag and proceed. */
  step2WordCountRetries: 0;
}

interface RerunFeedback {
  rerunOf: string;             // generationId of the previous attempt
  approvedParts: ApprovedPart[];
  feedbackText: string;
  previousOutput: Agent1Result;
}

type ApprovedPart =
  | "emotionalTruth"
  | "blueprint"
  | "approachInstruction"
  | "story";
```

---

## 2. Input loaded from Firestore

`StoryBrief` is defined in `server/src/models/storyBrief.model.ts`. Agent 1 does not redefine it. Agent 1 enforces three runtime assertions before doing anything else:

```typescript
function loadAndAssertBrief(briefId: string): Promise<StoryBrief> {
  const brief = await firestoreReadBrief(briefId);

  // Pilot guards
  if (brief.status !== "submitted") {
    throw new BriefNotReadyError(brief.status);
  }
  if (brief.storyType !== "fear_anxiety") {
    throw new UnsupportedStoryTypeError(brief.storyType);
  }
  if (
    brief.therapeuticArchitecture.typeSpecificField.fieldType !==
    "somatic_expression"
  ) {
    throw new TypeMismatchError(
      brief.therapeuticArchitecture.typeSpecificField.fieldType,
    );
  }

  return brief;
}
```

The third check exists because `TypeSpecificClinicalField` is a discriminated union. The TypeScript compiler cannot prove the brief contains a `SomaticExpressionField` from `storyType` alone, so we narrow at runtime.

---

## 3. Inter-step boundaries

### 3.1 PreCheckResult

```typescript
interface PreCheckResult {
  qualityGate: QualityGateResult;
  vagueIntention: VagueIntentionResult;
  complexityBudget: ComplexityBudgetResult;
  /** Aggregated for the specialist UI. Empty array if all clean. */
  warnings: PreCheckWarning[];
}

interface QualityGateResult {
  creativeVisionThin: boolean;       // < 50 chars
  triggerThin: boolean;              // < 80 chars
  intentionThin: boolean;            // < 30 chars in `because` half
}

interface VagueIntentionResult {
  isVague: boolean;
  matchedPattern?: string;           // present iff isVague
}

interface ComplexityBudgetResult {
  totalPageCost: number;             // weighted sum after age multiplier
  availablePageRange: [number, number];
  state: "green" | "yellow" | "red";
  /** Per-obligation breakdown for the UI. */
  contributions: Array<{
    obligation: string;
    cost: number;
  }>;
  /** Only when state is "yellow" or "red". The text passed into Step 1's complexity status. */
  complexityStatusText?: string;
}

interface PreCheckWarning {
  code: string;                      // e.g. "creative_vision_thin"
  message: string;                   // human-readable for the specialist
  severity: "info" | "warn";
}
```

### 3.2 Step1Output

```typescript
interface Step1Output {
  // Always present
  emotionalTruth: string;            // 60–120 words; ends with "By the end, this child needs to feel ___."
  blueprint: BlueprintPoint[];       // exactly 6 points
  copingToolPlacement: string;       // 1–2 sentences
  approachInstruction: string;       // 2–4 sentences, plain language

  // Conditional
  inferredIntention?: InferredIntention;
  compressionMetadata?: CompressionMetadata;
  characterNotesContradictions?: ContradictionFlag[];

  // Provenance (filled by output-parser, not the model)
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
}

interface BlueprintPoint {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;                      // 1–3 sentences, density proportional to narrative weight
}

interface InferredIntention {
  feel: string;
  because: string;
  reason: string;                    // why the model inferred this
}

interface CompressionMetadata {
  fullyIncluded: string[];           // labels of obligations included as planned
  compressed: Array<{
    obligation: string;
    how: string;                     // narrative explanation of the compression
  }>;
  omitted: Array<{
    obligation: string;
    why: string;
  }>;
}

interface ContradictionFlag {
  contradictedField: string;         // e.g. "caregiverPresence"
  contradictingPhrase: string;       // the snippet from characterNotes that conflicts
  resolution: string;                // human-readable: "structured field used"
}
```

### 3.3 Step2Output

```typescript
interface Step2Output {
  title: string;
  story: string;                     // full prose draft
  wordCount: number;                 // computed by the parser
  targetWordRange: [number, number]; // copied from STRUCTURAL_PARAMS for transparency
  wordCountDrift: "within_range" | "under" | "over"; // ±30% threshold

  // Provenance
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
}
```

### 3.4 PostValidationResult

```typescript
interface PostValidationResult {
  result: "PASS" | "FLAGS";
  flags: PostValidationFlag[];       // empty if PASS
  alignmentNote: string;             // 2–3 sentences

  // Provenance
  rawResponse: string;
  promptHash: string;
  llmCallRecord: LLMCallRecord;
}

interface PostValidationFlag {
  checkType: "must_never" | "shame_handling" | "coping_tool" | "age_appropriateness";
  /** ID or index pointing back to the constraint. For must_never: the index in the brief's mustNeverList. */
  constraintIdOrIndex: string | number;
  /** ≤15 words, quoted from the draft. */
  passage: string;
  reasoning: string;
  severity: "likely_violation" | "borderline_specialist_review";
}
```

---

## 4. Output to the caller

```typescript
interface Agent1Result {
  // Identifier
  generationId: string;              // uuid v4

  // Step 1 outputs
  emotionalTruth: string;
  blueprint: BlueprintPoint[];
  copingToolPlacement: string;
  approachInstruction: string;
  inferredIntention?: InferredIntention;
  compressionMetadata?: CompressionMetadata;
  characterNotesContradictions?: ContradictionFlag[];

  // Step 2 outputs
  title: string;
  story: string;
  wordCount: number;
  targetWordRange: [number, number];
  wordCountDrift: "within_range" | "under" | "over";

  // Step 3 outputs
  alignmentNote: string;
  postValidationFlags: PostValidationFlag[];

  // Pre-check warnings (passed through for the UI)
  preCheckWarnings: PreCheckWarning[];

  // Few-shot status
  exampleBankStatus: "examples_used" | "cold_start_no_examples";

  // Rerun context
  rerunCount: number;                // 0 for first generation, 1 or 2 for reruns
  rerunOf?: string;

  // Telemetry
  totalLatencyMs: number;
  llmCalls: LLMCallRecord[];         // one per LLM invocation; 3 for a clean run
  generatedAt: string;               // ISO timestamp
}
```

---

## 5. Shared types

```typescript
interface LLMCallRecord {
  step: "step1_architect" | "step2_author" | "step3_post_validation";
  model: string;                     // exact model string passed to the SDK
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  attempt: number;                   // 1 for first attempt, 2 for retry
  promptHash: string;                // sha256 of the assembled prompt for debugging
}

class BriefNotReadyError extends Error {
  constructor(public readonly status: string) {
    super(`Brief is not ready for generation. Current status: ${status}`);
  }
}

class UnsupportedStoryTypeError extends Error {
  constructor(public readonly storyType: string) {
    super(`Story type "${storyType}" is not supported in pilot v1.0. Only fear_anxiety is supported.`);
  }
}

class TypeMismatchError extends Error {
  constructor(public readonly fieldType: string) {
    super(`Expected typeSpecificField.fieldType "somatic_expression", got "${fieldType}".`);
  }
}

class Step1IncoherentError extends Error {
  constructor(public readonly attempts: number, public readonly lastRawResponse: string) {
    super(`Step 1 produced incoherent output after ${attempts} attempts.`);
  }
}
```

---

## 6. The discriminated union — how to access typeSpecificField

```typescript
import type { TypeSpecificClinicalField, SomaticExpressionField } from "@/models/storyBrief.model";

// WRONG — TypeScript will refuse this:
// const selections = brief.therapeuticArchitecture.typeSpecificField.selections;

// RIGHT — narrow first, then access:
function getSomaticField(
  field: TypeSpecificClinicalField,
): SomaticExpressionField {
  if (field.fieldType !== "somatic_expression") {
    throw new TypeMismatchError(field.fieldType);
  }
  return field;
}

// In the prompt builder:
const somatic = getSomaticField(brief.therapeuticArchitecture.typeSpecificField);
const firstExpression = somatic.selections[0];     // Tier 1
const secondExpression = somatic.selections[1];    // Tier 3, may be undefined
const freeText = somatic.freeText;                 // optional
```

`shared/token-helpers.ts` exports `getSomaticField` and the equivalent narrow guards. Use those, not inline checks.

---

## 7. Schema versioning

This is v1.0. When the schema changes:

1. Bump `Agent1Result.schemaVersion` (a new field — not present in v1.0 because there is no prior version to disambiguate from).
2. Update the parser to handle both versions for at least one release.
3. Update the specialist UI in lockstep.

For v1.0 there is no `schemaVersion` field. The implicit version is 1. The first time we change the shape, we add the field with default value `2` and start the migration.

---

## 8. What is *not* in the data contract

- **Prompts.** Prompts are not data; they are templates that consume data. See `prompts/`.
- **Few-shot examples.** Stored as JSON files in `examples/`, loaded at process start. Their shape is documented in `examples/README.md` (the file inside the agent1 directory) and is internal — they are never returned to the caller.
- **LLM raw responses.** The parser strips them out of the public API. They live in `LLMCallRecord.promptHash` for replay-ability and in logs for debugging, but they are not part of `Agent1Result`.
