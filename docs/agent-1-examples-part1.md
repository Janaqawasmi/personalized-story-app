# Agent 1 — Examples (Part 1)

A short reference: **what we need**, **where examples are used**, and **how to start without them**.

---

## What kinds of examples does Agent 1 actually need?

There are **two distinct example types**, used at **two different points** in the pipeline. They are **not interchangeable**.

### Type A — Blueprint examples (Step 1: Story Architect)

A **blueprint example** is the structured intermediate output the Architect produces from a brief. It contains:

- An **emotional truth** paragraph (60–120 words, ending with *"By the end, this child needs to feel ___."*)
- A **6-point narrative blueprint**
- A **coping tool placement** note
- An **approach instruction** (plain language, no clinical labels)

The Architect sees **2** of these per generation, retrieved by **`storyType` + `ageRange`**. Their job is to teach the model what good blueprint thinking looks like — the right level of specificity, density proportional to narrative weight, concrete imagery instead of clinical abstraction.

### Type B — Story examples (Step 2: Author)

A **story example** is a **finished, prose-quality story** — the final output the Author should aspire to. The Author sees **1** of these per generation, also keyed by **`storyType` + `ageRange`**. Their job is to teach the model what good prose looks like **for this age range specifically** — sentence rhythm, how the coping tool is **shown not named**, how the body’s experience is rendered, how the resolution lands.

### Why both (pairs)

These two come as **pairs**. A blueprint example **without** its corresponding finished story is half a teaching signal — the Architect learns what to plan for, but with no demonstration that the plan actually produces good prose downstream. A story **without** its blueprint is the inverse problem.

---

## How many do you actually need for the pilot?

**Brief spec Section 22** specifies **3 gold-standard brief→story pairs** as the pre-development deliverable. From each pair you derive **both** a blueprint example (Type A) and a story example (Type B), so **3 pairs → 3 of each type**.

The brief spec recommends these **specific 3**:

| Pair focus | Narrative / setup | Age | Example theme |
|------------|-------------------|-----|-----------------|
| 1 | Direct narrative, **personalized** | **3–5** | e.g. bathroom anxiety — simple, somatic, concrete coping tool |
| 2 | **Parallel** narrative, **fixed protagonist (animal)** | **5–7** | e.g. separation anxiety — emotional depth, caregiver arc, relational coping |
| 3 | Direct narrative, **personalized** | **7–9** | e.g. fear of mistakes — cognitive reframing, more complex pacing |

That covers **ages 3–5, 5–7, and 7–9** with **one pair each**.

**Ages 9–12** has **no example at launch** — that age range runs on **cold-start fallback** (see separate notes on fallback). The example bank fills in over time as approved 9–12 stories accumulate.

---

## Where this doc fits

- **Part 1** (this file): example **types**, **pairing**, **pilot count**, and the **three recommended pairs**.
- **Elsewhere**: cold-start fallback when no example exists for a bucket; how retrieval keys examples (`storyType` + `ageRange`).
