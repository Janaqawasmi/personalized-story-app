# Model File Reference

**Audience:** Anyone writing branch logic, prompt templates, or tests in Agent 1.
**Authoritative source:** `server/src/models/storyBrief.model.ts` (server) and `client/src/types/storyBrief.ts` (client mirror — identical for tokens).
**Purpose:** Single page that lists every constant and token Agent 1 imports. If Agent 1 code disagrees with this page, Agent 1 is wrong. If this page disagrees with the model file, the model file is right.

---

## The anti-drift rule

Agent 1 has exactly one rule for staying in sync with the model file:

> **Every conditional branch in every prompt template uses a token comparison against an enum imported from the model file. CI fails if any token in a branch does not exist in the corresponding enum.**

The CI gate lives in `__tests__/token-discipline.test.ts`. It uses TypeScript's type system at runtime (via `as const` assertions) plus a small static-analysis pass over the prompt template files. If you add a branch on `caregiverPresence === "guides_from_side"` (note: missing `the`), the test fails with a precise error pointing at the file and line.

This is the only thing standing between you and the silent drift that broke the v3.1 audit. Don't disable it.

---

## Constants Agent 1 imports (and never duplicates)

These are exported from the model file. Import them. Do not redefine them anywhere in `server/src/agent1/`.

### Structural parameters

```typescript
import { STRUCTURAL_PARAMS } from "@/models/storyBrief.model";

// Usage:
const params = STRUCTURAL_PARAMS["3-5"]["standard"];
// {
//   pages: [8, 12],
//   sentencesPerPage: [2, 3],
//   wordsPerSentence: [8, 12],
//   totalWords: [300, 450],
// }
```

12 entries: 4 age ranges × 3 story lengths. Used by:

- `step2-author/prompt-sections/section-e-structural-params.ts` to fill the target word/page ranges in the Author prompt.
- `step2-author/output-parser.ts` to compute word-count drift.
- `pre-check/complexity-budget.ts` to read the available page range.

**Do not redefine this table in Agent 1.** v3.1 §11 originally restated it; v3.2 explicitly removes the duplicate and tells you to import.

### Complexity budget weights

```typescript
import {
  OBLIGATION_WEIGHTS,
  AGE_WEIGHT_MULTIPLIERS,
} from "@/models/storyBrief.model";

// Usage:
const baseline = OBLIGATION_WEIGHTS.coreArc + 2 * OBLIGATION_WEIGHTS.somaticExpressionEach;
const adjusted = baseline * AGE_WEIGHT_MULTIPLIERS["3-5"];
```

Used by `pre-check/complexity-budget.ts`. Do not redefine.

### Cross-field validations

```typescript
import { CROSS_FIELD_VALIDATIONS } from "@/models/storyBrief.model";

// Usage:
const acknowledged = brief.acknowledgedWarnings ?? [];
const descriptions = acknowledged.map((id) => {
  const validation = CROSS_FIELD_VALIDATIONS.find((v) => v.id === id);
  return validation?.description ?? `(unknown validation: ${id})`;
});
```

Stable IDs (do not invent new ones; do not rename):

```
relational_tool_no_responder         (hard_block)
significant_intensity_young_age      (hard_warning)
graduated_exposure_comforting_caregiver (hard_warning)
conflicting_approach_pair            (soft_warning)
self_regulation_comforting_caregiver (soft_warning)
shame_central_no_normalization       (soft_warning)
separation_anxiety_no_caregiver      (soft_warning)
abstract_tool_young_age              (soft_warning)
cognitive_reframing_young_age        (soft_warning)
```

Used by `step1-architect/prompt-sections/section-c-clinical-brief.ts` to render the "acknowledged risk combinations" block.

### Story type routing

```typescript
import { STORY_TYPE_ROUTING } from "@/models/storyBrief.model";

// SAFE — pre-fill defaults for the brief UI:
const defaults = STORY_TYPE_ROUTING.fear_anxiety.mustNeverDefaults;

// CRITICAL BUG — never use this in Agent 1:
// const list = STORY_TYPE_ROUTING[storyType].mustNeverDefaults;
// In the Author prompt, the must-never list is the psychologist's
// FINAL EDITED list, which is brief.therapeuticArchitecture.mustNeverList.
```

The routing config also exports `approaches`, `typeSpecificFieldType`, `copingTools`, `resolutionDefault`, and `personalizationDefault` per type. Agent 1 uses this only as a sanity reference. The brief itself carries the operative values.

### Field registry

```typescript
import { FIELD_REGISTRY } from "@/models/storyBrief.model";
```

Used by tests and tooling that walk the brief structure programmatically. Not used directly in prompt templates.

### Char limits and max selections

```typescript
import { CHAR_LIMITS, MAX_SELECTIONS } from "@/models/storyBrief.model";
```

Used by `pre-check/quality-gate.ts` for the "thin field" thresholds (which are *stricter* than the brief UI nudges — see `prompts/step1-story-architect.md` Section A and the pre-check docs).

---

## Exact token vocabulary

This is the complete enum vocabulary Agent 1 branches against. **Copy from this list when writing branches. Do not retype tokens from memory.**

### Story type (pilot guard only)

```
"fear_anxiety"
```

(Only one supported in v1.0. Other values cause `UnsupportedStoryTypeError` at brief load.)

### Age range — note hyphen, not underscore

```
"3-5"
"5-7"
"7-9"
"9-12"
```

### Peak intensity

```
"very_gentle"
"moderate"
"significant"
```

### Story length

```
"short"
"standard"
"extended"
```

### Therapeutic approach (Fear & Anxiety only in pilot)

```
"normalization"
"cognitive_reframing"
"graduated_exposure"
"modeling"
"reassurance_predictability"      ← note: no "and"
"self_regulation"
"psychoeducation"
```

### Shame dimension

```
"not_significant"
"present"
"central"
```

### Somatic expression

```
"freezing_going_still"
"crying_clinging"
"stomach_ache_feeling_sick"
"heart_racing_cant_breathe"
"restless_fidgety"
"going_quiet_shutting_down"
"tension_clenching"
"sweating_feeling_hot"
```

### Coping tool (Fear & Anxiety only in pilot)

```
"deep_breathing"
"counting"
"grounding_through_senses"
"positive_self_talk"
"visualization"
"routine_awareness"
"safe_person"
"comfort_object_or_memory"
"asking_for_help"
```

**Useful subsets:**

- **Relational tools** (require a responder — used by the C-1 hard block):
  ```
  ["asking_for_help", "safe_person"]
  ```
- **Abstract tools** (translate to physical action for ages 3–5):
  ```
  ["routine_awareness", "visualization", "positive_self_talk"]
  ```

### Resolution completeness — note short form

```
"full"
"partial"
"open"
```

### Protagonist gender

```
"boy"
"girl"
"kept_open"
```

Field is **optional** on `StoryWorld` — only present when `personalization === false`. Branch on it only inside an `if personalization === false` block.

### Protagonist type

```
"child"
"animal"
"fantasy"
```

When `personalization === true`, this field is locked to `"child"`.

### Protagonist age

```
"same_age"
"slightly_older"
```

Field is **optional** on `StoryWorld` — only present when `personalization === false`. Same rule as gender.

### Caregiver presence — note `_the_` in two of these

```
"present_and_comforting"
"guides_from_the_side"            ← "the"
"leaves_and_returns"
"waiting_at_the_end"              ← "the"
"not_present"
```

### Narrative distance

```
"direct"
"parallel"
"metaphorical"
```

### Supporting character type

```
"peer_shows_possible"
"peer_alongside"
"teacher_adult_guides"
"animal_friend"
"sibling_perspective"
```

**Useful subset — characters that can respond** (used by the relational-tool hard block and the Modeling fallback):

```
["teacher_adult_guides", "peer_shows_possible"]
```

---

## Field paths (camelCase, nested under section objects)

The model file groups fields under section interfaces, not as flat properties. When writing prompt templates, use the full path. Common paths:

```
brief.storyType
brief.ageAndScope.ageRange
brief.ageAndScope.peakIntensity
brief.ageAndScope.storyLength
brief.clinicalFoundation.population
brief.clinicalFoundation.trigger
brief.clinicalFoundation.therapeuticIntention.feel
brief.clinicalFoundation.therapeuticIntention.because
brief.clinicalFoundation.creativeVision
brief.clinicalFoundation.oneTrueThing
brief.therapeuticArchitecture.primaryApproach
brief.therapeuticArchitecture.supportingApproach
brief.therapeuticArchitecture.shameDimension
brief.therapeuticArchitecture.typeSpecificField  // discriminated union, narrow before use
brief.therapeuticArchitecture.copingTool
brief.therapeuticArchitecture.resolutionCompleteness
brief.therapeuticArchitecture.mustNeverList
brief.storyWorld.personalization
brief.storyWorld.protagonistType
brief.storyWorld.protagonistGender              // optional
brief.storyWorld.protagonistAge                 // optional
brief.storyWorld.caregiverPresence
brief.storyWorld.narrativeDistance
brief.storyWorld.parallelChallenge              // optional
brief.storyWorld.supportingCharacters           // optional, array
brief.storyWorld.characterNotes                 // optional
brief.personalizationConfig.whyNot              // optional, only if personalization === false
brief.acknowledgedWarnings                      // optional, top-level on StoryBrief
```

---

## Narrowing the discriminated union

`TypeSpecificClinicalField` is a discriminated union by `fieldType`. For pilot v1.0, only `"somatic_expression"` is in scope. Always narrow before accessing:

```typescript
import type {
  TypeSpecificClinicalField,
  SomaticExpressionField,
} from "@/models/storyBrief.model";
import { TypeMismatchError } from "./errors";

export function assertSomaticField(
  field: TypeSpecificClinicalField,
): SomaticExpressionField {
  if (field.fieldType !== "somatic_expression") {
    throw new TypeMismatchError(field.fieldType);
  }
  return field;
}
```

This helper lives in `shared/token-helpers.ts`. Use it everywhere you need somatic data.

---

## Optional fields — guarding against undefined

The following fields are `T | undefined` on `StoryBrief`. Always guard before using:

```
clinicalFoundation.oneTrueThing
therapeuticArchitecture.supportingApproach
therapeuticArchitecture.typeSpecificField.freeText  (after narrowing)
storyWorld.protagonistGender
storyWorld.protagonistAge
storyWorld.parallelChallenge
storyWorld.supportingCharacters
storyWorld.characterNotes
personalizationConfig.whyNot
acknowledgedWarnings
```

The exhaustiveness test in CI builds a synthetic brief with each optional field undefined and asserts the prompt builder produces a valid prompt with no `"undefined"` literal in the output.

---

## When the model file changes

The model file is owned by the brief schema, not Agent 1. When tokens change there:

1. Update this page first.
2. Run the token-discipline test. It will fail with a list of every prompt branch that needs updating.
3. Update each prompt section file flagged by the test.
4. Update any test fixtures that reference the old token.
5. Run the full test suite.
6. If any change is to a value Agent 1 reads from a non-token field (e.g., a new option in `OBLIGATION_WEIGHTS`), check `pre-check/complexity-budget.ts` and `step1-architect/prompt-sections/section-d-obligation-tiers.ts` for assumptions.

The token-discipline test makes the second step automatic. The rest is manual. There is no shortcut.
