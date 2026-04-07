# DAMMAH Agent 1 — Project Instructions for Claude

## What this project is

This project builds **Agent 1** for DAMMAH — a platform where licensed child psychologists create therapeutic children's stories using AI. Agent 1 receives a structured story brief from a psychologist and produces a first story draft. The draft is reviewed by the psychologist, refined through a separate edit loop (Agent 2, not part of this project), and eventually published.

The pilot scope is **Fear & Anxiety stories only**. The product targets five specific situations: not knowing where the school bathroom is, fear of getting lost in school, separation anxiety at drop-off, fear of making mistakes in front of others, and fear of authority figures.

Agent 1 is a new module (`server/src/agent1/`) inside the existing TypeScript/Node.js backend. It is consumed by an Express route that the specialist interface calls when a psychologist clicks "Generate Draft."

## The single source of truth

**The complete Agent 1 specification lives at `docs/dammah-agent1-spec-v3.md`.**

Read this file before making any architectural decision. It defines:
- The 2-step chain architecture (Story Architect → Author) plus pre-check and post-validation
- Every prompt structure, with section-by-section content
- Information flow between steps (what each step receives, what it produces)
- All model assignments (Opus 4.6 for Step 1 and Step 2, Sonnet 4.6 for post-validation)
- Age-derived parameters, word count targets, narrative obligation tiers
- Few-shot example strategy
- Error handling and rerun logic

If a request asks you to design or change something that contradicts the spec, pause and ask whether the spec should be updated first. **The spec leads, the code follows.** Never let the codebase silently drift from the spec.

The brief specification (what fields the agent receives) lives at `docs/dammah-story-brief-spec-v1.2.md`. Reference it when you need to understand what data Agent 1 is consuming.

## Architectural principles that must not be violated

These principles are load-bearing. Changing any of them is a spec-level decision, not an implementation choice.

1. **The full brief reaches Step 1. A curated subset reaches Step 2.** This information bottleneck is intentional — it prevents the Author from entering compliance mode when faced with too many clinical fields. Do not pass the full brief to the Author "for completeness."

2. **Clinical taxonomy labels never reach the Author.** The Author receives a plain-language approach instruction, not labels like "cognitive reframing" or "graduated exposure." Clinical labels in the writer's context cause the model to explain mechanisms instead of embodying them.

3. **The therapeutic message is felt, never stated.** This is "the one rule." The Author prompt enforces it. Post-validation does not check it (it's a spectrum, not a binary, and over-flagging would erode specialist trust). The specialist judges this.

4. **Post-validation flags, never blocks.** The specialist is a licensed psychologist. The validation step is a second pair of eyes, not a gatekeeper.

5. **Safety is enforced in two places: in generation prompts (as constraints) and on the finished story (as post-validation).** Never rely on prompt-level constraints alone — LLMs do not reliably follow open-ended negative instructions during generation.

6. **The 2-step chain is not negotiable for Agent 1.** The architectural review evaluated single-prompt and 4-step alternatives and rejected both. If a future requirement seems to need a different structure, surface it as a spec question, not an implementation change.

## Tech stack

This module lives inside an existing TypeScript/Node.js/Express backend. Match existing project conventions wherever possible.

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js (matches the rest of the `server/`)
- **HTTP:** Express (matches the rest of the `server/`)
- **LLM SDK:** `@anthropic-ai/sdk` — the official Anthropic TypeScript SDK. Direct API calls only. Do NOT use LangChain, LangChain.js, or any orchestration framework. The architectural review explicitly evaluated these and concluded they add overhead without value for this linear pipeline.
- **Models:** `claude-opus-4-6` for Step 1 (Story Architect) and Step 2 (Author). `claude-sonnet-4-6` for post-validation. Define these as constants in a single config file — never hardcode model strings throughout the codebase.
- **Runtime validation:** Zod for validating LLM structured outputs and brief inputs at module boundaries. (If the existing server uses a different validation library — io-ts, class-validator, etc. — use that instead. Consistency with existing code is more important than my preference.)
- **Structured output from Claude:** Prefer the SDK's tool use feature for forcing structured JSON output from Step 1 — it is more reliable than prompting for JSON in free text. Define a tool whose schema matches the Step 1 output Zod schema. Parse the tool use response with Zod for runtime safety.
- **Prompt templates:** Plain markdown files in `server/src/agent1/prompts/` with `{variable}` placeholders. Load with `fs.readFileSync` at module load time (or via your project's existing asset-loading pattern). Substitute placeholders at runtime. Do NOT hardcode prompts inside `.ts` files — prompts will change frequently and you don't want code review noise on every prompt tweak.
- **Configuration:** JSON files in `server/src/agent1/config/` for clinical content from the brief (approach instructions, obligation tiers, budget weights). Type these with TypeScript interfaces. The clinical team should be able to edit JSON without touching code.
- **Async:** Native `async/await`. The pipeline is linear — no need for RxJS, no need for queues, no need for fancy concurrency primitives.
- **Tests:** Match the existing server's test framework (Jest, Vitest, Mocha — whichever the rest of `server/` uses).

## Project structure

Agent 1 is a self-contained module inside the existing server:

```
your-project/
├── CLAUDE.md                              ← This file (project root)
├── docs/
│   ├── dammah-agent1-spec-v3.md           ← THE spec — single source of truth
│   └── dammah-story-brief-spec-v1.2.md    ← Brief spec for reference
├── server/
│   ├── src/
│   │   ├── agent1/                        ← THIS MODULE
│   │   │   ├── index.ts                   ← Public entry point — only file imported externally
│   │   │   ├── pipeline.ts                ← Main orchestration (3 API calls)
│   │   │   ├── preCheck.ts                ← Quality gate + complexity budget (rule-based, no API)
│   │   │   ├── storyArchitect.ts          ← Step 1 (Opus)
│   │   │   ├── author.ts                  ← Step 2 (Opus)
│   │   │   ├── postValidation.ts          ← Sonnet validation
│   │   │   ├── types.ts                   ← TypeScript types + Zod schemas
│   │   │   ├── models.ts                  ← Model name constants
│   │   │   ├── prompts/                   ← Prompt templates (.md)
│   │   │   │   ├── storyArchitect.md
│   │   │   │   ├── author.md
│   │   │   │   └── postValidation.md
│   │   │   ├── config/                    ← Clinical configuration (.json)
│   │   │   │   ├── approachInstructions.json
│   │   │   │   ├── obligationTiers.json
│   │   │   │   └── budgetWeights.json
│   │   │   └── examples/                  ← Few-shot example bank
│   │   │       ├── bank.json
│   │   │       └── seeds/
│   │   ├── routes/
│   │   │   └── agent1.ts                  ← Express route exposing Agent 1
│   │   └── ... (existing server code)
│   └── tests/
│       └── agent1/
│           ├── briefs/                    ← Test briefs
│           └── eval/                      ← Evaluation harness
└── ... (existing frontend, etc.)
```

**`server/src/agent1/index.ts` is the only file imported from outside the module.** It exports the public surface — typically a single `runAgent1(brief: StoryBrief): Promise<Agent1Result>` function. Routes import from there, not from internal files. This keeps the module's surface area clean.

## Coding conventions

- **Strict TypeScript.** `strict: true` in `tsconfig.json`. No `any` without an explicit comment explaining why.
- **Zod schemas at every boundary.** TypeScript types disappear at runtime — Zod gives you both compile-time and runtime safety. Validate the brief on input, validate Step 1's structured output before passing to Step 2, validate Step 2's output before passing to post-validation.
- **No silent error swallowing.** Wrap API calls in try/catch, but always log the failure and either retry explicitly or throw. Errors during clinical content generation are not "soft" failures.
- **Functions over classes when possible.** This pipeline is a sequence of pure(ish) functions: `brief → preCheckResult → architectOutput → authorOutput → validationResult`. Don't over-engineer with class hierarchies.
- **Configuration over code.** When something changes per story type, age range, or therapeutic approach — put it in `config/`, not in code. The clinical team will update these. Code changes require deployment; config changes don't.
- **Prompts are versioned.** Every prompt template change is a git commit with a clear message. When iterating on prompts, document what changed and why in the commit.
- **Model names are constants.** `models.ts` exports the model strings. Importing code uses the constants. Never sprinkle model strings throughout the codebase — when Anthropic releases a new model, you change one file.
- **No top-level side effects in module files.** Loading prompt templates and config JSON happens at module load, but it should be idempotent and fast. No network calls, no database queries during import.

## What to build first

When implementing, follow this order:

1. **Types and Zod schemas** (`server/src/agent1/types.ts`) — define the data shapes for the brief, Step 1 output, Step 2 output, and validation result. This forces clarity about the contracts between steps before any prompts are written. Use Zod schemas as the source of truth and infer TypeScript types from them with `z.infer<typeof schema>`.

2. **Model constants** (`server/src/agent1/models.ts`) — export `OPUS_MODEL` and `SONNET_MODEL` constants. Trivial but important for maintainability.

3. **Pre-check** (`server/src/agent1/preCheck.ts`) — pure rule-based logic, no API calls. Implement quality gate, vague intention detection, and complexity budget calculation. Fast to test, gives you early wins.

4. **Configuration files** (`server/src/agent1/config/`) — extract approach instructions (Section 13 of the brief), obligation tiers (Section 15), and budget weights (Section 16) from the brief spec into JSON. Write TypeScript interfaces for them. These get loaded and injected into prompts.

5. **Prompt templates** (`server/src/agent1/prompts/`) — write the Step 1, Step 2, and post-validation prompts as markdown files with placeholders. Copy structure directly from the spec.

6. **Story Architect** (`server/src/agent1/storyArchitect.ts`) — load the prompt template, substitute variables from the brief, call Opus with tool use for structured output, validate the response with Zod. Handle the auto-retry on incoherent output.

7. **Author** (`server/src/agent1/author.ts`) — same pattern as Story Architect, age-adaptive prompt assembly, calls Opus.

8. **Post-validation** (`server/src/agent1/postValidation.ts`) — Sonnet call, parse flags, return validation result.

9. **Pipeline orchestration** (`server/src/agent1/pipeline.ts`) — wire it all together. Pure linear flow: preCheck → architect → author → validation. Handle the rerun mechanism here.

10. **Public entry point** (`server/src/agent1/index.ts`) — export `runAgent1` and the public types.

11. **Express route** (`server/src/routes/agent1.ts`) — expose Agent 1 to the specialist interface. Validate request body, call `runAgent1`, return the result.

12. **Test briefs** (`server/tests/agent1/briefs/`) — start with 3–5 hand-written briefs covering the pilot situations. Use these to test the pipeline end-to-end.

Don't try to build everything at once. Get the pipeline running with one test brief end-to-end before refining any single step.

## Things to ask before implementing

If any of these come up, stop and ask the user before coding:

- **A spec section is ambiguous or contradicts another section.** Don't guess. The spec is meant to be authoritative; if it's unclear, that's a spec bug to fix.
- **The few-shot example bank is empty.** Before launch, the clinical team must produce at least 3 gold-standard brief-story pairs. If they don't exist yet, the pipeline should use the cold-start fallback (quality standard instructions instead of examples) — confirm this is the desired behavior.
- **A new field or behavior would help but isn't in the spec.** Surface it. Don't add scope silently.
- **Prompt structure needs to deviate from the spec.** Every prompt section in the spec is there for a reason documented in the design decisions. If a section seems unnecessary, ask before removing it.
- **The existing server uses a convention different from what this file recommends.** Project consistency wins — match what's already there and ask if there's any doubt.

## Things NOT to do

- Do NOT use LangChain, LangChain.js, LangGraph, or any LLM orchestration framework. Direct `@anthropic-ai/sdk` only.
- Do NOT add RAG infrastructure (vector databases, embedding-based retrieval). The example bank uses deterministic key-based lookup. The architectural review explicitly evaluated and rejected RAG for this stage.
- Do NOT fine-tune any models. Few-shot prompting is the strategy.
- Do NOT make any step "agentic" — meaning capable of deciding what to do next. Every step has a fixed task with fixed inputs. Determinism is a feature.
- Do NOT add caching of LLM outputs without discussing it first. Each story is unique to its brief; aggressive caching would break that.
- Do NOT commit API keys, even in test files. Use environment variables. Add `.env` to `.gitignore` if it isn't already.
- Do NOT pass the full brief to the Author. Only the curated subset defined in spec Section 6.1.
- Do NOT include clinical taxonomy labels in the Author's prompt. Use the approach instruction produced by Step 1.
- Do NOT introduce a second runtime (Python, etc.) for any part of Agent 1. This module is TypeScript end to end, matching the existing server.
- Do NOT use `any` types to silence TypeScript errors. If a type is genuinely unknown, use `unknown` and narrow it. If you need to escape the type system temporarily, leave a comment explaining why and a TODO to fix it.

## How to interact with me on this project

When I ask you to implement something:
1. **Confirm you've read the relevant section of the spec.** If the request touches Step 1, reference the relevant subsection of spec Section 5. Same for Step 2 (Section 6), post-validation (Section 7), etc.
2. **Show me the structure before the implementation.** For non-trivial changes, walk me through what you plan to do before writing code.
3. **Ask if you're uncertain.** I would rather answer one clarifying question than review code built on a wrong assumption.
4. **Push back if I'm wrong.** If I ask you to do something that contradicts the spec or the architectural principles, tell me. Don't silently comply with bad instructions.

When I ask you to debug:
1. **Read the actual error and the actual code first.** Don't pattern-match to common issues.
2. **Check whether the spec covers this situation.** Many "bugs" are actually unimplemented spec requirements.
3. **Propose the smallest fix that addresses the root cause.** Don't refactor opportunistically.

## Glossary

- **Story Brief / Brief:** The structured input filled in by the psychologist. Defined in `docs/dammah-story-brief-spec-v1.2.md`.
- **Story Architect / Step 1:** The first Opus call. Reads the full brief, produces the emotional truth, blueprint, coping tool placement note, and approach instruction.
- **Author / Step 2:** The second Opus call. Receives the curated inputs from Step 1 and writes the story draft.
- **Post-validation:** The Sonnet call that checks the finished story against hard constraints and produces an alignment note.
- **Emotional truth:** A 60–120 word paragraph produced by Step 1 capturing what the child is living through, ending with "By the end, this child needs to feel ___."
- **Narrative blueprint:** Step 1's 6-point story structure that the Author writes from.
- **Coping tool placement note:** Step 1's explicit statement of where in the blueprint the coping tool appears and how.
- **Approach instruction:** Step 1's plain-language description of how the therapeutic approach manifests as narrative action — replaces clinical labels for the Author.
- **Compression metadata:** Step 1's optional output listing what was compressed or omitted when the brief's obligations exceed the story's word/page budget.
- **Specialist:** The licensed psychologist using DAMMAH to create stories.
- **Obligation tiers:** The 4-tier priority system (brief Section 15) that governs what gets compressed when space is tight.
- **Complexity budget:** The page-cost calculation system (brief Section 16) that warns when a brief's obligations exceed the selected story length.

## Reference quickly

- Specification: `docs/dammah-agent1-spec-v3.md`
- Brief specification: `docs/dammah-story-brief-spec-v1.2.md`
- Module location: `server/src/agent1/`
- Public entry point: `server/src/agent1/index.ts`
- Models in use: `claude-opus-4-6` (Steps 1 & 2), `claude-sonnet-4-6` (post-validation)
- SDK: `@anthropic-ai/sdk`
- Pilot scope: Fear & Anxiety only, 5 situations
- Architecture: 2-step chain (Architect → Author) + pre-check + post-validation
- Total API calls per generation: 3 (1 Opus for architect, 1 Opus for author, 1 Sonnet for validation)
