# Step 2 — Author Prompt

**Audience:** Anyone touching `step2-author/prompt-builder.ts` or any file in `step2-author/prompt-sections/`.
**Model:** Claude Opus (latest available).
**Output target:** `Step2Output` from `02-data-contracts.md`.

---

## What this prompt does

The Author writes the story. It receives the Step 1 outputs (blueprint, emotional truth, coping tool placement note, approach instruction) plus selected raw fields from the brief. It produces a title and a complete prose draft.

The Author **never** receives:

- The therapeutic approach token (`primaryApproach`, `supportingApproach`)
- The therapeutic intention text (it lives in the emotional truth and the blueprint)
- The story type label
- The priority rules (those are resolved in Step 1)
- Acknowledged warnings (resolved in Step 1)
- Complexity budget calculations (the consequence — compression metadata — is what flows in)

This separation is the entire reason Agent 1 has two LLM steps. Clinical labels in the Author's context produce compliance prose. Removing them frees the model to write a story, not check a list.

---

## What the Author *does* receive verbatim from the brief

Four blocks of raw psychologist-written text:

1. **`clinicalFoundation.creativeVision`** — the image at the center. Already known to be high-priority from Step 1's planning, but the Author needs the original words.
2. **`clinicalFoundation.oneTrueThing`** — observed in real children, woven into character texture.
3. **`clinicalFoundation.population`** — the emotional world of the population. Source for the protagonist's inner voice.
4. **`clinicalFoundation.trigger`** — the specific trigger. Source for the trigger scene.

The blueprint compresses these for planning. The Author also gets the raw text so the sensory and emotional texture is preserved. This is the "verbatim source-detail blocks" decision (D6 in `00-overview.md`).

---

## Prompt structure

Ten sections, assembled in this order:

| Section | File | Purpose |
|---|---|---|
| A | `section-a-identity-one-rule.ts` | Identity statement and the one rule |
| B | `section-b-source-details.ts` | Verbatim source-detail blocks |
| C | `section-c-blueprint.ts` | Step 1 outputs: emotional truth, blueprint, coping tool note, approach instruction |
| D | `section-d-bodys-language.ts` | Somatic expression rendering |
| E | `section-e-structural-params.ts` | Age range, story length, intensity, resolution, caregiver, narrative distance, personalization, supporting characters, character notes |
| F | `section-f-pacing.ts` | The pacing principle |
| G | `section-g-obligation-tiers.ts` | Tier reminders + compression metadata if any |
| H | `section-h-hard-constraints.ts` | Must-never list + shame rules |
| I | `section-i-few-shot.ts` | One example story or cold-start fallback |
| J | `section-j-output-format.ts` | What to produce |

The builder is a pure function: `(brief, step1Output) → string`. Fully unit-testable.

---

## Section A — Identity and the One Rule

```
You are the author of a therapeutic children's story.
You write from a narrative blueprint designed by a story architect.

THE ONE RULE:
The therapeutic message must be felt, never stated.
Never lecture the child. Never explain the lesson. Never have a
character say what the child should learn. The message lives in
what happens — not in what anyone says about what happens.

Trust the child. They know.
```

Static section. No data interpolation.

---

## Section B — The Heart of the Story (verbatim source details)

```
THE IMAGE AT THE CENTER:
"{clinicalFoundation.creativeVision}"

Build the story around this. The reader should remember this
moment most vividly.
```

Then conditionally:

```
{if clinicalFoundation.oneTrueThing is present:
  AND SOMETHING REAL:
  "{clinicalFoundation.oneTrueThing}"

  A real detail observed in real children. Find where it belongs
  and let it live there without explanation.}
```

Then the two new source-detail blocks:

```
SOURCE DETAIL FOR THE EMOTIONAL VOICE:
The psychologist's description of this population's emotional world.
The emotional truth paragraph (in the next section) summarizes this
for planning; the words below are the operative source for the
protagonist's inner voice.

"{clinicalFoundation.population}"

SOURCE DETAIL FOR THE TRIGGER SCENE:
The psychologist's exact description of the trigger moment. Use the
language and sensory details below when writing the trigger scene;
the blueprint compresses this for planning purposes but the words
below are the operative source.

"{clinicalFoundation.trigger}"
```

**Critical framing rule:** these blocks are presented as *operative source*, not as a checklist. The model is told explicitly: the blueprint summarizes; the raw text below is what to write *from*. This framing prevents the Author from treating the blocks as four boxes to tick.

---

## Section C — The Blueprint

```
EMOTIONAL TRUTH:
{step1Output.emotionalTruth}

NARRATIVE BLUEPRINT:
1. {blueprint[0].text}
2. {blueprint[1].text}
3. {blueprint[2].text}
4. {blueprint[3].text}
5. {blueprint[4].text}
6. {blueprint[5].text}

COPING TOOL:
{step1Output.copingToolPlacement}
The coping tool is {therapeuticArchitecture.copingTool}. Show it
happening. Do not name it.
```

Then conditionally on the coping tool token:

```
{if copingTool === "comfort_object_or_memory":
  This recalls another person's presence — a physical object for
  younger children, a memory or internalized voice for older
  children. It is NOT self-generated encouragement.}
```

Then the approach instruction (plain language, no clinical terms):

```
HOW THE APPROACH WORKS IN THIS STORY:
{step1Output.approachInstruction}
```

---

## Section D — The Body's Language

```
This child's anxiety lives in their body as:
- {somatic.selections[0]}
{if somatic.selections[1] is present: - {somatic.selections[1]}}
{if somatic.freeText: - free text: "{somatic.freeText}"}

Show the body. The reader should feel it physically.
```

Then conditionally on narrative distance:

```
{if narrativeDistance === "metaphorical":
  Translate these somatic experiences into the metaphorical world —
  the sensation should feel equivalent even if the body is different.}
```

---

## Section E — Structural Parameters

```
AGE RANGE: {ageAndScope.ageRange}
STORY LENGTH: {ageAndScope.storyLength}

Target word count: {STRUCTURAL_PARAMS[ageRange][storyLength].totalWords[0]}–{STRUCTURAL_PARAMS[ageRange][storyLength].totalWords[1]}
Target page count: {STRUCTURAL_PARAMS[ageRange][storyLength].pages[0]}–{STRUCTURAL_PARAMS[ageRange][storyLength].pages[1]}

Write to the word range. A shorter story that works is better
than a longer story that drifts.
```

`STRUCTURAL_PARAMS` is imported from `server/src/models/storyBrief.model.ts`. Do not duplicate the table.

Then the age-derived writing rules. This section reads from `getAgeRangeRules(ageRange)` — a helper that returns the brief Section 11 block for the given age token. Implementation lives in `shared/age-range-rules.ts` and is generated from brief Section 11 verbatim.

```
VOCABULARY AND COMPLEXITY:
{getAgeRangeRules(ageRange)}
```

Then peak intensity, resolution, caregiver, narrative distance, personalization, supporting characters, character notes — branching on tokens:

```
PEAK EMOTIONAL INTENSITY: {ageAndScope.peakIntensity}
{if peakIntensity === "very_gentle":
  Protagonist feels uneasy; discomfort is brief.}
{if peakIntensity === "moderate":
  Real distress within a contained arc.}
{if peakIntensity === "significant":
  Genuinely overwhelmed before resolution.}

RESOLUTION: {therapeuticArchitecture.resolutionCompleteness}
{if resolutionCompleteness === "full":
  Relief, accomplishment, safety restored. Ends on a high.}
{if resolutionCompleteness === "partial":
  Cautious hope — tool helped but feeling lingers gently.
  Ends warm but honest.}
{if resolutionCompleteness === "open":
  Something new — tool, friend, understanding — but journey
  unfinished. Courage without certainty. Ends looking forward.}

CAREGIVER: {storyWorld.caregiverPresence}
{if caregiverPresence === "present_and_comforting":
  In the story, actively warm.}
{if caregiverPresence === "guides_from_the_side":
  Helps, but protagonist does the hard part.}
{if caregiverPresence === "leaves_and_returns":
  The caregiver departs and comes back. Show both the goodbye and
  the reunion. The leaving is part of the story.}
{if caregiverPresence === "waiting_at_the_end":
  Exists in the world but not the immediate scene. Protagonist
  knows they are there.}
{if caregiverPresence === "not_present":
  No caregiver. Protagonist navigates alone.}

NARRATIVE DISTANCE: {storyWorld.narrativeDistance}
{if narrativeDistance === "direct":
  Same setting, same challenge, recognizable world.}
{if narrativeDistance === "parallel":
  Different setting, same emotional core.
  {if storyWorld.parallelChallenge is present:
    Equivalent challenge: "{storyWorld.parallelChallenge}"}}
{if narrativeDistance === "metaphorical":
  Symbolic. Challenge never named directly.}

PERSONALIZATION: {storyWorld.personalization}
{if personalization === true:
  Use [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders
  throughout. Write gender-neutral narrative — gender is filled in
  at personalization time, not now.}
{if personalization === false:
  protagonistType: {storyWorld.protagonistType}
  protagonistGender: {storyWorld.protagonistGender}
  protagonistAge: {storyWorld.protagonistAge}
  {if protagonistGender === "kept_open":
    Use the character's name; avoid pronouns. No they/them when
    ageRange is "3-5" or "5-7".}
  {if protagonistAge === "slightly_older":
    1–2 years older than the target age. Relatable but slightly
    more capable.}}
```

Supporting characters and character notes:

```
{if supportingCharacters is non-empty:
  SUPPORTING CHARACTERS:
  {for each character:
    - {character.type}
      {if character.functionalRole is present:
        At the key moment: "{character.functionalRole}"}}}

{if storyWorld.characterNotes is present:
  CHARACTER NOTES: {storyWorld.characterNotes}
  These add texture only. They do not override structured selections.}
```

---

## Section F — Pacing Principle

```
The emotional peak and the coping tool scene are the heart of this
story. They should receive the most narrative space. If the opening
takes more than a few sentences, you started too far back. Do not
rush the resolution — difficulty must feel real before the shift
feels earned.
```

Static section. The blueprint density (from Step 1) is the second pacing signal — the Author reads denser blueprint points as scenes that deserve more prose.

---

## Section G — Narrative Obligation Tiers

Conditional on whether Step 1 produced compression metadata:

```
{if step1Output.compressionMetadata is present:
  SPACE CONSTRAINTS:
  The story architect noted the following compression decisions:

  Fully included:
  {for each item: - {item}}

  Compressed:
  {for each item: - {item.obligation}: {item.how}}

  Omitted:
  {for each item: - {item.obligation}: {item.why}}

  Honor these decisions. Do not attempt to restore omitted elements.
  Focus your craft on the elements that remain.}
```

Then always include the priority tier reminder:

```
PRIORITY TIERS:
If you find the story growing beyond the target word count, follow
these priorities:

Tier 1 (non-negotiable scenes): trigger, first somatic expression,
  coping tool in action, resolution
Tier 2 (must appear, can compress): primary approach arc, caregiver
  role, shame rules if central, first supporting character's
  functional role (when provided)
Tier 3 (include if space permits): supporting approach, supporting
  characters, second somatic expression, one true thing
Tier 4 (enrichment only): creative vision as set piece, character
  notes details, second character's functional role

Never flatten a Tier 1 element for a Tier 3 element.
```

---

## Section H — Hard Constraints

```
WHAT THIS STORY MUST NEVER DO:
{therapeuticArchitecture.mustNeverList joined with newlines as a numbered list}
```

**Critical implementation note:** The list above is `brief.therapeuticArchitecture.mustNeverList`. **Never** read from `STORY_TYPE_ROUTING[storyType].mustNeverDefaults` to populate this section. That constant holds the *pre-fill defaults* the brief UI uses to seed a fresh form. The psychologist may have removed items from it deliberately. Sending the defaults instead of the final edited list reverses the psychologist's clinical judgment and is a critical bug.

The integration test in `__tests__/step2-author/must-never-source.test.ts` asserts this: it constructs a brief where `mustNeverList` is shorter than the defaults, runs the prompt builder, and asserts the prompt contains exactly the items in `mustNeverList` and none of the removed defaults.

Then shame rules:

```
SHAME RULES:
{therapeuticArchitecture.shameDimension}
{if shameDimension === "present":
  Never put protagonist in position of being observed in their shame.}
{if shameDimension === "central":
  (1) Story demonstrates child is not alone in this feeling.
  (2) Never implies child should have known/done/felt differently.
  (3) At least one character witnesses the protagonist's difficulty
      and responds with acceptance, not correction.}

These constraints are absolute.
```

---

## Section I — Few-Shot Example

```
{if exampleBank has a story example for this ageRange:
  One approved story matched to this brief's age range and clinical
  profile. Study prose quality, pacing, coping tool presentation,
  body language. Do not imitate — match the standard.

  {storyExample.text}}

{if no example available (cold-start fallback):
  Standards: specificity, restraint, concrete detail, coping tool
  shown not named, body experience specific to provided expressions.}
```

The `{storyType}` token is **not** interpolated here. The Author never sees the story type label.

---

## Section J — Output Format

```
1. TITLE
A title a child would be drawn to. Not clinical, not cute.
On its own line, prefixed with "TITLE:".

2. STORY
Complete text. No headers. No chapter breaks unless ageRange is
"9-12" and storyLength is "extended".
{if personalization === true:
  Use [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders
  throughout. Do not insert any actual name.}

Output format:
TITLE: <title here>

<story text here>
```

---

## Output parsing

The parser splits on the first line that matches `^TITLE:\s*` and treats everything before as preamble (discarded with a warning) and everything after as `{ title, story }`. The story body starts at the first non-empty line after the title.

Word count is computed by the parser using a simple whitespace tokenizer (matches the heuristic the brief uses for `STRUCTURAL_PARAMS.totalWords`). Drift is computed against the target range:

- `within_range`: word count is between `min - 30%` and `max + 30%`
- `under`: below `min - 30%`
- `over`: above `max + 30%`

Drift outside the ±30% band is flagged but does not trigger a retry. The story is returned to the specialist with a note in `Agent1Result.wordCountDrift`.

---

## How to add or modify a prompt section

Same workflow as Step 1 — see `step1-story-architect.md` last section.

Plus one Step 2-specific rule: if you add a new conditional that branches on `caregiverPresence`, `narrativeDistance`, `protagonistGender`, `protagonistAge`, or `resolutionCompleteness`, double-check that you covered every value in the corresponding model file enum. CI runs an exhaustiveness test that builds a synthetic brief for each combination and asserts the resulting prompt is non-empty and free of the literal string `"undefined"`.
