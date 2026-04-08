# DAMMAH Story Brief — Final Specification

**Version:** 1.3  
**Status:** Finalized — ready for development  
**Scope:** Story creation brief filled in by licensed psychologists, consumed by AI Agent 1 to generate therapeutic story drafts  
**Pilot:** Fear & Anxiety stories only

---

## Table of Contents

1. [Section Order & Rationale](#1-section-order--rationale)
2. [Pre-Brief: Story Type Selector](#2-pre-brief-story-type-selector)
3. [Section 1 — Age & Story Scope](#3-section-1--age--story-scope)
4. [Section 2 — Clinical Foundation](#4-section-2--clinical-foundation)
5. [Section 3 — Therapeutic Architecture](#5-section-3--therapeutic-architecture)
6. [Section 4 — Story World](#6-section-4--story-world)
7. [Section 5 — Personalization Configuration](#7-section-5--personalization-configuration)
8. [Cross-Field Validations](#8-cross-field-validations)
9. [Pre-Filled Defaults: "Must Never" List](#9-pre-filled-defaults-must-never-list)
10. [Agent Internal: Structural Parameters](#10-agent-internal-structural-parameters)
11. [Agent Internal: Age-Range Adaptation Rules](#11-agent-internal-age-range-adaptation-rules)
12. [Agent Internal: Narrative Arc Template](#12-agent-internal-narrative-arc-template)
13. [Agent Internal: Therapeutic Approach Definitions](#13-agent-internal-therapeutic-approach-definitions)
14. [Agent Internal: Priority Rules](#14-agent-internal-priority-rules)
15. [Agent Internal: Narrative Obligation Tiers](#15-agent-internal-narrative-obligation-tiers)
16. [Brief Complexity Budget](#16-brief-complexity-budget)
17. [Fields That Vary by Story Type](#17-fields-that-vary-by-story-type)
18. [Fields Removed from Previous Design](#18-fields-removed-from-previous-design)
19. [Fields Added](#19-fields-added)
20. [Key Design Decisions](#20-key-design-decisions)
21. [UI Requirements](#21-ui-requirements)
    - [Complexity Handling UI](#complexity-handling-ui)
22. [Pre-Development Deliverables](#22-pre-development-deliverables)

---

## 1. Section Order & Rationale

| Order | Section | Rationale |
|-------|---------|-----------|
| Pre-brief | Story Type Selector | Routes the entire form. Determines which fields appear, which options are shown, which hints and defaults are loaded. Must come first. |
| 1 | Age & Story Scope | Age range shapes how every subsequent field should be interpreted — vocabulary of the population description, complexity of the coping tool, appropriateness of peak intensity. The psychologist must scope before they design. |
| 2 | Clinical Foundation | The psychologist's clinical thinking: who are these children, what triggers the difficulty, what is the therapeutic goal. This is the core clinical input and depends on knowing the age range. |
| 3 | Therapeutic Architecture | The clinical mechanism: how the story will work therapeutically. Depends on the foundation being established first — the psychologist needs to have articulated the trigger and intention before choosing an approach. |
| 4 | Story World | The narrative design: who is in the story, what world it inhabits, how close it sits to reality. Depends on all clinical decisions being made. The psychologist designs the vessel after designing the medicine. |
| 5 | Personalization Configuration | Configures what parents can change. Depends on the personalization decision made at the top of Section 4. Intentionally last — it is a configuration step, not a clinical design step. |

---

## 2. Pre-Brief: Story Type Selector

**Position:** Before the brief begins  
**Type:** Single choice, required  
**UI framing:** *"Choose the lens this story looks through."*

**Options:**

| # | Type | Description |
|---|------|-------------|
| 1 | Fear & Anxiety | Stories about specific fears, worries, anxious responses to situations |
| 2 | Big Emotions | Stories about overwhelming emotions — anger, frustration, sadness, overstimulation |
| 3 | Loss & Grief | Stories about losing someone or something important |
| 4 | Identity & Self-Worth | Stories about how a child sees themselves, feels about themselves |
| 5 | Life Transitions | Stories about major changes — new sibling, moving, starting school, divorce |

**Routing behavior:** The story type determines which fields appear, which options are available within fields, which hints/prompts are shown, and which pre-filled defaults are loaded. All downstream field configurations are keyed to the selected type.

**Overlap rule:** When a situation could fit multiple types (e.g., a child anxious about mistakes could be Fear & Anxiety or Identity & Self-Worth), the psychologist picks the therapeutic lens they want to apply. The type is a lens, not a diagnosis.

**Future scope note:** Big Emotions combines externalizing emotions (anger, frustration), internalizing emotions (sadness), and sensory processing (overstimulation). These require different therapeutic approaches, coping tools, and somatic expressions. Big Emotions may require sub-type routing in a future version to provide sufficiently specific field options. For V1, only Fear & Anxiety is in scope.

---

## 3. Section 1 — Age & Story Scope

### Field 1.1 — Target Age Range

- **Type:** Single choice, required
- **Options:** 3–5 / 5–7 / 7–9 / 9–12
- **Note:** 5 appears in two ranges intentionally (boundary children). Single-select — psychologist picks the developmental level they are targeting.
- **Downstream effects:** Governs language complexity, coping tool appropriateness, protagonist type guidance, structural parameters (word count, page count, sentence length), and triggers cross-validation against peak intensity and coping tool selection.

### Field 1.2 — Peak Emotional Intensity

- **Type:** Single choice, required
- **Options:** Very gentle / Moderate / Significant
- **Definition:**
  - Very gentle — the protagonist feels uneasy or uncertain; discomfort is brief
  - Moderate — the protagonist experiences real distress but within a contained arc
  - Significant — the protagonist is genuinely overwhelmed before the resolution
- **Cross-validation:** Significant + ages 3–5 = hard warning (see Section 8)

### Field 1.3 — Story Length

- **Type:** Single choice, required
- **Default:** Standard
- **Options:** Short / Standard / Extended
- **UI preview per age range (shown to psychologist after selection):**
  - 3–5 Short: *"A brief story of about 6–8 pages, read aloud in 3–5 minutes"*
  - 3–5 Standard: *"A bedtime-length story of about 8–12 pages, read aloud in 5–7 minutes"*
  - 3–5 Extended: *"A longer story of about 12–16 pages, read aloud in 8–10 minutes"*
  - 5–7 Short: *"A brief story of about 8–10 pages, read aloud in 4–6 minutes"*
  - 5–7 Standard: *"A bedtime-length story of about 10–14 pages, read aloud in 6–9 minutes"*
  - 5–7 Extended: *"A longer story of about 14–18 pages, read aloud in 9–12 minutes"*
  - 7–9 Short: *"A short chapter of about 10–12 pages, read aloud in 6–8 minutes"*
  - 7–9 Standard: *"A standard chapter of about 12–16 pages, read aloud in 8–12 minutes"*
  - 7–9 Extended: *"A longer chapter of about 16–22 pages, read aloud in 12–16 minutes"*
  - 9–12 Short: *"A short story of about 12–15 pages, read aloud in 8–12 minutes"*
  - 9–12 Standard: *"A standard story of about 15–20 pages, read aloud in 12–18 minutes"*
  - 9–12 Extended: *"A longer story of about 20–28 pages, read aloud in 18–25 minutes"*

---

## 4. Section 2 — Clinical Foundation

### Field 2.1 — Emotional World of the Population

- **Type:** Free text, required
- **Character limit:** 600
- **Prompt:** *"What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?"*
- **Hint adapts per story type.**
- **Starter prompts (clickable, not required, shown as suggestions):**
  - Fear & Anxiety: *"Think about: What are they afraid will happen? What do they do to avoid it? What do adults misunderstand about this fear?"*
- **Agent use:** Sets the emotional tone, mirroring language, and internal voice of the protagonist. This field describes the inner world — not the situation.

### Field 2.2 — The Specific Trigger

- **Type:** Free text, required
- **Character limit:** 400
- **Label adapts per story type:**
  - Fear & Anxiety: "The specific trigger"
- **Prompt:** *"What precise moment or situation triggers the anxiety this story addresses?"*
- **Specificity nudge:** If input is under 80 characters, show: *"Can you add what the child sees, hears, or feels in this moment?"*
- **Agent use:** This is the story's inciting event. The agent builds the central scene from this input. It defines setting, moment of tension, and physical space.

### Field 2.3 — Therapeutic Intention

- **Type:** Completion format, required (both halves required)
- **Format:** *"When a child closes this book, they should feel ___ because ___"*
- **Inline guidance — shown directly in the UI per story type:**

  **Fear & Anxiety — good examples:**
  - *"...feel quietly brave because they have discovered that asking for help is something brave people do"*
  - *"...feel safely held because they have experienced that the people who love them always come back, even when it doesn't feel that way"*

  **Fear & Anxiety — avoid this:**
  - *"...feel better because there's nothing to be scared of"* — dismisses the fear
  - *"...feel safe because anxiety is a normal neurological response"* — too clinical for a children's story

- **Soft validation nudge:** If the combined input across both halves is under 60 characters total, show: *"This may be too brief for the agent to work with. Can you make the second half more specific?"*
- **Agent use:** This is the agent's north star. The first blank sets the emotional tone of the resolution. The second blank sets the core message the story delivers. If they appear to conflict, the agent treats the second blank as the story's core message and the first blank as the tonal quality of the ending.
- **Agent fallback for weak intentions:** If the therapeutic intention is vague or generic (e.g., "feel better," "feel safe," "everything will be okay"), the agent infers a more specific intention from the combination of the trigger (Field 2.2), the primary mechanism (Field 3.1), and the coping tool (Field 3.5). The inferred intention must be flagged in the output for the psychologist to review.

### Field 2.4 — Clinical Creative Vision

- **Type:** Free text, required
- **Character limit:** 400
- **Prompt:** *"Describe one specific image, moment, or detail you see at the heart of this story. Not a mood — a scene. This image should support your therapeutic approach, not replace it. What is happening, who is there, what does the child notice?"*
- **Agent use:** This is the creative anchor. The agent builds the story's central image or turning point from this input. Vague inputs ("a warm environment") are deprioritized. Specific inputs ("the child finds a small glowing door at the end of a hallway") become the story's visual and emotional centerpiece.
- **Agent priority rule:** The therapeutic mechanism (Field 3.1) defines the story's arc. The clinical creative vision enriches that arc — it does not override it. If the creative vision conflicts with the mechanism, the agent adapts the vision to serve the mechanism. For example: if the mechanism is graduated exposure and the vision describes a safe hiding place, the hiding place becomes the starting point from which the protagonist gradually ventures out — not the resolution.

### Field 2.5 — One True Thing

- **Type:** Free text, optional
- **Character limit:** 300
- **Prompt:** *"Picture a child you have worked with who this story would have helped. Without identifying them — one physical or emotional detail you remember: a gesture, a habit, a sentence, a look on their face."*
- **Agent use:** When present, this detail is embedded in the story as a moment of felt truth — a behavior the protagonist exhibits, a physical gesture, a small detail that makes the story feel written for a real child. The agent does not use it as a plot point — it is woven into character texture.

---

## 5. Section 3 — Therapeutic Architecture

### Field 3.1 — Primary Therapeutic Approach

- **Type:** Single choice, required
- **Options vary per story type.**
- **Fear & Anxiety options:**
  - Normalization
  - Cognitive reframing
  - Graduated exposure
  - Modeling
  - Reassurance & predictability
  - Self-regulation
  - Psychoeducation (age-appropriate)
- **Psychologist-facing definitions:** Each option shows a 1-sentence description (see Section 13 for full definitions and agent instructions).
- **Agent use:** Determines the story's therapeutic spine — how the protagonist moves from difficulty to resolution. The primary approach shapes the plot structure, not just the message. See Section 13 for the narrative technique the agent applies per approach.
- **Cross-validation:** Cognitive reframing + ages 3–5 = soft warning (see Section 8).

### Field 3.2 — Supporting Approach

- **Type:** Single choice, optional
- **Options:** Same list as Field 3.1, minus the selected primary approach (primary is excluded from the list)
- **Conflict handling:** When potentially conflicting pairs are selected (e.g., Graduated exposure + Reassurance & predictability), show: *"These approaches can pull in different directions. Is this intentional?"* — psychologist resolves.
- **Agent use:** The supporting approach flavors the story without driving the arc. If absent, the agent works from the primary approach alone.

### Field 3.3 — Shame Dimension

- **Type:** Single choice, required (three levels)
- **Options:**
  - Not a significant factor in this story — the agent does not need to address shame
  - Present — handle with care — the agent avoids anything implying fault but does not override the primary mechanism
  - Central to the experience — the agent prioritizes normalization (even if not the primary mechanism) and follows three hard rules: (1) the story must demonstrate the child is not alone in this feeling, (2) the story must never imply the child should have known better, done better, or felt differently, (3) at least one character must witness the protagonist's difficulty and respond with acceptance, not correction
- **Agent use:** Graduated instruction set. "Not significant" = no special handling. "Present" = avoidance constraints. "Central" = active normalization + hard constraints.

### Field 3.4 — Somatic Expression (Fear & Anxiety only)

- **Type:** Multi-select (up to 2) + optional free text, required (for Fear & Anxiety type only)
- **Label:** "How does the anxiety show up in the body?"
- **Options:**
  - Freezing / going still
  - Crying / clinging
  - Stomach ache / feeling sick
  - Heart racing / can't breathe
  - Restless / fidgety / can't sit still
  - Going quiet / shutting down
  - Tension / clenching (jaw, fists, shoulders)
  - Sweating / feeling hot
- **Optional free text:** Positioned directly below the checkboxes. Prompt: *"Anything else the body does?"* — 150 characters.
- **Agent use:** The agent uses these to write the protagonist's physical anxiety response. The story mirrors the child's real somatic experience. This is the foundation of emotional mirroring — the child recognizes their body in the protagonist's body.
- **Note:** This field only appears for Fear & Anxiety. Other story types have their own type-specific field (see Section 17).

### Field 3.5 — The Coping Tool

- **Type:** Single choice, required
- **Options grouped by category, vary per story type.**
- **Fear & Anxiety options:**
  - **Body:** Deep breathing / Counting / Grounding through senses
  - **Mind:** Positive self-talk / Visualization / Routine awareness
  - **Connection:** Safe person / Comfort object or memory / Asking for help
- **Design rule:** One tool only. The agent shows the protagonist using this tool at the story's most difficult moment — demonstrated in action, never named or explained didactically.
- **Coping tool definition — Comfort object or memory:** *"Something that represents the absent caregiver or a safe relationship — a physical object for younger children (a scarf, a stone, a drawing), a memory or internalized voice for older children ('I can hear my mom saying you've got this')."* This is clinically distinct from Positive self-talk, which is self-generated. Comfort object or memory recalls another person's presence.
- **Age-range note:** If age range is 3–5 and an abstract tool is selected (Routine awareness, Visualization, Positive self-talk), show: *"For younger children, the agent will show this as a simple physical action or repeated pattern — not verbal self-talk."*
- **Cross-validations:** See Section 8. Relational tools require character support. Abstract tools get age warnings.

### Field 3.6 — Resolution Completeness

- **Type:** Single choice, required
- **Default per type:** Fear & Anxiety = Partial resolution
- **Options:**
  - Full resolution — the protagonist overcomes the difficulty
  - Partial resolution — the protagonist takes a brave step but the feeling is not gone
  - Open — the protagonist is better equipped but the journey continues
- **Agent instruction:** This governs the final scene. Full resolution ends with the protagonist succeeding. Partial resolution ends with the protagonist having used the coping tool and feeling better, but acknowledging the feeling may return. Open resolution ends with the protagonist looking ahead, equipped but not finished.
- **Agent emotional signatures:**
  - Full resolution: relief, accomplishment, safety restored. The story ends on a high.
  - Partial resolution: cautious hope, the tool helped but the feeling lingers gently. The story ends warm but honest.
  - Open: the protagonist has something they didn't have before — a tool, a friend, a new understanding — but the journey is unfinished. The story ends looking forward.

### Field 3.7 — What This Story Must Never Do

- **Type:** Free text list, required, minimum 1 item
- **Pre-filled defaults per story type** (psychologist can keep, remove, or add to these — see Section 9)
- **Prompt:** *"Clinical and content constraints together — the agent treats every item as a hard rule."*
- **Enforcement mechanism:** Constraints are enforced at two levels: (1) all items are injected into the agent's system prompt as hard rules during generation, (2) a separate validation pass reviews the completed draft against each constraint item and flags potential violations with the specific constraint and the passage that may violate it. Flagged violations are surfaced to the psychologist during review. Prompt-level constraints alone are insufficient — LLMs do not reliably follow open-ended negative constraints during generation.

---

## 6. Section 4 — Story World

### Field 4.0 — Personalization Decision

- **Type:** Binary yes/no, required
- **Default:** Yes (for pilot — Fear & Anxiety, ages 3–7)
- **Position:** First field in this section
- **Options:**
  - **Yes** — *"Parents add their child's name, gender, and photo. The protagonist is their child. Strongest identification."*
  - **No** — *"You design the protagonist fully. The child reads about someone else. Protective distance."*
- **Downstream effects:** When YES: Fields 4.1 (gender) and 4.3 (age relative to reader) are hidden. Field 4.2 (protagonist type) is locked to "Child character." When NO: All protagonist fields are visible and editable.

### Field 4.1 — Protagonist Gender

- **Type:** Single choice, required
- **Visibility:** Only shown when personalization is OFF
- **Options:** Boy / Girl / Kept open
- **"Kept open" behavior:** Agent uses a neutral animal name or ungendered fantasy character. No they/them pronouns for ages under 7 (linguistically complex for the target audience).
- **When personalization is ON:** Hidden. Gender comes from the parent at personalization time. Agent writes with `[CHILD_NAME]` and `[he/she/they]` placeholders. Story structure does not depend on gender.

### Field 4.2 — Protagonist Type

- **Type:** Single choice, required
- **Options:** Child character / Animal character / Fantasy character
- **When personalization is ON:** Locked to "Child character." Not shown as a choice. The child IS the protagonist — animal and fantasy characters are incompatible with personalization (see Key Design Decisions, Section 20).
- **When personalization is OFF:** All three options available.
- **Age-range guidance (shown as non-binding notes):**
  - 3–5: *"Animal characters are recommended for this age — they provide protective distance."*
  - 5–7: *"Both animal and child characters work well at this age."*
  - 7–9 / 9–12: *"Child characters enable stronger identification for older readers."*

### Field 4.3 — Protagonist Age Relative to Reader

- **Type:** Single choice, required
- **Visibility:** Only shown when personalization is OFF
- **Default:** Same age
- **Options:** Same age / Slightly older
- **When personalization is ON:** Hidden. Defaults to "Same age." The protagonist is the child at their current developmental level.

### Field 4.4 — Caregiver's Presence

- **Type:** Single choice, required
- **Options:**
  - Present and comforting
  - Guides from the side
  - Leaves and returns — *"The caregiver departs during the story and comes back. The story includes both the goodbye and the reunion."*
  - Waiting at the end
  - Not present
- **Cross-validations:** See Section 8. Multiple conflict rules apply.

### Field 4.5 — Narrative Distance

- **Type:** Single choice, required
- **Options:** Direct / Parallel / Metaphorical
- **Definitions:**
  - Direct — story mirrors the real situation closely. Same setting, same challenge, recognizable world.
  - Parallel — similar situation with softened or shifted details. Different setting, same emotional core.
  - Metaphorical — situation represented symbolically. The challenge is abstracted into a fantasy or symbolic scenario.
- **Sub-field (conditional):** When "Parallel" is selected, show a free text field:
  - **Label:** *"What is the equivalent challenge in the parallel world?"*
  - **Character limit:** 200
  - **Status:** Optional, but strongly encouraged. Show note: *"Without this, the agent will create the parallel mapping on its own."*
  - **Example placeholder:** *"A magical library where the character can't find the room where their favorite book is kept"*
  - **Agent use:** If provided, the agent uses this as the emotional and situational mapping for the parallel world — not just the backdrop, but what stands in for the real difficulty. If left blank, the agent constructs the parallel by preserving: (1) the emotional core of the trigger, (2) the social dynamics (who knows, who doesn't, who might judge), and (3) the physical or practical stakes. The agent changes surface setting and details but not the emotional architecture.
- **Personalization + Direct note:** When personalization is ON and narrative distance is "Direct," show: *"The story will closely mirror the child's real experience, using their name and identity. Ensure the emotional intensity is appropriate."*

### Field 4.6 — Supporting Characters

- **Type:** Multi-choice, optional, up to 2
- **Options:**
  - A peer who shows it's possible
  - A peer who goes through it alongside
  - A teacher or adult who guides
  - An animal friend who accompanies
  - A sibling who offers perspective
- **Conditional requirement:** If the coping tool is relational (Asking for help, Safe person) AND the caregiver is "Not present" or "Waiting at the end" — at least one supporting character capable of responding (teacher/adult, peer who shows it's possible) must be selected. See Section 8.
- **Functional role prompt (conditional):** When any supporting character is selected, show an optional free text field directly below each selected character:
  - **Label:** *"What does this character do at the story's key moment?"*
  - **Character limit:** 150
  - **Status:** Optional. One prompt per selected character (if 2 characters selected, 2 prompts shown).
  - **Agent use:** If provided, the agent treats this as a high-priority instruction for that character's behavior in the climactic scene. If left blank, the agent infers function from the character label.

### Field 4.7 — Character Notes

- **Type:** Free text, optional
- **Character limit:** 300
- **Prompt:** *"Add detail about your characters — personality, appearance, habits, how they speak. The character roles and presence you selected above will not be changed by what you write here."*
- **Agent priority:** Structured fields define the story's architecture. Character notes add texture and specificity within that architecture. If character notes contain information that contradicts a structured field selection (caregiver presence, protagonist type, narrative distance, character roles), the structured field wins. The agent uses character notes for enrichment — physical traits, habits, relationship dynamics, dialogue style — not for overriding story structure.

---

## 7. Section 5 — Personalization Configuration

### If Personalization is ON:

**Section 5 — Personalized story confirmation (no additional inputs)**

- **Purpose:** Confirm what the parent can personalize for this story.
- **UI copy:** *"This story is personalized. Parents can personalize it with the child’s name and photo."*
- **System behavior:** No additional configuration is collected in this section.

### If Personalization is OFF:

**Field 5.2 — Why Not**

- **Type:** Free text, required when personalization is OFF
- **Prompt:** *"Why is this story better with a fixed protagonist? This note is shown to parents."*

---

## 8. Cross-Field Validations

### Hard Blocks (prevent submission)

| # | Conflict | Trigger | System Action |
|---|----------|---------|---------------|
| 1 | Relational coping tool + no available responder | Coping tool is "Asking for help" or "Safe person" AND caregiver is "Not present" or "Waiting at the end" AND no supporting character capable of responding is selected (teacher/adult, peer who shows it's possible) | Block submission. Message: *"The coping tool requires someone the protagonist can turn to. Please add a present caregiver or a supporting character who can respond."* |

### Hard Warnings (require acknowledgment to proceed)

| # | Conflict | Trigger | System Action |
|---|----------|---------|---------------|
| 2 | Significant intensity for youngest children | Peak intensity = "Significant" AND age range = 3–5 | Warning: *"Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?"* Psychologist must confirm. |
| 3 | Graduated exposure + comforting caregiver | Primary approach = "Graduated exposure" AND caregiver = "Present and comforting" | Warning: *"A consistently comforting caregiver may reduce the therapeutic effect of graduated exposure. Is this intentional?"* |

### Soft Warnings (shown but do not block)

| # | Conflict | Trigger | System Action |
|---|----------|---------|---------------|
| 4 | Self-regulation + comforting caregiver | Primary approach = "Self-regulation" AND caregiver = "Present and comforting" | Note: *"The caregiver's presence may reduce the protagonist's need to self-regulate. Consider 'Guides from the side' as an alternative."* |
| 5 | Shame central + normalization absent | Shame dimension = "Central to the experience" AND normalization is NOT the primary or supporting approach | Note: *"Shame is central to this experience. Normalization is typically important when shame is present — consider adding it as a supporting approach."* |
| 6 | Separation anxiety + caregiver not present | Trigger text contains separation-related keywords AND caregiver = "Not present" | Note: *"For separation anxiety, the caregiver's return is often part of the therapeutic arc. 'Waiting at the end' may serve this story better."* |
| 7 | Abstract coping tool + young age | Coping tool is "Routine awareness," "Visualization," or "Positive self-talk" AND age range = 3–5 | Note: *"For younger children, the agent will show this tool as a simple physical action or repeated pattern — not verbal self-talk."* |
| 8 | Cognitive reframing + young age | Primary approach = "Cognitive reframing" AND age range = 3–5 | Note: *"Cognitive reframing requires developmental capacity for perspective-taking. For ages 3–5, consider Normalization, Modeling, or Psychoeducation instead."* |

---

## 9. Pre-Filled Defaults: "Must Never" List

These appear pre-populated in Field 3.7. The psychologist can keep, remove, or add items.

### Fear & Anxiety Defaults

1. Never imply the child's fear is silly, irrational, or something to be ashamed of
2. Never resolve the fear by someone else fixing the situation for the child (unless "Asking for help" is the selected coping tool)
3. Never depict the feared situation as actually dangerous or confirm the child's worst-case scenario

### Big Emotions Defaults

1. Never label the child's emotion as "bad" or "wrong"
2. Never resolve the emotion by suppressing it — the emotion must be felt before it passes
3. Never show other characters punishing or rejecting the child for their emotional expression

### Loss & Grief Defaults

1. Never suggest the child should be "over it" or that the grief has a timeline
2. Never replace what was lost — the story honors the loss, it does not undo it
3. Never use euphemisms that obscure what happened (unless age-appropriate language requires softening)

### Identity & Self-Worth Defaults

1. Never reinforce the negative self-belief, even temporarily as a narrative device
2. Never resolve the story by external validation alone — the shift must include internal recognition
3. Never compare the child to others as a way to demonstrate their worth

### Life Transitions Defaults

1. Never dismiss what the child is losing in the transition
2. Never suggest the child should be excited or grateful for the change
3. Never present the old situation as inferior to the new one

---

## 10. Agent Internal: Structural Parameters

These parameters are derived automatically from the age range and story length fields. They are not shown to the psychologist. The psychologist sees only the human-readable preview (Field 1.3).

| Age Range | Length | Pages | Sentences/Page | Words/Sentence | Total Words (approx) |
|-----------|--------|-------|-----------------|----------------|---------------------|
| 3–5 | Short | 6–8 | 1–2 | 8–12 | 150–250 |
| 3–5 | Standard | 8–12 | 2–3 | 8–12 | 300–450 |
| 3–5 | Extended | 12–16 | 2–3 | 8–12 | 450–600 |
| 5–7 | Short | 8–10 | 2–3 | 10–15 | 300–450 |
| 5–7 | Standard | 10–14 | 3–4 | 10–15 | 500–800 |
| 5–7 | Extended | 14–18 | 3–4 | 10–15 | 800–1100 |
| 7–9 | Short | 10–12 | 3–5 | 12–18 | 600–900 |
| 7–9 | Standard | 12–16 | 4–6 | 12–18 | 900–1400 |
| 7–9 | Extended | 16–22 | 4–6 | 12–18 | 1400–2000 |
| 9–12 | Short | 12–15 | 5–7 | 15–20 | 1000–1500 |
| 9–12 | Standard | 15–20 | 5–8 | 15–20 | 1500–2500 |
| 9–12 | Extended | 20–28 | 5–8 | 15–20 | 2500–3500 |

---

## 11. Agent Internal: Age-Range Adaptation Rules

These rules govern how the agent writes. They are not shown to the psychologist.

### Ages 3–5

- **Vocabulary:** Concrete, physical, sensory words. No emotional abstraction. "Scared" not "anxious." "Tummy felt funny" not "a wave of nausea."
- **Emotional pacing:** Fast return to safety. The dark moment is brief — 1–2 pages at most. Reassurance arrives quickly.
- **Coping tool presentation:** Shown as a physical action. The rabbit takes three big breaths. The bear squeezes his special stone. Never verbal self-talk or internal monologue.
- **Narrative complexity:** Strictly linear. One character, one problem, one resolution. No subplots, no flashbacks, no parallel threads.
- **Caregiver role:** Almost always present or returning. Stories where the protagonist is fully alone for extended periods are inappropriate for this age.
- **Repetition:** Use rhythmic repetition — repeated phrases, predictable patterns. This is soothing and aids comprehension.

### Ages 5–7

- **Vocabulary:** Still concrete but can include simple emotional words. "Worried" is acceptable. "Overwhelmed" is not.
- **Emotional pacing:** Moderate. The dark moment can be sustained for 2–3 pages. The child can hold mild discomfort.
- **Coping tool presentation:** Can be shown as a deliberate choice the character makes. "She decided to count the blue things she could see." Simple internal narration is acceptable.
- **Narrative complexity:** Linear with one minor complication allowed. A friend who has the same problem. A first attempt that doesn't fully work.
- **Caregiver role:** Can be less present. "Waiting at the end" works well. "Not present" is possible if a supporting adult character exists.

### Ages 7–9

- **Vocabulary:** Emotional vocabulary expands. "Anxious," "embarrassed," "frustrated" are appropriate. Can use simile: "it felt like a rock in her chest."
- **Emotional pacing:** Can sustain tension across multiple scenes. The resolution can be gradual rather than sudden.
- **Coping tool presentation:** Can include internal process. "He reminded himself that the last time felt scary too, and he got through it." Visualization and self-talk are shown naturally.
- **Narrative complexity:** Can handle secondary character arcs, a brief flashback, or a moment of reflection. Two-scene structure (attempt → setback → new attempt) works well.
- **Caregiver role:** Protagonist can be independent. Caregiver presence is a design choice, not a developmental necessity.

### Ages 9–12

- **Vocabulary:** Full emotional range. "She felt the weight of everyone's expectations." Abstract emotional concepts are accessible.
- **Emotional pacing:** Can sustain extended tension. The dark moment can be the emotional center of the story. Resolution unfolds over multiple pages.
- **Coping tool presentation:** Can show full internal process — recognition, choice, effort, partial success. The tool can be shown failing the first time and working the second.
- **Narrative complexity:** Subplots, secondary character perspectives, non-linear moments (flashback to a previous success or failure), and thematic layering are all appropriate.
- **Caregiver role:** Fully optional. The protagonist's journey can be entirely self-directed. Caregiver presence, when chosen, represents a thematic choice rather than a safety need.

---

## 12. Agent Internal: Narrative Arc Template

The agent follows a canonical story arc adapted per age range. This provides narrative shape — the agent has flexibility in how each phase is expressed, but the sequence and purpose of each phase is fixed.

### Core Arc (all ages)

1. **Safe beginning** — The world before the trigger. The protagonist in their normal state. Establish who they are and what they care about. For stories involving separation or relational fears, this phase must establish the specific relationship that will be tested — not just the protagonist's world, but who they feel safe with and how that safety feels.
2. **The trigger moment** — The inciting event (from Field 2.2). Tension rises. The protagonist encounters the difficulty.
3. **The body feels it** — Somatic mirroring (from Field 3.4). The protagonist's physical anxiety response. The child reading recognizes their own body.
4. **The difficult peak** — The protagonist at their most stuck. This is the moment of maximum emotional intensity (calibrated by Field 1.2). The protagonist does not yet have access to the coping tool.
5. **The tool in action** — The protagonist uses the coping tool (from Field 3.5). Shown in action, never named. This is the story's therapeutic delivery.
6. **The shift** — Something changes. The tool doesn't fix everything — but it moves the needle. The protagonist feels different from how they felt at the peak.
7. **The landing** — Emotional resolution matching the therapeutic intention (Field 2.3) and resolution completeness (Field 3.6). The story closes with the emotional signature appropriate to the chosen resolution type.

### Age Adaptations

- **Ages 3–5:** Phases 1–3 are brief (1–2 pages each). Phase 4 is short — the protagonist is stuck but not for long. Phase 5 may be facilitated by another character. Phases 6–7 merge into a single warm resolution. Total: 7 phases compressed into a simple, reassuring arc.
- **Ages 5–7:** All phases present. Phase 4 can be sustained slightly longer. Phase 5 can include a first attempt that partially works. Phases 6–7 are distinct.
- **Ages 7–9:** Phases 4–5 can include a setback (attempt → fail → second attempt). Phase 6 can be gradual. Phase 7 can include reflection.
- **Ages 9–12:** Full arc with possible non-linear elements. Phase 1 can include foreshadowing. Phase 4 can be the emotional center of the story. Phase 5 can show the tool failing before working. Phase 7 can be open-ended or contemplative.

---

## 13. Agent Internal: Therapeutic Approach Definitions

Each option in Field 3.1 has a psychologist-facing definition (shown in UI) and an agent instruction (how to build the narrative).

### Fear & Anxiety Approaches

**Normalization**
- **Psychologist-facing:** *"The story shows the child that their fear is common and shared — they are not alone or broken."*
- **Agent instruction:** The story world treats the fear as unremarkable. Other characters (peers, animals, even the environment) reveal that they have experienced the same thing. The protagonist discovers they are not the only one. The narrative never explicitly says "this is normal" — it demonstrates it through the story world.

**Cognitive reframing**
- **Psychologist-facing:** *"The story helps the child see the situation from a new angle — changing how they think about what scares them."*
- **Agent instruction:** The protagonist encounters information, a perspective, or an experience that changes the meaning of the feared situation. The fear doesn't disappear — the protagonist's interpretation of it shifts. Example: the strict teacher is revealed to be worried about the children's safety, not angry at them. The reframe must emerge from the story, never from a lecture or explanation.

**Graduated exposure**
- **Psychologist-facing:** *"The story walks the child through approaching the feared situation step by step — each step a little braver."*
- **Agent instruction:** The protagonist faces the feared situation in increments. First a small version, then a slightly bigger version. Each step is uncomfortable but survivable. The story shows that the feared consequence does not happen — or is less bad than expected. The caregiver or supporting character may encourage but does not do it for the protagonist.

**Modeling**
- **Psychologist-facing:** *"The story shows another character successfully navigating the same fear — giving the child a model to follow."*
- **Agent instruction:** A supporting character (or the protagonist observing another character) demonstrates coping with the same or similar fear. The protagonist watches, learns, and then tries it themselves. The model character should show effort, not effortlessness — coping is hard and the model character shows it is possible, not easy.

**Reassurance & predictability**
- **Psychologist-facing:** *"The story creates safety through routine, predictability, and the reliable presence of trusted people."*
- **Agent instruction:** The story world has structure and repetition. Events follow a predictable sequence. Trusted characters behave consistently. The protagonist discovers that the world has patterns they can rely on. The coping comes primarily from external stability and the reliable behavior of trusted characters. However, the story must include at least one moment where the protagonist notices the pattern themselves — recognizing the predictability rather than only receiving it. This seeds internal capacity without requiring the protagonist to self-regulate.

**Self-regulation**
- **Psychologist-facing:** *"The story focuses on the child's ability to manage their own response — building internal capacity."*
- **Agent instruction:** The protagonist learns to use an internal resource (the coping tool) to shift their own emotional state. No one rescues them. The story shows the protagonist noticing their own state, making a choice, applying the tool, and experiencing a shift. The emphasis is on agency and internal capacity.

**Psychoeducation (age-appropriate)**
- **Psychologist-facing:** *"The story helps the child understand what is happening in their body or mind — naming the experience within the narrative, not as a lesson."*
- **Agent instruction:** The protagonist (or a trusted character) names the feeling or the body's response in simple, age-appropriate language embedded in the story's natural flow. This is not a lecture or a lesson — it is a moment of recognition where the experience is given a name or an explanation that makes it less frightening. Example: "That's your worry feeling," said the bear. "It comes when something is new. It doesn't mean something bad is happening — it means your body is paying extra attention." The explanation must emerge from a character's voice or the protagonist's discovery, never from narrator exposition. For ages 3–5, the naming should be concrete and physical ("your tummy does that when it's worried"). For ages 7+, it can include simple cause-and-effect ("when your brain thinks something might be scary, it sends a signal to your body to get ready").

---

## 14. Agent Internal: Priority Rules

When brief fields contain conflicting or ambiguous information, the agent follows these priority rules:

| Priority | Rule |
|----------|------|
| 1 | **Cross-field validations (Section 8)** — any combination that was validated at submission is treated as intentional |
| 2 | **Therapeutic mechanism (Field 3.1)** — defines the story's arc. Overrides creative vision if they conflict |
| 3 | **Therapeutic intention (Field 2.3)** — defines the story's destination. Shapes the resolution |
| 4 | **Coping tool (Field 3.5)** — defines the story's therapeutic delivery moment |
| 5 | **Structured field selections** (all dropdowns and single-choice fields) — define the story's architecture |
| 6 | **Clinical creative vision (Field 2.4)** — enriches the arc, does not override it |
| 7 | **Free text fields** (population, trigger, one true thing, character notes) — add texture and specificity within the architecture defined by structured fields |

**Specific rule for character notes (Field 4.7):** Structured fields define the story's architecture. Character notes add texture within that architecture. If character notes contradict a structured field (caregiver presence, protagonist type, narrative distance, character roles), the structured field wins.

**Specific rule for creative vision (Field 2.4):** If the creative vision conflicts with the therapeutic mechanism, the agent adapts the vision to serve the mechanism. Example: if the mechanism is graduated exposure and the vision describes a safe hiding place, the hiding place becomes the starting point from which the protagonist gradually ventures out — not the resolution.

**Specific rule for weak therapeutic intention (Field 2.3):** If the therapeutic intention is vague or generic, the agent infers a more specific intention from Fields 2.2 + 3.1 + 3.5. The inferred intention is flagged in the output for psychologist review.

---

## 15. Agent Internal: Narrative Obligation Tiers

When the brief's narrative obligations exceed the available word count and page budget, the agent follows these priority tiers. Higher tiers are never compressed to make room for lower tiers.

### Tier 1 — Must appear as fully realized scenes (non-negotiable)

- The trigger moment (from Field 2.2)
- Somatic mirroring — at least one expression shown physically (from Field 3.4, first selection)
- The coping tool in action (from Field 3.5)
- The resolution matching the chosen completeness level (from Field 3.6)

### Tier 2 — Must appear, but can be compressed into fewer beats

- The primary therapeutic approach — defines the arc (from Field 3.1)
- The caregiver's presence at the specified role (from Field 4.4)
- Shame rules when shame = Central (from Field 3.3) — all three rules must be honored but can be served through a single scene rather than multiple scenes

### Tier 3 — Should appear if space permits, can be reduced to a single beat

- The supporting approach — can become a tonal quality that flavors the story rather than a distinct scene (from Field 3.2)
- Supporting characters — can appear in a single interaction rather than a developed role (from Field 4.6)
- The second somatic expression, if two were selected — the first is Tier 1, the second is Tier 3 (from Field 3.4)
- The "One true thing" detail (from Field 2.5)

### Tier 4 — Enrichment, omit if space is tight

- The creative vision as a distinct set piece — can be reduced to a visual detail or atmospheric element rather than a full scene (from Field 2.4)
- Character notes details (from Field 4.7)
- Second supporting character's functional role, if two characters were selected (from Field 4.6)

**Agent instruction:** When the brief's obligations exceed the available word count, follow the priority tiers. Tier 1 elements must always appear as fully realized scenes. Tier 2 elements must appear but can be compressed into fewer beats. Tier 3 elements should appear if space permits but can be reduced to a single sentence or a background detail. Tier 4 elements are enrichment — include them only if they don't compress other tiers. Never flatten a Tier 1 element to make room for a Tier 3 element.

**Output metadata requirement:** When any element is compressed or omitted due to space constraints, the agent must output a metadata section (not shown in the story, shown to the psychologist during review) listing: what was fully included, what was compressed (and how), and what was omitted (and why). This gives the psychologist transparency to adjust the brief and regenerate if needed.

---

## 16. Brief Complexity Budget

The system calculates the total narrative obligation load of a brief and compares it against the available page budget. When the brief is overloaded, a warning is shown to the psychologist before submission.

### How it works

Every narrative obligation has an approximate page cost. The system sums all page costs and compares the total against the available pages for the selected age range × story length combination.

### Obligation weights (ages 3–5 baseline)

| Obligation | Page Cost |
|---|---|
| Core arc (safe beginning + trigger + peak + tool + landing) | 5 pages |
| Each somatic expression selected (Field 3.4) | 0.5 pages |
| Supporting approach selected (Field 3.2) | 1 page |
| Shame = Central (normalization + witnessing + acceptance) | 1 page |
| Shame = Present | 0.5 pages |
| Each supporting character selected (Field 4.6) | 1 page |
| Caregiver = "Leaves and returns" | 1.5 pages |
| Caregiver = "Waiting at the end" (needs return scene) | 0.5 pages |
| Parallel narrative distance (world-building overhead) | 1 page |
| Metaphorical narrative distance (symbolic mapping overhead) | 1.5 pages |

### Age-range scaling

Older age ranges have denser pages (more sentences, more words per sentence), so each obligation costs relatively fewer pages. Apply these multipliers to the baseline weights:

| Age Range | Weight Multiplier |
|---|---|
| 3–5 | 1.0× (baseline) |
| 5–7 | 0.8× |
| 7–9 | 0.6× |
| 9–12 | 0.5× |

### Available page budgets

| Age Range | Short | Standard | Extended |
|---|---|---|---|
| 3–5 | 6–8 | 8–12 | 12–16 |
| 5–7 | 8–10 | 10–14 | 14–18 |
| 7–9 | 10–12 | 12–16 | 16–22 |
| 9–12 | 12–15 | 15–20 | 20–28 |

### Overload warning

When the total weighted page cost exceeds the **lower bound** of the available page range, the system shows a soft warning:

*"Your story design requires approximately [X] pages to include all elements well. You've selected [Length] ([Y]–[Z] pages). Consider increasing the story length, or reducing complexity by removing a supporting character, changing the supporting approach, or adjusting the shame level."*

This is a soft warning — the psychologist can proceed. But they are making an informed choice. The warning lists the specific obligations contributing to the overload so the psychologist can decide what to adjust.

### Example calculation

Brief: ages 3–5, Short (6–8 pages), primary approach + supporting approach, shame Central, 2 somatic expressions, 2 supporting characters, caregiver "Waiting at the end."

Core arc: 5 + somatic (2 × 0.5 = 1) + supporting approach (1) + shame central (1) + characters (2 × 1 = 2) + caregiver return (0.5) = **10.5 pages**.

Weight multiplier for 3–5: 1.0×. Total: **10.5 pages**.

Available: 6–8 pages. Deficit: 2.5–4.5 pages. **Warning triggered.**

---

## 17. Fields That Vary by Story Type

### Fields where options change per type

| Field | What Changes |
|-------|-------------|
| 2.1 Emotional world prompt | Starter prompts adapt per type |
| 2.2 Trigger label and hint | Label changes (e.g., "The specific trigger" for anxiety, "The moment of loss" for grief) |
| 2.3 Therapeutic intention examples | Inline good/bad examples adapt per type |
| 3.1 Primary therapeutic approach | Option list and definitions change per type |
| 3.2 Supporting approach | Same list as 3.1 per type, minus primary |
| 3.4 Type-specific clinical field | Entirely different field per type (see below) |
| 3.5 Coping tool | Option list and categories change per type |
| 3.7 Must-never defaults | Pre-filled defaults change per type (see Section 9) |

### Field 3.4 — Type-Specific Clinical Field

This field changes completely per story type:

| Story Type | Field Name | Type | Required |
|------------|-----------|------|----------|
| Fear & Anxiety | "How does the anxiety show up in the body?" | Multi-select (up to 2) + free text 150 chars | Yes |
| Big Emotions | "What does the emotion look like?" (body, behavior, words) | Free text, 300 chars | Yes |
| Loss & Grief | "Where is the child in the grief process?" | Single choice (options TBD) | Yes |
| Identity & Self-Worth | "The negative self-belief" | Free text, 200 chars | Yes |
| Life Transitions | "What is being lost in this transition?" | Free text, 300 chars | Yes |

**Fear & Anxiety somatic expression options:**
- Freezing / going still
- Crying / clinging
- Stomach ache / feeling sick
- Heart racing / can't breathe
- Restless / fidgety / can't sit still
- Going quiet / shutting down
- Tension / clenching (jaw, fists, shoulders)
- Sweating / feeling hot

---

## 18. Fields Removed from Previous Design

| Field | Previous ID | Reason for Removal |
|-------|-------------|-------------------|
| Emotional destination | Was 1.4 | Redundant with therapeutic intention (Field 2.3). The "they should feel ___" half of the completion format already captures the emotional endpoint. A dropdown restating the same information creates either redundancy (when they match) or contradiction (when they don't). One source of truth. |
| Topic sensitivity | Was 4.2 | Redundant with the combination of shame dimension + peak intensity + age range. Tested against all pilot situations — two psychologists would choose different sensitivity levels for the same situation. The field produces inconsistent input because the label is subjective, and the agent's behavioral response to each level is not clearly differentiated from what other fields already govern. |
| "Unspecified" option for protagonist age | Was in 3.3 | The agent should not make clinical decisions. Protagonist age relative to reader affects identification and aspiration. Default to "Same age" instead of allowing ambiguity. |

---

## 19. Fields Added

| Field | ID | Reason for Addition |
|-------|-----|-------------------|
| Story length | 1.3 | The agent needs a length signal beyond age range. A psychologist may want a shorter story for an intense topic or a longer one for gradual exposure. Previously, word count was derived from age alone, which is insufficient. |
| Resolution completeness | 3.6 | Some therapeutic stories end with full resolution; others end with partial or open resolution. For anxiety stories, partial resolution is often more clinically honest — the fear doesn't vanish, but the child has a tool. This is a critical narrative decision the agent was previously making without guidance. Placed in Section 3 (Therapeutic Architecture) rather than Section 1 because the psychologist needs to have chosen the mechanism, shame level, and coping tool before they can meaningfully decide how completely the story resolves. |
| Somatic expression (Fear & Anxiety) | 3.4 | The brief previously had no way to tell the agent what the child's body does when anxious. "Freezes" vs. "cries" vs. "gets stomach pain" produce completely different stories. This is one of the most clinically relevant details for anxiety stories and was entirely missing. |
| Supporting character functional role | 4.6 sub-field | The agent needs to know what a supporting character does at the story's key moment, not just who they are. "A peer who shows it's possible" is a casting note — the functional role prompt gives the agent a behavioral direction for the climactic scene. |

---

## 20. Key Design Decisions

### 1. Personalization and protagonist type are mutually exclusive

When personalization is ON, the protagonist is a child character — always. The child's name, gender, and photo are applied. Animal and fantasy protagonists are incompatible with personalization because naming an animal after the child does not create identification — it creates confusion. Protective distance (the clinical value of animal/fantasy characters) requires the protagonist to be a separate being the child observes, not a version of themselves.

When personalization is OFF, the psychologist designs the full protagonist: type, gender, age. This is where animal and fantasy characters live.

### 2. Free text is preserved for clinical and creative fields

Six fields remain free text. These capture clinical judgment, creative vision, and real clinical memories that no dropdown can express. Structuring them would produce generic, interchangeable inputs that strip the richness the agent needs. Control over data quality is achieved through prompt design (specificity nudges, starter prompts, rephrased prompts) — not structural constraint.

### 3. Age range comes before clinical content

The psychologist must scope before they design. Age range shapes every subsequent decision — the population description, the trigger specificity, the coping tool appropriateness, the peak intensity. Placing it first ensures the psychologist is thinking within the right developmental frame from the start.

### 4. One coping tool only

The story shows the protagonist using one technique at the moment of greatest difficulty. Multiple tools dilute the message and confuse the child. One tool, shown in action, not named — that is the therapeutic delivery mechanism.

### 5. Shame is three-level, not binary

Binary yes/no for shame was too blunt — shame is present in almost every anxiety situation to some degree. Three levels (not significant / present / central) give the agent graduated instructions and let the psychologist differentiate between situations where shame is background and situations where shame is the core experience.

### 6. Pre-filled defaults for the "must never" list

Starting from a blank constraint list produces vague, inconsistent input. Pre-filled defaults per story type guarantee a clinically sound baseline. The psychologist reviews, edits, and extends. The minimum requirement (1 item) combined with defaults makes it nearly impossible to submit a vague list.

### 7. Cross-field validation is layered by severity

Hard blocks prevent submission of structurally broken briefs (relational tool with no one to receive it). Hard warnings require acknowledgment for clinically risky combinations (significant intensity for 3–5). Soft warnings inform without blocking. This respects the psychologist's clinical judgment while preventing structural errors the agent cannot recover from.

### 8. Structural parameters are agent-internal, not psychologist-facing

Page count, sentence length, and word count are derived from age range + story length. The psychologist sees a human-readable preview ("A bedtime-length story of about 10 pages, read aloud in 5–7 minutes") but never configures structural parameters directly. This keeps the brief clinical, not technical.

### 9. The story type selector is a lens, not a diagnosis

When a situation could fit multiple types, the psychologist chooses the therapeutic lens. The UI framing ("Choose the lens this story looks through") eliminates hesitation. Each story addresses one therapeutic dimension — it does not treat the whole child.

### 10. Personalization defaults to ON for the pilot

For Fear & Anxiety stories targeting ages 3–7, personalization is the clinically stronger choice in the vast majority of cases. Defaulting to ON reduces unnecessary decisions. The psychologist can override to OFF with a required explanation.

### 11. Structured fields always override free text

Character notes and other free text fields add texture within the architecture defined by structured fields. They never override structured selections. If a psychologist needs to change a structural decision, they change the structured field — not the free text. This ensures cross-field validations remain reliable and the agent receives a coherent, non-contradictory brief.

### 12. Therapeutic mechanism overrides creative vision

The therapeutic mechanism (Field 3.1) defines the story's arc. The clinical creative vision (Field 2.4) enriches that arc. When they conflict, the agent adapts the creative vision to serve the mechanism. This ensures clinical integrity is never sacrificed for a compelling image.

### 13. The therapeutic intention format is therapeutically inclusive

The format "they should feel ___ because ___" (without "understood that") accommodates CBT (cognitive shift), attachment (felt safety), somatic (body-based), and narrative (meaning-making) therapeutic frameworks. Both halves are required. The open "because" allows the psychologist to complete the intention with a cognition, a felt experience, a relational truth, or a body-based shift.

### 14. Brief complexity is budgeted against story length

A brief can contain more narrative obligations (supporting approach, shame rules, two supporting characters, parallel world-building) than a short story can accommodate. Without protection, the agent compresses everything into a checklist story with no emotional breathing room. The complexity budget system (Section 16) calculates the total obligation load and warns the psychologist when the brief exceeds the selected story length. The narrative obligation tiers (Section 15) give the agent explicit priority rules for when compression is necessary — ensuring the therapeutic core is never sacrificed for secondary elements.

### 15. Complexity handling is layered and non-duplicative

Complexity is handled through five layers — a live meter for continuous awareness, a collaborative length-bump suggestion for the easiest fix, a mid-flow checkpoint at the heaviest decision point, a pre-submit warning as final check, and post-draft metadata for transparency. Each layer triggers at a distinct moment so the psychologist never sees the same message twice. No hard caps, no silent auto-bumps, no presets. The psychologist stays in control while the system makes the problem visible at the right moments.

---

## 21. UI Requirements

These are platform-level requirements that affect the brief form's usability. They are not field-level specs.

1. **Progress indicator:** Show the 5 sections with labels, highlight the current section, show completion state per section.
2. **Save and resume:** The psychologist can save a partially completed brief and return to it later.
3. **No live story preview in V1:** The psychologist submits the complete brief and receives a full draft. A section-level preview feature may be explored post-pilot.
4. **Illustration guidance out of scope for V1:** Illustration direction (visual tone, color palette, style, visual sensitivity constraints) is not part of the V1 story brief. It will be addressed in a separate specification.
5. **Personalization engine out of scope for V1 brief spec:** The personalization engine (placeholder replacement, gendered language handling for non-English languages, name length considerations, photo/illustration integration) requires a separate specification. This brief spec defines what the agent produces (text with placeholders) but not how personalization is executed downstream.

### Complexity Handling UI

Sections [15](#15-agent-internal-narrative-obligation-tiers) and [16](#16-brief-complexity-budget) define backend logic: obligation tiers, weighted page costs, age-range multipliers, available page budgets, and the pre-submit overload warning copy. This subsection specifies how complexity is surfaced in the UI so psychologists get continuous awareness without redundant interruptions.

The complexity handling strategy has **five layers**. Each layer triggers at a distinct moment so the psychologist never sees the same overload message twice in one session.

**Layer 1 — Live Complexity Meter.** A persistent visual progress bar visible across all form sections. **Label:** "Story load" (not page numbers, not percentages). The bar fills as clinical elements are added. **Three color states:** green when load is well within budget, yellow when load is approaching the budget limit, red when load exceeds the budget. The default view shows only the bar and the label — no math, no page numbers. When clicked or hovered, the bar expands to show the underlying breakdown: each obligation contributing to the load, total page cost, and available budget for the selected age range × story length. The expanded view is the only place where page numbers appear. The meter uses the weighted page costs and age-range multipliers from Section 16.

**Layer 2 — One-Click Length Bump Suggestion.** When the meter is in yellow or red state, the expanded view includes a collaborative suggestion (not a warning): *"This design may need more space. Want to switch to [Standard/Extended]?"* with a one-click button that updates the story length field. Tone is helpful, not critical. The system never changes length automatically. The suggestion is offered as an option — the psychologist can also reduce elements manually.

**Layer 3 — Mid-Flow Checkpoint.** When the psychologist transitions from Section 3 (Therapeutic Architecture) to Section 4 (Story World), the system checks the current complexity load. If load is in yellow or red state, show a checkpoint modal: *"Before you add characters and story world details, your current design is approaching the available story length. You can continue and adjust later, or review your clinical choices now."* Offer two buttons: **"Continue to Section 4"** and **"Review Section 3."** This checkpoint fires **only once per session**, **only at the 3→4 transition**, and **only if load is already yellow or red**. If load is green, the transition is silent. **Rationale:** Most complexity decisions land in Section 3; checking at the end of Section 3 lets the psychologist adjust in place before adding more load in Section 4.

**Layer 4 — Pre-Submit Warning.** A soft warning shown at submission time — but **only if** load is in red state **and** the psychologist has **not** already acknowledged the overload through the mid-flow checkpoint or the length bump suggestion. If the psychologist has already seen and dismissed an earlier signal, do not repeat the warning at submit — they have been informed. If no earlier signal fired (edge case), show the warning with the obligation breakdown. The psychologist can acknowledge and proceed. The substantive warning behavior and copy remain as defined in Section 16; this subsection adds the **de-duplication rule** so earlier acknowledgments suppress the submit-time repeat.

**Layer 5 — Post-Draft Transparency Metadata.** When the agent generates a draft, it outputs metadata listing what was fully included, what was compressed, and what was omitted. This is the safety net for edge cases. Specified in Section 15 (output metadata requirement); unchanged here.

**Inline clinical notes** (separate system). Inline notes at selection time (e.g., the cognitive reframing + ages 3–5 soft warning) remain in place for clinical mismatches. These are **not** part of the complexity handling system. The complexity meter handles cumulative load; inline notes handle specific field combinations with clinical issues. **Keep the two systems separate. Do not combine them.**

**Layer sequencing rules** (to prevent duplicate messaging):

- The meter is always visible but passive — it informs without interrupting.
- The length bump suggestion appears only inside the expanded meter view, only when load is yellow or red.
- The mid-flow checkpoint fires only once per session, only at Section 3 → 4 transition, only if load is yellow or red.
- The pre-submit warning fires only if load is red **and** no earlier signal has been acknowledged.
- The psychologist should never see the same overload message twice in one session.

---

## 22. Pre-Development Deliverables

These items must be completed before Agent 1 development begins.

### 1. Gold-Standard Brief-Story Pairs

**Required:** 3 complete brief-story pairs for the pilot scope (Fear & Anxiety).

Each pair consists of a fully completed story brief (using this spec) and a corresponding finished story that meets DAMMAH's clinical and literary quality standards.

**The 3 pairs must cover:**
1. A direct narrative, personalized, ages 3–5 (e.g., bathroom anxiety — straightforward, somatic, concrete coping tool)
2. A parallel narrative, fixed protagonist (animal), ages 5–7 (e.g., separation anxiety — emotional depth, caregiver arc, relational coping)
3. A direct narrative, personalized, ages 7–9 (e.g., fear of mistakes — cognitive reframing, more complex emotional pacing)

**Purpose:** These pairs serve as few-shot examples in the agent's prompt and as the quality benchmark for output evaluation. They teach the agent the translation from brief fields to narrative — when the brief says "graduated exposure," what does that look like in a story? When the brief says "show, don't name" for the coping tool, what does that look like in prose?

**Who creates them:** The clinical team (psychologists on the DAMMAH team). They fill in 3 briefs using this spec, then write (or heavily edit) 3 stories that represent exactly what they want the agent to produce.

**Acceptance test:** When Agent 1 is built, feed it the 3 example briefs (without the example stories) and compare output to the gold standard. The gap between agent output and psychologist-written stories is the quality metric for iteration.

### 2. Therapeutic Intention Examples for Non-Pilot Types

The inline good/bad examples in Field 2.3 are currently defined for Fear & Anxiety only. Before any non-pilot story type is launched, the corresponding intention examples must be created by the clinical team.

### 3. Therapeutic Approach Definitions for Non-Pilot Types

Section 13 currently defines approaches for Fear & Anxiety only. Before any non-pilot story type is launched, the corresponding approach definitions (psychologist-facing and agent instructions) must be created.

---

## Complete Field Summary

**Total fields:** 19 core fields (plus 1 pre-brief selector, plus conditional sub-fields).

**Section 5:** Per Section 7, when personalization is **ON** there are **no data fields** in this section (confirmation UI only). When personalization is **OFF**, only Field 5.2 applies. There is no separate “constraints list” field in Section 5 in V1.

| # | Field | Section | Type | Required | Conditional Logic |
|---|-------|---------|------|----------|-------------------|
| — | Story type selector | Pre-brief | Single choice | Yes | Routes entire form |
| 1.1 | Target age range | Age & Story Scope | Single choice | Yes | — |
| 1.2 | Peak emotional intensity | Age & Story Scope | Single choice | Yes | Cross-validate with age |
| 1.3 | Story length | Age & Story Scope | Single choice | Yes | Preview adapts to age range |
| 2.1 | Emotional world of the population | Clinical Foundation | Free text, 600 chars | Yes | Starter prompts per type |
| 2.2 | The specific trigger | Clinical Foundation | Free text, 400 chars | Yes | Label/hint per type. Specificity nudge if <80 chars |
| 2.3 | Therapeutic intention | Clinical Foundation | Completion format | Yes (both halves) | Inline examples per type. Soft nudge if <60 chars |
| 2.4 | Clinical creative vision | Clinical Foundation | Free text, 400 chars | Yes | — |
| 2.5 | One true thing | Clinical Foundation | Free text, 300 chars | No | — |
| 3.1 | Primary therapeutic approach | Therapeutic Architecture | Single choice | Yes | Options + definitions per type |
| 3.2 | Supporting approach | Therapeutic Architecture | Single choice | No | Excludes primary. Conflict warning for risky pairs |
| 3.3 | Shame dimension | Therapeutic Architecture | Single choice (3 levels) | Yes | — |
| 3.4 | Type-specific clinical field | Therapeutic Architecture | Varies per type | Yes | Entirely different field per type |
| 3.5 | The coping tool | Therapeutic Architecture | Single choice | Yes | Options per type. Age note for abstract tools |
| 3.6 | Resolution completeness | Therapeutic Architecture | Single choice | Yes | Default varies per type |
| 3.7 | What this story must never do | Therapeutic Architecture | Free text list + defaults | Yes (min 1) | Defaults per type. Dual enforcement layer. |
| 4.0 | Personalization decision | Story World | Binary yes/no | Yes | Default: Yes (pilot). Gates 4.1, 4.2, 4.3 |
| 4.1 | Protagonist gender | Story World | Single choice | Conditional | Only if personalization OFF |
| 4.2 | Protagonist type | Story World | Single choice | Yes | Locked to "Child" if personalization ON. Guidance per age |
| 4.3 | Protagonist age relative to reader | Story World | Single choice | Conditional | Only if personalization OFF. Default: Same age |
| 4.4 | Caregiver's presence | Story World | Single choice (5 options) | Yes | Multiple cross-validations |
| 4.5 | Narrative distance | Story World | Single choice | Yes | Sub-field: parallel equivalent challenge (200 chars, optional but encouraged) |
| 4.6 | Supporting characters | Story World | Multi-choice, up to 2 | Conditional | Required if relational tool + no present caregiver. Functional role sub-field per character (150 chars, optional) |
| 4.7 | Character notes | Story World | Free text, 300 chars | No | Adds texture only. Cannot override structured fields. |
| — | *(Section 5 — personalization ON)* | Personalization Config | *(no inputs)* | — | Confirmation copy only (see Section 7). Parents personalize name/photo downstream. |
| 5.2 | Why not (fixed protagonist) | Personalization Config | Free text | Conditional — required if personalization OFF | Explains to parents why the protagonist is not personalized. Shown to parents. |

---

*End of specification.*
