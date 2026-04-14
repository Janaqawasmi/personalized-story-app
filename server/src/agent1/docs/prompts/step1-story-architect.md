# Step 1 — Story Architect Prompt

**Audience:** Anyone touching `step1-architect/prompt-builder.ts` or any file in `step1-architect/prompt-sections/`.
**Model:** Claude Opus (latest available).
**Output target:** `Step1Output` from `02-data-contracts.md`.

---

## What this prompt does

The Story Architect reads the full story brief and produces a planning artifact: an emotional truth paragraph, a 6-point narrative blueprint, a coping tool placement note, and a plain-language approach instruction. Conditionally, it also produces an inferred intention flag, compression metadata, and character notes contradictions.

The Story Architect is the only place in the pipeline that sees both the clinical labels (like the therapeutic approach token) **and** the creative material (like the creative vision text). It is the bridge that translates clinical language into narrative language. The Author never sees the clinical labels.

---

## Prompt structure

Six sections, assembled in this order:

| Section | File | Purpose |
|---|---|---|
| A | `section-a-identity.ts` | Identity statement and the list of outputs to produce |
| B | `section-b-creative-vision.ts` | The creative vision as seed; one true thing if present |
| C | `section-c-clinical-brief.ts` | All structured fields, conditional clinical instructions, priority rules |
| D | `section-d-obligation-tiers.ts` | The 4 tiers + complexity status if overloaded |
| E | `section-e-output-format.ts` | What to produce, in what shape, with what checks |
| F | `section-f-few-shot.ts` | 2 example blueprints or cold-start fallback |

The builder is a pure function that takes a `StoryBrief` plus a `PreCheckResult` and returns a string. It is fully unit-testable without an LLM.

---

## Section A — Identity

```
You are a story architect for therapeutic children's stories.
You receive a clinical brief written by a licensed child psychologist.
Your job: understand what this child is living through, then design
a story that will help them — not by teaching, but by letting them
feel understood.

You produce four things, plus three conditional outputs:
1. An emotional truth paragraph
2. A narrative blueprint (6 points)
3. A coping tool placement note
4. An approach instruction
5. (Conditional) An inferred intention flag
6. (Conditional) Compression metadata
7. (Conditional) Character notes contradictions
```

This section is static. It does not consume any brief data.

---

## Section B — Creative Vision as Seed

```
THE HEART OF THIS STORY:

The psychologist has seen something specific — one image, one moment,
one detail that is the emotional center of this story:

"{clinicalFoundation.creativeVision}"

This is not a detail to include. This is the seed the story grows from.
Your blueprint must be built around this image. The emotional peak of
your blueprint must center on this moment or a narrative transformation
of it.

IMPORTANT: If this image describes a resolution or ending moment
rather than a moment of difficulty, treat it as the story's
destination — blueprint point 6 — rather than the emotional peak.
The story grows toward this image rather than around it.

IMPORTANT: If this vision conflicts with the therapeutic mechanism,
adapt the vision to serve the mechanism. The mechanism defines the
story's arc. The vision enriches it — it does not override it.
Example: if the mechanism is graduated exposure and the vision
describes a safe hiding place, the hiding place becomes the starting
point from which the protagonist gradually ventures out.
```

If `clinicalFoundation.oneTrueThing` is present, append:

```
And this is something real — observed in real children, not invented:

"{clinicalFoundation.oneTrueThing}"

Hold this detail. It belongs somewhere in the story. You will pass it
to the author. Do not force it into the blueprint structure — just
know it exists and let it inform your understanding.
```

---

## Section C — Clinical Brief

This is the largest section. It is built by composing several sub-builders, each one responsible for one block. Every conditional below uses **token comparisons** against `server/src/models/storyBrief.model.ts` enums. Display strings are illustrative only.

### C.1 Hard constraints

```
HARD CONSTRAINTS — absolute, never violated:
- Must-never list (the psychologist's final edited list — never the pre-fill defaults):
  {therapeuticArchitecture.mustNeverList joined with "; "}
- Shame dimension: {therapeuticArchitecture.shameDimension}
```

Then append, conditionally on `shameDimension`:

```
{if shameDimension === "present":
  The story must never put the protagonist in a position of being
  observed in their shame by others. Shame is internal. It is not
  performed.}

{if shameDimension === "central":
  Shame is the deepest layer. You prioritize normalization (even if
  not the primary mechanism) and follow three hard rules:
  (1) the story must demonstrate the child is not alone in this feeling,
  (2) the story must never imply the child should have known better,
      done better, or felt differently,
  (3) at least one character must witness the protagonist's difficulty
      and respond with acceptance, not correction.}
```

### C.2 Clinical core

```
CLINICAL CORE — the story's reason for existing:
- Therapeutic intention: When a child closes this book, they should
  feel {clinicalFoundation.therapeuticIntention.feel}
  because {clinicalFoundation.therapeuticIntention.because}
- Primary therapeutic approach: {therapeuticArchitecture.primaryApproach}
- Supporting approach: {therapeuticArchitecture.supportingApproach || "(none)"}
- Coping tool: {therapeuticArchitecture.copingTool}
  This tool must be shown in action at the story's most difficult
  moment. Not explained. Not suggested by a character. Demonstrated
  by the protagonist or discovered through experience.
```

Conditional on `copingTool`:

```
{if copingTool === "comfort_object_or_memory":
  This is clinically distinct from positive_self_talk. It represents
  the absent caregiver or a safe relationship — a physical object
  for younger children (a scarf, a stone, a drawing), a memory or
  internalized voice for older children. It recalls another person's
  presence, not self-generated encouragement.}

{if ageRange === "3-5" AND copingTool in
   ["routine_awareness", "visualization", "positive_self_talk"]:
  For this age range, show this tool as a simple physical action
  or repeated sensory pattern — not verbal self-talk or abstract
  internal process.}
```

### C.3 Somatic expressions

```
- Somatic expression: {somatic.selections[0]}
  {if somatic.selections[1] is present: + {somatic.selections[1]}}
  {if somatic.freeText: + free text: "{somatic.freeText}"}

  These are how this child's body holds the fear. The story must show
  the body's experience, not just the mind's. The first expression
  above is Tier 1 — it must appear as a fully realized scene. The
  second, if present, is Tier 3 — include it if space permits.
```

### C.4 Approach instructions

This block injects the **agent instruction** text from brief Section 13 — never the psychologist-facing definition. The mapping lives in `shared/approach-instructions.ts`.

```
HOW THE PRIMARY APPROACH WORKS IN NARRATIVE:
{getApproachInstruction(primaryApproach)}
```

Conditional inserts for two approaches:

```
{if primaryApproach === "psychoeducation":
  Note: Psychoeducation names the feeling or body response in simple,
  age-appropriate language within the story's natural flow. NOT a
  lecture — a moment of recognition. The explanation must emerge
  from a character's voice or the protagonist's discovery, never from
  narrator exposition.
  For ageRange === "3-5": concrete and physical
    ("your tummy does that when it's worried").
  For ageRange in ["7-9", "9-12"]: can include simple cause-
    and-effect ("when your brain thinks something might be scary,
    it sends a signal to your body to get ready").}

{if primaryApproach === "reassurance_predictability":
  Note: The story must include at least one moment where the
  protagonist notices the pattern themselves — recognizing the
  predictability rather than only receiving it. This seeds internal
  capacity without requiring the protagonist to self-regulate.}

{if supportingApproach is present:
  HOW THE SUPPORTING APPROACH FLAVORS THE STORY:
  {getApproachInstruction(supportingApproach)}
  The supporting approach does not drive the arc — the primary does.
  It manifests as a quality of the story world or a secondary thread.}
```

### C.5 Emotional world and trigger

```
EMOTIONAL WORLD:
- What this population feels: {clinicalFoundation.population}
- The specific trigger: {clinicalFoundation.trigger}
```

These are passed in Step 1 as raw text (the planning step needs them in full). They will also be passed verbatim to Step 2 as separate "source detail" blocks — see `step2-author.md` Section B.

### C.6 Story world

```
STORY WORLD:
- Age range: {ageAndScope.ageRange}
- Peak emotional intensity: {ageAndScope.peakIntensity}
- Story length: {ageAndScope.storyLength}
- Resolution completeness: {therapeuticArchitecture.resolutionCompleteness}
```

Then the resolution emotional signature, branched on the token:

```
{if resolutionCompleteness === "full":
  Emotional signature: relief, accomplishment, safety restored.
  The story ends on a high.}
{if resolutionCompleteness === "partial":
  Emotional signature: cautious hope — the tool helped but the
  feeling lingers gently. The story ends warm but honest.}
{if resolutionCompleteness === "open":
  Emotional signature: the protagonist has something they didn't
  have before — a tool, a friend, a new understanding — but the
  journey is unfinished. Ends looking forward.}
```

Personalization, with the gender and age-relation rules nested *inside* the `personalization === false` branch (because those fields are typed as optional and only present when personalization is OFF):

```
- Personalization: {storyWorld.personalization}
  {if personalization === true:
    Protagonist is [CHILD_NAME], pronouns are [HE/SHE/THEY].
    Protagonist type is locked to "child".}
  {if personalization === false:
    protagonistType: {storyWorld.protagonistType}
    protagonistGender: {storyWorld.protagonistGender}
    protagonistAge: {storyWorld.protagonistAge}
    {if protagonistGender === "kept_open":
      Use a neutral name. No they/them pronouns when ageRange is
      "3-5" or "5-7" (linguistically complex for the target audience).}
    {if protagonistAge === "slightly_older":
      Protagonist is 1–2 years older than the target age, showing a
      near-future version of themselves navigating the difficulty.
      Relatable but slightly more capable.}}
```

Caregiver — branches on five tokens:

```
- Caregiver presence: {storyWorld.caregiverPresence}
  {if caregiverPresence === "leaves_and_returns":
    The caregiver departs during the story and comes back. The story
    includes both the goodbye and the reunion. This is distinct from
    "waiting_at_the_end" — the leaving is shown.}
```

Then the separation-trigger fallback — defers to brief-level acknowledgment:

```
{if storyBrief.acknowledgedWarnings includes "separation_anxiety_no_caregiver":
  The psychologist acknowledged the separation+absent-caregiver
  combination at submission. Treat as intentional design choice.}
{else if specific_trigger_text mentions separation, loss of an adult,
        or being apart from a caregiver
        AND caregiverPresence === "not_present":
  Treat as configuration risk. Construct a relational anchor from
  whatever is available (supporting characters, the trigger context).
  Flag in compression metadata as "Story configuration risk —
  separation trigger without relational anchor."}

{if this is a separation or relational fear story:
  The safe beginning must establish the specific relationship that
  will be tested — not just the protagonist's world, but who they
  feel safe with and how that safety feels.}
```

Narrative distance, with parallel sub-field handling:

```
- Narrative distance: {storyWorld.narrativeDistance}
  {if narrativeDistance === "parallel":
    Equivalent challenge: "{storyWorld.parallelChallenge || "(not provided)"}"}
  {if narrativeDistance === "parallel" AND parallelChallenge is present:
    Use this as the emotional and situational mapping. Preserve
    emotional core, social dynamics, and practical stakes. Change
    surface setting.}
  {if narrativeDistance === "parallel" AND parallelChallenge is empty:
    Construct the parallel by preserving: (1) emotional core,
    (2) social dynamics, (3) practical stakes. Change surface setting
    and details.}
  {if narrativeDistance === "metaphorical" AND somatic.selections is non-empty:
    Translate somatic expressions into the metaphorical world.
    Preserve the quality of the sensation even if the body is
    different.}
```

Modeling fallback (handles audit C-6 inline because the brief has no hard block for this case yet):

```
{if primaryApproach === "modeling"
   AND caregiverPresence in ["not_present", "waiting_at_the_end"]
   AND supportingCharacters is empty or undefined:
  The brief did not provide a model character but the approach
  requires one. Construct a model character internally — the
  protagonist observes another character in the same predicament.
  Document this in the compression metadata under
  "agent-introduced character (Modeling required a model)."}
```

Supporting characters, with functional role tier distinction:

```
{if supportingCharacters is non-empty:
  - Supporting characters:
    {for each character with index i:
      - {character.type}
        {if character.functionalRole is present:
          functional role at the climactic scene: "{character.functionalRole}"
          {if i === 0:
            (Tier 2 — this functional role must appear at the
            climactic scene as specified, can be compressed in length
            but not in substance.)}
          {if i === 1:
            (Tier 4 — enrichment, omit if space is tight.)}}}}
```

Character notes:

```
{if storyWorld.characterNotes is present:
  - Character notes: {storyWorld.characterNotes}
    NOTE: Character notes add texture within the architecture. If they
    contradict structured fields (caregiver presence, protagonist type,
    narrative distance, character roles), structured fields win. If
    you detect a contradiction, surface it in the
    character_notes_contradictions output field.}
```

### C.7 Acknowledged warnings

```
{if storyBrief.acknowledgedWarnings is non-empty:
  ACKNOWLEDGED RISK COMBINATIONS — the psychologist confirmed these
  are intentional. Treat them as design choices, not errors.
  {for each id in acknowledgedWarnings:
    - {CROSS_FIELD_VALIDATIONS.find(v => v.id === id).description}}
  The post-validation alignment note may comment on how the story
  navigates these trade-offs.}
```

### C.8 Priority rules

All seven tiers, in this exact order:

```
PRIORITY RULES (when fields conflict — seven tiers, in order):
1. Cross-field validations — passed and acknowledged combinations
   are intentional
2. Therapeutic mechanism (Field 3.1) — defines the arc, overrides
   creative vision
3. Therapeutic intention (Field 2.3) — defines the destination
4. Coping tool (Field 3.5) — defines therapeutic delivery, overrides
   ordinary structured field selections
5. Structured field selections — define architecture
6. Clinical creative vision (Field 2.4) — enriches, does not override
7. Free text fields — add texture within the architecture
```

---

## Section D — Narrative Obligation Tiers

```
NARRATIVE OBLIGATION TIERS:

When this story's obligations exceed its word/page budget, follow
these tiers. Higher tiers are never compressed for lower tiers.

TIER 1 — Must appear as fully realized scenes (non-negotiable):
- The trigger moment (from the specific trigger field)
- Somatic mirroring — at least the first selected expression shown
  physically
- The coping tool in action
- The resolution matching the chosen completeness level

TIER 2 — Must appear, can be compressed into fewer beats:
- The primary therapeutic approach — defines the arc
- The caregiver's presence at the specified role
- Shame rules when shame = central — all three rules honored but
  can be served through a single scene rather than multiple
- First supporting character's functional role (if provided)

TIER 3 — Should appear if space permits, can be reduced to a single beat:
- The supporting approach — can become tonal quality rather than
  a distinct scene
- Supporting characters — can appear in a single interaction
- The second somatic expression (first is Tier 1, second is Tier 3)
- The "One true thing" detail

TIER 4 — Enrichment, omit if space is tight:
- The creative vision as a distinct set piece — can be reduced to a
  visual detail or atmospheric element
- Character notes details
- Second supporting character's functional role
```

Then conditionally:

```
{if preCheckResult.complexityBudget.complexityStatusText is present:
  COMPLEXITY STATUS:
  {complexityStatusText}
  Plan your blueprint with these compression needs in mind from the
  start. Do not design a full-scale blueprint that must be cut later.
  Design a blueprint that serves the available space while honoring
  the tier priorities.}
```

---

## Section E — Output Format

```
Produce the following outputs.

1. EMOTIONAL TRUTH (one paragraph, 60–120 words)
Write what this child is living through in plain human language.
No clinical terms. No field names. No therapeutic jargon.
This paragraph must convey:
- What the child feels in their body and mind
- What they are afraid of (the real fear beneath the situation)
- The shame dimension, if present, woven into the description
Must end with: "By the end, this child needs to feel ___."

2. NARRATIVE BLUEPRINT (6 points)
  1. Who the protagonist is and what we sense about them immediately
  2. What the world of the story is — time, place, sensory context
  3. What happens in the opening that pulls the child reader in
  4. The emotional peak — the moment the child reader will feel most.
     This must include how the protagonist's body experiences the fear —
     not as a label, but as a moment the reader can feel physically.
  5. How the protagonist finds their way through
     (the coping tool in action — name it explicitly)
  6. The shift and the landing — what changes for the protagonist and
     the final image the child holds after the story ends. For
     "partial" and "open" resolutions, make the distinction between
     the in-story shift and the lingering feeling explicit.

Each point: 1–3 sentences. Concrete and specific, not abstract.
Use narrative language, not clinical language.

Write each point with density proportional to its narrative
importance. The relative density tells the author where the story's
center of gravity belongs.

3. COPING TOOL PLACEMENT NOTE (1–2 sentences)
"The coping tool [{copingTool}] appears at blueprint point [N]:
[one-sentence description of how it manifests]."

4. APPROACH INSTRUCTION (2–4 sentences, plain language)
Describe how the primary approach manifests as narrative action in
this specific story. If a supporting approach is present, then
describe how it flavors the story. Use no clinical terminology.

5. INFERRED INTENTION FLAG (only if needed)
If the therapeutic intention is vague, infer a more specific one
from the trigger + primary approach + coping tool. Write:
"The brief's therapeutic intention may be too general. Based on the
trigger, approach, and coping tool, a more specific intention could
be: 'they should feel ___ because ___.' The specialist should review."

6. COMPRESSION METADATA (only if obligations exceed budget OR if
the agent introduced a character to satisfy Modeling)
List: what was fully included, what was compressed (and how), and
what was omitted (and why).

7. CHARACTER NOTES CONTRADICTIONS (only if any detected)
Array of objects: { contradicted_field, contradicting_phrase,
resolution }. Empty if none.

BEFORE FINALIZING — checks:

Structural safety: Review each blueprint point against the must-never
list. If any point would require violating a constraint, redesign it.

Anti-generic check: Could this blueprint describe a story that already
exists in every children's anxiety book? The blueprint must contain at
least one structural choice a generic story would not make.

{if primaryApproach === "normalization" AND resolutionCompleteness === "open":
  The protagonist has discovered they are not alone, but the fear is
  unresolved. Company changes the experience, not the problem.}
```

---

## Section F — Few-Shot Examples

```
{if exampleBank has examples for this storyType + ageRange:
  Here are two approved blueprints for stories at this age range.
  Study quality, specificity, and pacing (expressed through point
  density). Do not imitate their content — match their standard.

  EXAMPLE 1: {example1.full}
  EXAMPLE 2: {example2.full}}

{if no examples available (cold-start fallback):
  No approved examples yet for this age range. Standards:
  - Each blueprint point must be specific enough to visualize
  - Emotional truth must convey felt experience, not clinical summary
  - At least one structural surprise
  - Coping tool must have a clear, concrete moment}
```

---

## Output parsing

The Story Architect's response is parsed into `Step1Output` (see `02-data-contracts.md`). The parser is permissive about whitespace and section ordering but strict about structure:

- The emotional truth must end with the literal sentence pattern `"By the end, this child needs to feel "` followed by content followed by `"."`. If not, parser raises and the pipeline retries Step 1 once.
- The blueprint must contain exactly 6 numbered points. If 5 or 7, parser raises and pipeline retries.
- Coping tool placement note must reference one of the 6 blueprint point indices.
- Approach instruction must be 2–4 sentences (count by `.`, `?`, `!`).
- Conditional outputs (5, 6, 7) are absent from the response if not produced.

Parser implementation lives in `step1-architect/output-parser.ts`. It is fully testable with fixtures.

---

## How to add or modify a prompt section

1. Decide which section file to edit. Most edits land in `section-c-clinical-brief.ts`.
2. Make the change as a pure-function edit. Each section file exports `function buildSectionX(brief, preCheckResult): string`.
3. Add a unit test in `__tests__/step1-architect/prompt-sections/section-x.test.ts` that supplies a brief fixture and asserts the section contains the expected substring.
4. Add a snapshot test for the *full* assembled prompt with that section involved. Snapshots are checked into git.
5. If you added a new conditional that branches on a token, add a case to `__tests__/token-discipline.test.ts` that asserts the token exists in the model file.

That last step is the anti-drift gate. Without it, tokens slip out of sync silently.
