# Build Plan

**Audience:** The developer (or AI agent) implementing Agent 1 from scratch.
**Method:** Phased build, each phase has a clear deliverable and an acceptance gate that must pass before the next phase starts.
**Estimated total effort:** 4–6 working weeks for one engineer working with an AI pair.

---

## Phase 0 — Foundations (no agent code yet)

**Goal:** Make sure the model file is solid, the dev environment runs, and the anti-drift test exists *before* writing a single prompt.

**Deliverables:**

1. `server/src/models/storyBrief.model.ts` is finalized (already done — see uploaded model file).
2. Test infrastructure in place: vitest or jest, with TypeScript paths resolved.
3. `__tests__/token-discipline.test.ts` — the CI gate. This is a custom test that:
   - Walks every `.ts` file under `step1-architect/prompt-sections/`, `step2-author/prompt-sections/`, and `step3-post-validation/`.
   - Finds every string literal that looks like a token (snake_case, lowercase, alphanumeric).
   - Compares against the token unions exported from the model file.
   - Fails with a precise file/line/token report if any token in a prompt file does not exist in the corresponding enum.
4. `__tests__/model-imports.test.ts` — asserts the model file exports every constant Agent 1 plans to consume (`STRUCTURAL_PARAMS`, `OBLIGATION_WEIGHTS`, `AGE_WEIGHT_MULTIPLIERS`, `CROSS_FIELD_VALIDATIONS`, `STORY_TYPE_ROUTING`, `FIELD_REGISTRY`, `CHAR_LIMITS`, `MAX_SELECTIONS`).

**Acceptance gate:** Both tests run, both pass with an empty `prompt-sections/` directory (the token-discipline test must handle the empty case gracefully — that's what makes it useful from day one).

**Why first:** Every later phase will write code that risks drift. Having the test in place from day one means drift surfaces at the moment it happens, not weeks later when someone notices a subtle bug.

---

## Phase 1 — Shared utilities

**Goal:** Build the boring infrastructure that every later phase will depend on.

**Deliverables:**

1. `shared/llm-client.ts` — thin wrapper over the Anthropic SDK:
   - Accepts a model name, prompt string, and max_tokens.
   - Returns `{ text, inputTokens, outputTokens, latencyMs }`.
   - Handles transient errors with one retry on 5xx and rate-limit responses.
   - Logs every call to a per-process JSONL file in `logs/agent1-calls.jsonl` for replay-ability.
2. `shared/token-helpers.ts`:
   - `assertSomaticField(field)` — narrows the discriminated union, throws `TypeMismatchError` on mismatch.
   - `isRelationalCopingTool(tool): boolean` — checks against the relational subset.
   - `isAbstractCopingTool(tool): boolean` — checks against the abstract subset.
   - `canRespondCharacterType(type): boolean` — checks against `["teacher_adult_guides", "peer_shows_possible"]`.
3. `shared/approach-instructions.ts`:
   - `getApproachInstruction(approach: FearAnxietyApproach): string`.
   - Returns the **agent instruction** text from brief Section 13 (verbatim, hard-coded as a constant). Not the psychologist-facing definition.
   - Seven entries, one per Fear & Anxiety approach.
4. `shared/age-range-rules.ts`:
   - `getAgeRangeRules(age: AgeRange): string`.
   - Returns the brief Section 11 block for that age, hard-coded verbatim.
5. `shared/prompt-utils.ts`:
   - `joinList(items, sep)`, `numberedList(items)`, `conditionalBlock(condition, text)` — small helpers used by every prompt section to keep templating tidy.
6. Type definitions for everything in `02-data-contracts.md`. Recommended location: `types/index.ts` inside the agent1 directory.

**Tests:**

- Unit tests for each helper. Token helpers should test against every value of the relevant enum (8 caregiver tokens, 9 coping tools, etc.).
- `getApproachInstruction` should be tested for all 7 approaches.

**Acceptance gate:** Every shared helper has tests. Coverage on `shared/` is ≥90%.

---

## Phase 2 — Pre-check

**Goal:** Build the pre-check pipeline. No LLM calls. Fully testable in isolation.

**Deliverables:**

1. `pre-check/quality-gate.ts`:
   - Checks the three thresholds from `prompts/step1-story-architect.md` (creative vision <50, trigger <80, intention.because <30).
   - Returns `QualityGateResult`.
2. `pre-check/vague-intention.ts`:
   - Pattern list (the corrected list from the v3.1 token-correction patch, removing the "they are safe / they are loved" entry).
   - Returns `VagueIntentionResult`.
3. `pre-check/complexity-budget.ts`:
   - Imports `OBLIGATION_WEIGHTS`, `AGE_WEIGHT_MULTIPLIERS`, `STRUCTURAL_PARAMS` from the model file.
   - Sums weighted page costs for the brief.
   - Compares against the lower bound of the available page range.
   - Returns `ComplexityBudgetResult` with state, contributions, and complexity status text.
4. `pre-check/index.ts` — composes the three checks and assembles `PreCheckResult`.

**Tests:**

Build a fixture set of 12 briefs that exercise:

- All four age ranges
- All three story lengths
- Both shame=central and shame=present
- Briefs with 0, 1, and 2 supporting characters
- Briefs with caregiver=`leaves_and_returns` (highest-cost option)
- Briefs with `narrativeDistance=metaphorical` (also high-cost)
- Briefs with intentionally-thin creative fields (to trigger the quality gate)
- Briefs with vague intentions (to trigger the vague-intention detector)
- A brief that triggers the complexity-budget yellow state
- A brief that triggers red state

For each fixture, write a snapshot test that asserts the `PreCheckResult` matches the expected shape exactly.

**Acceptance gate:** All 12 fixtures pass. Coverage on `pre-check/` is ≥95% (it's pure logic; coverage should be high).

---

## Phase 3 — Step 1 (Story Architect)

**Goal:** Build the Story Architect prompt builder, output parser, and few-shot retriever.

**This is the largest phase.** It is broken into sub-phases by prompt section.

### 3a. Section A and Section B

- `step1-architect/prompt-sections/section-a-identity.ts` (static).
- `step1-architect/prompt-sections/section-b-creative-vision.ts` (handles oneTrueThing as conditional).
- Tests: snapshot tests for both sections against fixtures with and without `oneTrueThing`.

### 3b. Section C — the big one

This section has many sub-blocks. Implement them in this order:

1. Hard constraints block (must-never list, shame dimension with three-rule version).
2. Clinical core block (intention, primary approach, supporting approach, coping tool with conditionals).
3. Somatic expressions block (with `assertSomaticField`).
4. Approach instructions block (uses `getApproachInstruction` for primary and supporting).
5. Emotional world and trigger block (raw text passthrough).
6. Story world block — split into two sub-builders:
   - Personalization sub-block (gender and age-relation nested *inside* `personalization === false`).
   - Caregiver sub-block (with `leaves_and_returns` conditional plus separation-trigger fallback).
   - Narrative distance sub-block (with parallel sub-field handling).
   - Modeling fallback (the agent-side handling for missing model character).
   - Supporting characters sub-block (with Tier 2/Tier 4 distinction for first/second functional role).
   - Character notes sub-block.
7. Acknowledged warnings block (uses `CROSS_FIELD_VALIDATIONS`).
8. Priority rules block (all 7 tiers, static).

**Tests after each sub-block:** Snapshot test against a fixture that exercises the sub-block, plus an "exhaustiveness test" that builds a synthetic brief with every value of the relevant enum and asserts the output is non-empty and contains no `"undefined"` literal.

### 3c. Section D — obligation tiers

- `step1-architect/prompt-sections/section-d-obligation-tiers.ts`.
- Static tier list, plus conditional injection of complexity status from `preCheckResult`.
- Tests: snapshot with and without complexity status.

### 3d. Section E — output format

- `step1-architect/prompt-sections/section-e-output-format.ts`.
- Mostly static. Conditional anti-generic check at the bottom for `normalization + open`.
- Tests: snapshot.

### 3e. Section F — few-shot

- `step1-architect/few-shot-retriever.ts`:
  - Loads JSON files from `examples/{ageRange}/blueprint-*.json` at process start.
  - Caches in memory.
  - Returns up to 2 examples for a given `ageRange`. Returns empty array for `9-12` (no examples at launch — cold-start fallback).
- `step1-architect/prompt-sections/section-f-few-shot.ts`:
  - Renders the examples as a prompt block, or the cold-start fallback if empty.
- Tests: with examples present, with examples missing.

### 3f. Prompt builder + output parser + index

- `step1-architect/prompt-builder.ts` — composes the six sections.
- `step1-architect/output-parser.ts` — parses the LLM response into `Step1Output`. Permissive about whitespace, strict about the emotional truth ending pattern, the 6-point blueprint, and the conditional outputs.
- `step1-architect/index.ts` — `runStoryArchitect(brief, preCheckResult)`. Builds prompt, calls `llm-client`, parses, returns `Step1Output`. One retry on parse failure. Throws `Step1IncoherentError` on second failure.

**Tests:**

- Unit tests for the parser with hand-crafted response fixtures (clean response, response missing the emotional truth pattern, response with 5 blueprint points, response with conditional outputs).
- Integration test using a stubbed `llm-client` that returns a fixed response. Asserts `runStoryArchitect` produces the expected `Step1Output`.

**Acceptance gate:**

1. All section tests pass.
2. Token discipline test passes (every token used in any Step 1 section file exists in the model file).
3. The integration test produces a `Step1Output` with all 4 always-present fields populated.
4. Manual smoke test: invoke `runStoryArchitect` against a real Opus call with a hand-written brief fixture for ages 3–5 bathroom anxiety. The resulting blueprint should be specific, the emotional truth should end with the required sentence pattern, and the approach instruction should contain no clinical labels.

---

## Phase 4 — Step 2 (Author)

**Goal:** Build the Author prompt builder, output parser, and story example retriever.

### 4a. Sections A through F

Implement in order:

1. Section A — identity and the one rule (static).
2. Section B — verbatim source-detail blocks (creative vision, optional one true thing, population, trigger). **This is the most important section to get right.** The framing as "operative source, not checklist" is in the template; do not paraphrase it.
3. Section C — blueprint passthrough from Step 1 with the coping tool comfort-object conditional.
4. Section D — body's language with the metaphorical translation conditional.
5. Section E — structural parameters (uses `STRUCTURAL_PARAMS` and `getAgeRangeRules`), peak intensity, resolution, caregiver, narrative distance, personalization, supporting characters, character notes.
6. Section F — pacing principle (static).

### 4b. Sections G through J

7. Section G — obligation tier reminder, plus conditional compression metadata if Step 1 produced any.
8. Section H — must-never list and shame rules. **Critical:** the source is `brief.therapeuticArchitecture.mustNeverList`, never `STORY_TYPE_ROUTING.mustNeverDefaults`. Add the `must-never-source.test.ts` test described in `prompts/step2-author.md` Section H.
9. Section I — story example with no `storyType` interpolation.
10. Section J — output format.

### 4c. Builder, parser, retriever, index

- `step2-author/few-shot-retriever.ts` — same shape as Step 1 retriever, returns 1 story example.
- `step2-author/prompt-builder.ts`.
- `step2-author/output-parser.ts` — splits on the `TITLE:` line, computes word count, computes drift against `STRUCTURAL_PARAMS`.
- `step2-author/index.ts` — `runAuthor(brief, step1Output)`. Builds prompt, calls Opus, parses. No retry on word count drift.

**Tests:**

- Section snapshots for all 10 sections with realistic fixtures.
- The `must-never-source.test.ts` critical test.
- Parser tests for clean responses, missing TITLE marker, word counts at the boundaries of within_range / under / over.
- Integration test with stubbed LLM.
- Manual smoke test against a real Opus call with the same 3–5 bathroom anxiety fixture, plus a 5–7 separation animal fixture and a 7–9 fear-of-mistakes fixture.

**Acceptance gate:**

1. All section tests pass.
2. Token discipline test still passes.
3. The exhaustiveness test passes (every enum value combination produces a valid prompt).
4. The `must-never-source.test.ts` test passes.
5. Manual smoke tests produce stories that:
   - Hit the target word range
   - Show the coping tool in action (not named)
   - Contain no clinical labels
   - For personalized stories: contain `[CHILD_NAME]` and pronoun placeholders, no actual names

---

## Phase 5 — Step 3 (Post-Validation)

**Goal:** Build the post-validation prompt and parser. Smaller phase.

**Deliverables:**

1. `step3-post-validation/prompt-builder.ts` — single template, no section split.
2. `step3-post-validation/output-parser.ts` — small state machine that extracts PASS, FLAG blocks, and the alignment note.
3. `step3-post-validation/index.ts` — `runPostValidation(step2Output, brief)`. Calls Sonnet. Soft-fails on parser errors (returns PASS with empty flags and a system-warning alignment note).

**Tests:**

- Parser tests for: clean PASS, single FLAG, multiple FLAGs, missing alignment note, missing both PASS and FLAG.
- Integration test with a fixture story that contains a deliberate must-never violation (e.g., a story with a character saying "there's nothing to be scared of") and a fixture story that's clean. Assert the violator gets flagged.
- Calibration test: feed it 5 known-good stories and assert the dismissal rate is 0 (no false positives on stories that should be clean).

**Acceptance gate:** All tests pass. Smoke test against a real Sonnet call with a clean fixture story produces PASS and a sensible alignment note.

---

## Phase 6 — Pipeline orchestration and public API

**Goal:** Wire everything together. Add error handling. Ship a working `generateStoryDraft` function.

**Deliverables:**

1. `pipeline.ts` — orchestrates the full flow: load → pre-check → step 1 → step 2 → step 3 → assemble.
2. `index.ts` — public `generateStoryDraft` API.
3. Error class definitions (`BriefNotReadyError`, `UnsupportedStoryTypeError`, `TypeMismatchError`, `Step1IncoherentError`).
4. Rerun handling: if `feedback` option is present, the prompt builder injects the rerun block into Step 1 prompt.
5. Telemetry: every LLM call records into `LLMCallRecord`, attached to the final `Agent1Result`.

**Tests:**

- End-to-end test with all three LLM calls stubbed. Asserts the result shape is correct.
- End-to-end test with one LLM call returning malformed output. Asserts the right error is thrown.
- End-to-end test with feedback option. Asserts the Step 1 prompt contains the rerun block.

**Acceptance gate:**

1. All tests pass.
2. End-to-end smoke test against real LLM calls with all 3 golden-pair fixtures (see `testing/test-strategy.md`). The output should be coherent for all three.

---

## Phase 7 — Golden pairs and acceptance

**Goal:** Verify the agent against the 3 gold-standard brief-story pairs from brief Section 22.

This phase has no new code. It runs the agent against the gold standards and computes the gap between agent output and psychologist-written stories. The clinical team reviews.

If the gap is acceptable, ship. If not, tune prompts and re-run. See `testing/test-strategy.md` §3 for the full golden pair process.

---

## Dependency graph

```
Phase 0 (foundations)
   ↓
Phase 1 (shared utilities)
   ↓
Phase 2 (pre-check) ──────┐
   ↓                      │
Phase 3 (Step 1)          │
   ↓                      │
Phase 4 (Step 2)          │
   ↓                      │
Phase 5 (Step 3)          │
   ↓                      │
Phase 6 (pipeline) ←──────┘
   ↓
Phase 7 (golden pairs)
```

Pre-check can be built in parallel with Step 1 if you have two engineers, but Step 1 cannot start until Phase 1 is done because it depends on `shared/`.

---

## Out of plan (do not build in v1.0)

- Agent 2 (the targeted edit loop). Different module entirely; spec it after v1.0 is in production for at least 2 weeks.
- A prompt versioning system. Git history is the v1.0 versioning system.
- Analytics on flag dismissal rates. The data is logged; build the dashboard later.
- Multi-language adaptation. English-only prompts at launch; design considerations exist but no code.
- The few-shot example bank for ages 9–12. Cold-start fallback engages with a UI notice.
