# CLAUDE.md — DAMMAH Project Configuration

## What is DAMMAH

DAMMAH is a platform where licensed child psychologists create therapeutic children's stories using AI. Specialists design and approve every story. Parents browse approved stories and personalize them for their child. The platform does NOT generate stories on demand for parents — psychologists author and approve every story before publication.

## Current build scope

We are building the **Story Brief** system — the form that psychologists fill in to design a therapeutic story before an AI agent generates the first draft. This is the only focus right now.

The pilot launches with **Fear & Anxiety** stories only.

## The canonical source of truth

**`/docs/dammah-story-brief-spec-v1.2.md`** is the single source of truth for the story brief design. Every field name, field type, option list, validation rule, default value, and conditional logic rule comes from this document. Do not invent fields or options that are not in the spec. Do not change field order. Do not rename fields.

When in doubt, read the spec. If the spec and existing code disagree, the spec wins.

## Architecture overview

The story brief system has four layers:

1. **Data model** — the schema for a story brief (all fields, types, constraints, conditional presence)
2. **Validation layer** — cross-field validations (Section 8 of spec) and complexity budget (Section 16 of spec)
3. **Form UI** — 5 sections presented sequentially to the psychologist with progress indicator, save/resume
4. **Agent output** — the structured payload sent to Agent 1 when the brief is submitted, including all agent-internal context (approach definitions, narrative arc, obligation tiers, priority rules, age adaptation rules, structural parameters)

## Story brief structure

The brief has a pre-brief selector and 5 sections, always in this order:

```
Pre-brief: Story Type Selector (routes the entire form)
Section 1: Age & Story Scope (3 fields: age range, peak intensity, story length)
Section 2: Clinical Foundation (5 fields: population, trigger, intention, creative vision, one true thing)
Section 3: Therapeutic Architecture (7 fields: approach, supporting approach, shame, somatic expression, coping tool, resolution, must-never list)
Section 4: Story World (8 fields: personalization, gender, protagonist type, protagonist age, caregiver, narrative distance, supporting characters, character notes)
Section 5: Personalization Configuration (2 conditional fields: constraints or why-not)
```

Total: 19 core fields + 1 pre-brief selector + conditional sub-fields.

## Field types in this project

- **Single choice** — dropdown or radio group, one selection
- **Multi-choice** — checkboxes, limited selections (e.g., up to 2)
- **Free text** — text area with character limit
- **Completion format** — structured fill-in-the-blank ("they should feel ___ because ___")
- **Free text list** — list of items, each a free text entry, with pre-filled defaults
- **Binary yes/no** — toggle or two-button selector

## Critical conditional logic

These rules are non-negotiable. If they are not implemented correctly, the form produces broken briefs:

### Personalization gates protagonist fields
- Personalization ON → hide gender field (4.1), hide protagonist age field (4.3), lock protagonist type (4.2) to "Child character"
- Personalization OFF → show all protagonist fields

### Narrative distance gates sub-field
- "Parallel" selected → show free text sub-field: "What is the equivalent challenge in the parallel world?" (200 chars, optional)
- "Direct" or "Metaphorical" → hide sub-field

### Supporting characters gate functional role prompts
- When any character is selected → show optional free text below it: "What does this character do at the story's key moment?" (150 chars)
- One prompt per selected character (max 2)

### Coping tool gates character requirements
- Coping tool is "Asking for help" or "Safe person" AND caregiver is "Not present" or "Waiting at the end" AND no responding supporting character selected → BLOCK submission

## Cross-field validations

Implement exactly as specified in Section 8 of the spec. Three severity levels:

- **Hard block** (1 rule) — prevents submission entirely
- **Hard warning** (3 rules) — requires explicit acknowledgment to proceed
- **Soft warning** (8 rules) — shown but does not block

## Complexity budget

Section 16 of the spec defines a page-cost system. Every narrative obligation has a weight. The system sums all weights, scales by age range, and compares against the available page budget. When overloaded, show a soft warning listing the specific obligations contributing to the excess.

This is a validation that runs on the complete brief, not on individual fields.

## Pre-filled defaults

Several fields load pre-filled content per story type:

- **Must-never list (3.7)** — 3 default items per type, editable (Section 9 of spec)
- **Therapeutic intention examples (2.3)** — 2 good + 2 bad examples for Fear & Anxiety (spec Field 2.3)
- **Starter prompts for population field (2.1)** — clickable suggestions per type
- **Personalization constraints (5.1)** — 2 default items for Fear & Anxiety

For the pilot, only Fear & Anxiety defaults need to be implemented.

## Therapeutic approach options (pilot)

The Fear & Anxiety type has 7 approaches. Each has a psychologist-facing definition (shown in UI) and an agent instruction (sent in output payload only). See Section 13 of the spec for all 7:

1. Normalization
2. Cognitive reframing
3. Graduated exposure
4. Modeling
5. Reassurance & predictability
6. Self-regulation
7. Psychoeducation (age-appropriate)

## Somatic expression options (pilot)

8 options for Fear & Anxiety, multi-select up to 2 + free text:

1. Freezing / going still
2. Crying / clinging
3. Stomach ache / feeling sick
4. Heart racing / can't breathe
5. Restless / fidgety / can't sit still
6. Going quiet / shutting down
7. Tension / clenching (jaw, fists, shoulders)
8. Sweating / feeling hot

## Coping tool options (pilot)

9 options in 3 categories, single select:

- **Body:** Deep breathing / Counting / Grounding through senses
- **Mind:** Positive self-talk / Visualization / Routine awareness
- **Connection:** Safe person / Comfort object or memory / Asking for help

## Caregiver presence options

5 options, single select:

1. Present and comforting
2. Guides from the side
3. Leaves and returns
4. Waiting at the end
5. Not present

## Shame dimension options

3 levels, single select:

1. Not a significant factor in this story
2. Present — handle with care
3. Central to the experience

## Resolution completeness options

3 options, single select. Default for Fear & Anxiety: Partial resolution.

1. Full resolution
2. Partial resolution
3. Open

## Key rules for AI assistants working on this project

1. **Read the spec before writing code.** Always reference `/docs/dammah-story-brief-spec-v1.2.md` for field definitions, options, and logic.
2. **Field order is fixed.** The section order and field order within sections are finalized design decisions. Do not rearrange.
3. **Structured fields override free text.** If character notes (4.7) conflict with a structured field, the structured field wins. This is an architectural rule, not a suggestion.
4. **Therapeutic mechanism overrides creative vision.** Priority rules are defined in Section 14 of the spec. Follow them.
5. **One coping tool only.** Never allow multiple coping tool selection.
6. **Personalization and animal/fantasy protagonists are mutually exclusive.** When personalization is ON, protagonist type is locked to "Child character." No exceptions.
7. **The must-never list has dual enforcement.** Items are both injected into the agent prompt AND checked by a separate validation pass. Implement both pathways.
8. **The complexity budget is not optional.** Implement the page-cost calculation from Section 16. Without it, psychologists will create briefs that produce checklist stories.

## What NOT to build yet

- Agent 1 (the story generation system) — separate spec, not started
- Agent 2 (specialist review and edit handling) — not designed yet
- Illustration system — out of scope for V1
- Personalization engine (placeholder replacement, gendered language) — separate spec needed
- Live story preview sidebar — explicitly deferred post-pilot
- Non-pilot story types (Big Emotions, Loss & Grief, Identity & Self-Worth, Life Transitions) — data model should accommodate them but UI only needs Fear & Anxiety

## File and folder conventions

```
/docs/                              — specification documents
  dammah-story-brief-spec-v1.2.md   — canonical story brief spec
/src/
  /models/                          — data models and schemas
  /validation/                      — cross-field validations and complexity budget
  /components/brief/                — form UI components, one per section
  /services/                        — agent output builder, defaults loader
```

## How to work with this project

When asked to implement a feature:
1. Identify which section(s) of the spec it relates to
2. Read those sections from `/docs/dammah-story-brief-spec-v1.2.md`
3. Implement exactly what the spec says — no additions, no omissions
4. If the spec is ambiguous on a point, flag it rather than guessing

When asked to modify a field:
1. Check if the modification contradicts the spec
2. If it does, say so and explain which spec section is affected
3. Never silently deviate from the spec
