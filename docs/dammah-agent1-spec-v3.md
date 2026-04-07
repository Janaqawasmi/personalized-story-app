# DAMMAH — Agent 1 Final Specification v3

> **Status:** Finalized — reconciled with Story Brief Specification v1.2
> **Version:** 3.0
> **Scope:** Fear & Anxiety stories (pilot)
> **Purpose:** Developer-ready specification for building Agent 1 — the system that receives a psychologist's story brief and generates the first therapeutic story draft.

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
21. [Changes from Agent 1 Spec v2](#21-changes-from-agent-1-spec-v2)

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
  + complexity budget warning (from brief Section 16)
  If issues found → specialist sees feedback + options
        ↓
STEP 1 — Story Architect (Claude Opus 4.6)
  Input:  Full story brief
          + therapeutic approach narrative instructions
          + narrative obligation tiers
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
  Compression metadata (if applicable)
  Story draft + title
  Alignment note
  Safety flags (if any)
```

---

## 3. Key Design Decisions

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

Pacing handled through blueprint density, few-shot examples, and a single pacing principle. The brief's narrative arc template (Section 12) provides canonical structure that the Story Architect internalizes; it is not passed to the Author as a template.

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

**NEW in v3.** When a brief's obligations exceed the word/page budget, both the Story Architect and the Author follow the brief's 4-tier priority system (Section 15). Tier 1 elements must always appear as fully realized scenes. Lower tiers are compressed or omitted as needed. Compression decisions are transparent — the specialist sees what was compressed and why.

### 3.19 — Complexity budget status informs the Story Architect

**NEW in v3.** If the brief triggered a complexity budget warning (brief Section 16), Step 1 is informed and must plan the blueprint with compression in mind from the start rather than discovering space constraints during writing.

---

## 4. Pre-Check: Brief Quality Gate and Complexity Budget

**Implementation:** Rule-based. No LLM. Runs instantly on submit.

### 4.1 Creative field quality checks

| Field | Threshold | Feedback |
|---|---|---|
| Clinical creative vision | < 50 characters | "A specific image or moment — a sound, a gesture, a visual detail — helps produce a distinctive story. Would you like to add more?" |
| Specific trigger | < 80 characters | "A detailed trigger scene — what the child sees, hears, feels in the moment — helps the story capture the right experience. Would you like to elaborate?" |
| Therapeutic intention ("because ___") | < 30 characters in the second half | "A specific understanding helps the story land its therapeutic purpose. Would you like to be more specific?" |

### 4.2 Vague intention detection

The second half of the therapeutic intention is checked against a pattern list of common vague completions. Maintained by clinical team.

Initial list: "they can be brave," "everything will be okay / it will be fine / it will be alright," "there's nothing to be scared of / nothing to worry about," "they are safe / they are loved," "they can do it / they can handle it," "it's not that bad / it's not so scary."

### 4.3 Complexity budget (from brief Section 16)

The system calculates the total narrative obligation load using the brief's page-cost weights and compares against available pages.

**Obligation weights (ages 3–5 baseline, scaled by age multiplier):**

| Obligation | Page Cost |
|---|---|
| Core arc (safe beginning + trigger + peak + tool + landing) | 5 pages |
| Each somatic expression selected | 0.5 pages |
| Supporting approach selected | 1 page |
| Shame = Central | 1 page |
| Shame = Present | 0.5 pages |
| Each supporting character selected | 1 page |
| Caregiver = "Leaves and returns" | 1.5 pages |
| Caregiver = "Waiting at the end" (needs return scene) | 0.5 pages |
| Parallel narrative distance | 1 page |
| Metaphorical narrative distance | 1.5 pages |

**Age-range scaling multipliers:**

| Age Range | Multiplier |
|---|---|
| 3–5 | 1.0× |
| 5–7 | 0.8× |
| 7–9 | 0.6× |
| 9–12 | 0.5× |

If total weighted cost exceeds the lower bound of the available page range, show soft warning listing specific obligations contributing to overload.

### 4.4 Behavior

- All checks produce specific feedback shown to the specialist.
- Multiple issues can trigger simultaneously.
- Two buttons: **"Enrich brief"** / **"Generate anyway"**.
- Complexity budget warnings can also suggest: "Consider increasing the story length, or reducing complexity."
- This gate never blocks.

### 4.5 What flows downstream

If the complexity budget warning triggered AND the specialist chose "Generate anyway," the following status is passed to Step 1:

```
COMPLEXITY STATUS: This brief's narrative obligations exceed the
selected story length. Total estimated page cost: {X} pages.
Available: {Y}–{Z} pages. Follow the narrative obligation tiers
(provided below) to make compression decisions.
```

If no warning triggered: no complexity status is passed.

---

## 5. Step 1: Story Architect

**Model:** Claude Opus 4.6

### 5.1 Input

- The **complete story brief** — every field
- **Therapeutic approach narrative instructions** — full agent instruction for primary approach, and supporting approach if present (from brief Section 13)
- **Narrative obligation tiers** (from brief Section 15) — always provided
- **Complexity budget status** — only if the brief triggered an overload warning
- **2 few-shot examples** — or cold-start quality standards
- **Brief priority rules** (from brief Section 14)
- **Must-never list** and **shame rules**

### 5.2 Prompt Structure

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

#### Section B — The Creative Vision as Seed

```
THE HEART OF THIS STORY:

The psychologist has seen something specific — one image, one moment,
one detail that is the emotional center of this story:

"{creative_vision}"

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

{if one_true_thing is present:}
And this is something real — observed in real children, not invented:

"{one_true_thing}"

Hold this detail. It belongs somewhere in the story. You will pass it
to the author. Do not force it into the blueprint structure — just
know it exists and let it inform your understanding.
```

#### Section C — The Clinical Brief

```
HARD CONSTRAINTS — absolute, never violated:
- Must-never list: {must_never_list}
- Shame dimension: {shame_level}
  {if "Present — handle with care": The story must never put the
   protagonist in a position of being observed in their shame by
   others. Shame is internal. It is not performed.}
  {if "Central to experience": Shame is the deepest layer. The agent
   prioritizes normalization (even if not the primary mechanism) and
   follows three hard rules: (1) the story must demonstrate the child
   is not alone in this feeling, (2) the story must never imply the
   child should have known better, done better, or felt differently,
   (3) at least one character must witness the protagonist's difficulty
   and respond with acceptance, not correction.}

CLINICAL CORE — the story's reason for existing:
- Therapeutic intention: When a child closes this book, they should
  feel {feel} because {because}
  {if intention appears vague: See the intention inference instruction
   in the output section below.}
- Primary therapeutic approach: {primary_approach}
- Supporting approach: {supporting_approach, if any}
- Coping tool: {coping_tool}
  This tool must be shown in action at the story's most difficult
  moment. Not explained. Not suggested by a character. Demonstrated
  by the protagonist or discovered through experience.
  {if coping_tool is "Comfort object or memory": This is clinically
   distinct from Positive self-talk. It represents the absent caregiver
   or a safe relationship — a physical object for younger children
   (a scarf, a stone, a drawing), a memory or internalized voice for
   older children. It recalls another person's presence, not self-
   generated encouragement.}
  {if age_range is 3–5 AND coping_tool is one of [Routine awareness,
   Visualization, Positive self-talk]: For this age range, show this
   tool as a simple physical action or repeated sensory pattern — not
   verbal self-talk or abstract internal process.}
- Somatic expression: {somatic_1} {+ somatic_2 if present}
  {+ somatic_free_text if present}
  These are how this child's body holds the fear.
  Options include: Freezing/going still, Crying/clinging,
  Stomach ache/feeling sick, Heart racing/can't breathe,
  Restless/fidgety/can't sit still, Going quiet/shutting down,
  Tension/clenching (jaw, fists, shoulders), Sweating/feeling hot.
  The story must show the body's experience, not just the mind's.

HOW THE PRIMARY APPROACH WORKS IN NARRATIVE:
{primary_approach_narrative_instruction — full text from brief Section 13}

{if primary_approach is "Psychoeducation":}
Note: Psychoeducation names the feeling or body response in simple,
age-appropriate language within the story's natural flow. This is NOT
a lecture — it is a moment of recognition. The explanation must emerge
from a character's voice or the protagonist's discovery, never from
narrator exposition. For ages 3–5: concrete and physical ("your tummy
does that when it's worried"). For ages 7+: can include simple cause-
and-effect ("when your brain thinks something might be scary, it sends
a signal to your body to get ready").

{if primary_approach is "Reassurance & predictability":}
Note: The story must include at least one moment where the protagonist
notices the pattern themselves — recognizing the predictability rather
than only receiving it. This seeds internal capacity without requiring
the protagonist to self-regulate.

{if supporting_approach present:}
HOW THE SUPPORTING APPROACH FLAVORS THE STORY:
{supporting_approach_narrative_instruction}
The supporting approach does not drive the arc — the primary does.
It manifests as a quality of the story world or a secondary thread.

EMOTIONAL WORLD:
- What this population feels: {emotional_world}
- The specific trigger: {specific_trigger}

STORY WORLD:
- Age range: {age_range}
- Peak emotional intensity: {intensity}
- Story length: {length}
- Resolution completeness: {resolution}
  {resolution emotional signatures:}
  {if full: relief, accomplishment, safety restored. Ends on a high.}
  {if partial: cautious hope — tool helped but feeling lingers gently.
   Ends warm but honest.}
  {if open: protagonist has something new — a tool, a friend, a new
   understanding — but journey unfinished. Ends looking forward.}
- Personalization: {yes/no}
  {if yes: protagonist is [CHILD_NAME], pronouns are [HE/SHE/THEY]}
  {if no: protagonist type: {type}, gender: {gender},
   age relation: {age_relation}}
  {if gender is "Kept open": Use a neutral name. No they/them pronouns
   for ages under 7.}
  {if age_relation is "Slightly older": Protagonist is 1–2 years older
   than the target age, showing a near-future version of themselves
   navigating the difficulty. Relatable but slightly more capable.}
- Caregiver presence: {caregiver_presence}
  {if "Leaves and returns": The caregiver departs during the story and
   comes back. The story includes both the goodbye and the reunion.
   This is distinct from "Waiting at the end" — the leaving is shown.}
  {if this is a separation or relational fear story: The safe beginning
   must establish the specific relationship that will be tested — not
   just the protagonist's world, but who they feel safe with and how
   that safety feels.}
- Narrative distance: {narrative_distance}
  {if parallel: Equivalent challenge: "{parallel_equivalent_challenge}"}
  {if parallel AND equivalent challenge provided: Use this as the
   emotional and situational mapping. Preserve emotional core, social
   dynamics, and practical stakes. Change surface setting.}
  {if parallel AND no equivalent challenge: Construct the parallel by
   preserving: (1) emotional core, (2) social dynamics, (3) practical
   stakes. Change surface setting and details.}
  {if metaphorical AND somatic expressions selected: Translate somatic
   expressions into the metaphorical world. Preserve the quality of
   the sensation even if the body is different.}
- Supporting characters: {characters, if any}
  {for each character with a functional role sub-field:}
  - {character_label}: functional role at key moment:
    "{functional_role_text}"
  {Functional role text is high-priority instruction for that
   character's behavior in the climactic scene.}
- Character notes: {character_notes, if any}
  NOTE: Character notes add texture within the architecture. If they
  contradict structured fields, structured fields win.

PRIORITY RULES (when fields conflict):
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
- Shame rules when shame = Central — all three rules honored but
  can be served through a single scene rather than multiple

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
- Second supporting character's functional role if two were selected

{if complexity_status present:}
COMPLEXITY STATUS:
{complexity_status_text}
Plan your blueprint with these compression needs in mind from the
start. Do not design a full-scale blueprint that must be cut later.
Design a blueprint that serves the available space while honoring
the tier priorities.
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

2. NARRATIVE BLUEPRINT (6 points)
  1. Who the protagonist is and what we sense about them immediately
  2. What the world of the story is — time, place, sensory context
  3. What happens in the opening that pulls the child reader in
  4. The emotional peak — the moment the child reader will feel most.
     This must include how the protagonist's body experiences the fear —
     not as a label, but as a moment the reader can feel physically.
  5. How the protagonist finds their way through
     (the coping tool in action — name it explicitly)
  6. The final image the child holds after the story ends

Each point: 1–3 sentences. Concrete and specific, not abstract.
Use narrative language, not clinical language.

Write each point with density proportional to its narrative
importance. The relative density tells the author where the story's
center of gravity belongs.

{if supporting characters have functional roles:}
Supporting characters and their roles must be reflected in the blueprint.

3. COPING TOOL PLACEMENT NOTE (1–2 sentences)
"The coping tool [{tool_name}] appears at blueprint point [N]:
[one-sentence description of how it manifests]."

4. APPROACH INSTRUCTION (2–4 sentences, plain language)
Describe how the primary approach manifests as narrative action in
this specific story.
{if supporting approach present:}
Then describe how the supporting approach flavors the story.
No clinical terminology.

5. INFERRED INTENTION FLAG (only if needed)
If the therapeutic intention is vague, infer a more specific one
from the trigger + primary approach + coping tool. Write:
"The brief's therapeutic intention may be too general. Based on the
trigger, approach, and coping tool, a more specific intention could
be: 'they should feel ___ because ___.' The specialist should review."

6. COMPRESSION METADATA (only if obligations exceed budget)
List: what was fully included, what was compressed (and how), and
what was omitted (and why). This is shown to the specialist during
review so they can adjust and regenerate if needed.

BEFORE FINALIZING — checks:

Structural safety: Review each blueprint point against the must-never
list. If any point would require violating a constraint, redesign it.

Anti-generic check: Could this blueprint describe a story that already
exists in every children's anxiety book? The blueprint must contain at
least one structural choice a generic story would not make.

{if normalization is primary AND resolution is open:}
The protagonist has discovered they are not alone, but the fear is
unresolved. Company changes the experience, not the problem.
```

#### Section F — Few-Shot Examples

```
{if examples available:}
Here are two approved blueprints for {story_type} stories
in the {age_range} range. Study quality, specificity, and
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

### 5.3 Output

1. **Emotional truth** — one paragraph, 60–120 words, ending with "By the end, this child needs to feel ___."
2. **Narrative blueprint** — 6 numbered points, density reflecting narrative weight
3. **Coping tool placement note** — 1–2 sentences
4. **Approach instruction** — 2–4 sentences, plain language, covering primary + supporting
5. **Inferred intention flag** — conditional
6. **Compression metadata** — conditional, lists what was fully included / compressed / omitted

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
- Coping tool name
- Somatic expressions (selections + free text)
- Age range
- Story length
- Peak emotional intensity
- Resolution completeness + emotional signatures
- Personalization flag + protagonist details
- Caregiver presence level
- Narrative distance + parallel equivalent challenge — **all ages**
- Supporting characters + functional role sub-fields
- Character notes
- Must-never list (verbatim)
- Shame dimension level + rules (including 3-rule version for Central)
- Narrative obligation tiers

**NOT passed:**
- Emotional world of the population (in emotional truth)
- Specific trigger text (in blueprint)
- Therapeutic intention text (in emotional truth + blueprint)
- Therapeutic approach labels
- Approach narrative instructions from Section 13 (in approach instruction)
- Priority rules (conflicts resolved in Step 1)
- Story type label
- Complexity budget calculations

### 6.2 Prompt Structure

Age-adaptive — sections that don't apply to target age are omitted.

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
"{creative_vision}"

Build the story around this. The reader should remember this
moment most vividly.

{if one_true_thing present:}
AND SOMETHING REAL:
"{one_true_thing}"

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
The coping tool is {coping_tool_name}. Show it happening. Do not name it.
{if coping_tool is "Comfort object or memory": This recalls another
 person's presence — a physical object for younger children, a memory
 or internalized voice for older children. It is NOT self-generated
 encouragement.}

HOW THE APPROACH WORKS IN THIS STORY:
{approach_instruction}
```

#### Section D — The Body's Language

```
This child's anxiety lives in their body as:
{somatic_expression_1}
{somatic_expression_2, if present}
{somatic_free_text, if present}

Show the body. The reader should feel it physically.

{if narrative_distance is metaphorical:}
Translate these somatic experiences into the metaphorical world —
the sensation should feel equivalent even if the body is different.
```

#### Section E — Structural Parameters

```
AGE RANGE: {age_range}
STORY LENGTH: {length}

Target word count: {word_range}
Target page count: {page_range}

Write to the word range. A shorter story that works is better
than a longer story that drifts.

VOCABULARY AND COMPLEXITY:
{age-derived rules from Section 10}

PEAK EMOTIONAL INTENSITY: {intensity}
{if very gentle: Protagonist feels uneasy; discomfort is brief.}
{if moderate: Real distress within a contained arc.}
{if significant: Genuinely overwhelmed before resolution.}

RESOLUTION: {resolution}
{if full: Relief, accomplishment, safety restored. Ends on a high.}
{if partial: Cautious hope — tool helped but feeling lingers gently.
 Ends warm but honest.}
{if open: Something new — tool, friend, understanding — but journey
 unfinished. Courage without certainty. Ends looking forward.}

CAREGIVER: {caregiver_presence}
{if present and comforting: In the story, actively warm.}
{if guides from the side: Helps, but protagonist does the hard part.}
{if leaves and returns: The caregiver departs and comes back. Show
 both the goodbye and the reunion. The leaving is part of the story.}
{if waiting at the end: Exists in the world but not the immediate
 scene. Protagonist knows they are there.}
{if not present: No caregiver. Protagonist navigates alone.}

NARRATIVE DISTANCE: {narrative_distance}
{if direct: Same setting, same challenge, recognizable world.}
{if parallel: Different setting, same emotional core.
 {if equivalent challenge:} "{parallel_equivalent_challenge}"}
{if metaphorical: Symbolic. Challenge never named directly.}

PERSONALIZATION: {personalization_flag}
{if on: [CHILD_NAME], [HE/SHE/THEY], [HIS/HER/THEIR] placeholders.
 Gender-neutral narrative.}
{if off: {type}, {gender}, {age_relation}.
 {if "Kept open": Use character's name, avoid pronouns. No they/them
  under 7.}
 {if "Slightly older": 1–2 years older than target age. Relatable
  but slightly more capable.}}

{if supporting characters:}
SUPPORTING CHARACTERS:
{for each:}
- {label}
  {if functional role:} At the key moment: "{functional_role_text}"
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
  role, shame rules if Central
Tier 3 (include if space permits): supporting approach, supporting
  characters, second somatic expression, one true thing
Tier 4 (enrichment only): creative vision as set piece, character
  notes details, second character's functional role

Never flatten a Tier 1 element for a Tier 3 element.
```

#### Section H — Hard Constraints

```
WHAT THIS STORY MUST NEVER DO:
{must_never_list}

SHAME RULES:
{shame_level}
{if "Present": Never put protagonist in position of being observed
 in their shame.}
{if "Central": (1) Story demonstrates child is not alone in this
 feeling. (2) Never implies child should have known/done/felt
 differently. (3) At least one character witnesses the protagonist's
 difficulty and responds with acceptance, not correction.}

These constraints are absolute.
```

#### Section I — Few-Shot Example

```
{if example available:}
One approved story for {story_type}, age {age_range}.
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

**Model:** Claude Sonnet 4.6

### 7.1 Input

- Story draft + title (from Step 2)
- Must-never list
- Shame dimension + rules (3-rule version for Central)
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
{level}
{if Central: Check all three rules — (1) not alone demonstrated,
 (2) no implication of should-have-known, (3) witnessing character
 responds with acceptance not correction.}
{if Present: Is protagonist observed in their shame?}

3. COPING TOOL:
Tool: {name}. Should appear at emotional peak.
Present? Shown in action or explained/named?

4. AGE APPROPRIATENESS:
Age: {age_range}. Intensity: {intensity}.
Any scene exceeds specified intensity?

OUTPUT:
"PASS" or per-concern: check number, passage, reasoning, severity
("likely violation" / "borderline — specialist should review").
Flag only what a clinical reviewer would genuinely question.

===== PART 2: ALIGNMENT NOTE =====

2–3 sentences. What therapeutic mechanism is embodied. Where the
coping tool appears. What the emotional arc achieves.

Resolution type: {resolution}
Expected signature: {emotional_signature}
Approach instruction: {approach_instruction}

Describe what you see, not what should be there.
```

### 7.3 Output

- **PASS** or **FLAGS**
- **Alignment note** — 2–3 sentences, clinical language

---

## 8. Specialist Interface and Review Flow

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

**Emotional truth rejected:** Step 1 reruns with original brief + previous output + feedback.

**Blueprint rejected (emotional truth approved):** Step 1 reruns with approved emotional truth held constant + blueprint feedback.

**Inferred intention rejected:** Step 1 reruns with corrected intention replacing the vague original.

**Story needs editing:** Specialist approves plan → Agent 2.

**Compression metadata rejected:** Specialist can return to the brief to reduce complexity or increase story length, then regenerate.

**Maximum 2 feedback reruns.** After 2: "Consider revisiting the brief." Specialist can proceed to Agent 2 with best version or return to brief.

**All previous versions retained** until specialist advances.

---

## 10. Age-Derived Parameters

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

| Age | Length | Pages | Words |
|-----|--------|-------|-------|
| 3–5 | Short | 6–8 | ~150–250 |
| 3–5 | Standard | 8–12 | ~300–450 |
| 3–5 | Extended | 12–16 | ~450–600 |
| 5–7 | Short | 8–10 | ~300–450 |
| 5–7 | Standard | 10–14 | ~500–800 |
| 5–7 | Extended | 14–18 | ~800–1100 |
| 7–9 | Short | 10–12 | ~600–900 |
| 7–9 | Standard | 12–16 | ~900–1400 |
| 7–9 | Extended | 16–22 | ~1400–2000 |
| 9–12 | Short | 12–15 | ~1000–1500 |
| 9–12 | Standard | 15–20 | ~1500–2500 |
| 9–12 | Extended | 20–28 | ~2500–3500 |

Word count is the primary writing target. Page count is context — story will be illustrated.

---

## 12. Narrative Obligation Tiers

Reproduced from brief Section 15 for developer reference.

### Tier 1 — Must appear as fully realized scenes (non-negotiable)
- The trigger moment
- Somatic mirroring — at least the first selected expression
- The coping tool in action
- The resolution matching chosen completeness level

### Tier 2 — Must appear, can be compressed
- Primary therapeutic approach arc
- Caregiver presence at specified role
- Shame rules when shame = Central (all three rules, can be one scene)

### Tier 3 — Should appear if space permits, can reduce to single beat
- Supporting approach (can become tonal quality)
- Supporting characters (can be single interaction)
- Second somatic expression
- One true thing detail

### Tier 4 — Enrichment, omit if space is tight
- Creative vision as distinct set piece (can reduce to visual detail)
- Character notes details
- Second supporting character's functional role

### Output metadata requirement
When any element is compressed or omitted, the Step 1 compression metadata must list: what was fully included, what was compressed (and how), what was omitted (and why).

---

## 13. Few-Shot Example Strategy

### Retrieval
- **Key:** Story type + age range
- **Per generation:** Step 1: 2 blueprint examples. Step 2: 1 story example.
- **Matching:** Dynamic from example bank.

### Cold-start fallback
Quality standard instructions replace examples when unavailable.

### Example bank
- Pilot: 1 type × 4 age ranges = 4 buckets
- Each bucket: 2 blueprint examples + 1 story example minimum

### Cold-start plan

| Phase | Action |
|---|---|
| Pre-launch | Clinical team creates 3 gold-standard brief-story pairs per brief Section 22, then expands to 10 seed examples. |
| Launch | Seeds serve all generations. Age mismatch noted in prompt. |
| Month 2+ | Best approved stories nominated as candidates. Separate approval. |
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

## 14. Information Flow Map

| Brief Field | Step 1 | Step 2 | Post-Val |
|---|---|---|---|
| Story type | ✓ (routes) | — | — |
| Age range | ✓ | ✓ | ✓ |
| Peak intensity | ✓ | ✓ | ✓ |
| Story length | ✓ | ✓ | — |
| Resolution completeness + signatures | ✓ | ✓ | ✓ |
| Emotional world | ✓ | — (in ET) | — |
| Specific trigger | ✓ | — (in BP) | — |
| Therapeutic intention | ✓ | — (in ET+BP) | — |
| Creative vision | ✓ (seed) | ✓ (verbatim) | — |
| One true thing | ✓ | ✓ (verbatim) | — |
| Primary approach label | ✓ | — (in AI) | — |
| Primary approach narrative instruction | ✓ (Section 13) | — (in AI) | — |
| Supporting approach label | ✓ | — | — |
| Supporting approach narrative instruction | ✓ | — (in AI) | — |
| Shame dimension + rules (3-rule Central) | ✓ | ✓ | ✓ |
| Somatic expressions (expanded list) | ✓ | ✓ | ✓ |
| Coping tool name | ✓ | ✓ | ✓ |
| Comfort object/memory definition | ✓ | ✓ | — |
| Must-never list | ✓ | ✓ | ✓ |
| Personalization + protagonist | ✓ | ✓ | — |
| Gender "kept open" rules | ✓ | ✓ | — |
| Age relation "slightly older" | ✓ | ✓ | — |
| Caregiver presence (5 options incl. leaves/returns) | ✓ | ✓ | — |
| Narrative distance (ALL ages) | ✓ | ✓ | — |
| Parallel equivalent challenge | ✓ | ✓ | — |
| Supporting characters | ✓ | ✓ | — |
| Functional role sub-fields | ✓ (high priority) | ✓ (high priority) | — |
| Character notes | ✓ | ✓ | — |
| Priority rules (Section 14) | ✓ | — (resolved) | — |
| Narrative obligation tiers (Section 15) | ✓ | ✓ | — |
| Complexity budget status | ✓ (if overloaded) | — (via compression metadata) | — |
| Personalization constraints (5.1) | — | — | — |
| "Why not personalized" (5.2) | — | — | — |

### Step 1 outputs downstream

| Step 1 Output | Step 2 | Post-Val | Specialist |
|---|---|---|---|
| Emotional truth | ✓ | — | ✓ |
| Blueprint | ✓ | — | ✓ |
| Coping tool placement note | ✓ | ✓ | ✓ |
| Approach instruction | ✓ | ✓ | ✓ |
| Inferred intention flag | — | — | ✓ |
| Compression metadata | ✓ | — | ✓ |

---

## 15. Model Allocation and Performance

| Step | Model | Est. Input | Est. Output |
|---|---|---|---|
| Step 1 | Opus 4.6 | ~4,000–6,000 | ~600–1,000 |
| Step 2 | Opus 4.6 | ~2,500–5,000 | ~200–3,500 |
| Post-Val | Sonnet 4.6 | ~1,500–4,500 | ~100–400 |

Input estimates increased from v2 due to obligation tiers, complexity status, Psychoeducation instructions, expanded somatic options, and comfort object definitions.

Total per generation: 3 calls. Max per story: 9 calls (with 2 reruns).
Estimated latency: 30–60 seconds.

---

## 16. Error Handling

| Failure | Behavior |
|---|---|
| Step 1 incoherent | Auto-retry once. If fails: error message + log. |
| Step 2 word count ±30% | Flag to specialist. No auto-retry. |
| Post-validation fails | Story goes to specialist without flags/note. Log. |
| Rerun produces worse output | All versions retained. Specialist chooses. |
| Inferred intention rejected | Rerun with corrected intention. |
| Compression metadata disputed | Specialist returns to brief to adjust complexity or length. |

---

## 17. Unvalidated Brief Conflicts the Agent Must Handle

| Conflict | Step 1 Handling |
|---|---|
| Metaphorical narrative + specific somatic expressions | Translate somatic into metaphorical world. Preserve sensation quality. |
| Normalization (primary) + open resolution | Protagonist knows they're not alone; fear itself unresolved. |
| Creative vision describes resolution + graduated exposure | Vision becomes destination (point 6), not peak. |
| Psychoeducation + shame Central | Naming must never imply "you should have known." The explanation normalizes, not corrects. |
| Leaves-and-returns caregiver + short story length | Departure and reunion compress to brief beats; the emotional core of both moments is preserved. Complexity budget should have flagged this. |

### Recommended additions to brief cross-field validations

| Validation | Trigger | Action |
|---|---|---|
| Modeling + no model character | Primary = Modeling AND caregiver not present AND no supporting characters | Hard block |
| Parallel + personalization ON (3–5) | Distance = Parallel AND personalization ON AND age 3–5 | Soft warning |
| Cognitive reframing + 3–5 | Already in brief v1.2 as validation #8 | Covered |

---

## 18. Extensibility: Non-Pilot Story Types

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

No structural changes to the 2-step chain needed.

---

## 19. Out of Scope

- Agent 2 — targeted edit loop
- Personalization engine — placeholder resolution
- Illustration integration
- Prompt versioning
- Analytics
- Multi-language support

---

## 20. Architectural Risks and Mitigations

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

---

## 21. Changes from Agent 1 Spec v2

This section documents what changed between v2 and v3, keyed to Brief v1.2 changes.

| Brief v1.2 Change | Agent 1 v3 Impact |
|---|---|
| **New: Narrative Obligation Tiers (Section 15)** | Added to Step 1 input and prompt (Section D). Added to Step 2 input and prompt (Section G). New Step 1 output: compression metadata. New specialist interface element. |
| **New: Brief Complexity Budget (Section 16)** | Added to pre-check (Section 4.3). Complexity status passed to Step 1 when overloaded. Blueprint designed with compression in mind from the start. |
| **Resolution completeness moved to Section 3 (Field 3.6)** | No architectural impact — field still reaches all the same steps. Field number references updated throughout. |
| **Psychoeducation added as 7th approach** | Full narrative instruction added to Step 1 prompt Section C. Special handling: explanation emerges from character voice or protagonist discovery, never narrator exposition. Age-specific concreteness rules included. |
| **New cross-validation: Cognitive reframing + 3–5** | No agent impact — handled by brief UI before submission. |
| **Somatic expressions expanded (3 new options)** | Options list updated in Step 1 prompt. No structural change — somatic handling already dynamic. |
| **"Leaves and returns" caregiver option added** | Specific instruction added to Step 1 and Step 2: show both goodbye and reunion. Added to complexity budget as 1.5-page cost. New unvalidated conflict entry for short stories. |
| **"Comfort object or memory" replaces "Transition object"** | Clinical definition added to Step 1 and Step 2 prompts distinguishing it from Positive self-talk. |
| **Shame Central: 3rd rule added** | Updated from 2 rules to 3 in Step 1, Step 2, and post-validation prompts. New rule: at least one character witnesses difficulty and responds with acceptance. |
| **Reassurance & predictability: protagonist notices pattern** | Included in Step 1 approach-specific note. |
| **Narrative arc Phase 1: establish tested relationship** | Included in Step 1 prompt for separation/relational fear stories. |
| **Key Decision #14: Complexity budgeted** | Reflected in architecture — pre-check, Step 1, and specialist interface all handle complexity. |

---

*End of specification.*
