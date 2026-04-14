# DAMMAH — Agent 1 Final Specification v3.2

> **Status:** Reconciled with Story Brief Specification **v1.3** and `storyBrief.model.ts`
> **Version:** 3.2
> **Scope:** Fear & Anxiety stories (pilot)
> **Purpose:** Developer-ready specification for building Agent 1 — the system that receives a psychologist's story brief and generates the first therapeutic story draft.
>
> **Changed from v3.1:** This version applies the token-correction consolidation patch and reconciles Agent 1 with both Brief v1.3 and `storyBrief.model.ts`. Section 21 includes a dedicated v3.1 → v3.2 change log.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Key Design Decisions](#3-key-design-decisions)
4. [Pre-Check: Brief Quality Gate and Complexity Budget](#4-pre-check-brief-quality-gate-and-complexity-budget)
5. [Step 1: Story Architect](#5-step-1-story-architect)
6. [Step 2: The Author](#6-step-2-the-author)
7. [Post-Generation Validation](#7-post-generation-validation)
8. [Specialist Interface and Review Flow](#8-specialist-interface-and-review-flow)
9. [Feedback and Rerun Mechanism](#9-feedback-and-rerun-mechanism)
10. [Age-Derived Parameters](#10-age-derived-parameters)
11. [Word Count and Page Count Reference](#11-word-count-and-page-count-reference)
12. [Narrative Obligation Tiers](#12-narrative-obligation-tiers)
13. [Few-Shot Example Strategy](#13-few-shot-example-strategy)
14. [Information Flow Map](#14-information-flow-map)
15. [Model Allocation and Performance](#15-model-allocation-and-performance)
16. [Error Handling](#16-error-handling)
17. [Unvalidated Brief Conflicts the Agent Must Handle](#17-unvalidated-brief-conflicts-the-agent-must-handle)
18. [Extensibility: Non-Pilot Story Types](#18-extensibility-non-pilot-story-types)
19. [Out of Scope](#19-out-of-scope)
20. [Architectural Risks and Mitigations](#20-architectural-risks-and-mitigations)
21. [Changes from Agent 1 Spec v3.0](#21-changes-from-agent-1-spec-v30)

---

## Token convention used throughout this spec

> **[v3.2 NOTE — model aligned]** All branch literals in prompt templates use token values from `storyBrief.model.ts`, not display strings. Display labels are interpolated separately into prompt prose under the `_display` suffix. Examples of tokens used below: `fear_anxiety`, `graduated_exposure`, `psychoeducation`, `reassurance_predictability`, `cognitive_reframing`, `normalization`, `modeling`, `self_regulation`, `comfort_object_or_memory`, `routine_awareness`, `visualization`, `positive_self_talk`, `safe_person`, `asking_for_help`, `deep_breathing`, `counting`, `grounding_through_senses`, `partial`, `full`, `open`, `direct`, `parallel`, `metaphorical`, `present_and_comforting`, `guides_from_the_side`, `leaves_and_returns`, `waiting_at_the_end`, `not_present`, `kept_open`, `slightly_older`, `same_age`, `not_significant`, `present`, `central`. **If any token in `storyBrief.model.ts` differs from this list, the model file wins** — substitute the model's token wherever prompt branches.

---

## 1. System Overview

Agent 1 is the first stage of DAMMAH's story creation pipeline. A licensed psychologist fills in a structured story brief capturing clinical intention, therapeutic architecture, and creative guidance. Agent 1 transforms that brief into a first story draft.

Agent 1 runs once per story. Its output is the foundation everything else builds on. A weak first draft means a long, painful edit loop in Agent 2. A strong first draft means the specialist makes targeted refinements, not structural repairs.

The specialist clicks "Generate Draft" and receives three outputs: an emotional truth paragraph, a narrative blueprint, and a full story draft. Internally, three LLM calls execute sequentially. The specialist sees the combined output as one generation event.

---

## 2. Architecture Summary

```
PRE-CHECK (rule-based, no LLM)
  Brief quality gate on creative fields
  + vague intention detection
  + complexity budget de-duplication (red-state only, see §4.3)
  If issues found → specialist sees feedback + options
        ↓
STEP 1 — Story Architect (Claude Opus 4.6)
  Input:  Full story brief
          + therapeutic approach narrative instructions
          + narrative obligation tiers
          + narrative arc template (7 phases)        ← v3.1
          + complexity budget status
          + 2 few-shot blueprint examples
  Output: Emotional truth paragraph
          Narrative blueprint (6 points)
          Coping tool placement note
          Approach instruction (primary + supporting)
          Inferred intention flag (if applicable)
          Compression metadata (if obligations exceed budget)
        ↓
STEP 2 — The Author (Claude Opus 4.6)
  Input:  Step 1 outputs + selected brief fields
          + narrative obligation tiers
          + 1 few-shot story example
  Output: Story title
          Full story draft
        ↓
POST-GENERATION VALIDATION (Claude Sonnet 4.6)
  Input:  Story draft + hard constraints + structural parameters
  Output: Pass OR Flags with specific concerns
          + Alignment note (2–3 sentence clinical read)
        ↓
SPECIALIST RECEIVES:
  Emotional truth paragraph
  Narrative blueprint + coping tool placement note
  Inferred intention flag (if applicable)
  Compression metadata (if applicable — implements brief Layer 4)
  Story draft + title
  Alignment note
  Safety flags (if any)
```

---

## 3. Key Design Decisions

(Decisions 3.1 through 3.19 unchanged from v3.0 — see audit "Confirmed alignment" items.)

### 3.1 — Two-step chain, not four, not one

**Decision:** Agent 1 uses a 2-step chain (Story Architect → Author).

**Why not four steps:** Information bottleneck at Step 1 caused silent loss of clinical specificity. Separation between "reading" and "planning" was artificial. Standalone Safety Filter checked the blueprint (abstract) rather than the story (concrete).

**Why not a single prompt:** Compliance mode — model tries to check every clinical box and produces technically correct but emotionally flat output. Clinical language contaminates creative output. No specialist checkpoint.

**Why two steps:** The meaningful cognitive boundary is between understanding+planning and writing. Step 1 does interpretive work with the full brief. Step 2 does creative work from a clean blueprint.

### 3.2 — No standalone safety filter

Safety checking is embedded in Step 1's instructions and applied as post-generation validation on the finished story.

### 3.3 — Post-validation flags, never blocks

The specialist is a licensed psychologist. The safety check is a second pair of eyes, not a gatekeeper.

### 3.4 — "The one rule" is not checked by post-validation

Whether the story "lectures the child" is a quality criterion on a spectrum, judged exclusively by the specialist.

### 3.5 — Soft quality gate on creative fields, plus vague intention detection

Rule-based pre-check flags thin inputs and vague intentions. Always overridable.

### 3.6 — Creative vision as seed, with conflict resolution rule

The creative vision is the origin of the story. When it conflicts with the therapeutic mechanism, the mechanism wins.

### 3.7 — Therapeutic approach labels withheld from the Author, replaced by approach instruction

The Author receives plain-language approach instruction covering primary and supporting approaches. No clinical labels.

### 3.8 — Alignment note produced by post-validation, not the Author

Independent read by Sonnet, not the Author's self-assessment.

### 3.9 — Emotional truth paragraph with required closing sentence

Must end with "By the end, this child needs to feel ___."

### 3.10 — Author prompt is age-adaptive

Inapplicable sections omitted for younger age ranges.

### 3.11 — No pacing templates or beat structures in prompts

Pacing handled through blueprint density, few-shot examples, and a single pacing principle. The brief's narrative arc template (Section 12) provides canonical structure that the Story Architect references explicitly *(v3.1 — see §5 Section A2)*; it is not passed to the Author as a template.

### 3.12 — Somatic experience required in the blueprint's emotional peak

Blueprint point 4 must include the protagonist's physical experience of fear.

### 3.13 — Blueprint density encodes pacing

Blueprint points written with density proportional to narrative importance.

### 3.14 — Feedback reruns include previous output and approval state

Maximum 2 reruns. Previous output, approved parts, and feedback all included.

### 3.15 — Narrative distance passed to Author for all ages

Parallel and metaphorical narratives are common at all age ranges.

### 3.16 — Therapeutic approach narrative instructions flow to Step 1

Step 1 receives full per-approach narrative instruction, not just the label.

### 3.17 — Brief's priority rules are explicit in Step 1

The field hierarchy and conflict resolution rules from brief Section 14 are in Step 1's prompt.

### 3.18 — Narrative obligation tiers govern compression decisions

When a brief's obligations exceed the word/page budget, both the Story Architect and the Author follow the brief's 4-tier priority system (Section 15). Tier 1 elements must always appear as fully realized scenes. Lower tiers are compressed or omitted as needed. Compression decisions are transparent — the specialist sees what was compressed and why.

### 3.19 — Complexity budget status informs the Story Architect

If the brief triggered a complexity budget warning (brief Section 16), Step 1 is informed and must plan the blueprint with compression in mind from the start rather than discovering space constraints during writing.

### 3.20 — Compression metadata IS the brief's Layer 4 [v3.1 ADDITION — audit 3.1]

Brief v1.3 Section 21 introduces a four-layer complexity-handling UI. Layer 4 is "Post-Draft Transparency Metadata" and is marked in the brief as not yet implemented in V1. Agent 1's Step 1 compression metadata output (Step 1 output #6) is the canonical implementation of Layer 4. The brief's "out of scope" note refers to the *frontend rendering* of compression metadata, not its production. Agent 1 produces the metadata; the frontend's display of it lands when the generation/review pipeline ships.

### 3.21 — Pre-check de-duplicates the brief's complexity warning [v3.1 ADDITION — audit 3.2]

Brief v1.3 Section 21 sets a "never see the same overload message twice" rule across four UI layers. Agent 1's pre-check honors this by **only** showing a complexity warning to the specialist when load is **red** AND length is not already Extended AND the specialist did not acknowledge a length-bump suggestion in the brief form. In all other overload cases, the complexity status is silently passed to Step 1.

Agent 1 also honors `storyBrief.acknowledgedWarnings` (top-level `string[]` of `CROSS_FIELD_VALIDATIONS` IDs) as specialist-acknowledged intentional combinations. When present, Step 1 renders each acknowledged item using `CROSS_FIELD_VALIDATIONS[id].description` and treats it as design intent.

> **[v3.2 NOTE]** `conflicting_approach_pair` is currently classified as `soft_warning` in `storyBrief.model.ts`. Agent 1 still treats any acknowledged ID as intentional when present in `acknowledgedWarnings`, regardless of severity tier.

---

## 4. Pre-Check: Brief Quality Gate and Complexity Budget

**Implementation:** Rule-based. No LLM. Runs instantly on submit.

### 4.1 Creative field quality checks [v3.1 CHANGE — audit 2.5]

| Field | Threshold | Source | Feedback |
|---|---|---|---|
| Specific trigger (Field 2.2) | < 80 characters | brief Field 2.2 specificity nudge | "A detailed trigger scene — what the child sees, hears, feels in the moment — helps the story capture the right experience. Would you like to elaborate?" |
| Therapeutic intention (Field 2.3) | combined first-half + " because " + second-half < 60 characters | brief Field 2.3 soft validation nudge | "This may be too brief for the agent to work with. Can you make the second half more specific?" |
| Clinical creative vision (Field 2.4) | *no character-count threshold* | brief Field 2.4 has no nudge | n/a — quality is checked downstream by the vague-intention pattern logic only when relevant |

**Notes on changes from v3.0:**
- The trigger threshold (80 chars) is unchanged and matches the brief.
- The intention threshold was previously "second half < 30 chars". It is now "combined < 60 chars" to match brief Field 2.3's soft nudge exactly. Brief is the canonical contract.
- The creative vision threshold (previously < 50 chars) is **removed**. The brief has no character-count nudge for Field 2.4. If a specialist's vision is thin, that surfaces through the few-shot quality gap and the inferred-intention flag, not through pre-check.
- If clinical wants to add a vision threshold, the change must originate in brief v1.4 first.

### 4.2 Vague intention detection [v3.1 CHANGE — audit 2.6]

The therapeutic intention is checked against a pattern list of common vague completions, maintained by the clinical team.

**Match logic:** the pattern list is matched against the *concatenation* `lowercase(first_half) + " because " + lowercase(second_half)`, with leading/trailing whitespace stripped. The match fires if **either** of:
1. The concatenation contains any pattern from the list (substring match), **or**
2. The second-half is shorter than 30 characters AND contains no concrete noun (heuristic: no token longer than 4 characters that is not in a small stop-word list).

**Initial pattern list (Fear & Anxiety):**
- "they can be brave"
- "everything will be okay" / "it will be fine" / "it will be alright"
- "there's nothing to be scared of" / "nothing to worry about"
- "they are safe" / "they are loved"
- "they can do it" / "they can handle it"
- "it's not that bad" / "it's not so scary"
- "feel better" (matches "feel better because…" first-half cases)

When a match fires, Step 1 is informed via the `intention_appears_vague: true` flag, and Step 1's prompt branch on this flag activates the inferred-intention output (Step 1 output #5).

### 4.3 Complexity budget [v3.1 CHANGE — audit 3.2]

The system calculates the total narrative obligation load using the brief's page-cost weights and compares against available pages. **Calculation logic is unchanged from v3.0.** What changes is *what the specialist sees* when overload is detected.

> *"Pre-check imports `OBLIGATION_WEIGHTS` and `AGE_WEIGHT_MULTIPLIERS` from `storyBrief.model.ts`. The values shown in v3.1 §4.3 were illustrative — implementation must read them from the model file. The lower-bound threshold logic (warn when total weighted cost > lower bound of available page range) is unchanged."*

**Color state calculation** (mirrors brief Section 21 Layer 1):

- `green` — total weighted cost ≤ minimum page count for selected age × length
- `yellow` — total > minimum AND total ≤ maximum
- `red` — total > maximum

**De-duplication rule** (mirrors brief Section 21 Layer 3):

The pre-check shows a complexity warning to the specialist **only if all three** conditions hold:
1. Color state is `red`
2. Story length is **not** already Extended
3. The specialist has **not** already acknowledged a length-bump suggestion in the brief form (this state must be passed from the brief form to Agent 1 as a boolean flag, e.g. `complexity_acknowledged_in_brief: true|false`)

In all other overload cases (yellow, or red-but-already-acknowledged, or red-with-length-already-Extended), no specialist-facing warning is shown — the load is **silently** passed to Step 1 as `complexity_status` so the Story Architect can compress with intent.

**What flows downstream when load is yellow or red (regardless of whether warning fires):**

```
COMPLEXITY STATUS: This brief's narrative obligations exceed the
selected story length. Total estimated page cost: {X} pages.
Available: {Y}–{Z} pages. Color state: {yellow|red}.
Follow the narrative obligation tiers (provided below) to make
compression decisions.
```

If no overload (green): no complexity status is passed.

### 4.4 Behavior

- All checks produce specific feedback shown to the specialist.
- Multiple issues can trigger simultaneously.
- Two buttons: **"Enrich brief"** / **"Generate anyway"**.
- Complexity budget warnings (when shown — see §4.3 de-duplication rule) can also suggest: "Consider increasing the story length, or reducing complexity."
- This gate never blocks.

### 4.5 Acknowledged risk combinations [v3.2 CHANGE — model alignment]

Use `storyBrief.acknowledgedWarnings` as the source of accepted cross-field combinations. Each value is a validation `id` from `CROSS_FIELD_VALIDATIONS` in `storyBrief.model.ts`. When present, Agent 1 treats the combination as intentional and looks up the human-readable description from `CROSS_FIELD_VALIDATIONS[id].description`.

> **Important:** `conflicting_approach_pair` is currently classified as `soft_warning` in `storyBrief.model.ts`. Agent 1 should still treat any acknowledged ID as intentional when it appears in `acknowledgedWarnings`, regardless of severity tier.

---

## 5. Step 1: Story Architect

**Model:** Claude Opus 4.6

### 5.1 Input

- The **complete story brief** — every field (token form for branch values; display form for prose interpolation)
- **Therapeutic approach narrative instructions** — full agent instruction for primary approach, and supporting approach if present (from brief Section 13)
- **Narrative obligation tiers** (from brief Section 15) — always provided
- **Narrative arc template summary** (from brief Section 12) — always provided **[v3.1 ADDITION — audit 3.3]**
- **Complexity budget status** — only if the brief triggered an overload warning (yellow or red — see §4.3)
- **2 few-shot examples** — or cold-start quality standards
- **Brief priority rules** (from brief Section 14)
- **Must-never list** and **shame rules**

### 5.2 Prompt Structure

> **[v3.2 NOTE — model alignment]** Branch conditions below read canonical StoryBrief paths from `storyBrief.model.ts` (for example: `therapeuticArchitecture.copingTool`, `therapeuticArchitecture.primaryApproach`, `storyWorld.caregiverPresence`, `therapeuticArchitecture.shameDimension`, `therapeuticArchitecture.resolutionCompleteness`, `storyWorld.narrativeDistance`, `storyWorld.protagonistGender`, `storyWorld.protagonistAge`, `storyType`). Display labels remain interpolation helpers for prose output (`*_display`).

#### Section A — Identity and Task

```
You are a story architect for therapeutic children's stories.
You receive a clinical brief written by a licensed child psychologist.
Your job: understand what this child is living through, then design
a story that will help them — not by teaching, but by letting them
feel understood.

You produce four things (plus two conditional outputs):
1. An emotional truth paragraph
2. A narrative blueprint
3. A coping tool placement note
4. An approach instruction
5. An inferred intention flag (only if intention is vague)
6. Compression metadata (only if obligations exceed budget)
```

#### Section A2 — The Canonical Narrative Arc [v3.1 ADDITION — audit 3.3]

```
THE 7-PHASE ARC (from brief Section 12):

Every story you blueprint follows this canonical arc. Your 6
blueprint points compress the 7 phases like this:

  Brief Phase                      → Blueprint Point
  ─────────────────────────────────────────────────────
  1. Safe beginning                → Point 1 (who/what)
  2. The trigger moment            → Point 2 (world)
  3. The body feels it             → Point 3 (opening)
  4. The difficult peak            → Point 4 (peak — REQUIRED somatic)
  5. The tool in action            → Point 5 (tool — name it)
  6. The shift                     → Point 6 (final image, part 1)
  7. The landing                   → Point 6 (final image, part 2)

Use this mapping to plan, not as a rigid template. If a phase needs
to compress (because of length budget), the priority tier system in
Section D tells you which phases can be compressed and which cannot.

For separation or relational fear stories, Phase 1 must establish
the specific relationship that will be tested — not just the
protagonist's world, but who they feel safe with and how that
safety feels.
```

#### Section B — The Creative Vision as Seed [v3.1 CHANGE — audit 2.9]

```
THE HEART OF THIS STORY:

The psychologist has seen something specific — one image, one moment,
one detail that is the emotional center of this story:

"{clinicalFoundation.creativeVision}"

This is not a detail to include. This is the seed the story grows from.
Your blueprint must be built around this image.

PLACING THE VISION IN THE ARC:
Ask which phase of the 7-phase arc (Section A2) this vision most
naturally inhabits:
- Phases 1–3 (setup, trigger, body) → place at blueprint points 1–3
- Phase 4 (the difficult peak)      → place at blueprint point 4
- Phase 5 (the tool in action)      → place at blueprint point 5
- Phases 6–7 (shift, landing)       → place at blueprint point 6

Default placement if the vision describes a moment of difficulty:
Point 4. If the vision describes a resolution or ending moment:
Point 6. The story grows toward the vision rather than around it.

IMPORTANT: If this vision conflicts with the therapeutic mechanism,
adapt the vision to serve the mechanism. The mechanism defines the
story's arc. The vision enriches it — it does not override it.
Example: if the mechanism is graduated_exposure and the vision
describes a safe hiding place, the hiding place becomes the starting
point from which the protagonist gradually ventures out.

{if one_true_thing is present:}
And this is something real — observed in real children, not invented:

"{clinicalFoundation.oneTrueThing}"

Hold this detail. It belongs somewhere in the story. Pass it to the
author. Do not force it into the blueprint structure — just know it
exists and let it inform your understanding.
```

#### Section C — The Clinical Brief [v3.1 CHANGE — audit 2.3, 2.7, 2.8, 3.5]

```
HARD CONSTRAINTS — absolute, never violated:
- Must-never list: {therapeuticArchitecture.mustNeverList}
- Shame dimension token: {therapeuticArchitecture.shameDimension}
  {if therapeuticArchitecture.shameDimension == "present":
   The story must never put the protagonist in a position of being
   observed in their shame by others. Shame is internal. It is not
   performed.}
  {if therapeuticArchitecture.shameDimension == "central":
   Shame is the deepest layer. The agent prioritizes normalization
   (even if not the primary mechanism) and follows three hard rules:
   (1) the story must demonstrate the child is not alone in this
   feeling, (2) the story must never imply the child should have
   known better, done better, or felt differently, (3) at least one
   character must witness the protagonist's difficulty and respond
   with acceptance, not correction.}

CLINICAL CORE — the story's reason for existing:
- Therapeutic intention: When a child closes this book, they should
  feel {clinicalFoundation.therapeuticIntention.feel} because {clinicalFoundation.therapeuticIntention.because}
  {if intention_appears_vague == true: See the intention inference
   instruction in the output section below.}
- Primary therapeutic approach: {primary_approach_display}
  (token: {therapeuticArchitecture.primaryApproach})
- Supporting approach: {supporting_approach_display, if any}
  (token: {therapeuticArchitecture.supportingApproach, if any})
- Coping tool: {coping_tool_display}
  (token: {therapeuticArchitecture.copingTool})
  This tool must be shown in action at the story's most difficult
  moment. Not explained. Not suggested by a character. Demonstrated
  by the protagonist or discovered through experience.
  {if therapeuticArchitecture.copingTool == "comfort_object_or_memory":
   This is clinically distinct from positive_self_talk. It represents
   the absent caregiver or a safe relationship — a physical object
   for younger children (a scarf, a stone, a drawing), a memory or
   internalized voice for older children. It recalls another person's
   presence, not self-generated encouragement.}
  {if ageAndScope.ageRange == "3-5" AND therapeuticArchitecture.copingTool in
       ["routine_awareness", "visualization", "positive_self_talk"]:
   For this age range, show this tool as a simple physical action or
   repeated sensory pattern — not verbal self-talk or abstract
   internal process.}

- Somatic expression: {somatic_1_display}
  {+ somatic_2_display if present}
  {+ somatic_free_text if present}
  These are how this child's body holds the fear.
  Options include: freezing_going_still, crying_clinging,
  stomach_ache_feeling_sick, heart_racing_cant_breathe,
  restless_fidgety, going_quiet_shutting_down,
  tension_clenching, sweating_feeling_hot.
  The story must show the body's experience, not just the mind's.

HOW THE PRIMARY APPROACH WORKS IN NARRATIVE:
{primary_approach_narrative_instruction — full text from brief Section 13}

{if therapeuticArchitecture.primaryApproach == "psychoeducation":
 Note: Psychoeducation names the feeling or body response in simple,
 age-appropriate language within the story's natural flow. This is
 NOT a lecture — it is a moment of recognition. The explanation must
 emerge from a character's voice or the protagonist's discovery,
 never from narrator exposition. For ages 3–5: concrete and physical
 ("your tummy does that when it's worried"). For ages 7+: can include
 simple cause-and-effect ("when your brain thinks something might be
 scary, it sends a signal to your body to get ready").}

{if therapeuticArchitecture.primaryApproach == "reassurance_predictability":
 Note: The story must include at least one moment where the
 protagonist notices the pattern themselves — recognizing the
 predictability rather than only receiving it. This seeds internal
 capacity without requiring the protagonist to self-regulate.}

{if therapeuticArchitecture.primaryApproach == "modeling" AND
    storyWorld.caregiverPresence == "not_present" AND
    storyWorld.supportingCharacters is empty:
 [v3.1 — audit 2.7]
 No model character was provided. The protagonist must observe the
 modeling behavior in another character that you introduce — a
 passing peer, an animal, a memory of a sibling. Treat this
 introduced model as Tier 2 — must appear, can be compressed.}

{if therapeuticArchitecture.supportingApproach is set:
 HOW THE SUPPORTING APPROACH FLAVORS THE STORY:
 {supporting_approach_narrative_instruction}
 The supporting approach does not drive the arc — the primary does.
 It manifests as a quality of the story world or a secondary thread.}

EMOTIONAL WORLD:
- What this population feels: {clinicalFoundation.population}
- The specific trigger: {clinicalFoundation.trigger}

STORY WORLD:
- Age range: {age_range_display}    (token: {ageAndScope.ageRange})
- Peak emotional intensity: {intensity_display}
- Story length: {length_display}
- Resolution completeness: {resolution_display}
  (token: {therapeuticArchitecture.resolutionCompleteness})
  {resolution emotional signatures:}
  {if therapeuticArchitecture.resolutionCompleteness == "full":
   relief, accomplishment, safety restored. Ends on a high.}
  {if therapeuticArchitecture.resolutionCompleteness == "partial":
   cautious hope — tool helped but feeling lingers gently.
   Ends warm but honest.}
  {if therapeuticArchitecture.resolutionCompleteness == "open":
   protagonist has something new — a tool, a friend, a new
   understanding — but journey unfinished. Ends looking forward.}
- Personalization: {storyWorld.personalization}
  {if storyWorld.personalization === true:
    Protagonist is [CHILD_NAME], pronouns are [HE/SHE/THEY].
    Protagonist type is locked to "child".}
  {if storyWorld.personalization === false:
    protagonistType: {storyWorld.protagonistType}
    protagonistGender: {storyWorld.protagonistGender}
    protagonistAge: {storyWorld.protagonistAge}
    {if storyWorld.protagonistGender === "kept_open":
      Use a neutral name. No they/them pronouns when ageAndScope.ageRange is
      "3-5" or "5-7" (linguistically complex for the target audience).}
    {if storyWorld.protagonistAge === "slightly_older":
      Protagonist is 1–2 years older than the target age, showing a
      near-future version of themselves navigating the difficulty.
      Relatable but slightly more capable.}}
- Caregiver presence: {caregiver_presence_display}
  (token: {storyWorld.caregiverPresence})

  [v3.1 NOTE — audit 2.8] Caregiver-specific narrative guidance is
  the Author's job (Step 2 Section E), not the Architect's. Step 1
  only needs to know whether the caregiver participates in the arc
  and at which phase. Plan blueprint accordingly.

  {if storyBrief.acknowledgedWarnings includes "separation_anxiety_no_caregiver":
    Treat the absent caregiver as intentional. The psychologist
    acknowledged this combination at submission.}
  {else if clinicalFoundation.trigger mentions separation, loss of an adult,
          or being apart from a caregiver
          AND storyWorld.caregiverPresence === "not_present":
    Treat as configuration risk. Construct a relational anchor from
    whatever is available (supporting characters, the trigger context).
    Flag in compression metadata as "Story configuration risk —
    separation trigger without relational anchor."}

  {if (separation/relational fear story):
   The safe beginning (Phase 1, Point 1) must establish the specific
   relationship that will be tested — not just the protagonist's
   world, but who they feel safe with and how that safety feels.}

- Narrative distance: {narrative_distance_display}
  (token: {storyWorld.narrativeDistance})
  {if storyWorld.narrativeDistance == "parallel":
   Equivalent challenge: "{storyWorld.parallelChallenge}"}
  {if storyWorld.narrativeDistance == "parallel" AND
       storyWorld.parallelChallenge is set:
   Use this as the emotional and situational mapping. Preserve
   emotional core, social dynamics, and practical stakes. Change
   surface setting.}
  {if storyWorld.narrativeDistance == "parallel" AND
       storyWorld.parallelChallenge is empty:
   Construct the parallel by preserving: (1) emotional core,
   (2) social dynamics, (3) practical stakes. Change surface setting
   and details.}
  {if storyWorld.narrativeDistance == "metaphorical" AND
       somatic expressions selected:
   Translate somatic expressions into the metaphorical world.
   Preserve the quality of the sensation even if the body is
   different.}

- Supporting characters: {characters_display, if any}
  {for each character with a functional role sub-field:}
  - {character_label_display}: functional role at key moment:
    "{supportingCharacters[i].functionalRole}"

  [v3.1 — audit 3.5]
  {if 2 supporting characters AND complexity_status is set:
   First character's functional role is Tier 3 — keep if space
   permits. Second character's functional role is Tier 4 — omit
   first under compression.}

- Character notes: {character_notes, if any}
  NOTE: Character notes add texture within the architecture. If they
  contradict structured fields, structured fields win.

{if storyBrief.acknowledgedWarnings is non-empty:
  ACKNOWLEDGED RISK COMBINATIONS — the psychologist confirmed these
  are intentional. Treat them as design choices, not errors.
  {for each id in storyBrief.acknowledgedWarnings:
    - {CROSS_FIELD_VALIDATIONS[id].description}}
  The post-validation alignment note may comment on how the story
  navigates these trade-offs.}

PRIORITY RULES (when fields conflict — from brief Section 14):
1. Cross-field validations — passed combinations are intentional
2. Therapeutic mechanism — defines the arc, overrides creative vision
3. Therapeutic intention — defines the destination
4. Coping tool — defines therapeutic delivery
5. Structured field selections — define architecture
6. Clinical creative vision — enriches, does not override
7. Free text fields — add texture within the architecture
```

#### Section D — Narrative Obligation Tiers

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
- Shame rules when therapeuticArchitecture.shameDimension == "central" — all three rules
  honored but can be served through a single scene rather than
  multiple
- An introduced model character if primary is modeling and none was
  provided in the brief (see Section C)

TIER 3 — Should appear if space permits, can be reduced to a single beat:
- The supporting approach — can become tonal quality rather than
  a distinct scene
- Supporting characters — can appear in a single interaction
- The first supporting character's functional role
- The second somatic expression (first is Tier 1, second is Tier 3)
- The "One true thing" detail

TIER 4 — Enrichment, omit if space is tight:
- The creative vision as a distinct set piece — can be reduced to a
  visual detail or atmospheric element
- Character notes details
- The second supporting character's functional role (if two were
  selected)

{if complexity_status is set:
COMPLEXITY STATUS:
{complexity_status_text}
Plan your blueprint with these compression needs in mind from the
start. Do not design a full-scale blueprint that must be cut later.
Design a blueprint that serves the available space while honoring
the tier priorities.}
```

#### Section E — Output Format and Instructions

```
Produce the following outputs:

1. EMOTIONAL TRUTH (one paragraph, 60–120 words)
Write what this child is living through in plain human language.
No clinical terms. No field names. No therapeutic jargon.
This paragraph must convey:
- What the child feels in their body and mind
- What they are afraid of (the real fear beneath the situation)
- The shame dimension, if present, woven into the description
Must end with: "By the end, this child needs to feel ___."

2. NARRATIVE BLUEPRINT (6 points — mapped to 7-phase arc, see §A2)
  1. Who the protagonist is and what we sense about them immediately
  2. What the world of the story is — time, place, sensory context
  3. What happens in the opening that pulls the child reader in
  4. The emotional peak — the moment the child reader will feel most.
     This must include how the protagonist's body experiences the fear —
     not as a label, but as a moment the reader can feel physically.
  5. How the protagonist finds their way through
     (the coping tool in action — name it explicitly)
  6. The final image the child holds after the story ends
     (compresses Phases 6+7: the shift AND the landing)

Each point: 1–3 sentences. Concrete and specific, not abstract.
Use narrative language, not clinical language.

Write each point with density proportional to its narrative
importance. The relative density tells the author where the story's
center of gravity belongs.

{if supporting characters have functional roles:}
Supporting characters and their roles must be reflected in the blueprint.

3. COPING TOOL PLACEMENT NOTE (1–2 sentences)
"The coping tool [{coping_tool_display}] appears at blueprint
point [N]: [one-sentence description of how it manifests]."

4. APPROACH INSTRUCTION (2–4 sentences, plain language)
Describe how the primary approach manifests as narrative action in
this specific story.
{if supporting approach present:}
Then describe how the supporting approach flavors the story.
No clinical terminology.

5. INFERRED INTENTION FLAG (only if intention_appears_vague == true)
The brief's therapeutic intention may be too general. Based on the
trigger, approach, and coping tool, a more specific intention could
be: "they should feel ___ because ___." The specialist should review.

6. COMPRESSION METADATA (only if complexity_status is set)
List: what was fully included, what was compressed (and how), and
what was omitted (and why). This is shown to the specialist during
review so they can adjust and regenerate if needed. This output is
the canonical implementation of brief Layer 4 (see Decision 3.20).

BEFORE FINALIZING — checks:

Structural safety: Review each blueprint point against the must-never
list. If any point would require violating a constraint, redesign it.

Anti-generic check: Could this blueprint describe a story that
already exists in every children's anxiety book? The blueprint must
contain at least one structural choice a generic story would not
make.

{if therapeuticArchitecture.primaryApproach == "normalization" AND
    therapeuticArchitecture.resolutionCompleteness == "open":
 The protagonist has discovered they are not alone, but the fear is
 unresolved. Company changes the experience, not the problem.}
```

#### Section F — Few-Shot Examples [v3.1 CHANGE — audit 2.4]

```
{if examples available:}
Here are two approved blueprints for {story_type_display} stories
in the {age_range_display} range. Study quality, specificity, and
pacing (expressed through point density).
Do not imitate their content — match their standard.

EXAMPLE 1: {full example}
EXAMPLE 2: {full example}

{if no examples available:}
No approved examples yet. Standards:
- Each blueprint point must be specific enough to visualize
- Emotional truth must convey felt experience, not clinical summary
- At least one structural surprise
- Coping tool must have a clear, concrete moment
```

> **[v3.1 NOTE]** Example bank lookup uses `{storyType}` × `{ageAndScope.ageRange}` as the key. The display variant `{story_type_display}` is interpolated only into prose shown to the model.

### 5.3 Output

1. **Emotional truth** — one paragraph, 60–120 words, ending with "By the end, this child needs to feel ___."
2. **Narrative blueprint** — 6 numbered points, density reflecting narrative weight
3. **Coping tool placement note** — 1–2 sentences
4. **Approach instruction** — 2–4 sentences, plain language, covering primary + supporting
5. **Inferred intention flag** — conditional
6. **Compression metadata** — conditional, lists what was fully included / compressed / omitted (canonical Layer 4 implementation)

---

## 6. Step 2: The Author

**Model:** Claude Opus 4.6

### 6.1 Input

**From Step 1:**
- Emotional truth paragraph
- Narrative blueprint (6 points)
- Coping tool placement note
- Approach instruction
- Compression metadata (if present — informs the Author about space constraints)

**Passed through from brief:**
- Creative vision (verbatim)
- One true thing (verbatim, if present)
- Coping tool (token + display name)
- Somatic expressions (selections + free text)
- Age range (token + display)
- Story length
- Peak emotional intensity
- Resolution completeness (token) + emotional signatures
- Personalization flag + protagonist details
- Caregiver presence (token + display) — full Author-side branching here
- Narrative distance (token) + parallel equivalent challenge — **all ages**
- Supporting characters + functional role sub-fields
- Character notes
- Must-never list (verbatim)
- Shame dimension (token) + rules (including 3-rule version for `central`)
- Narrative obligation tiers

**NOT passed:**
- Emotional world of the population (in emotional truth)
- Specific trigger text (in blueprint)
- Therapeutic intention text (in emotional truth + blueprint)
- Therapeutic approach tokens or labels
- Approach narrative instructions from Section 13 (in approach instruction)
- Priority rules (conflicts resolved in Step 1)
- Story type label
- Complexity budget calculations

### 6.2 Prompt Structure

Age-adaptive — sections that don't apply to target age are omitted.

> **[v3.1 NOTE — audit 2.3]** Same token convention as Step 1: branch on `*_token`, interpolate prose with `*_display`.

#### Section A — Identity and the One Rule

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

#### Section B — The Heart of the Story

```
THE IMAGE AT THE CENTER:
"{clinicalFoundation.creativeVision}"

Build the story around this. The reader should remember this
moment most vividly.

{if one_true_thing present:}
AND SOMETHING REAL:
"{clinicalFoundation.oneTrueThing}"

A real detail observed in real children. Find where it belongs
and let it live there without explanation.
```

#### Section C — The Blueprint

```
EMOTIONAL TRUTH:
{emotional_truth_paragraph}

NARRATIVE BLUEPRINT:
{6 points}

COPING TOOL:
{coping_tool_placement_note}
The coping tool is {coping_tool_display}. Show it happening. Do not
name it.
{if therapeuticArchitecture.copingTool == "comfort_object_or_memory":
 This recalls another person's presence — a physical object for
 younger children, a memory or internalized voice for older
 children. It is NOT self-generated encouragement.}

HOW THE APPROACH WORKS IN THIS STORY:
{approach_instruction}
```

#### Section D — The Body's Language

```
This child's anxiety lives in their body as:
{somatic_expression_1_display}
{somatic_expression_2_display, if present}
{somatic_free_text, if present}

Show the body. The reader should feel it physically.

{if storyWorld.narrativeDistance == "metaphorical":
 Translate these somatic experiences into the metaphorical world —
 the sensation should feel equivalent even if the body is different.}
```

#### Section E — Structural Parameters

```
AGE RANGE: {age_range_display}
STORY LENGTH: {length_display}

Target word count: {word_range}
Target page count: {page_range}

Write to the word range. A shorter story that works is better
than a longer story that drifts.

VOCABULARY AND COMPLEXITY:
{age-derived rules from Section 10}

PEAK EMOTIONAL INTENSITY: {intensity_display}
{if intensity == very_gentle:
 Protagonist feels uneasy; discomfort is brief.}
{if intensity == moderate:
 Real distress within a contained arc.}
{if intensity == significant:
 Genuinely overwhelmed before resolution.}

RESOLUTION: {resolution_display}
{if therapeuticArchitecture.resolutionCompleteness == "full":
 Relief, accomplishment, safety restored. Ends on a high.}
{if therapeuticArchitecture.resolutionCompleteness == "partial":
 Cautious hope — tool helped but feeling lingers gently.
 Ends warm but honest.}
{if therapeuticArchitecture.resolutionCompleteness == "open":
 Something new — tool, friend, understanding — but journey
 unfinished. Courage without certainty. Ends looking forward.}

CAREGIVER: {caregiver_presence_display}
{if storyWorld.caregiverPresence == "present_and_comforting":
 In the story, actively warm.}
{if storyWorld.caregiverPresence == "guides_from_the_side":
 Helps, but protagonist does the hard part.}
{if storyWorld.caregiverPresence == "leaves_and_returns":
 The caregiver departs and comes back. Show both the goodbye and
 the reunion. The leaving is part of the story.}
{if storyWorld.caregiverPresence == "waiting_at_the_end":
 Exists in the world but not the immediate scene. Protagonist knows
 they are there.}
{if storyWorld.caregiverPresence == "not_present":
 No caregiver. Protagonist navigates alone.}

NARRATIVE DISTANCE: {narrative_distance_display}
{if storyWorld.narrativeDistance == "direct":
 Same setting, same challenge, recognizable world.}
{if storyWorld.narrativeDistance == "parallel":
 Different setting, same emotional core.
 {if storyWorld.parallelChallenge is set:
  Equivalent challenge: "{storyWorld.parallelChallenge}"}}
{if storyWorld.narrativeDistance == "metaphorical":
 Symbolic. Challenge never named directly.}

PERSONALIZATION: {storyWorld.personalization}
{if storyWorld.personalization === true:
 [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders.
 Gender-neutral narrative.}
{if storyWorld.personalization === false:
 protagonistType: {storyWorld.protagonistType}
 protagonistGender: {storyWorld.protagonistGender}
 protagonistAge: {storyWorld.protagonistAge}
 {if storyWorld.protagonistGender === "kept_open":
  Use character's name, avoid pronouns. No they/them when ageAndScope.ageRange is
  "3-5" or "5-7" (linguistically complex for the target audience).}
 {if storyWorld.protagonistAge === "slightly_older":
  1–2 years older than target age. Relatable but slightly more
  capable.}}

{if supporting characters:}
SUPPORTING CHARACTERS:
{for each:}
- {character_label_display}
  {if functional role:} At the key moment: "{supportingCharacters[i].functionalRole}"
{if character notes:}
CHARACTER NOTES: {character_notes}
```

#### Section F — Pacing Principle

```
The emotional peak and the coping tool scene are the heart of this
story. They should receive the most narrative space. If the opening
takes more than a few sentences, you started too far back. Do not
rush the resolution — difficulty must feel real before the shift
feels earned.
```

#### Section G — Narrative Obligation Tiers

```
{if compression_metadata present:}
SPACE CONSTRAINTS:
The story architect noted the following compression decisions:
{compression_metadata}

Honor these decisions. Do not attempt to restore omitted elements.
Focus your craft on the elements that remain.

{always included:}
PRIORITY TIERS:
If you find the story growing beyond the target word count, follow
these priorities:
Tier 1 (non-negotiable scenes): trigger, first somatic expression,
  coping tool in action, resolution
Tier 2 (must appear, can compress): primary approach arc, caregiver
  role, shame rules if therapeuticArchitecture.shameDimension == "central"
Tier 3 (include if space permits): supporting approach, supporting
  characters, second somatic expression, one true thing, first
  character's functional role
Tier 4 (enrichment only): creative vision as set piece, character
  notes details, second character's functional role

Never flatten a Tier 1 element for a Tier 3 element.
```

#### Section H — Hard Constraints

> *"The must-never list passed to the Author is `storyBrief.therapeuticArchitecture.mustNeverList`, the psychologist's final edited list as submitted with the brief. **Never read from `STORY_TYPE_ROUTING[storyType].mustNeverDefaults`** — that constant holds the pre-fill defaults that populate a fresh brief, and the psychologist may have removed items deliberately. Sending defaults instead of the final list reverses clinical judgment and is a critical bug."*

```
WHAT THIS STORY MUST NEVER DO:
{therapeuticArchitecture.mustNeverList}

SHAME RULES:
{shame_level_display}
{if therapeuticArchitecture.shameDimension == "present":
 Never put protagonist in position of being observed in their
 shame.}
{if therapeuticArchitecture.shameDimension == "central":
 (1) Story demonstrates child is not alone in this feeling.
 (2) Never implies child should have known/done/felt differently.
 (3) At least one character witnesses the protagonist's difficulty
     and responds with acceptance, not correction.}

These constraints are absolute.
```

#### Section I — Few-Shot Example [v3.1 CHANGE — audit 2.4]

```
{if example available:}
One approved story for {story_type_display}, age {age_range_display}.
Study prose quality, pacing, coping tool presentation, body language.
Do not imitate — match the standard.
{example}

{if no example:}
Standards: specificity, restraint, concrete detail, coping tool
shown not named, body experience specific to provided expressions.
```

#### Section J — Output Format

```
1. TITLE
A title a child would be drawn to. Not clinical, not cute.

2. STORY
Complete text. No headers. No chapter breaks (unless 9–12 Extended).
{if personalization on: placeholders throughout.}
```

### 6.3 Output

1. **Title**
2. **Story** — full prose draft

---

## 7. Post-Generation Validation

(Unchanged from v3.0 except for the token references in branches.)

**Model:** Claude Sonnet 4.6

### 7.1 Input

- Story draft + title (from Step 2)
- Must-never list
- Shame dimension token + rules (3-rule version for `central`)
- Somatic expressions
- Age range + peak intensity
- Coping tool name + placement note
- Approach instruction
- Resolution completeness + emotional signature

### 7.2 Prompt

```
You are a clinical safety reviewer. Two jobs: check hard constraints,
write an alignment note.

NOT judging quality. NOT judging whether the story lectures.
Checking specific rules and providing a clinical read.

THE STORY:
{title}
{story_draft}

===== PART 1: CONSTRAINT CHECK =====

1. MUST-NEVER LIST:
{items}
Violations? Quote passage (max 15 words), name the rule.

2. SHAME HANDLING:
{shame_level_display}  (token: {therapeuticArchitecture.shameDimension})
{if therapeuticArchitecture.shameDimension == "central":
 Check all three rules — (1) not alone demonstrated,
 (2) no implication of should-have-known, (3) witnessing character
 responds with acceptance not correction.}
{if therapeuticArchitecture.shameDimension == "present":
 Is protagonist observed in their shame?}

3. COPING TOOL:
Tool: {coping_tool_display}. Should appear at emotional peak.
Present? Shown in action or explained/named?

4. AGE APPROPRIATENESS:
Age: {age_range_display}. Intensity: {intensity_display}.
Any scene exceeds specified intensity?

OUTPUT:
"PASS" or per-concern: check number, passage, reasoning, severity
("likely violation" / "borderline — specialist should review").
Flag only what a clinical reviewer would genuinely question.

===== PART 2: ALIGNMENT NOTE =====

2–3 sentences. What therapeutic mechanism is embodied. Where the
coping tool appears. What the emotional arc achieves.

Resolution token: {therapeuticArchitecture.resolutionCompleteness}
Expected signature: {emotional_signature}
Approach instruction: {approach_instruction}

Describe what you see, not what should be there.
```

### 7.3 Output

- **PASS** or **FLAGS**
- **Alignment note** — 2–3 sentences, clinical language

---

## 8. Specialist Interface and Review Flow

(Unchanged from v3.0.)

```
┌─────────────────────────────────────────────┐
│ EMOTIONAL TRUTH                             │
│ {paragraph}                                 │
│ [✓ Captures my intention]                   │
│ [✗ Misses something — provide feedback]     │
├─────────────────────────────────────────────┤
│ NARRATIVE BLUEPRINT                         │
│ 1–6. {points}                               │
│ Coping tool: {placement note}               │
│ Approach: {approach instruction}            │
│ [✓ Right journey] [✗ Wrong direction]       │
├─────────────────────────────────────────────┤
│ {INFERRED INTENTION FLAG — if present}      │
│ {COMPRESSION METADATA — if present}         │
│ {SAFETY FLAGS — if any}                     │
├─────────────────────────────────────────────┤
│ STORY: {title}                              │
│ {full text}                                 │
│ Alignment note: {from post-validation}      │
│ [Approve → editing] [Regenerate]            │
└─────────────────────────────────────────────┘
```

**Progress indicator:**
```
Step 1 of 3: Understanding your brief and designing the structure...
Step 2 of 3: Writing the story...
Step 3 of 3: Reviewing the draft...
```

---

## 9. Feedback and Rerun Mechanism

(Unchanged from v3.0.)

**Emotional truth rejected:** Step 1 reruns with original brief + previous output + feedback.

**Blueprint rejected (emotional truth approved):** Step 1 reruns with approved emotional truth held constant + blueprint feedback.

**Inferred intention rejected:** Step 1 reruns with corrected intention replacing the vague original.

**Story needs editing:** Specialist approves plan → Agent 2.

**Compression metadata rejected:** Specialist can return to the brief to reduce complexity or increase story length, then regenerate.

**Maximum 2 feedback reruns.** After 2: "Consider revisiting the brief." Specialist can proceed to Agent 2 with best version or return to brief.

**All previous versions retained** until specialist advances.

---

## 10. Age-Derived Parameters

(Unchanged from v3.0 — matches brief Section 11.)

### Ages 3–5
- Sentences: 5–10 words average, 15 max
- Vocabulary: concrete, physical, sensory. "Scared" not "anxious."
- Structure: strictly linear. No subplots, flashbacks, parallel threads.
- Coping tool: physical action only. Never verbal self-talk.
- Caregiver: almost always present or returning.
- Repetition: rhythmic, soothing.

### Ages 5–7
- Sentences: 8–15 words average, 20 max
- Vocabulary: concrete + simple emotional words. "Worried" ok. "Overwhelmed" no.
- Structure: linear, one minor complication allowed.
- Coping tool: deliberate choice. Simple internal narration ok.
- Caregiver: can be less present.

### Ages 7–9
- Sentences: 10–20 words average, varied for rhythm
- Vocabulary: expanded emotional. Simile ok.
- Structure: secondary arcs, brief flashback, attempt → setback → new attempt.
- Coping tool: internal process. Visualization and self-talk shown naturally.
- Caregiver: protagonist can be independent.

### Ages 9–12
- Sentences: full range, stylistic variation
- Vocabulary: full emotional range. Abstract concepts.
- Structure: subplots, secondary perspectives, non-linear, thematic layering.
- Coping tool: full process — recognition, choice, effort, partial success. Can fail then work.
- Caregiver: fully optional.

---

## 11. Word Count and Page Count Reference

> *"Structural parameters are exported from `storyBrief.model.ts` as `STRUCTURAL_PARAMS[ageRange][storyLength]`. Agent 1 must import this constant and read from it. Do not duplicate the values in prompt templates or helper files. The model file is the single source of truth."*

---

## 12. Narrative Obligation Tiers

(Unchanged from v3.0 — reproduces brief Section 15.)

### Tier 1 — Must appear as fully realized scenes (non-negotiable)
- The trigger moment
- Somatic mirroring — at least the first selected expression
- The coping tool in action
- The resolution matching chosen completeness level

### Tier 2 — Must appear, can be compressed
- Primary therapeutic approach arc
- Caregiver presence at specified role
- Shame rules when `therapeuticArchitecture.shameDimension == "central"` (all three rules, can be one scene)
- Introduced model character if primary is `modeling` and none was provided **[v3.1 — audit 2.7]**

### Tier 3 — Should appear if space permits, can reduce to single beat
- Supporting approach (can become tonal quality)
- Supporting characters (can be single interaction)
- First supporting character's functional role **[v3.1 — audit 3.5]**
- Second somatic expression
- One true thing detail

### Tier 4 — Enrichment, omit if space is tight
- Creative vision as distinct set piece (can reduce to visual detail)
- Character notes details
- Second supporting character's functional role **[v3.1 — audit 3.5]**

### Output metadata requirement
When any element is compressed or omitted, the Step 1 compression metadata must list: what was fully included, what was compressed (and how), what was omitted (and why). This is the canonical implementation of brief Layer 4 (see Decision 3.20).

---

## 13. Few-Shot Example Strategy

### Retrieval [v3.1 CHANGE — audit 2.4]
- **Key:** `{storyType}` × `{ageAndScope.ageRange}`
- **Per generation:** Step 1: 2 blueprint examples. Step 2: 1 story example.
- **Matching:** Dynamic from example bank. Display labels (`*_display`) used in prose; tokens used as the lookup key.

### Cold-start fallback
Quality standard instructions replace examples when unavailable.

### Example bank
- Pilot: 1 type × 4 age ranges = 4 buckets
- Each bucket: 2 blueprint examples + 1 story example minimum

### Cold-start plan [v3.1 CHANGE — audit 3.8]

| Phase | Action |
|---|---|
| Pre-launch | Clinical team produces the **three gold-standard brief-story pairs specified in brief Section 22**: (1) 3–5 direct narrative, personalized (e.g., bathroom anxiety); (2) 5–7 parallel narrative, fixed animal protagonist (e.g., separation anxiety); (3) 7–9 direct narrative, personalized (e.g., fear of mistakes, cognitive reframing). These three pairs become the seed example bank. They cover three of the four pilot age buckets. |
| Launch | The three seeds serve as the example bank. The 9–12 bucket launches with cross-bucket retrieval (closest available age) until a native 9–12 example is approved. Age mismatch noted in the prompt. |
| Month 2+ | Best approved stories nominated as candidates. Separate clinical approval. Bank expands to ~10 examples. |
| Ongoing | Quarterly review. Weak examples replaced. |

### Example quality criteria
- Non-obvious narrative structure
- Therapeutic mechanism embodied without stating
- Coping tool shown in action at peak
- Creative vision visible and central
- Tone matches age range
- Body experience specific
- Blueprint density reflects pacing
- Approach instruction demonstrates behavioral description
- Compression metadata demonstrates proper tier-based decisions (for examples of complex briefs)

### Diversity monitoring
After 6 months, audit convergence. Ensure examples cover different therapeutic approaches including Psychoeducation.

---

## 14. Information Flow Map [v3.1 CHANGE — audit 2.2]

> *"Field IDs and names in this table reference `FIELD_REGISTRY` in `storyBrief.model.ts`. If this table and the registry disagree on a field name or ID, the registry wins."*

| Brief Field | Step 1 | Step 2 | Post-Val |
|---|---|---|---|
| Story type (token + display) | ✓ (routes; display in prose) | — | — |
| Age range | ✓ | ✓ | ✓ |
| Peak intensity | ✓ | ✓ | ✓ |
| Story length | ✓ | ✓ | — |
| Resolution completeness + signatures | ✓ | ✓ | ✓ |
| Emotional world | ✓ | — (in ET) | — |
| Specific trigger | ✓ | — (in BP) | — |
| Therapeutic intention | ✓ | — (in ET+BP) | — |
| Creative vision | ✓ (seed) | ✓ (verbatim) | — |
| One true thing | ✓ | ✓ (verbatim) | — |
| Primary approach token | ✓ | — (in AI) | — |
| Primary approach narrative instruction | ✓ (Section 13) | — (in AI) | — |
| Supporting approach token | ✓ | — | — |
| Supporting approach narrative instruction | ✓ | — (in AI) | — |
| Shame dimension + rules (3-rule `central`) | ✓ | ✓ | ✓ |
| Somatic expressions (expanded list) | ✓ | ✓ | ✓ |
| Coping tool (token + display) | ✓ | ✓ | ✓ |
| Comfort object/memory definition | ✓ | ✓ | — |
| Must-never list | ✓ | ✓ | ✓ |
| Personalization + protagonist | ✓ | ✓ | — |
| Gender `kept_open` rules | ✓ | ✓ | — |
| Age relation `slightly_older` | ✓ | ✓ | — |
| Caregiver presence (5 options incl. `leaves_and_returns`) | ✓ (token only — for blueprint planning) | ✓ (full Author-side branching) | — |
| Narrative distance (ALL ages) | ✓ | ✓ | — |
| Parallel equivalent challenge | ✓ | ✓ | — |
| Supporting characters | ✓ | ✓ | — |
| Functional role sub-fields | ✓ (high priority) | ✓ (high priority) | — |
| Character notes | ✓ | ✓ | — |
| Priority rules (brief §14) | ✓ | — (resolved) | — |
| Narrative obligation tiers (brief §15) | ✓ | ✓ | — |
| Narrative arc template (brief §12) | ✓ (§A2) | — (encoded in blueprint) | — |
| Complexity budget status (yellow or red) | ✓ (silent or warned per §4.3) | — (via compression metadata) | — |
| `complexity_acknowledged_in_brief` flag | ✓ (controls warning de-dup) | — | — |
| "Why not personalized" (Field 5.2) | — | — | — (parent-facing only) |

> **[v3.1 NOTE]** Field 5.1 (parental personalization constraints list) was removed in brief v1.3 and no longer exists. The corresponding row from the v3.0 Information Flow Map has been deleted.

### Step 1 outputs downstream

| Step 1 Output | Step 2 | Post-Val | Specialist |
|---|---|---|---|
| Emotional truth | ✓ | — | ✓ |
| Blueprint | ✓ | — | ✓ |
| Coping tool placement note | ✓ | ✓ | ✓ |
| Approach instruction | ✓ | ✓ | ✓ |
| Inferred intention flag | — | — | ✓ |
| Compression metadata (Layer 4) | ✓ | — | ✓ |

---

## 15. Model Allocation and Performance

(Unchanged from v3.0.)

| Step | Model | Est. Input | Est. Output |
|---|---|---|---|
| Step 1 | Opus 4.6 | ~4,000–6,000 | ~600–1,000 |
| Step 2 | Opus 4.6 | ~2,500–5,000 | ~200–3,500 |
| Post-Val | Sonnet 4.6 | ~1,500–4,500 | ~100–400 |

Total per generation: 3 calls. Max per story: 9 calls (with 2 reruns).
Estimated latency: 30–60 seconds.

> **[v3.1 NOTE]** Step 1 input estimates absorb the new arc-template summary (~150 tokens) without changing the budget bracket.

---

## 16. Error Handling

(Unchanged from v3.0.)

| Failure | Behavior |
|---|---|
| Step 1 incoherent | Auto-retry once. If fails: error message + log. |
| Step 2 word count ±30% | Flag to specialist. No auto-retry. |
| Post-validation fails | Story goes to specialist without flags/note. Log. |
| Rerun produces worse output | All versions retained. Specialist chooses. |
| Inferred intention rejected | Rerun with corrected intention. |
| Compression metadata disputed | Specialist returns to brief to adjust complexity or length. |

---

## 17. Unvalidated Brief Conflicts the Agent Must Handle [v3.1 CHANGE — audit 2.7]

| Conflict | Step 1 Handling |
|---|---|
| Metaphorical narrative + specific somatic expressions | Translate somatic into metaphorical world. Preserve sensation quality. |
| Normalization (primary) + open resolution | Protagonist knows they're not alone; fear itself unresolved. |
| Creative vision describes resolution + graduated exposure | Vision becomes destination (Phase 6+7, blueprint point 6), not peak. |
| Psychoeducation + shame `central` | Naming must never imply "you should have known." The explanation normalizes, not corrects. |
| Leaves-and-returns caregiver + short story length | Departure and reunion compress to brief beats; emotional core of both moments preserved. Complexity budget should have flagged this. |
| **Modeling primary + no caregiver + no supporting characters** **[v3.1 — promoted from "recommended additions"]** | Step 1 introduces a model character (passing peer, animal, memory of a sibling). Treated as Tier 2 — must appear, can be compressed. |
| Gender/age conditional fields with personalization ON | `storyWorld.protagonistGender` and `storyWorld.protagonistAge` are conditional fields (present only when personalization is OFF). Branches for `kept_open` and `slightly_older` must stay nested under `storyWorld.personalization === false`. |
| Separation anxiety without caregiver (acknowledged) | If `"separation_anxiety_no_caregiver"` appears in `storyBrief.acknowledgedWarnings`, treat configuration as intentional and do not emit fallback risk metadata. Otherwise apply trigger-based fallback detection and annotate compression metadata risk. |

### Recommended additions to brief cross-field validations [v3.1 — narrowed]

| Validation | Trigger | Action |
|---|---|---|
| Parallel + personalization ON (3–5) | Distance = `parallel` AND personalization ON AND age_range = `3-5` | Soft warning |

> **[v3.1 NOTE]** "Modeling + no model character" was previously a recommended addition. It is now handled by the agent at runtime (above) since brief v1.3 did not add the validation. "Cognitive reframing + 3–5" is already in the brief (validation #8), so no recommendation needed.

---

## 18. Extensibility: Non-Pilot Story Types [v3.1 CHANGE — audit 3.4]

Type-dependent elements requiring creation per type:

| Element | What changes |
|---|---|
| Therapeutic approaches + narrative instructions | Different per type. Psychoeducation now available for Fear & Anxiety. |
| Type-specific clinical field (replaces somatic) | Entirely different field and handling |
| Must-never defaults | Different constraints |
| Few-shot examples | Type-specific |
| Coping tool options | Different categories |
| Resolution defaults | Different per type |
| Vague intention patterns | Different per type |
| Obligation tier weights | May need type-specific page costs |
| Complexity budget weights | May need type-specific adjustments |

**Routing key:** the `storyType` from the brief. The Step 1 prompt loads a type-specific snippet for the clinical field (somatic for `fear_anxiety`, behavioral description for `big_emotions`, etc.). The snippet structure mirrors the existing somatic block in Step 1 Section C.

**Future consideration:** Tagging must-never list items as default-vs-custom would let post-validation surface "this violation is against a default constraint" for higher-confidence flags. Not in scope for v1.

No structural changes to the 2-step chain needed.

---

## 19. Out of Scope [v3.1 CHANGE — audit 3.6]

- Agent 2 — targeted edit loop
- Personalization engine — placeholder resolution
- Display of "Why not personalized" text (Field 5.2) to parents at personalization time — part of the parent-facing personalization engine, not Agent 1
- Illustration integration
- Prompt versioning
- Analytics
- Multi-language support
- **Frontend rendering of compression metadata** — Agent 1 produces the metadata (the canonical Layer 4 implementation per Decision 3.20); the specialist UI rendering of it lands when the generation/review pipeline ships

---

## 20. Architectural Risks and Mitigations

(Unchanged from v3.0.)

### Example bank monoculture
Audit after 6 months. Ensure structural diversity and approach coverage including Psychoeducation.

### Creative vision contradicts story world
Monitor rerun rates. Add pre-check if frequent.

### Over-flagging erodes trust
Track dismissal rates. Recalibrate if >70%.

### Thin briefs despite quality gate
Monitor richness vs. rerun correlation. Tighten thresholds.

### Approach instruction quality varies
Include in example criteria. Monitor supporting approach coverage.

### Vague intention inference inaccurate
Track acceptance rate. Recalibrate if rejection >40%.

### Compression metadata creates specialist confusion
Risk: specialist sees "creative vision omitted" and feels the agent ignored their input. Mitigation: compression metadata framing must explain this was a space decision, not a quality judgment, and that increasing story length would include it.

### Obligation tier system undertested
The tier system is new. The page-cost weights are estimates. Track whether compression decisions produce clinically sound stories or whether the weights need adjustment. Run calibration tests with overloaded briefs during development.

### Leaves-and-returns caregiver overtaxes short stories
The 1.5-page cost is significant for 3–5 Short (6–8 pages). The complexity budget should catch this, but if specialists override the warning, the agent must compress both departure and reunion into very brief beats. Monitor whether this produces clinically adequate separation/reunion scenes or whether the minimum should be Standard length.

### Token-vs-display drift [v3.1 ADDITION]
Risk: as brief options evolve, the prompt branch literals (tokens) and the display labels can drift apart. Mitigation: every new brief field option must be added to `storyBrief.model.ts` first, and Agent 1 prompts must reference the model file as the source of truth for tokens. Run a CI check that fails the build if any token used in an Agent 1 prompt is not present in `storyBrief.model.ts`.

---

## 21. Changes from Agent 1 Spec v3.0

This version reconciles Agent 1 v3.0 against **Brief v1.3** (v3.0 was reconciled against v1.2). All changes are tied to specific audit findings.

### Conflicts resolved

| Audit # | Change | Section affected |
|---|---|---|
| 2.1 | Header updated to reference Brief v1.3 | Header |
| 2.2 | Removed Field 5.1 (personalization constraints) row from Information Flow Map — field was removed in brief v1.3 | §14 |
| 2.3 | All branch literals in Step 1, Step 2, and Post-Validation prompts now use snake_case **tokens** from `storyBrief.model.ts`, not display strings. Display labels carried in separate `*_display` variables for prose interpolation. | §5, §6, §7, plus token convention block at top |
| 2.4 | `{storyType}` split into `{storyType}` (lookup key) and `{story_type_display}` (prose). Same pattern applied to all type-bearing fields. | §5 §F, §6 §I, §13 |
| 2.5 | Pre-check thresholds aligned to brief: trigger < 80 (unchanged), intention < 60 *combined* (was 30 second-half), creative vision threshold removed | §4.1 |
| 2.6 | Vague intention match logic explicitly defined as concatenation lowercase substring match + short-second-half heuristic | §4.2 |
| 2.7 | "Modeling primary + no model character" promoted from "recommended additions" to runtime-handled conflict; explicit Step 1 instruction added; introduced model character added to Tier 2 | §17, §5 §C, §12 |
| 2.8 | Caregiver-specific narrative branches removed from Step 1 Section C (Step 2 Section E remains the single home for Author-side caregiver prose). Step 1 only knows the caregiver's role for blueprint planning. | §5 §C, §14 |
| 2.9 | Step 1 Section B's vision-placement rule rewritten as a 7-phase arc heuristic instead of a binary "describes resolution" check | §5 §B |

### Gaps closed

| Audit # | Change | Section affected |
|---|---|---|
| 3.1 | New Decision 3.20: Agent 1's compression metadata IS the canonical implementation of brief Layer 4. The brief's "Layer 4 out of scope" note refers to frontend rendering, not metadata production. | §3, §19 |
| 3.2 | New Decision 3.21 + revised §4.3: pre-check de-duplication rule. Complexity warning shown to specialist only if color = red AND length ≠ Extended AND no prior brief-form acknowledgment. Yellow and acknowledged-red pass silently to Step 1. | §3, §4.3, §14 |
| 3.3 | New Step 1 prompt Section A2: explicit summary of brief §12 (7-phase arc) with mapping from arc phases to blueprint points. Step 1 can now reason about phase placement explicitly. | §5 §A2 |
| 3.4 | §18 now names `storyType` as the routing key for type-specific clinical fields and snippet loading | §18 |
| 3.5 | Tier system clarified: first supporting character's functional role is Tier 3, second is Tier 4. Step 1 prompt and §12 updated. | §5 §C, §6 §G, §12 |
| 3.6 | §19 now explicitly excludes the parent-facing display of Field 5.2 and the frontend rendering of compression metadata | §19 |
| 3.7 | No change for v1 — default-vs-custom must-never tagging deferred to future, noted in §18 | §18 |
| 3.8 | §13 cold-start plan now references brief §22 explicitly: the three required gold-standard pairs are named (3–5 direct/personalized; 5–7 parallel/animal/separation; 7–9 direct/personalized/cognitive reframing). 9–12 launches with cross-bucket retrieval. | §13 |

### Changes from Agent 1 Spec v3.1 to v3.2

| Section | Type | Reason |
|---|---|---|
| Part A (A.1–A.14) | Token corrections | v3.1 used illustrative tokens; some did not match the model file and were corrected. |
| Part B.1 | Reference instead of duplicate | §11 now imports `STRUCTURAL_PARAMS` from `storyBrief.model.ts` rather than duplicating the table. |
| Part B.2 | Reference instead of duplicate | §4.3 now imports `OBLIGATION_WEIGHTS` and `AGE_WEIGHT_MULTIPLIERS` from `storyBrief.model.ts`. |
| Part B.3 | acknowledgedWarnings redesign | `acknowledgedWarnings` is used directly and rendered via `CROSS_FIELD_VALIDATIONS[id].description`. |
| Part B.4 | Normative strengthening | §6.2 Section H now explicitly forbids reading `STORY_TYPE_ROUTING[storyType].mustNeverDefaults`. |
| Part B.5 | Registry authority note | §14 now states that `FIELD_REGISTRY` is authoritative when names/IDs disagree. |
| Part C-14 | Conflict integration | Personalization conditional branches in Step 1 and Step 2 now nest gender/age under `storyWorld.personalization === false`. |
| Part C-15 | Conflict integration | Separation-anxiety handling checks acknowledged warning first, then falls back to trigger-based detection. |
| Part E | Quick reference appendix | Added Appendix A token migration substitution table for implementation and maintenance. |

### What did not change

Everything else from v3.0 is preserved: the two-step chain architecture, Decisions 3.1–3.19, the age-derived parameters (§10), the model allocation (§15), error handling (§16), most architectural risks (§20), and the post-validation prompt structure (§7) other than token references.

---

## Appendix A — Token Migration Reference

Drop-in substitution table from the v3.1 patch. Left side is what v3.1 showed; right side is what implementation must use.

```
3_5                            → "3-5"
5_7                            → "5-7"
7_9                            → "7-9"
9_12                           → "9-12"

full_resolution                → "full"
partial_resolution             → "partial"
open_resolution                → "open"

guides_from_side               → "guides_from_the_side"
waiting_at_end                 → "waiting_at_the_end"

reassurance_and_predictability → "reassurance_predictability"

"Child character"              → "child"
"Animal character"             → "animal"
"Fantasy character"            → "fantasy"

"A peer who shows it's possible"           → "peer_shows_possible"
"A peer who goes through it alongside"     → "peer_alongside"
"A teacher or adult who guides"            → "teacher_adult_guides"
"An animal friend who accompanies"         → "animal_friend"
"A sibling who offers perspective"         → "sibling_perspective"

"Asking for help" / "Safe person"
                               → ["asking_for_help", "safe_person"]

acknowledged_validations (block) → acknowledgedWarnings (top-level
                                   string[] of CROSS_FIELD_VALIDATIONS ids)
```

## Open items for future revision

- Reconcile brief wording vs model classification for `conflicting_approach_pair` severity so brief text and model severity tiers remain aligned.

---

*End of specification.*
