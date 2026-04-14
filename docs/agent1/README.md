# Agent 1 — Documentation Index

**Status:** Production specification, pilot v1.0
**Pilot scope:** Fear & Anxiety stories, all four age ranges (3–5, 5–7, 7–9, 9–12)
**Canonical sources:**
- Story Brief Specification: `/docs/dammah-story-brief-spec-v1.3.md`
- Agent 1 Specification: `/docs/agent1/dammah-agent1-spec-v3_2.md`
- Field model: `server/src/models/storyBrief.model.ts` and `client/src/types/storyBrief.ts`

---

## How to use this index

This page is the entry point for anyone — human or AI — landing on Agent 1 for the first time. It does two jobs:

1. **Tells you which doc to read for which question.** See the table below.
2. **Points to the deep specs** in `server/src/agent1/docs/` where every detail lives.

Read top to bottom on your first pass. After that, jump by question.

---

## Project summary in 60 seconds

DAMMAH is a platform where licensed child psychologists design therapeutic children's stories. Agent 1 is the first stage of the story creation pipeline. A psychologist fills in a structured story brief that captures clinical intention, therapeutic architecture, and creative guidance. Agent 1 transforms that brief into a first story draft.

Agent 1 runs once per story. Its output is the foundation everything else builds on. A weak first draft means a long, painful edit loop in Agent 2 (out of scope for this spec). A strong first draft means the specialist makes targeted refinements, not structural repairs.

The architecture is a 2-step LLM chain wrapped by a rule-based pre-check and a Sonnet-based post-validation pass. The specialist clicks "Generate Draft" and receives three outputs: an emotional truth paragraph, a narrative blueprint, and a full story draft.

---

## Where to find what

| Question | File |
|---|---|
| What is this thing and how does it work end-to-end? | `docs/agent1/dammah-agent1-spec-v3_2.md` |
| Where do the files live and how do I run a generation? | `server/src/agent1/docs/01-architecture.md` |
| What inputs does Agent 1 receive? What does it output? | `docs/agent1/dammah-agent1-spec-v3_2.md` |
| How is the Story Architect prompt built? | `docs/agent1/dammah-agent1-spec-v3_2.md` |
| How is the Author prompt built? | `docs/agent1/dammah-agent1-spec-v3_2.md` |
| How is the post-validation prompt built? | `docs/agent1/dammah-agent1-spec-v3_2.md` |
| What's the right way to handle errors, retries, costs? | `server/src/agent1/docs/operations/error-handling.md` |
| What does the model file actually export? Which constants do I import? | `server/src/agent1/docs/types/model-file-reference.md` |
| How do I test this? What does "good output" look like? | `server/src/agent1/docs/testing/test-strategy.md` |
| What's done, what's left, what depends on what? | `server/src/agent1/docs/operations/build-plan.md` |

---

## For AI coding agents specifically

If you are an AI coding agent (Cursor, Claude Code, etc.) starting work on this codebase:

1. Read `docs/agent1/dammah-agent1-spec-v3_2.md` first. Always.
2. Then read the specific deep doc for the file you are about to touch.
3. **Never branch on display strings.** Always import token constants from `server/src/models/storyBrief.model.ts`. See `types/model-file-reference.md` for the full list.
4. **Never duplicate constants** that already exist in the model file (`STRUCTURAL_PARAMS`, `OBLIGATION_WEIGHTS`, `AGE_WEIGHT_MULTIPLIERS`, `CROSS_FIELD_VALIDATIONS`, `STORY_TYPE_ROUTING`, `FIELD_REGISTRY`). Import them.
5. **Never read `STORY_TYPE_ROUTING[storyType].mustNeverDefaults` when generating a story** — that constant holds *pre-fill* defaults. The operative list is `storyBrief.therapeuticArchitecture.mustNeverList`, the psychologist's *final edited* list. Sending defaults instead reverses the psychologist's clinical judgment and is a critical bug. See `docs/agent1/dammah-agent1-spec-v3_2.md` for the canonical prompt constraints.
6. Brief v1.3 is the canonical source of truth for clinical logic. The model file is the canonical source for token values. If a deep spec disagrees with either, the deep spec is wrong.

---

## Pilot scope and what is out of scope

**In scope for v1.0:**

- Fear & Anxiety story type only.
- All four age ranges: 3–5, 5–7, 7–9, 9–12.
- The 2-step Story Architect → Author chain.
- Rule-based pre-check (quality gate, vague intention detection, complexity budget).
- Sonnet-based post-validation (constraint check + alignment note).
- Specialist review interface contract (the data shape; the React UI is built separately against it).
- Up to 2 feedback reruns per generation event.

**Out of scope for v1.0** — tracked but not built here:

- Agent 2 (targeted edit loop based on specialist feedback).
- Other story types (Big Emotions, Loss & Grief, Identity & Self-Worth, Life Transitions).
- The personalization engine (placeholder resolution into final personalized stories).
- Illustration integration.
- Multi-language support (Arabic, Hebrew, English design considerations exist but no language adaptation in the prompt templates).
- Prompt versioning system, analytics, A/B testing infrastructure.

---

## Quick file map

```
docs/agent1/
├── dammah-agent1-spec-v3_2.md         ← canonical Agent 1 specification (v3.2)
└── README.md                          ← you are here

server/src/agent1/docs/
├── 01-architecture.md                 ← directory layout, runtime flow, module boundaries
├── types/
│   └── model-file-reference.md        ← which constants to import, exact tokens, anti-drift rules
├── operations/
│   ├── build-plan.md                  ← phased implementation order, dependencies, acceptance gates
│   └── error-handling.md              ← retry policy, cost ceilings, failure modes
└── testing/
    └── test-strategy.md               ← unit, integration, golden-pair, branch coverage
```
