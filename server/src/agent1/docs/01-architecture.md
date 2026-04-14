# 01 — Architecture

**Audience:** Developers about to add or modify code in `server/src/agent1/`.
**Prerequisite:** `00-overview.md`.

---

## Directory layout

```
server/src/agent1/
├── index.ts                          ← public API: generateStoryDraft(briefId)
├── pipeline.ts                       ← orchestrator: pre-check → step1 → step2 → post-val
│
├── pre-check/
│   ├── index.ts                      ← runPreCheck(brief)
│   ├── quality-gate.ts               ← creative-field thresholds
│   ├── vague-intention.ts            ← pattern matching on therapeuticIntention.because
│   └── complexity-budget.ts          ← weighted page-cost calculation (imports from model file)
│
├── step1-architect/
│   ├── index.ts                      ← runStoryArchitect(brief, preCheckResult)
│   ├── prompt-builder.ts             ← assembles the Step 1 prompt from sections
│   ├── prompt-sections/              ← one file per prompt section (A–F)
│   │   ├── section-a-identity.ts
│   │   ├── section-b-creative-vision.ts
│   │   ├── section-c-clinical-brief.ts
│   │   ├── section-d-obligation-tiers.ts
│   │   ├── section-e-output-format.ts
│   │   └── section-f-few-shot.ts
│   ├── output-parser.ts              ← parses LLM response into typed Step1Output
│   └── few-shot-retriever.ts         ← picks 2 blueprint examples by storyType + ageRange
│
├── step2-author/
│   ├── index.ts                      ← runAuthor(brief, step1Output)
│   ├── prompt-builder.ts             ← assembles the Step 2 prompt from sections
│   ├── prompt-sections/              ← Sections A–J
│   │   ├── section-a-identity-one-rule.ts
│   │   ├── section-b-source-details.ts
│   │   ├── section-c-blueprint.ts
│   │   ├── section-d-bodys-language.ts
│   │   ├── section-e-structural-params.ts
│   │   ├── section-f-pacing.ts
│   │   ├── section-g-obligation-tiers.ts
│   │   ├── section-h-hard-constraints.ts
│   │   ├── section-i-few-shot.ts
│   │   └── section-j-output-format.ts
│   ├── output-parser.ts              ← parses LLM response into { title, story }
│   └── few-shot-retriever.ts         ← picks 1 story example by storyType + ageRange
│
├── step3-post-validation/
│   ├── index.ts                      ← runPostValidation(step2Output, brief)
│   ├── prompt-builder.ts
│   └── output-parser.ts              ← parses into PostValidationResult
│
├── shared/
│   ├── llm-client.ts                 ← thin wrapper over Anthropic SDK with retry + logging
│   ├── token-helpers.ts              ← guards: assertSomaticField, assertFearAnxietyBrief
│   ├── approach-instructions.ts      ← maps approach token → agent-instruction text (brief §13)
│   └── prompt-utils.ts               ← string-template helpers, conditional block builders
│
├── examples/
│   ├── README.md                     ← curation rules
│   ├── 3-5/
│   │   ├── blueprint-01.json
│   │   ├── blueprint-02.json
│   │   └── story-01.json
│   ├── 5-7/
│   │   └── ... (same shape)
│   ├── 7-9/
│   │   └── ... (same shape)
│   └── 9-12/                         ← empty at launch; cold-start fallback engages
│       └── README.md                 ← explains the gap
│
├── docs/                             ← all the .md files referenced in the index
│   └── ... (see docs/agent1/README.md)
│
└── __tests__/
    ├── pre-check/
    ├── step1-architect/
    ├── step2-author/
    ├── step3-post-validation/
    ├── pipeline.test.ts              ← end-to-end with mocked LLM
    ├── token-discipline.test.ts      ← CI gate: every prompt branch token exists in model file
    └── golden-pairs/
        ├── 3-5-bathroom-anxiety.json
        ├── 5-7-separation-animal.json
        └── 7-9-fear-of-mistakes.json
```

---

## Module boundaries

The pipeline is a one-way dependency graph. Modules below depend on modules above; nothing depends downward.

```
                    index.ts (public API)
                          │
                          ▼
                     pipeline.ts
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
    pre-check/       step1-architect/  step2-author/
        │                 │                 │
        │                 ▼                 ▼
        │            shared/llm-client.ts ──┘
        ▼                 │
   complexity-budget      ▼
   imports from:      shared/approach-instructions.ts
   server/src/models/     │
   storyBrief.model.ts    ▼
                     server/src/models/storyBrief.model.ts
                     (the canonical source — never duplicated)
```

**Hard rules:**

- `pre-check/`, `step1-architect/`, `step2-author/`, and `step3-post-validation/` never import each other directly. They only communicate through `pipeline.ts`.
- Anything that needs a token value or a brief constant imports from `server/src/models/storyBrief.model.ts`. Period.
- `shared/llm-client.ts` is the only module that imports the Anthropic SDK. Wrap, don't sprinkle.
- Prompt sections are individual files because they are the most-edited surface area. One file per section keeps merges sane and lets a Cursor agent rewrite a single section without touching the rest.

---

## Public API

```typescript
// server/src/agent1/index.ts

export interface GenerateOptions {
  /** Optional override for retry behavior. Default: 1 retry on Step 1 incoherence. */
  retryPolicy?: RetryPolicy;
  /** Optional rerun feedback from a previous generation event. */
  feedback?: RerunFeedback;
}

export async function generateStoryDraft(
  briefId: string,
  options?: GenerateOptions,
): Promise<Agent1Result>;
```

That is the entire public surface. Nothing else is exported from `index.ts`. Internal modules are accessed via deep imports inside the agent1 directory only — never from outside.

---

## Runtime flow

1. **Entry.** Caller invokes `generateStoryDraft(briefId)`.
2. **Load.** `pipeline.ts` reads the brief from Firestore (the brief document, typed as `StoryBrief`). Asserts `status === "submitted"`. Asserts `storyType === "fear_anxiety"` (pilot guard). Asserts the discriminated `typeSpecificField.fieldType === "somatic_expression"`.
3. **Pre-check.** `runPreCheck(brief)` returns a `PreCheckResult` with three sub-results: `qualityGate`, `vagueIntention`, `complexityBudget`. None of these block by themselves at this stage — they produce a `complexityStatus` payload that flows into Step 1 and a list of pre-check warnings that flow to the specialist UI.
4. **Step 1 — Story Architect.** `runStoryArchitect(brief, preCheckResult)` builds the prompt, calls Opus, parses the response. Returns a typed `Step1Output`. If parsing fails, retry once. If still failing, throw `Step1IncoherentError` and surface to the specialist with an error message and a "Try again" button.
5. **Step 2 — Author.** `runAuthor(brief, step1Output)` builds the prompt (which includes the verbatim source-detail blocks for Fields 2.1 and 2.2), calls Opus, parses into `{ title, story }`. If word count is more than ±30% off the target range, flag but do not retry.
6. **Step 3 — Post-Validation.** `runPostValidation(step2Output, brief)` calls Sonnet, parses into `PostValidationResult`. If post-validation itself errors out, the story is still returned to the specialist with `postValidationFlags: []` and a system warning logged. Post-validation never blocks the specialist from seeing the draft.
7. **Assemble.** `pipeline.ts` assembles the `Agent1Result` and returns it.
8. **Persist.** The caller (the Express route or the queue worker) persists the result to Firestore under the brief document, increments the rerun counter if this was a rerun, and notifies the specialist UI.

---

## Reruns

Reruns are not a separate code path. They are a regular generation with an additional input block. The pipeline accepts a `feedback` option that includes:

- `rerunOf`: generationId of the previous attempt
- `approvedParts`: which Step 1 outputs the specialist kept (e.g., `["emotionalTruth"]`)
- `feedbackText`: free-form rejection reason
- `previousOutput`: the full prior `Agent1Result`

When `feedback` is present, the Step 1 prompt builder injects an additional section after Section A that says "this is a rerun; preserve approved parts and address the feedback below" with the previous output and feedback text. Approved parts are passed back into the new output unchanged unless the model determines they conflict with the new structure.

**Maximum 2 reruns per generation event** (so 3 total generations). After that, the UI shows "Consider revisiting the brief" and offers a path back to the brief editor.

---

## What runs where

| Concern | Runs in | Notes |
|---|---|---|
| Brief loading and validation | `pipeline.ts` | One DB read per generation event. No retries. |
| Token enforcement | `shared/token-helpers.ts` | Pure functions; no I/O. |
| LLM calls | `shared/llm-client.ts` | Single point of contact with the Anthropic SDK. Handles auth, retry on transient errors, cost tracking. |
| Few-shot retrieval | `step1-architect/few-shot-retriever.ts` and `step2-author/few-shot-retriever.ts` | File-system reads from `examples/`. Cached at process start. |
| Persistence | The caller, not Agent 1 | Agent 1 returns a `Agent1Result`. The route handler or queue worker writes it to Firestore. Keeps the agent stateless and easy to test. |

---

## What this directory does not do

- **No HTTP routing.** Agent 1 is invoked by a route handler in `server/src/routes/`, not the other way around.
- **No Firestore writes.** Agent 1 reads the brief once at the start and returns a result. The caller persists.
- **No queue management.** If you want to run Agent 1 from a queue, that lives in `server/src/queue/`.
- **No specialist UI.** Agent 1 returns a typed result. The React component that renders it lives in `client/src/components/specialist/draft-review/`.
- **No prompt versioning.** v1.0 has one version of each prompt template. When v2 ships, the prompt files in `step1-architect/prompt-sections/` get updated and the old version lives in git history.

---

## Where to start when implementing

Read `operations/build-plan.md`. It lists the phased build order, what each phase delivers, and what gates the next phase. The summary is:

1. Model file integration tests + token-discipline test (no agent code yet).
2. `shared/llm-client.ts` and `shared/approach-instructions.ts`.
3. `pre-check/` (no LLM, fully testable in isolation).
4. `step1-architect/` (one prompt section at a time, with tests after each).
5. `step2-author/`.
6. `step3-post-validation/`.
7. `pipeline.ts` and `index.ts`.
8. End-to-end test against the 3 golden pairs.
