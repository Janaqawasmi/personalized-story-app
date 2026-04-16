# Test Strategy

**Audience:** Anyone writing tests for Agent 1 or evaluating whether a change is safe to ship.
**Scope:** What to test, how to test it, what "good output" looks like, the golden-pair process.

---

## The four layers of testing

Agent 1 is tested at four layers. Each layer catches a different class of bug.

| Layer | What it catches | Where it runs | Speed |
|---|---|---|---|
| 1. Type discipline | Token drift, missing imports, enum exhaustiveness | CI, every commit | <5s |
| 2. Unit tests | Pure-function bugs, parser edge cases | CI, every commit | <30s |
| 3. Integration tests | Module composition bugs, fixture-driven flows | CI, every commit | 1–3 min |
| 4. Golden pair evaluation | Clinical quality, real Opus calls | Manual, before release | 5–15 min |

Layers 1–3 must pass before merge. Layer 4 runs before each release.

---

## Layer 1 — Type discipline

The non-negotiable foundation. These tests don't test logic; they test that the code is internally consistent with the model file. They are the entire reason audit drift didn't blow up the v3.1 spec when actual tokens turned out different from illustrative ones.

### 1.1 Token discipline test

`__tests__/token-discipline.test.ts`. See `types/model-file-reference.md` for the rule.

Implementation sketch:

```typescript
import * as model from "@/models/storyBrief.model";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const PROMPT_DIRS = [
  "step1-architect/prompt-sections",
  "step2-author/prompt-sections",
  "step3-post-validation",
];

const ENUMS_BY_NAME = {
  AGE_RANGES: model.AGE_RANGES,
  PEAK_INTENSITIES: model.PEAK_INTENSITIES,
  STORY_LENGTHS: model.STORY_LENGTHS,
  FEAR_ANXIETY_APPROACHES: model.FEAR_ANXIETY_APPROACHES,
  SHAME_DIMENSIONS: model.SHAME_DIMENSIONS,
  SOMATIC_EXPRESSIONS: model.SOMATIC_EXPRESSIONS,
  FEAR_ANXIETY_COPING_TOOLS: model.FEAR_ANXIETY_COPING_TOOLS,
  RESOLUTION_OPTIONS: model.RESOLUTION_OPTIONS,
  PROTAGONIST_GENDERS: model.PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES: model.PROTAGONIST_TYPES,
  PROTAGONIST_AGES: model.PROTAGONIST_AGES,
  CAREGIVER_PRESENCES: model.CAREGIVER_PRESENCES,
  NARRATIVE_DISTANCES: model.NARRATIVE_DISTANCES,
  SUPPORTING_CHARACTER_TYPES: model.SUPPORTING_CHARACTER_TYPES,
};

const ALL_VALID_TOKENS = new Set(Object.values(ENUMS_BY_NAME).flat());

test("every snake_case literal in prompt sections is a valid token", () => {
  const violations: Array<{ file: string; token: string; line: number }> = [];

  for (const dir of PROMPT_DIRS) {
    for (const file of walkTsFiles(dir)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        // Match double-quoted snake_case literals on the line (excluding comments)
        const matches = line.match(/"([a-z][a-z0-9_]*)"/g) ?? [];
        for (const match of matches) {
          const token = match.slice(1, -1);
          // Heuristic: snake_case literals 4+ chars long that look like tokens
          if (token.length >= 4 && token.includes("_") && !ALL_VALID_TOKENS.has(token)) {
            violations.push({ file, token, line: i + 1 });
          }
        }
      });
    }
  }

  expect(violations).toEqual([]);
});
```

The test is deliberately pessimistic — it flags anything that looks like a token. False positives can be allow-listed via inline comments (`// allow-token: my_string`) but should be rare.

### 1.2 Model imports test

`__tests__/model-imports.test.ts`. Asserts every constant Agent 1 expects is exported from the model file.

```typescript
import * as model from "@/models/storyBrief.model";

test("model file exports all required constants", () => {
  const required = [
    "STRUCTURAL_PARAMS",
    "OBLIGATION_WEIGHTS",
    "AGE_WEIGHT_MULTIPLIERS",
    "CROSS_FIELD_VALIDATIONS",
    "STORY_TYPE_ROUTING",
    "FIELD_REGISTRY",
    "CHAR_LIMITS",
    "MAX_SELECTIONS",
  ];
  for (const name of required) {
    expect(model).toHaveProperty(name);
  }
});
```

### 1.3 Exhaustiveness tests

For every prompt section that branches on an enum, an exhaustiveness test builds a synthetic brief for each value of the enum and asserts the section produces non-empty output containing no `"undefined"` literal.

Example for Section E (caregiver branch):

```typescript
import { CAREGIVER_PRESENCES } from "@/models/storyBrief.model";
import { buildSectionECaregiverBlock } from "../section-e-structural-params";
import { makeFixtureBrief } from "../../../__fixtures__/brief-builder";

test.each(CAREGIVER_PRESENCES)("section E renders for caregiverPresence=%s", (caregiver) => {
  const brief = makeFixtureBrief({ storyWorld: { caregiverPresence: caregiver } });
  const output = buildSectionECaregiverBlock(brief);
  expect(output).not.toContain("undefined");
  expect(output.length).toBeGreaterThan(20);
});
```

This catches the case where a developer adds a new enum value to the model file without updating the prompt section.

---

## Layer 2 — Unit tests

Pure-function tests for everything under `pre-check/`, `shared/`, and the parsers in each step directory.

### 2.1 Pre-check unit tests

Already covered in `operations/build-plan.md` Phase 2. Twelve fixture briefs covering all four age ranges, all three lengths, both shame levels above background, and both complexity-budget triggering states.

### 2.2 Shared helper tests

- `assertSomaticField` — pass with valid somatic field, throws for each non-somatic discriminated union variant.
- `isRelationalCopingTool`, `isAbstractCopingTool`, `canRespondCharacterType` — test against every value in the relevant enum.
- `getApproachInstruction` — returns non-empty string for all 7 approaches; returns the same string twice for the same input (deterministic).
- `getAgeRangeRules` — returns non-empty string for all 4 age ranges; verifies key phrases from brief Section 11 are present.

### 2.3 Parser unit tests

Each step has a parser. Each parser gets a fixture set:

**Step 1 parser fixtures:**
- Clean response with all 4 always-present outputs.
- Clean response with the conditional inferred intention flag.
- Clean response with compression metadata.
- Clean response with character notes contradictions.
- Clean response with all three conditionals at once.
- Malformed: emotional truth missing the required ending pattern.
- Malformed: 5 blueprint points instead of 6.
- Malformed: 7 blueprint points instead of 6.
- Malformed: missing approach instruction section entirely.

**Step 2 parser fixtures:**
- Clean response with TITLE marker.
- Clean response, word count exactly at lower bound.
- Clean response, word count exactly at upper bound.
- Clean response, word count 25% under (still within ±30%).
- Clean response, word count 50% under (drift = "under").
- Clean response, word count 50% over (drift = "over").
- Malformed: missing TITLE marker (parser should soft-handle).

**Step 3 parser fixtures:**
- Clean PASS with alignment note.
- Clean response with single FLAG.
- Clean response with three FLAGs.
- Clean response with FLAG before alignment note.
- Clean response with alignment note before PASS.
- Malformed: missing alignment note (soft-fail).
- Malformed: missing both PASS and FLAG (soft-fail).

---

## Layer 3 — Integration tests

Test the composition of modules. The LLM is stubbed in these tests — they test wiring, not creative output.

### 3.1 Pipeline integration test

`__tests__/pipeline.test.ts`. Stubs `llm-client` to return canned responses. Asserts:

- A clean brief produces a clean `Agent1Result` with all expected fields.
- A brief with an overloaded complexity budget produces a result with `compressionMetadata` populated.
- A brief with `acknowledgedWarnings` produces a Step 1 prompt that contains the acknowledged warnings block.
- A brief with personalization OFF produces a Step 1 prompt that includes the gender and age-relation fields.
- A brief with `coping_tool === "comfort_object_or_memory"` produces both Step 1 and Step 2 prompts that include the comfort-object distinction note.

### 3.2 Must-never source test (critical)

`__tests__/step2-author/must-never-source.test.ts`. The single most important test in the suite.

```typescript
test("Author prompt uses brief.therapeuticArchitecture.mustNeverList, not STORY_TYPE_ROUTING.mustNeverDefaults", () => {
  const brief = makeFixtureBrief({
    therapeuticArchitecture: {
      mustNeverList: ["Custom rule from psychologist"],
    },
  });

  const prompt = buildAuthorPrompt(brief, fixtureStep1Output);

  // The custom rule must be present
  expect(prompt).toContain("Custom rule from psychologist");

  // None of the default rules should leak through
  for (const defaultRule of STORY_TYPE_ROUTING.fear_anxiety.mustNeverDefaults) {
    expect(prompt).not.toContain(defaultRule);
  }
});
```

If this test ever turns red, do not ship. The bug it catches reverses psychologists' clinical decisions.

### 3.3 Token-comparison branch tests

For every conditional in every prompt section, a test that exercises both branches with appropriate fixtures. If a section has 5 enum values, write 5 test cases.

This sounds tedious. It is. It is also how you catch subtle bugs like "the `guides_from_the_side` branch has a typo and renders nothing." The exhaustiveness tests in Layer 1 catch some of these; the integration tests in Layer 3 catch the rest.

---

## Layer 4 — Golden pair evaluation

The clinical quality bar.

### 4.1 What golden pairs are

From brief Section 22: three psychologist-written brief-story pairs the clinical team produces before Agent 1 development begins. Each pair is:

- A complete, valid `StoryBrief` (filled in by a psychologist)
- A complete, finished story (written by the same psychologist) that meets DAMMAH's clinical and literary standards

The three pairs cover:

1. **Direct narrative, personalized, ages 3–5.** Example: bathroom anxiety. Straightforward, somatic, concrete coping tool.
2. **Parallel narrative, fixed protagonist (animal), ages 5–7.** Example: separation anxiety. Emotional depth, caregiver arc, relational coping.
3. **Direct narrative, personalized, ages 7–9.** Example: fear of mistakes. Cognitive reframing, more complex emotional pacing.

(Ages 9–12 has no golden pair at launch — see the cold-start gap notice in `00-overview.md`.)

The pairs serve two purposes simultaneously: they are the few-shot examples the agent retrieves at generation time, AND they are the quality benchmark for evaluating agent output.

### 4.2 The acceptance test

After Phase 7 of the build plan, run this test before declaring v1.0 ready to ship:

1. Take each golden pair brief (the three from Section 22).
2. Run `generateStoryDraft(briefId)` with each.
3. Compare the agent's output to the gold-standard story side-by-side.
4. Have the clinical team review.

The clinical team rates each output on a 5-point scale across these dimensions:

- **Coping tool delivery** — Is the coping tool shown in action at the emotional peak, not named or explained? (1 = explained didactically, 5 = embodied perfectly)
- **Therapeutic mechanism embodiment** — Does the story arc actually do what the chosen approach says it should do? (1 = no, 5 = yes, perfectly)
- **Somatic mirroring** — Does the protagonist's body experience match the somatic field? (1 = absent, 5 = vivid and specific)
- **Emotional truth** — Does the emotional truth paragraph capture what the psychologist meant? (1 = misses entirely, 5 = exactly right)
- **Prose quality** — Is the writing at the standard of a published children's book? (1 = clearly AI, 5 = indistinguishable from a skilled author)
- **Resolution honesty** — Does the resolution match the chosen completeness level (full/partial/open)? (1 = wrong type, 5 = exactly right)
- **Lecturing** — Does the story avoid lecturing the child? (1 = full lecture, 5 = trusts the child completely)

**Acceptance threshold for v1.0 ship:** average score of 3.5+ across all dimensions across all 3 pairs, with no dimension below 3 on any pair.

### 4.3 What to do if the test fails

If the average is below 3.5 or any single dimension is below 3 on any pair:

1. Identify which dimension(s) failed.
2. Map each failed dimension to the prompt section most likely responsible:
   - Coping tool delivery → Step 2 Section C (the coping tool block) and the blueprint
   - Mechanism embodiment → Step 1 Section C (approach instruction generation) and the few-shot examples
   - Somatic mirroring → Step 2 Section D (body's language)
   - Emotional truth → Step 1 Section E (output format) and the few-shot examples
   - Prose quality → Step 2 Section A (the one rule), Section F (pacing), and the few-shot examples
   - Resolution honesty → Step 1 Section C (resolution emotional signature) and Step 2 Section E
   - Lecturing → Step 2 Section A (the one rule) and the few-shot examples
3. Tune the relevant section(s) and re-run the test.
4. If three rounds of tuning don't move the needle, the issue is upstream — either the brief itself is unclear or the example bank is too thin. Discuss with the clinical team.

### 4.4 What "good output" actually looks like

The clinical team is the ultimate judge, but here are the patterns to watch for:

**Good signs:**
- The protagonist's body is described in specific physical terms that match the somatic field exactly.
- The coping tool happens. The protagonist does the breathing or squeezes the stone or notices the pattern. No character says "you should try breathing."
- The fear is real. The story does not dismiss it or argue with it. The protagonist feels it.
- The resolution is emotionally honest. A "partial" resolution does not turn into a "full" resolution at the last page.
- The story would be readable to a child even without the therapeutic frame. It works as a story.

**Bad signs (regenerate or tune):**
- Any character explains the lesson out loud.
- The coping tool is mentioned but never shown.
- The fear vanishes too quickly or too completely.
- The prose has the rhythm of a "lesson" — short declarative sentences, abstract emotional vocabulary, neat morals.
- The protagonist's body is generic ("scared," "nervous") instead of specific.
- A `partial` resolution story ends with "and they were never afraid again."
- The story contradicts something in the must-never list.
- Personalized stories contain actual names instead of `[CHILD_NAME]` placeholders.

---

## Branch coverage targets

| Module | Coverage target | Why |
|---|---|---|
| `shared/` | ≥90% | Pure logic, easy to test |
| `pre-check/` | ≥95% | Pure logic, no LLM, fully deterministic |
| `step1-architect/output-parser.ts` | ≥90% | Critical path, must handle malformed responses |
| `step1-architect/prompt-sections/` | ≥80% | Each branch needs a fixture |
| `step2-author/output-parser.ts` | ≥90% | Same |
| `step2-author/prompt-sections/` | ≥80% | Same |
| `step3-post-validation/output-parser.ts` | ≥85% | Soft-fail paths reduce required coverage slightly |
| `pipeline.ts` | ≥75% | Orchestration, harder to test in isolation |

These are minimums, not targets. Aim higher where reasonable.

---

## What does NOT need a test

To keep the suite from becoming a tax:

- **Static prompt sections** (e.g., Section A of Step 1, the identity block). One snapshot test is enough; do not write per-line assertions.
- **The Anthropic SDK itself.** Trust it. Mock it in tests; don't test its behavior.
- **Firestore reads.** Mock the brief loader; don't run tests against a real database.
- **The few-shot example JSON files.** They are content, not code. The retriever is tested against fixtures.
- **Cost calculations.** Test the formula once; don't test against current API pricing because pricing changes.

---

## Running the tests

```bash
# Layer 1+2: type discipline + unit tests, fast
npm run test:fast

# Layer 3: integration tests with stubbed LLM
npm run test:integration

# All of the above
npm test

# Layer 4: golden pair evaluation against real LLM
# Requires ANTHROPIC_API_KEY in environment
npm run test:golden-pairs

# Coverage report
npm run test:coverage
```

CI runs `npm test` on every PR. `npm run test:golden-pairs` is run manually before each release.
