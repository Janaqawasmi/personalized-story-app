# DAMMAH Illustration System — v2 Architecture Specification

**Status:** Draft v1 — supersedes the `image-gen-experiments` branch implementation.
**Audience:** Developers about to build the illustration phase. Specialists / product owners reviewing the workflow.
**Replaces:** the entire `prompt_review → illustrating → illustration_review → illustration_ready` pipeline currently on `image-gen-experiments`.
**Pilot scope (v2.0):** same as Agent 1 — Fear & Anxiety story type, all four age ranges.

This is a **redesign**, not an incremental refactor. The current implementation has structural problems that small fixes cannot solve. The justification for redesigning is in **Part I**; the new architecture is in **Part II**; the bridge is in **Part III**.

---

## Table of contents

**Part I — Critical review of the current implementation**
- §1. Where the implementation lives today
- §2. Pipeline as currently built
- §3. Critical findings (numbered, severity-labelled)
- §4. Cross-cutting issues
- §5. What is worth keeping

**Part II — Redesigned architecture**
- §6. Design principles
- §7. Industry references
- §8. High-level architecture
- §9. State machine
- §10. Data model
- §11. Stage-by-stage specification
- §12. Specialist UX architecture
- §13. Developer / observability layer
- §14. API surface
- §15. Background-job model
- §16. Logging, telemetry, audit
- §17. Provider abstraction

**Part III — Migration & rollout**
- §18. Keep / remove / replace / simplify
- §19. Migration plan (existing branch → v2)
- §20. Implementation phases & priorities
- §21. Risks & scalability concerns
- §22. Open questions for later iteration

**Appendix**
- A. Glossary
- B. Proposed file layout
- C. Old-vs-new comparison

---

# PART I — Critical review of the current implementation

The implementation under review lives on the `image-gen-experiments` branch. The review is deliberately blunt — the user asked for a critical redesign and that is the most useful form of feedback at this stage. Every finding is grounded in a specific file/function reference so it can be checked.

---

## §1. Where the implementation lives today

Two parallel surfaces exist:

1. **Production-shaped code** under [server/src/specialist/](server/src/specialist/) and [client/src/specialist/components/](client/src/specialist/components/). This is what the specialist actually drives.
2. **Experiment harness** under [server/experiments/](server/experiments/). This is research code with 12 variants, each implementing a different theory of "how to do illustration".

The two have diverged: the experiment harness contains the **most recent ideas** (the two-stage Scene Director in [server/experiments/src/scene-director.ts](server/experiments/src/scene-director.ts), the structured Style Bible in [server/experiments/src/style-bible.types.ts](server/experiments/src/style-bible.types.ts)), while the production pipeline still uses the **first iteration** (single Claude call producing both `VisualBible` and per-page prompts, in [server/src/specialist/image-prompt-generator.ts](server/src/specialist/image-prompt-generator.ts)).

This split is itself a problem: the production pipeline is being asked to ship while the architecture is still under research. The redesign must collapse the two surfaces into one production-grade pipeline plus a thin evaluation harness.

---

## §2. Pipeline as currently built

End-to-end flow as written in code today (production path, ignoring experiments):

```
Specialist clicks "Generate image prompts" in IllustrationsTab
       │
       │   POST /api/specialist/stories/:id/transitions   { to: "prompt_review" }
       ▼
Router updates story.status = "prompt_review"
Router fires generateImagePromptsForPages(...) (fire-and-forget Promise)
       │
       ▼
specialistIllustration.service.generateImagePromptsForPages()
       │
       │   single Claude call: VisualBible + N image prompts in one shot
       │   (image-prompt-generator.ts: callClaudeForImagePrompts)
       ▼
Firestore: story.visualBible + story.pages[].imagePrompt populated
       │
       │   Specialist reviews each page's imagePrompt manually in PromptReviewPanel
       │   PATCH /api/specialist/stories/:id/pages/:n/prompt  { action: approve|reject }
       │
       │   When all approved → server auto-advances status to "illustrating"
       │   and fires triggerIllustrationGeneration(...) (fire-and-forget Promise)
       ▼
specialistIllustration.service.triggerIllustrationGeneration()
       │
       │   Loops pages 1..N synchronously inside one HTTP request
       │   Page 1 → Seedream text-to-image (no reference)
       │   Pages 2..N → Seedream image-to-image with page 1's URL as referenceImage
       │   Persists incremental progress to Firestore after every page
       │   Status → illustration_review when loop ends
       ▼
Specialist reviews each image in IllustrationReviewPanel
       │   PATCH /api/specialist/stories/:id/pages/:n/illustration  { action: approve|reject }
       │   On reject: re-triggers full triggerIllustrationGeneration (re-loops all pages)
       │   When all approved → auto-advance to illustration_ready
       ▼
Status: illustration_ready → published (manual transition exists)
```

The two-stage Scene Director architecture explored in experiments ([server/experiments/src/scene-director.ts](server/experiments/src/scene-director.ts)) is **not wired into this production path**. It is invoked only by the experiment runner.

---

## §3. Critical findings

Each finding is labelled **S1 / S2 / S3** for severity (S1 = blocking, S2 = significant, S3 = minor).

### F1 — Reference-image consistency is the wrong primary mechanism [S1]

The current strategy for visual consistency is: generate page 1, then pass page 1's URL as a reference image to pages 2..N (see [server/src/specialist/specialistIllustration.service.ts:160-175](server/src/specialist/specialistIllustration.service.ts) in the branch). This is **architecturally fragile**:

- If page 1 happens to be a wide environment shot, page 2 inherits "wide shot" as a style hint when it shouldn't.
- If page 1 has a quality flaw (extra finger, off-model character), every subsequent page inherits it.
- Re-rolls of page 1 invalidate the entire downstream batch in subtle, hard-to-detect ways.
- The experiment series (exp-08 avatar-only, exp-08 environment-only, exp-08 composite, exp-09b dual-reference) confirm this: each variant invents a more elaborate reference scheme to compensate for what is fundamentally a fragile anchor. None of them produced a clean win.

Reference images **camouflage** drift on simple stories rather than **prevent** it on hard stories. The redesign drops the entire reference-image plumbing in favour of stronger structured text consistency. (User confirmed in Q6.)

### F2 — One Claude call doing two incompatible jobs [S1]

[server/src/specialist/image-prompt-generator.ts:69-128](server/src/specialist/image-prompt-generator.ts) asks Claude in a single call to produce **both** a Visual Bible **and** N per-page image prompts. The two jobs are at different cognitive levels — world-building (which characters/places exist and how they look) versus per-scene direction (which moment to freeze, where the camera is, what light is on). Mixing them in one prompt has two consequences:

- The Visual Bible regresses when Claude is also juggling N prompts; you get four-field shallow output instead of the richer structured form from [server/experiments/src/style-bible.types.ts](server/experiments/src/style-bible.types.ts).
- The per-page prompts collapse into "what literally happens on the page" rather than "what is the unforgettable visual moment", because Claude has no token-space to make a creative directorial decision.

The Scene Director experiment explicitly identified this problem ("The fundamental problem with the current pipeline: Claude is asked to be both an art director and a technical prompt writer in a single call." — [scene-director.ts:1-22](server/experiments/src/scene-director.ts)). The experiment fixes it but never gets promoted to production.

### F3 — Visual Bible schema drift across variants [S2]

Three incompatible Visual-Bible-like objects exist in the branch:

1. `VisualBible` in [server/src/models/story.model.ts](server/src/models/story.model.ts) — 4 fields (protagonist, styleGuide, environmentRegistry as flat string map, palette).
2. `StyleBible` in [server/experiments/src/style-bible.types.ts](server/experiments/src/style-bible.types.ts) — 8 fields, environment registry has structured entries with atmosphere + spatialLayout, plus characterAnchor / characterSheet split, plus consistencyAnchors and avoidList.
3. The Scene Director's `SceneDirection` ([scene-director.ts:34-46](server/experiments/src/scene-director.ts)) — a third per-page layer that sits between the Bible and the structured scene prompt.

The production type is the **weakest** of the three. Migrating to the StyleBible shape requires data migration and prompt rewrites — not free, but the alternative (production schema = weakest schema) caps illustration quality permanently.

### F4 — Per-page prompts are not generated independently [S1]

The production pipeline generates **all N image prompts in a single Claude call** ([image-prompt-generator.ts:476-516](server/src/specialist/image-prompt-generator.ts)). This means:

- If the specialist rejects one prompt with feedback, the only way to "regenerate" is to re-run the entire batch — losing edits to the other N-1 prompts.
- The token budget for any single page is tiny (`max_tokens: 2048` divided across N pages plus the Visual Bible).
- Failures are all-or-nothing.

Scene-director experiments already split this into per-target-page generation. The new pipeline should treat per-page operations as the unit.

### F5 — Auto-advance state transitions disagree with the manual-control requirement [S1]

The current state machine auto-advances on two thresholds:
- All prompts approved → `prompt_review → illustrating` ([stories.router.ts:1085-1102](server/src/routes/specialist/stories.router.ts))
- All illustrations approved → `illustration_review → illustration_ready` ([stories.router.ts:980-1000](server/src/routes/specialist/stories.router.ts))

But the new requirement is **per-page manual buttons** with no auto-advance. The current shape can't accommodate that without ripping out the auto-advance and adding explicit transition endpoints. Conceptually those four states (`prompt_review`, `illustrating`, `illustration_review`, `illustration_ready`) collapse to **one workspace state** plus per-page sub-status. (User confirmed in Q1.)

### F6 — Fire-and-forget background work from HTTP routes [S1]

Two long-running operations (`generateImagePromptsForPages` and `triggerIllustrationGeneration`) are invoked as `.catch(...)` promises from inside route handlers ([stories.router.ts:463-470, 1097-1105](server/src/routes/specialist/stories.router.ts)).

Consequences:

- If the server restarts mid-operation, the work is **silently lost**. The story sits in `illustrating` forever.
- The route returns 200 before the work has even started. The client can't distinguish "queued" from "in progress" from "failed before starting".
- Errors are logged to `console.error` and forgotten — no retry, no surfacing, no audit trail.
- On Render free tier (the deployment target per [render.yaml](render.yaml)), the dyno can be reaped at any time. Render warns explicitly about background work outside the request lifecycle.

This is **the single biggest reliability bug** in the current implementation.

### F7 — Rejection regenerates every page, not just the rejected page [S1]

In [stories.router.ts:993-1000](server/src/routes/specialist/stories.router.ts), when an illustration is rejected, the handler:

1. Sets the rejected page's `illustrationStatus` to `"pending"`.
2. Calls `triggerIllustrationGeneration(storyId, ownerUid)`.

But `triggerIllustrationGeneration` ([specialistIllustration.service.ts:148-235](server/src/specialist/specialistIllustration.service.ts)) iterates **every** page whose `promptStatus === "approved"`, including those already in `illustrationStatus === "done"`. Those already-approved pages get their status flipped to `"generating"` and re-generated, overwriting the approved image in Firebase Storage at the same path.

This is a destructive bug. A specialist who has approved page 1 and rejects page 3 will find page 1's image silently replaced.

### F8 — Synchronous per-page image generation inside one HTTP request [S2]

`triggerIllustrationGeneration` runs a `for` loop calling Seedream synchronously page-by-page ([specialistIllustration.service.ts:158-227](server/src/specialist/specialistIllustration.service.ts)). For a 10-page story this can easily run 60+ seconds. Even though it's invoked fire-and-forget so the HTTP response is fast, the Node event loop is blocked on a single Seedream call at a time per story. With multiple specialists, this is a head-of-line-blocking problem.

Per-page work belongs in a job queue, not a for loop.

### F9 — Two mutually contradictory prompt models used in production [S2]

[image-prompt-generator.ts](server/src/specialist/image-prompt-generator.ts) uses `claude-haiku-4-5-20251001` for everything. The scene-director experiments use `claude-sonnet-4-6`. There is no documented rationale for either. The implication "Haiku is fine for prompt generation" is unverified; the implication "Sonnet is needed for creative direction" is plausible but unproved. The redesign should make model choice an explicit, named decision per stage, not a default-and-forget.

### F10 — Telemetry written to local disk; broken on Render [S2]

LLM call logs are appended to `server/logs/image-prompt-calls.jsonl` ([image-prompt-generator.ts:33-42](server/src/specialist/image-prompt-generator.ts)). On Render's filesystem these are ephemeral and effectively useless. There is no production telemetry pipeline.

### F11 — Prompts not versioned or persisted as artefacts [S2]

When the specialist rejects a prompt and a new one is generated, the old prompt is **overwritten** in the `pages[].imagePrompt` field. There is no version history per page. This kills the most important debugging signal in the system: "what changed from the version that didn't work to the version that did?".

The Agent 1 pipeline already establishes a pattern for this (`agent1Versions[]`). The illustration pipeline should follow it.

### F12 — Polling client UI for long-running work [S3]

[client/src/specialist/components/IllustrationsTab.tsx](client/src/specialist/components/IllustrationsTab.tsx) polls every 5 seconds via `draftStore.getStory()` while in `illustrating` status. Per-page status updates are visible only after a polling tick. The progress feedback feels jittery in practice and is a load multiplier on the API. A proper job model (§15) lets the UI subscribe rather than poll.

### F13 — Experiment harness mixed into production codebase [S3]

[server/experiments/](server/experiments/) ships with the production server build (it's a sibling of `src/`) and shares the same `package.json` dependencies. 12 variant files sit in source. There is no clear "this is the chosen variant" — every variant is implicitly equal-status. This:

- Bloats the production server image with research code.
- Confuses any new contributor about which file represents the real pipeline.
- Makes git history harder to read (every experiment is a feature commit, not an obvious WIP fork).

Experiment code should live in a separate workspace (Nx-style or just `experiments/` outside `server/`) with its own tsconfig, not next to production.

### F14 — IllustrationsTab does pipeline routing in the client [S3]

[IllustrationsTab.tsx:266-302](client/src/specialist/components/IllustrationsTab.tsx) switches on `story.status` to decide which panel to render (ApprovedPanel / PromptReviewPanel / IllustratingPanel / IllustrationReviewPanel / Gallery). This makes the client a partial reimplementation of the server state machine. With v2's collapsed states this is much simpler — but more importantly, the client should render based on **typed data** (per-page sub-status), not on the macro status.

### F15 — No safety/age-appropriateness gate on illustrations [S2]

Agent 1 has a `postValidationFlags` mechanism for the manuscript. The illustration pipeline has no analogue. A child-appropriateness check on generated images is a hard requirement for the product but is not in the current code anywhere.

---

## §4. Cross-cutting issues

Above the individual findings, three patterns recur:

**(C1) The system is missing the concept of an "artefact".** Every intermediate output (Visual Bible, prompt, structured scene, final assembled prompt, image bytes) lives inline on the `Story` document and is mutated in place. There's no `{ id, version, createdAt, createdBy, content }` envelope around any of them. This makes versioning impossible without restructuring.

**(C2) The pipeline is structured around endpoints, not around the work.** Each route handler does load + validate + transition + side-effect + persist + fire-and-forget background work. There is no separate "what work needs to happen" abstraction. The system would benefit from an explicit **job graph** where stages are nodes, artefacts are edges, and the API surface is a thin wrapper.

**(C3) The boundary between "creative" and "technical" is ambiguous.** Some Claude calls are clearly creative (Scene Director — pick the moment, the light, the composition). Some are clearly technical (Prompt Converter — translate creative direction into a Seedream-compatible string). Some calls do both. The specialist UI surfaces both indiscriminately. The redesign needs an explicit creative-vs-technical seam, with each side having its own LLM model, prompt template, retry policy, and observability surface.

---

## §5. What is worth keeping

A redesign is not a teardown. From the current branch, the following ideas are correct and should survive:

- **StyleBible's structured environment registry** (atmosphere + spatialLayout per scene). The flat string-map in production-`VisualBible` is too thin.
- **The Scene Director two-call split** (creative direction → technical prompt). This is the right shape.
- **The 5-section structured scene prompt** (setting / character / focalPoint / composition / lighting). This is a good intermediate representation, far better than free-form natural language.
- **The avoid list** with text-suppression as item 1 (Seedream weights early tokens more heavily). Carry forward.
- **Per-page review UI** as the specialist interaction surface. The shape of the review cards in [PromptReviewPanel](client/src/specialist/components/PromptReviewPanel.tsx) and [IllustrationReviewPanel](client/src/specialist/components/IllustrationReviewPanel.tsx) is broadly right.
- **`ImageGenerationProvider`** in [server/src/shared/types/aiProvider.ts](server/src/shared/types/aiProvider.ts) as the seam to the image model. Keep the abstraction; just don't keep the reference-image parameter in v2.
- **The experiment harness methodology** (1 story / 3 pages / one-variable-per-experiment / 1–5 rubric). Keep — promote to a permanent evaluation tool, not a research-only artifact.

Everything else in this part is either redesigned or removed. The table in §18 specifies which.

---

# PART II — Redesigned architecture

---

## §6. Design principles

The new system is bound by seven principles. Every concrete decision below traces back to one of these.

1. **One pipeline, one stage at a time.** Each stage has one job, one LLM call (or none), one typed output. No stage does both creative and technical work. No stage runs another stage as a side effect.
2. **Artefacts, not fields.** Every output is a versioned, addressable artefact: `{ id, version, parent, content, createdAt, createdBy, model, prompt }`. Stages produce artefacts; the Story document references the latest by version pointer.
3. **Consistency through structured text, not pixels.** No reference images. Visual identity is locked through a rich Visual Bible (character sheet, style guide, environment registry, palette, avoid list, consistency anchors) embedded in every prompt.
4. **The specialist drives.** No automatic state transitions inside the illustration workspace. Visual Bible + scene plans are generated up-front on entry; everything else happens on a per-page button click.
5. **Two surfaces, one model.** Specialists see human-readable scene plans. Developers see structured prompts, final image-model prompts, latency, tokens, model versions. Both surfaces read the same artefacts, with the developer surface being expandable / role-gated.
6. **Background work is jobs, not promises.** Anything that takes more than 5 seconds runs as a durable job with state in Firestore, idempotency keys, and retry semantics. Route handlers enqueue, never await.
7. **Provider-agnostic.** The image model is a plug-in. The LLM is a plug-in. Switching either should change one file, not ten.

---

## §7. Industry references

The architecture below adapts patterns that are standard in three adjacent industries.

**Animation production pipeline (Pixar / Disney / Studio Ghibli).** A film moves through Script → Visual Development → Storyboard → Layout → Animation → Lighting → Final Render. Each step has a dedicated artist; each produces a durable artefact that downstream steps consume. **Mapping to DAMMAH:** Manuscript → Visual Bible → Scene Plan → Structured Prompt → Final Prompt → Image. The Visual Bible is "visual development"; the Scene Plan is "storyboard + layout"; everything after is "render".

**Comic / manga production.** Script → Thumbnails → Pencils → Inks → Colors → Letters. The key idea is **serialised stages with hand-off contracts**: a penciller doesn't need to know how the colorist will work. **Mapping:** stages are decoupled by typed artefacts; a developer working on Stage 3 doesn't need to understand Stage 1.

**Picture book industry.** Editor + Art Director + Illustrator. The art director produces character model sheets and a style guide; the illustrator works within them. **Mapping:** Stage 1 (Visual Director) is the art director; Stage 2 (Storyboard) is the illustrator's thumbnails; Stage 3 (Prompt Engineer) and beyond is the print production.

**Agent / pipeline orchestration patterns (LangGraph, Inngest, Temporal).** Modern AI workflows model the system as a **typed state graph** where each node is an idempotent function consuming typed inputs and producing typed outputs, with durable state between calls. **Mapping:** the Story document is the durable state; each stage is a typed node; jobs in Firestore are the durable execution log.

**Stable Diffusion / Midjourney prompt structure orthodoxy.** Higher-quality outputs come from prompts ordered: (1) hard constraints / negatives early, (2) style anchors, (3) subject, (4) environment, (5) lighting/mood. **Mapping:** [server/experiments/src/style-bible.assembler.ts](server/experiments/src/style-bible.assembler.ts) already has this ordering. The v2 Final Prompt Assembler keeps it.

---

## §8. High-level architecture

```
                    ┌──────────────────────────────────────────────┐
                    │   Story (status = approved)                  │
                    │   Specialist clicks "Open illustration       │
                    │   workspace" on the Workspace page           │
                    └────────────────────┬─────────────────────────┘
                                         │
                       transition: approved → illustration_workspace
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 1a — Visual Director (LLM)                    │
              │ Generates ONE Visual Bible from the full manuscript │
              │ Output artefact:  VisualBibleArtefact                 │
              └──────────────────────────┬──────────────────────────┘
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 1b — Scene Planner (LLM, BATCH)               │
              │ Reads full story + Visual Bible                     │
              │ Produces ONE Scene Plan per page                    │
              │ Output artefacts:  ScenePlanArtefact[]              │
              └──────────────────────────┬──────────────────────────┘
                                         │
              ◇──────────────  Specialist enters workspace  ──────────────◇
                                         │
              Per page, on specialist's manual button click:
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 2 — Prompt Engineer (LLM, PER PAGE)           │
              │ Reads Scene Plan + Visual Bible                     │
              │ Produces StructuredPromptArtefact                   │
              └──────────────────────────┬──────────────────────────┘
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 3 — Final Prompt Assembly (PURE FUNCTION)     │
              │ Deterministic concatenation following the           │
              │ Seedream prompt-ordering orthodoxy from §7          │
              │ Output:  FinalPromptString  +  FinalPromptArtefact  │
              └──────────────────────────┬──────────────────────────┘
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 4 — Image Generation (PROVIDER, ASYNC JOB)    │
              │ Calls ImageGenerationProvider.generateImage(...)    │
              │ Stores bytes to Firebase Storage                    │
              │ Output:  ImageArtefact  (URL + metadata)            │
              └──────────────────────────┬──────────────────────────┘
                                         │
                          Image pending review on the page card
                                         │
              ◇──────────  Specialist approves OR rejects-with-feedback  ──────◇

                                         │
              On reject-with-feedback:
              ┌──────────────────────────┴──────────────────────────┐
              │ Stage 1b' — Scene Planner re-run (LLM, PER PAGE)    │
              │ Inputs: original Scene Plan + Visual Bible +        │
              │ specialist feedback note                             │
              │ Output: new ScenePlanArtefact (version++)           │
              │ Cascades automatically: Stage 2 → 3 → 4 re-run      │
              │ for this one page                                    │
              └──────────────────────────┬──────────────────────────┘
                                         │
              ... loop until all pages have an approved image ...
                                         │
              ◇──────────  Specialist clicks "Mark as ready to publish"  ──────◇
                                         │
                       transition: illustration_workspace → illustration_ready
                                         │
                                  (existing publish flow takes over)
```

A note on what is **not** in this diagram:

- No reference images. Stages 2–4 operate on text only.
- No auto-advance. Specialist clicks per page; specialist clicks at the end.
- No fire-and-forget. Stages 1a and 1b are HTTP-synchronous when the workspace opens (a one-minute call is acceptable for a single batched start). Stage 4 is the only stage long enough to need a job queue.

---

## §9. State machine

### 9.1 Macro states on the Story

The existing four illustration macro states collapse to **two**:

```
approved
   │
   │ user action: "Open illustration workspace"
   ▼
illustration_workspace
   │
   │ user action: "Mark as ready to publish" (only enabled
   │             when every page has an approved image)
   ▼
illustration_ready
   │
   │ existing publish flow
   ▼
published
```

Plus existing terminal: `archived` (allowed from any of the above).

Plus existing back-edge: `illustration_workspace → in_review` (specialist realizes the manuscript needs more work). This invalidates all illustration artefacts; entering `illustration_workspace` again is a fresh start (versioned, not destructive — old artefacts remain for audit).

### 9.2 Page sub-state

The `Story.pages[i]` array gains a per-page sub-status that drives the page card UI:

```
plan_only         ─ Scene Plan exists, no image generated yet
generating_image  ─ Stage 4 job in flight
awaiting_review   ─ Image generated, pending specialist decision
approved          ─ Specialist approved
needs_revision    ─ Specialist rejected with feedback; regen pending or in flight
```

Note these are **substates**, not story-level states. They drive UI cards. Macro state stays `illustration_workspace` throughout.

### 9.3 Allowed transitions

```
Macro:
  approved             → illustration_workspace
  illustration_workspace → illustration_ready          (gated: all pages approved)
  illustration_workspace → in_review                   (specialist re-opens manuscript)
  illustration_workspace → archived
  illustration_ready    → published                    (existing flow)
  illustration_ready    → illustration_workspace       (specialist re-opens for fixes)
  illustration_ready    → archived

Per page (within illustration_workspace):
  plan_only            → generating_image                (specialist clicks "Generate")
  generating_image     → awaiting_review                 (job succeeds)
  generating_image     → plan_only                       (job fails — image cleared)
  awaiting_review      → approved
  awaiting_review      → needs_revision                  (with feedback note)
  needs_revision       → generating_image                (cascades automatically)
  approved             → needs_revision                  (specialist reopens — rare)
```

All transitions are validated server-side, identical to the existing Agent 1 transition pattern. Macro transitions go through `POST /api/specialist/stories/:id/transitions`. Per-page substate changes go through `POST /api/specialist/stories/:id/pages/:n/<action>` endpoints (§14).

---

## §10. Data model

All types live in `server/src/illustration/types.ts` (or extend `story.model.ts` directly). The client mirrors them in `client/src/types/illustration.ts`. Names below are normative.

### 10.1 The Visual Bible

```ts
interface VisualBibleArtefact {
  id: string;                     // UUID
  storyId: string;
  version: number;                // monotonic per story, starts at 1
  createdAt: number;              // ms since epoch
  createdBy: "system" | { uid: string };  // "system" = generated, uid = specialist edit
  parentVersion: number | null;   // for edit-vs-regenerate audit
  source: "llm_generated" | "specialist_edited";
  llmCall: LLMCallRecord | null;  // null when source = specialist_edited

  // Content
  characterSheet: string;         // 5-7 sentences, full description
  characterAnchor: string;        // 1-2 sentences, embedded in every prompt
  styleGuide: string;             // medium, line quality, palette mood, level of stylisation
  consistencyAnchors: string[];   // 3-5 short phrases, 4-6 words each
  environmentRegistry: Record<string, EnvironmentEntry>;
  palette: string;                // 5-7 comma-separated colour names
  avoidList: string[];            // 6-8 short phrases; item [0] is always the no-text constraint
}

interface EnvironmentEntry {
  atmosphere: string;             // 1 sentence: feeling, light quality, visual tone
  spatialLayout: string;          // 1 sentence: prop positions using wall references
}
```

This is the StyleBible shape from experiments, promoted to production type and given the artefact envelope.

### 10.2 The Scene Plan (specialist-facing artefact)

Two views of the same artefact: **human-readable** (the primary specialist surface) and **structured** (the developer-only expandable details).

```ts
interface ScenePlanArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentVersion: number | null;
  llmCall: LLMCallRecord;

  // Inputs locked at generation time (so artefact is self-contained for audit)
  visualBibleVersion: number;
  feedbackNote: string | null;    // populated for regenerations triggered by Stage 1b'

  // === Human-readable view (rendered as the specialist primary surface) ===
  title: string;                   // e.g. "Hesitation at the doorway"
  prose: string;                   // 2-4 sentences in plain language; what is in the image
  emotionalIntent: string;         // 1 sentence: "what the reader should feel"
  keyVisibleDetail: string;        // 1 sentence: the one physical element that carries the scene

  // === Structured view (developer / admin only) ===
  director: SceneDirection;        // creative decisions (moment, camera, light, hook)
  structuredPrompt: StructuredPrompt | null;  // populated after Stage 2 runs
}

interface SceneDirection {
  moment: string;                  // exact split-second, present tense
  cameraSpec: string;              // distance, angle, framing
  lightingChoice: string;          // source, quality, mood
  visualHook: string;              // the memorable element
  keyPhysicalDetail: string;       // single-detail body language anchor
}
```

The `prose` + `emotionalIntent` + `keyVisibleDetail` fields are what the specialist sees by default. `director` and `structuredPrompt` live behind an expandable panel.

### 10.3 The Structured Prompt (Stage 2 output)

```ts
interface StructuredPrompt {
  setting: string;       // "<env key> | <light state> | <visible props for this frame>"
  character: string;     // "<surface/contact> | <body position, gaze>"
  focalPoint: string;
  composition: string;   // "<framing> | <angle> | <fg/mid/bg>"
  lighting: string;      // "<source+pos> | <quality> | <illuminates> | <shadow> | mood:<word>"
}
```

This is the same 5-section format from the experiments. It is the input to Stage 3.

### 10.4 The Final Prompt (Stage 3 output)

```ts
interface FinalPromptArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentScenePlanVersion: number;
  parentVisualBibleVersion: number;

  finalPromptString: string;    // the exact text sent to the image provider
  promptOrder: string[];        // ordered list of section labels for audit
  charCount: number;
  warnings: string[];           // e.g. "prompt exceeds 1200 chars, may be truncated"
}
```

### 10.5 The Image (Stage 4 output)

```ts
interface ImageArtefact {
  id: string;
  storyId: string;
  pageNumber: number;
  version: number;
  createdAt: number;
  parentFinalPromptId: string;

  // Provider metadata
  providerId: string;            // "seedream" | future others
  modelId: string;
  modelParams: Record<string, unknown>;  // seed, guidance_scale, width, height, etc.
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;

  // Output
  storagePath: string;           // e.g. specialist-illustrations/<storyId>/p3-v2.jpeg
  publicUrl: string;
  mimeType: string;
  bytes: number;

  // Review state
  reviewStatus: "awaiting_review" | "approved" | "needs_revision";
  approvedAt: number | null;
  rejectionNote: string | null;
}
```

### 10.6 The page in the Story document

```ts
interface IllustrationPage {
  pageNumber: number;
  text: string;                  // from manuscript, immutable here

  // Latest version pointers
  currentScenePlanVersion: number | null;
  currentImageVersion: number | null;

  // Sub-status (derived but materialized for query speed)
  status: "plan_only" | "generating_image" | "awaiting_review" | "approved" | "needs_revision";

  // Job tracking (for Stage 4 async work)
  pendingJobId: string | null;
  lastError: string | null;
}
```

The artefacts themselves live in subcollections (§10.7) so the Story document stays small and read-able.

### 10.7 Firestore layout

```
stories/{storyId}                              ← Story doc (unchanged shape + new fields below)
  ├── status: "illustration_workspace" | ...
  ├── illustrationPages: IllustrationPage[]    ← lightweight per-page state
  ├── currentVisualBibleVersion: number | null
  └── illustrationWorkspaceOpenedAt: number | null

stories/{storyId}/visualBibles/{vbId}          ← VisualBibleArtefact docs
stories/{storyId}/scenePlans/{spId}            ← ScenePlanArtefact docs
stories/{storyId}/finalPrompts/{fpId}          ← FinalPromptArtefact docs
stories/{storyId}/images/{imageId}             ← ImageArtefact docs (URL + metadata, not bytes)
stories/{storyId}/illustrationJobs/{jobId}     ← Job records (Stage 4 only)
```

Storage:

```
specialist-illustrations/{storyId}/p{pageNumber}-v{version}.{ext}
```

Old `STORAGE_PATHS.specialistIllustration` is replaced; the new path is versioned so rejection never overwrites an approved image.

---

## §11. Stage-by-stage specification

Each stage is documented with: **purpose / inputs / outputs / model / retry / observability / failure modes**.

### §11.1 Stage 1a — Visual Director

**Purpose.** Read the full manuscript and produce one durable Visual Bible per story. This is the world-building step. It is invoked exactly once per story, the first time the specialist opens the illustration workspace. The specialist can edit it inline or regenerate it as a whole; regeneration produces a new version.

**Inputs.**
- Full manuscript (the approved manuscript from `story.currentDraft` and `story.brief`).
- Brief metadata: `ageAndScope`, `storyType`, `clinicalFoundation.creativeVision`.

**Outputs.** One `VisualBibleArtefact` (§10.1).

**Model.** `claude-sonnet-4-6`. Sonnet, not Haiku — this is creative, structural, one-shot work where quality matters far more than cost.

**Prompt template.** Adapted from [server/experiments/src/style-bible.generator.ts](server/experiments/src/style-bible.generator.ts) (the `callClaudeForStyleBible` prompt). Two adjustments:

- The avoid-list item [0] is hard-mandated to `"text, letters, words, captions, labels, speech bubbles, logos of any kind"`.
- Add an explicit "consistencyAnchors must be short, repeatable, and embeddable in 1200-char prompts" instruction.

**Token budget.** ~3000 input tokens (typical manuscript) + ~2000 output tokens. Comfortably within Sonnet's window.

**Retry.** 1 retry on JSON parse failure. No retry on content — if Sonnet produces a thin or wrong Visual Bible, that's a specialist edit, not an automatic retry.

**Observability.** Full prompt + raw response + token usage + latency are stored on the artefact (`llmCall: LLMCallRecord`). The artefact also records `source` (llm_generated / specialist_edited) and `parentVersion` for audit trail.

**Failure modes.** Same as Agent 1: 5xx from Anthropic, parse failure, validation failure. Surface to the specialist as "Couldn't generate the Visual Bible — try again" with a retry button. Does not advance state.

**Idempotency.** Calling Stage 1a twice on the same `(storyId, manuscriptVersion)` is allowed; each call produces a new artefact with `version + 1`. The Story's `currentVisualBibleVersion` is updated to the latest.

### §11.2 Stage 1b — Scene Planner

**Purpose.** Read the full manuscript + Visual Bible and produce one Scene Plan per page. This is the storyboard step.

**Inputs.**
- Full manuscript pages array.
- Visual Bible (the artefact at `currentVisualBibleVersion`).
- (For regenerations of a single page) the existing Scene Plan version + the specialist's feedback note.

**Outputs.** N `ScenePlanArtefact`s (§10.2), one per page on the first run. One artefact for a single page on a regeneration.

**Model.** `claude-sonnet-4-6`. Same rationale as Stage 1a — creative direction.

**Prompt template.** Adapted from [server/experiments/src/scene-director.ts](server/experiments/src/scene-director.ts) `buildSceneDirectorPrompt`. The output JSON schema is extended to include both the **human-readable view** (`title`, `prose`, `emotionalIntent`, `keyVisibleDetail`) and the **director view** (`director: { moment, cameraSpec, lightingChoice, visualHook, keyPhysicalDetail }`). One LLM call produces both; the artefact stores both.

The prompt also includes the **full story** for narrative context (page-by-page is wrong — a Scene Plan needs to know what came before and after to make the right framing decision). This matches the exp-09 finding.

**Critical prompt rules** carried forward from experiments:
- Literal language only — no metaphors, no similes.
- No emotion names in `keyPhysicalDetail`.
- Each page must be visually distinct from its neighbours (different framing / angle / proximity).
- No text-based identifiers (room numbers, signs) in the scene.

**Token budget.** Input scales with story length: ~3000 tokens for the manuscript, plus the Visual Bible. Output: ~250 tokens per page, batched in a single call when generating all N at once; ~250 tokens for a single regeneration.

**Retry.** 1 retry on JSON parse / schema validation failure.

**Observability.** Full prompt + raw response + tokens + latency on every artefact. Plus: every Scene Plan stores its `visualBibleVersion` so we can reproduce the exact LLM inputs.

**Failure modes.** Same as Stage 1a. Per-page generation failure on a regeneration leaves the old Scene Plan version active.

**Idempotency.** Stage 1b can be re-run for the whole story (creates N new versions) or for a single page (creates 1 new version). Both are safe — no in-place mutation.

**The regeneration sub-flow.** When the specialist rejects an image with feedback, Stage 1b is invoked **for that one page** with:
- The previous Scene Plan version (passed in the prompt as "previous direction").
- The specialist's feedback (passed in the prompt as "please address this").
- The full manuscript and Visual Bible.

The prompt asks for a revised Scene Plan that **specifically addresses the feedback** while staying within the Visual Bible. Stage 2 + 3 + 4 then cascade automatically for that page.

### §11.3 Stage 2 — Prompt Engineer

**Purpose.** Translate a Scene Plan into a structured 5-section prompt format ([§10.3](#103-the-structured-prompt-stage-2-output)). This is the technical handoff from creative to mechanical.

**Inputs.**
- One Scene Plan (latest version for the page).
- The Visual Bible.

**Outputs.** Populates the `structuredPrompt: StructuredPrompt | null` field on the Scene Plan artefact. (Stage 2 does **not** create its own artefact — it's an extension of the Scene Plan. This avoids artefact proliferation.)

**Model.** `claude-haiku-4-5-20251001`. This is mechanical translation; Haiku is fast and accurate enough.

**Prompt template.** Adapted from [server/experiments/src/scene-director.ts](server/experiments/src/scene-director.ts) `buildPromptConverterPrompt`. The instruction is "translation, not creativity — the creative decisions are already made; translate them into precise Seedream-compatible structure with strict word budgets per field". The "literal language only" rule is repeated here.

**Token budget.** ~800 input, ~300 output. Cheap.

**Retry.** 1 retry on parse / schema failure.

**Observability.** Prompt + response + tokens + latency stored on the parent Scene Plan artefact (in a nested `stage2LLMCall` field).

**Why a separate LLM call instead of a template substitution.** Two reasons: (a) the structured prompt needs to omit props not visible in the camera frame, which requires judgment about composition that a template can't make; (b) the structured prompt needs to translate `keyPhysicalDetail` into precise body coordinates ("white-knuckled grip" → "fingers pressed white against the bag strap"), which requires light rephrasing.

**Failure modes.** Same shape as Stages 1a/1b. On failure the Scene Plan is still valid, just lacks a structured prompt — re-runnable on next image generation attempt.

**Idempotency.** Re-running Stage 2 on the same Scene Plan version overwrites the `structuredPrompt` field. This is OK because the Scene Plan is the artefact, not the structured prompt — the Visual Bible + creative direction are immutable, the translation can be retried.

### §11.4 Stage 3 — Final Prompt Assembly

**Purpose.** Deterministically concatenate the Visual Bible + structured prompt into the exact text string sent to the image model. This is a **pure function** — no LLM call.

**Inputs.**
- Visual Bible (current version).
- Scene Plan with structured prompt populated.

**Outputs.** A `FinalPromptArtefact` (§10.4).

**Algorithm.** Direct adaptation of [server/experiments/src/style-bible.assembler.ts](server/experiments/src/style-bible.assembler.ts) `assembleStyleBiblePagePrompt`, **minus** all `referenceInstruction` parameters (no reference images in v2). The token-weighted ordering:

1. Hard no-text constraint.
2. Consistency anchors (top 2).
3. `Setting: <structuredPrompt.setting>.`
4. `<visualBible.characterAnchor> In this scene: <structuredPrompt.character>.`
5. `Focal point: <structuredPrompt.focalPoint>.`
6. `Lighting: <structuredPrompt.lighting>.`
7. `Color palette: <top 4 palette colours>.`
8. `Avoid: <top 3 avoid items>.`
9. Footer: `Children's book illustration.`

**Why pure function instead of a stage.** Determinism + auditability. Given the same inputs, the same final prompt is produced byte-for-byte. The artefact records the exact string for forensic audit ("which prompt produced this image?").

**Warnings.** If the final string exceeds 1200 characters, log a warning (Seedream truncates at ~300 tokens). v2 should target 800–1000 chars typical.

**Failure modes.** None — pure function. Always produces an artefact.

### §11.5 Stage 4 — Image Generation

**Purpose.** Send the final prompt to the image provider and store the result.

**Inputs.** A `FinalPromptArtefact`.

**Outputs.** An `ImageArtefact` (§10.5) with `reviewStatus: "awaiting_review"`.

**Provider.** Calls `ImageGenerationProvider.generateImage({ textPrompt, seed, outputWidth, outputHeight })`. **No `referenceImage` parameter** — that parameter is removed from the v2 provider contract (§17).

**Seed strategy.** Per page: a fresh random seed on the first generation; on regenerations, a **new** random seed (we want variation, not determinism — the feedback note is the variation signal, not the seed). The Image Artefact records the seed used so an admin can re-run if needed.

**Output dimensions.** 1024×1024 for all pages in v2.0. Aspect ratio variation is out of scope.

**Storage.** `specialist-illustrations/{storyId}/p{pageNumber}-v{version}.{ext}` in Firebase Storage. The file is made publicly readable; the public URL is stored on the artefact.

**Concurrency.** Stage 4 runs as a **background job** (§15). The route handler enqueues; the worker executes. Per-page jobs run in parallel up to a small concurrency limit (default 3, configurable). Polling-tier latency: typical end-to-end <30s per page.

**Retry.** 2 automatic retries on provider 5xx / timeout, exponential backoff. After 3 total attempts, the job moves to `failed` state. The page sub-status reverts to `plan_only` and `lastError` is populated on the IllustrationPage.

**Observability.** Full provider request + response metadata is stored on the Image Artefact, including the seed, model ID, model parameters, latency, and any provider-side warnings.

**Failure modes.** Provider errors are isolated to the page — no other page is affected. The specialist sees a "Generation failed, try again" panel on the page card with the error message.

**Idempotency.** Each enqueue carries an idempotency key (`storyId + pageNumber + finalPromptId`). Re-clicking the "Generate" button on a page that already has a generating job is a no-op (returns the existing job). Re-clicking after the job completed creates a new version.

---

## §12. Specialist UX architecture

The illustration workspace is **one tab** in the existing Story Workspace ([client/src/specialist/pages/StoryWorkspacePage.tsx](client/src/specialist/pages/StoryWorkspacePage.tsx)) — the same place where the Brief, Story, and History tabs already live. Tab label: **"Illustrations"** (added next to "Story" and before "History").

### 12.1 Tab states (one per macro state)

The Illustrations tab renders one of three panels based on `story.status`:

**Panel A — Workspace not started.** Story is in `approved` and the workspace has never been opened.

- Centered call-to-action card: "The story has been approved. Open the illustration workspace to start designing the illustrated book."
- Big button: **"Open illustration workspace"**.
- Click triggers `POST /api/specialist/stories/:id/transitions { to: "illustration_workspace" }` which on the server enqueues Stage 1a + Stage 1b as a single batched job.
- Page immediately switches to **Panel B** in a loading state.

**Panel B — Workspace (the main surface).** Story is in `illustration_workspace`.

- Top: Visual Bible card (collapsible). Editable. Shows character sheet, style guide, palette swatches, environment list, avoid list. "Edit", "Regenerate Visual Bible" buttons. Regenerate has a confirmation dialog ("This may invalidate scene plans on pages where you've already approved an image. Continue?").
- Middle: page list, one card per page (see 12.2 below).
- Footer: a sticky bar with **"Mark as ready to publish"** button — disabled until every page has `status === "approved"`. Click triggers macro transition `illustration_workspace → illustration_ready`. Confirmation dialog: "All N pages are approved. Mark this story ready to publish?".

**Panel C — Ready / published.** Story is in `illustration_ready` or `published`.

- Read-only gallery of approved images.
- "Reopen for edits" button (only for `illustration_ready`) — transitions back to `illustration_workspace`.

### 12.2 The page card (the heart of the UX)

One card per manuscript page. The card has three vertical regions:

**Region 1 — Manuscript text** (read-only, top of card, visually de-emphasised — light grey background).

> Page 3
> Sara stood outside the classroom door. Her stomach felt tight. She didn't want to go in...

**Region 2 — Scene Plan** (primary specialist content).

> **Hesitation at the doorway**
> 
> Sara stands two steps back from the classroom door, her schoolbag held tight against her chest with both arms. The corridor is empty. The morning light from a high window falls on her face but not on the door, leaving the entrance in a duller shadow. We see her from a low angle, slightly behind, close enough to read the tension in her shoulders but not so close that her face fills the frame.
> 
> **What the reader should feel:** the weight of standing on a threshold — a held breath before a decision.
> 
> **Key visible detail:** the white-knuckled grip on the bag strap.

Inline actions:
- 🔄 **Regenerate scene plan** (no feedback — produces a new alternative)
- 💬 **Suggest a change** (opens a textarea, specialist writes feedback, click "Regenerate with feedback")
- ▾ **Show technical details** (expand the developer panel — see §13)
- Version indicator: "v2 of 3" (clickable — see prior versions)

**Region 3 — Image** (only present once Stage 4 has run).

If `status === "plan_only"`:
- A placeholder + a single big button: **"Generate illustration"**.

If `status === "generating_image"`:
- A skeleton + spinner + "Generating… typically <30s".

If `status === "awaiting_review"` or `"approved"`:
- The image thumbnail, click to lightbox.
- **"Approve"** + **"Reject with feedback"** actions (the latter opens a textarea, requires a non-empty note, triggers Stage 1b regeneration).
- An "approved" badge if approved.

If `status === "needs_revision"`:
- The previous image is shown in a faded state ("This image was rejected. Regenerating…") or a spinner if Stage 4 is in flight.

### 12.3 Specialist editing of the Visual Bible

Specialists are not developers but they **are** clinicians and authors with strong opinions about the visual world. Editing the Visual Bible is supported via inline forms:

- `characterAnchor` is editable directly (short textarea).
- `styleGuide` is editable directly.
- `palette` shows colour swatches; specialist can click "Replace" to enter new colour names.
- Each environment in `environmentRegistry` shows `atmosphere` and `spatialLayout` as separate editable fields; specialist can add or remove environments.
- `avoidList` is a list with add/remove.
- `consistencyAnchors` is a list with add/remove.

Each edit creates a new VisualBibleArtefact version with `source: "specialist_edited"` and `parentVersion: <previous>`. The Story's `currentVisualBibleVersion` updates.

Editing the Visual Bible does **not** automatically regenerate scene plans (cascade explosions are confusing). Instead, every page card shows a small "(Visual Bible has changed since this plan was generated — regenerate?)" banner if the page's Scene Plan was based on an older Visual Bible version. The specialist decides per page.

---

## §13. Developer / observability layer

Every Scene Plan, structured prompt, final prompt, and image generation has full forensic data attached. The specialist by default sees the human-readable view; the developer sees the technical view via an expandable section on each card.

The developer panel is **role-gated**: visible to roles `admin` and (during the build phase) to users with `featureFlag.illustrationDevPanels = true` in their custom claims. After the pilot stabilises this can be flipped to admin-only.

When expanded, the developer panel shows, for the latest version of the page:

```
┌─ Scene Plan (v3) ─────────────────────────────────────────────────┐
│ Generated 2026-05-12 14:33:01                                     │
│ Source: llm_generated  ·  Model: claude-sonnet-4-6                │
│ Tokens: 2340 in / 312 out  ·  Latency: 1.8s                       │
│ Based on Visual Bible v2                                          │
│                                                                    │
│ Director's notes:                                                  │
│   Moment: Sara's right hand hovers two inches from the door...    │
│   Camera: Low angle, behind-left, medium close                    │
│   Lighting: High window source, cool morning quality, ...         │
│   Visual hook: The white-knuckled grip on the bag strap           │
│   Key physical detail: Fingers locked tight, knuckles pale        │
│                                                                    │
│ ▸ Show raw LLM prompt                                              │
│ ▸ Show raw LLM response                                            │
└────────────────────────────────────────────────────────────────────┘

┌─ Structured Prompt (Stage 2) ─────────────────────────────────────┐
│ Generated 2026-05-12 14:33:04                                     │
│ Model: claude-haiku-4-5  ·  Tokens: 820/295  ·  Latency: 0.6s     │
│                                                                    │
│ setting:      corridor_morning | high window light from           │
│               above-right | empty corridor, classroom door ...    │
│ character:    standing two steps back from door | both arms ...   │
│ focalPoint:   white-knuckled grip on the bag strap                │
│ composition:  medium shot | low angle behind-left | fg: ...       │
│ lighting:     high window source, above-right | cool ...          │
│                                                                    │
│ ▸ Show raw LLM prompt                                              │
└────────────────────────────────────────────────────────────────────┘

┌─ Final Image-Model Prompt (Stage 3) ──────────────────────────────┐
│ Char count: 891 (within 1200 limit)                                │
│ Ordering: no-text → anchors → setting → character → focal →       │
│           lighting → palette → avoid → footer                     │
│                                                                    │
│ ▾ Show full prompt (copy to clipboard)                             │
│   "No text, no letters, no words, no captions, no labels, no      │
│    speech bubbles, no logos, wordless illustration. soft muted    │
│    watercolour illustration, gentle warm earth palette. Setting:  │
│    corridor_morning, high window light from above-right, empty    │
│    corridor with classroom door and pale floor strip. A small ... │
└────────────────────────────────────────────────────────────────────┘

┌─ Image (v2) ──────────────────────────────────────────────────────┐
│ Generated 2026-05-12 14:33:38                                     │
│ Provider: seedream  ·  Model: seedream-4-0-250828                 │
│ Seed: 1734590211  ·  Latency: 32.4s  ·  1024×1024 jpeg            │
│ Storage: specialist-illustrations/<storyId>/p3-v2.jpeg            │
└────────────────────────────────────────────────────────────────────┘
```

There is also a **per-story dev page** at `/specialist/stories/:id/illustration/debug` (admin-only) that shows all artefacts across all pages in a flat table, useful for "find me the page where the character drifted".

---

## §14. API surface

All endpoints live under `/api/specialist/stories/:storyId/...` and require `requireAuth + requireRole("specialist", "admin")`, identical to existing illustration routes.

### 14.1 Macro transitions (existing endpoint, new transitions)

```
POST /api/specialist/stories/:storyId/transitions
  body: { to: StoryStatus }
```

New allowed transitions:
- `approved → illustration_workspace` — opens the workspace. **Side effect:** enqueues Stage 1a + Stage 1b as a batched job. Returns immediately with `{ jobId }`. Story status updates to `illustration_workspace` once the job succeeds (or back to `approved` if it fails).
- `illustration_workspace → illustration_ready` — gated server-side: rejects with 409 if any page is not `approved`.
- `illustration_workspace → in_review` — invalidates implicit; existing artefacts kept for audit but the workspace is "reset" on re-entry.
- `illustration_ready → illustration_workspace` — re-open for edits.

### 14.2 Visual Bible management

```
GET    /api/specialist/stories/:storyId/visual-bible
       → { artefact: VisualBibleArtefact, version: number }

PATCH  /api/specialist/stories/:storyId/visual-bible
       body: Partial<VisualBibleArtefact["content"]>
       → { artefact: VisualBibleArtefact (new version), version: number }

POST   /api/specialist/stories/:storyId/visual-bible/regenerate
       → { jobId: string }
       (Same Stage 1a path as workspace open, but in isolation)

GET    /api/specialist/stories/:storyId/visual-bible/versions
       → { versions: VisualBibleArtefact[] }
```

### 14.3 Scene plan management

```
GET    /api/specialist/stories/:storyId/pages/:n/scene-plan
       → { artefact: ScenePlanArtefact, allVersions: ScenePlanArtefact[] }

POST   /api/specialist/stories/:storyId/pages/:n/scene-plan/regenerate
       body: { feedbackNote?: string }
       → { artefact: ScenePlanArtefact (new version) }
       (Synchronous — single LLM call, returns the new artefact.
        Stage 2 also runs synchronously to populate structuredPrompt.)

GET    /api/specialist/stories/:storyId/pages/:n/scene-plan/versions
       → { versions: ScenePlanArtefact[] }
```

### 14.4 Image generation & review

```
POST   /api/specialist/stories/:storyId/pages/:n/image
       (idempotency key: latest scene plan version)
       → { jobId, page: IllustrationPage (status: generating_image) }
       
GET    /api/specialist/stories/:storyId/pages/:n/image
       → { artefact: ImageArtefact, allVersions: ImageArtefact[] }

POST   /api/specialist/stories/:storyId/pages/:n/image/approve
       → { page: IllustrationPage (status: approved) }

POST   /api/specialist/stories/:storyId/pages/:n/image/reject
       body: { feedbackNote: string }
       → { page: IllustrationPage (status: needs_revision),
           regenerationJobId: string }
       (Side effect: enqueues Stage 1b regeneration with feedback,
        which cascades through Stage 2 → 3 → 4 for this one page.)
```

### 14.5 Job status

```
GET    /api/specialist/stories/:storyId/jobs/:jobId
       → { id, status, progress, error?: string, artefactId?: string }

GET    /api/specialist/stories/:storyId/jobs?status=pending|running
       → { jobs: Job[] }
```

This is what the client polls (or subscribes to via Firestore real-time listener — see §15).

---

## §15. Background-job model

Stage 4 (image generation) and the combined Stage 1a+1b workspace-open call are the only stages that need to run outside an HTTP request lifecycle. They use a **Firestore-backed job queue**.

### 15.1 Job document shape

```ts
interface IllustrationJob {
  id: string;                   // UUID
  storyId: string;
  type: "workspace_open"        // Stage 1a + 1b batched
      | "scene_plan_regen"      // Stage 1b for one page (+ cascading Stage 2)
      | "image_generation"      // Stage 4 for one page
      | "image_regen";          // Stage 1b + 2 + 3 + 4 cascade for one page
  pageNumber: number | null;
  enqueuedBy: string;           // uid
  enqueuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  status: "pending" | "running" | "succeeded" | "failed";
  attempt: number;              // 1, 2, 3
  idempotencyKey: string;       // for dedup
  inputRefs: Record<string, string>;  // versions of inputs at enqueue time
  outputRefs: Record<string, string>; // artefact IDs created by the job
  error: string | null;
}
```

### 15.2 Execution model

**Pilot (v2.0)** — a **single-process worker** baked into the Express server. On startup, the server polls the `illustrationJobs` collection (collection-group query) every 2 seconds for `status === "pending"` jobs, picks up to N (concurrency limit, default 3), and runs them. Jobs are claimed via a transactional update from `pending → running` to prevent duplicate work. On crash, jobs left in `running` with no recent `startedAt` heartbeat are reclaimed.

**Production (post-pilot, v2.1+)** — Cloud Functions (`onCreate` on `illustrationJobs/{jobId}`) or Cloud Tasks with HTTP target. Same job shape; same idempotency. The seam is the worker — swappable without changing how the route handlers enqueue.

### 15.3 Client subscription

The client listens to the Story document (via Firestore SDK) for `illustrationPages[i].status` changes — these are the user-visible state changes. No polling required. The job documents are read on-demand for error detail / debug, not subscribed to in the main flow.

### 15.4 Cancellation

Specialist can cancel a pending job from the page card. A `cancel` flag on the job document is checked at the start of `running`; cancelling a running job is best-effort (Seedream calls in flight can't be aborted, but the result is discarded).

---

## §16. Logging, telemetry, audit

Three orthogonal concerns.

**LLM call logs.** Every Anthropic call records `{ model, prompt, response, inputTokens, outputTokens, latencyMs, success, error? }`. These are stored on the artefact directly (`llmCall` field) — no separate logs collection. The current `.jsonl` log file approach in [server/src/specialist/image-prompt-generator.ts](server/src/specialist/image-prompt-generator.ts) is removed.

**Image provider logs.** Image generation records on the `ImageArtefact` directly. No separate logs collection.

**Event audit trail.** Reuse the existing `Story.editHistory[]` mechanism. New `EditHistoryEvent` variants:

```ts
| { kind: "visual_bible_generated", version: number, source: "llm" | "edit" }
| { kind: "scene_plan_generated", pageNumber: number, version: number, withFeedback: boolean }
| { kind: "image_generated", pageNumber: number, version: number }
| { kind: "image_approved", pageNumber: number, version: number }
| { kind: "image_rejected", pageNumber: number, version: number, feedbackNote: string }
| { kind: "illustration_workspace_opened" }
| { kind: "illustration_ready_marked" }
```

These flow into the existing History tab on the workspace.

**Production observability** (post-pilot). Pipe job lifecycle events to a real telemetry service (Datadog, Sentry, or just a Firestore `analytics` collection that a dashboard reads). For the pilot, Firestore artefacts + History tab are sufficient.

---

## §17. Provider abstraction

The `ImageGenerationProvider` interface in [server/src/shared/types/aiProvider.ts](server/src/shared/types/aiProvider.ts) is **simplified** in v2.

**v1 (current branch) signature:**

```ts
generateImage(params: {
  textPrompt: string;
  referenceImage?: string;
  referenceImages?: string[];   // removed
  style?: string;
  outputFormat?: ...;
  outputWidth?: number;
  outputHeight?: number;
  seed?: number;
  additionalParams?: Record<string, unknown>;
}): Promise<ImageGenerationResult>;
```

**v2 signature:**

```ts
interface ImageGenerationProvider {
  readonly providerId: string;
  readonly modelId: string;
  generateImage(params: {
    textPrompt: string;
    outputWidth: number;       // required, default 1024 at the call site
    outputHeight: number;
    seed: number;              // required, never undefined — auditability
    providerOptions?: ProviderOptions;
  }): Promise<ImageGenerationResult>;
}

interface ImageGenerationResult {
  imageBuffer: Buffer;
  mimeType: string;
  providerMetadata: {
    modelId: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    revisedPrompt?: string;    // some providers return a normalized prompt
    rawResponse: unknown;      // for forensic debug
  };
}
```

Changes from v1:
- `referenceImage` / `referenceImages` removed.
- `style` removed (was unused in the branch).
- `seed` is required.
- The result envelope carries full provider metadata for the `ImageArtefact`.

This makes Seedream → Gemini Imagen / Nano Banana / DALL-E / future providers a one-file swap.

---

# PART III — Migration & rollout

---

## §18. Keep / remove / replace / simplify

| Current artefact / module | Decision | What replaces it / where it goes |
|---|---|---|
| `VisualBible` interface (4 fields) in [story.model.ts](server/src/models/story.model.ts) | **Replace** | `VisualBibleArtefact` from §10.1 (full StyleBible shape promoted to production) |
| `image-prompt-generator.ts` single-call function | **Remove** | Split into Stage 1a + Stage 1b in `server/src/illustration/stage1-visual-director/` and `stage1-scene-planner/` |
| `prompt-builder.ts` (`assembleSeedreamPrompt`) | **Replace** | `server/src/illustration/stage3-final-prompt/assembler.ts` — pure-function version of `style-bible.assembler.ts` minus all reference-image branches |
| `specialistIllustration.service.ts` | **Replace** | Decomposed into per-stage modules under `server/src/illustration/` plus a thin orchestrator |
| `triggerIllustrationGeneration` for-loop | **Remove** | Per-page jobs via the queue (§15) |
| Fire-and-forget Promise chains in [stories.router.ts:463, 1097](server/src/routes/specialist/stories.router.ts) | **Remove** | Enqueue jobs; never await; never `.catch` and forget |
| `STORY_STATUSES`: `prompt_review`, `illustrating`, `illustration_review`, `illustration_ready` | **Simplify** to two | `illustration_workspace` + `illustration_ready` (keep `illustration_ready`; remove the other three) |
| Auto-advance in `handleReviewPrompt` / `handleReviewIllustration` | **Remove** | Specialist clicks the explicit "Mark ready to publish" button |
| `referenceImage` / `referenceImages` on `ImageGenerationProvider` | **Remove** | v2 signature (§17) |
| Reference-image plumbing in `triggerIllustrationGeneration` | **Remove** | n/a |
| `STORAGE_PATHS.specialistIllustration` (unversioned) | **Replace** | Versioned path: `specialist-illustrations/{storyId}/p{n}-v{ver}.{ext}` |
| `server/logs/*.jsonl` files | **Remove** | LLM call records live on artefact documents |
| `IllustrationsTab.tsx` 5-status switch | **Simplify** | One panel for `illustration_workspace`; one for `illustration_ready / published`; loading state for the workspace-open job |
| `PromptReviewPanel.tsx` + `IllustrationReviewPanel.tsx` (two panels) | **Replace** | One Page Card component per §12.2 — Manuscript / Scene Plan / Image regions stacked, used uniformly |
| `server/experiments/` (12 variants) | **Move out** of `server/src/` build path | Promote chosen path to production; keep the harness (CLI, runner, rubric, test-set) in a separate `experiments/` workspace at repo root, gitignored from production builds |
| Scene Director two-call shape | **Keep & promote** | Becomes the canonical Stage 1b + Stage 2 |
| StyleBible structured environment registry | **Keep & promote** | Becomes the canonical Visual Bible environment registry |
| 5-section structured scene prompt | **Keep & promote** | Becomes the canonical `StructuredPrompt` (§10.3) |
| 1–5 rubric in `server/experiments/rubric.md` | **Keep** | Use post-launch for any provider or prompt-template change |
| `ImageGenerationProvider` interface | **Keep with v2 signature** | §17 |
| `SeedreamProvider` class | **Keep, simplify** | Drop reference-image branches; require seed; richer metadata return |
| Per-page review UI shape (review-card pattern) | **Keep** | Reused in the new single Page Card component |

---

## §19. Migration plan (existing branch → v2)

The migration is not "merge `image-gen-experiments` into `main`". It is "build v2 fresh on a new branch, using the StyleBible + Scene Director ideas as inputs, in a clean shape". The existing branch becomes a research reference, not a base.

### 19.1 What to delete first

These are the files that become **net-negative** under v2 — they pull thinking back toward reference-image consistency or single-call architecture. Delete them on the v2 branch:

- All `server/experiments/src/variants/` files **except** the StyleBible and Scene Director ones (those are templates for production).
- `server/src/specialist/image-prompt-generator.ts` — the single-call generator.
- `server/src/specialist/prompt-builder.ts` — replaced by the structured assembler.
- Reference-image branches in `server/src/providers/seedream.provider.ts`.
- The `STORAGE_PATHS.specialistIllustration` unversioned path constant.

### 19.2 What to migrate forward (with rewrites)

- `StyleBible` types from `server/experiments/src/style-bible.types.ts` → `server/src/illustration/types/visual-bible.ts` with the artefact envelope added.
- `callClaudeForStyleBible` prompt → `server/src/illustration/stage1-visual-director/prompt-builder.ts`.
- `callClaudeForSceneDirections` + `callClaudeForPromptsFromDirections` → split into `stage1-scene-planner/` (creative) and `stage2-prompt-engineer/` (technical).
- `assembleStyleBiblePagePrompt` minus reference branches → `stage3-final-prompt/assembler.ts`.
- Per-page review UI patterns from `PromptReviewPanel.tsx` and `IllustrationReviewPanel.tsx` → one unified `PageCard.tsx` component.

### 19.3 Firestore migration

There is no production data on `image-gen-experiments` (the branch never shipped). The v2 schema can be installed clean. For any test stories on the branch that have illustration artefacts, treat them as throwaway — the new shape is incompatible and migration is not worth the effort.

If `main` already has illustration-related fields from prior merges (it doesn't, per the audit), they are removed cleanly.

### 19.4 Branch strategy

Recommended:

```
main
 └── feat/illustration-v2          ← new branch off main, fresh start
      ├── phase 1 PR — types, state machine, no UI
      ├── phase 2 PR — Stage 1a + 1b, workspace-open flow
      ├── phase 3 PR — page cards, Stage 4 jobs, image gen
      ├── phase 4 PR — feedback loop, regen
      ├── phase 5 PR — Visual Bible editing, dev panels
      └── phase 6 PR — polish, gate to illustration_ready, publish hook
```

`image-gen-experiments` stays as the research reference branch — do not merge it into `main`.

---

## §20. Implementation phases & priorities

Six phases. Each ends with a working, mergeable PR. No phase ships without an explicit specialist sanity-test against one real story.

### Phase 0 — Spec sign-off & test set (no code)

**Deliverable.** This doc, approved.
**Plus.** A frozen test set: 2 stories from `seedJanaStoryToStories` / existing approved stories, 3 pages each, expected qualitative outcomes documented per page. Lives at `experiments/test-set-v2.json`.
**Gate.** No code lands until Phase 0 is signed.

### Phase 1 — Foundations (types, state machine, no LLM, no UI)

**Deliverable PR 1.**
- New types in `server/src/illustration/types/` (Visual Bible, Scene Plan, Structured Prompt, Final Prompt, Image artefacts).
- Client mirror in `client/src/types/illustration.ts`.
- New state machine entries in `story.model.ts` (`illustration_workspace`, transitions).
- Job document type in `server/src/illustration/types/job.ts`.
- Firestore subcollection paths added to `shared/firestore/paths.ts`.
- Unit tests for state machine transitions + artefact validation.

**No behavior change** from `main`. The new code is dead code until Phase 2 wires it up.

### Phase 2 — Stage 1a + 1b + workspace open

**Deliverable PR 2.**
- `server/src/illustration/stage1-visual-director/` — prompt builder, output parser, LLM client wrapper, tests.
- `server/src/illustration/stage1-scene-planner/` — same shape, prompt builder, parser, tests.
- `server/src/illustration/orchestrator/openWorkspace.ts` — runs Stage 1a then Stage 1b in a single batched flow.
- Job worker: single-process polling worker in `server/src/illustration/worker/` (§15.2). Supports `workspace_open` job type only at this phase.
- `POST /api/specialist/stories/:id/transitions { to: "illustration_workspace" }` — handler enqueues the workspace-open job and returns `{ jobId }`.
- Client: `IllustrationsTab` Panel A (call-to-action) + loading state with job-status subscription.
- End-to-end test: pick a manuscript from the test set, click "Open workspace", verify the Visual Bible + N Scene Plans land in Firestore.

**Verification.** Specialist manual test: open workspace on 2 test stories, eyeball the Visual Bible and Scene Plans for sanity. No image generation yet.

### Phase 3 — Page cards + image generation (Stage 2, 3, 4)

**Deliverable PR 3.**
- `server/src/illustration/stage2-prompt-engineer/` — prompt builder, output parser, tests.
- `server/src/illustration/stage3-final-prompt/assembler.ts` — pure function, exhaustive unit tests covering prompt ordering and char-budget warnings.
- `server/src/illustration/stage4-image-generation/` — provider call wrapper, storage write, artefact persistence.
- Job worker: adds `image_generation` job type.
- `POST /api/specialist/stories/:id/pages/:n/image` endpoint.
- `SeedreamProvider` simplified to v2 signature.
- Client: full Page Card UX (Region 1 manuscript / Region 2 Scene Plan readonly / Region 3 generate button + image display).
- "Approve" action wires to `POST /image/approve`.
- "Mark as ready to publish" button at workspace footer.

**Verification.** Specialist manual test on test set: open workspace, click Generate on each page, approve each, mark ready, verify `illustration_ready` status set. **This is the v2 minimum viable pipeline.**

### Phase 4 — Feedback loop & regeneration

**Deliverable PR 4.**
- "Reject with feedback" action on the Image card.
- `POST /api/specialist/stories/:id/pages/:n/image/reject` endpoint.
- Stage 1b regeneration prompt template — handles the "previous plan + feedback" input shape.
- `image_regen` job type — Stage 1b → 2 → 3 → 4 cascade for one page.
- Scene Plan "Regenerate" and "Regenerate with feedback" buttons (without rejecting image — for cases where the specialist wants to redirect before generating).
- Version-history dropdown on page cards.

**Verification.** Specialist manual test: reject one page with a specific feedback ("show the door clearly in frame"), verify next image reflects feedback. Confirm previous version is still accessible.

### Phase 5 — Visual Bible editing + developer panels

**Deliverable PR 5.**
- `PATCH /visual-bible` endpoint — produces new version on edit.
- Visual Bible editing UI at top of workspace (collapsible card with field-level edits).
- "Visual Bible has changed since this plan was generated" banner on outdated page cards.
- Developer panel UI (§13) — role-gated on admin claim.
- Per-story debug page at `/specialist/stories/:id/illustration/debug`.

**Verification.** Specialist edits the character anchor, regenerates one page's scene plan, verifies the new anchor flows through.

### Phase 6 — Polish + publish bridge

**Deliverable PR 6.**
- `illustration_ready → published` flow integration with the existing publish pipeline (the public `story_templates` document).
- Final illustrated book preview reusing the existing `BookReader` component on the specialist side as the "approval preview".
- History tab entries for all new event kinds.
- Cancellation flow for in-flight generation jobs.
- Image safety-check stub (Stage 4 post-call): for now, just a `safetyFlags: []` field on the ImageArtefact. v3.0 will plug in a real classifier.
- README + this spec moved into the docs index ([docs/specialist-dashboard/README.md](docs/specialist-dashboard/README.md)).

**Verification.** Full path from `draft_brief` to `published` with illustrations, end-to-end.

### Phase priorities

If time is constrained, the **must-ship core** is Phases 1–3 (the v2 minimum viable pipeline produces approved illustrations and gates publishing). Phase 4 is the next priority (without it, every imperfect generation is a dead-end). Phases 5–6 can ship incrementally after the pilot is live.

---

## §21. Risks & scalability concerns

**R1 — Visual Bible quality is the upstream bottleneck.** If the Visual Bible is thin or generic, every Scene Plan inherits the thinness. Mitigation: Sonnet (not Haiku) for Stage 1a; rich prompt template (full StyleBible shape, not 4 fields); specialist editing surface so the human can fix what the model misses.

**R2 — Multi-page narrative coherence.** With per-page Scene Plans, there's a risk of cross-page incoherence (page 3 says "Sara sits on the bed", page 4 says "Sara has been at the door for a while" — the bed disappeared). Mitigation: Stage 1b's prompt includes the full story manuscript, not just the target page (this is exactly what the exp-09 scene-director did right). Plus: specialist review is per-page but the workspace view shows all cards in sequence, so cross-page issues are visible.

**R3 — Image-model drift across regenerations.** Without reference images, a regenerated page may produce a character with subtly different features than the approved pages. Mitigation: the Visual Bible's `characterAnchor` is the consistency anchor and is embedded in every prompt verbatim. Specialist can compare regenerated against approved in the page card. This is a known limitation of pure-text consistency; if it proves too weak in practice, post-pilot the option remains to add a character avatar as a soft anchor — but it would be a v2.x consideration, not v2.0.

**R4 — Stage 1a + 1b LLM cost spikes on workspace-open.** A 12-page story at Sonnet rates: Stage 1a ~$0.05, Stage 1b ~$0.10. Per workspace-open: ~$0.15. With reasonable specialist throughput (5 stories/week), this is trivial. The risk is regenerations multiplying cost; mitigation: each regeneration is one page, ~$0.02. Even with heavy iteration, weekly cost stays low double digits.

**R5 — Image-generation cost.** Seedream per-call cost is currently the dominant variable. Mitigation: it's per-page-button — the specialist controls when. There is no "regenerate all 12 pages" button by design. Per-story ceiling for image gen is ~12 × 2-3 versions × per-call cost; budget at $1–3 per published story.

**R6 — Job worker on a single Render free dyno.** The Render free tier sleeps after inactivity and has a single dyno. A polling worker baked into the Express process means image generation only happens while a request is keeping the dyno awake. Mitigation: specialist sessions are interactive, so the dyno is awake during use; jobs enqueued from a click run within seconds. For production scale (post-pilot), migrate the worker to Cloud Functions or Cloud Tasks per §15.2.

**R7 — Firestore subcollection growth.** With versioning, every regeneration adds an artefact. A heavily-iterated story could accumulate 50+ Scene Plan + Image artefacts. Mitigation: subcollections are exactly what Firestore is good at; charges are linear; no query-time penalty since the IllustrationPage already points to the current version. Old versions are read on demand. Post-pilot, a "compact" job can archive non-current versions to a cold collection if storage becomes an issue.

**R8 — No image safety classifier in v2.0.** The pilot ships without an automated check that generated illustrations are child-appropriate. Mitigation: human review by the specialist is the gate (they explicitly approve every image before publish). Risk-rating this is a "manual control during pilot, automated gate post-pilot" decision; not a blocker. The `safetyFlags: []` field is reserved on `ImageArtefact` so a v2.x integration is a one-field add.

**R9 — Specialist confusion when Scene Plan is good but image is bad.** A common failure mode: the Scene Plan reads well but the image looks wrong (e.g., character drift). Specialist doesn't know whether to "regenerate scene plan" or "reject image with feedback". Mitigation: UI copy makes the distinction explicit — "If the image doesn't match what's described, reject with feedback to regenerate. If the description itself isn't right, regenerate the scene plan instead." Plus a future small enhancement: show a hint when feedback keywords suggest "the scene was right, the image is off" → suggest regenerating image alone.

**R10 — Cascading failures lose specialist work.** A specialist edits the Visual Bible after approving 3 pages; the next page they generate uses the new VB; old pages now look stylistically inconsistent. Mitigation: no automatic cascade. Page cards show a banner if their Scene Plan's Visual Bible version is stale. Specialist explicitly chooses whether to regenerate. Old approved images remain valid regardless of VB version; they just may not match newly-generated ones.

---

## §22. Open questions for later iteration

These are deferred to v2.1+ but flagged here so they don't surprise anyone:

1. **Aspect ratio per page.** v2.0 is 1024×1024 only. Picture books often have spread layouts (wide) and portrait. Adding per-page aspect choice is a Stage 4 parameter + a per-page UI control — straightforward.
2. **Cover image generation.** v2.0 generates per-page illustrations. The published `story_templates` document has a `coverImage` field — where does it come from? Options: (a) reuse page 1's image, (b) Stage 1a generates a cover prompt as well, (c) explicit "cover" page at index 0 with its own Scene Plan. Decision deferred.
3. **Preview spreads for the public catalog.** The `previewSpreads: [Spread, Spread]` on `story_templates` are the first two illustrated pages — currently auto-derived from pages 1 + 2. Should the specialist pick them?
4. **Per-character handling for stories with multiple recurring characters.** v2.0's Visual Bible has one `characterAnchor`. Stories with parents, siblings, friends need a multi-character registry. Schema-wise, easy: promote `characterAnchor` to `characters: Record<string, CharacterAnchor>`. Defer until a multi-character story is in test set.
5. **Automated safety classifier.** R8 in §21.
6. **Specialist preferences / templates.** A specialist may have a preferred art style. v2.0 reads style guidance from the brief's `creativeVision` field on every story. v2.1 could let specialists save reusable style presets.
7. **Multi-language illustration consistency.** Stories exist in Hebrew + Arabic. Illustrations should be language-agnostic, but text-suppression matters more for some scripts. Verify the avoid-list's no-text item is strong enough; tighten if necessary.
8. **Caregiver-side personalization integration.** The existing caregiver flow (preview / purchase) personalizes images per child name + photo. The specialist-side v2 pipeline produces the **template** illustrations; personalization at purchase time is a separate code path ([server/src/services/fullStoryGeneration.service.ts](server/src/services/fullStoryGeneration.service.ts)) that consumes the published template. Verify the shape coming out of v2.0 publish is compatible — likely yes if the per-page `imagePromptTemplate` field on the template is sourced from the Stage 3 final prompt.

---

# Appendix

## A. Glossary

- **Visual Bible** — the durable, per-story art-direction document (character sheet, style guide, palette, environment registry, avoid list, consistency anchors).
- **Scene Plan** — the per-page, primarily human-readable artefact that names the moment, the camera, the lighting, the emotional intent. Specialist's main review surface.
- **Structured Prompt** — the 5-section technical form (setting / character / focal point / composition / lighting) derived from a Scene Plan. Developer-only surface.
- **Final Prompt** — the exact string sent to the image model. Deterministic concatenation. Developer-only surface.
- **Image** — the generated bytes, stored to Firebase Storage, surfaced as the page's illustration.
- **Artefact** — any of the above with the `{ id, version, createdAt, parent, llmCall? }` envelope.
- **Page card** — the per-manuscript-page UI component on the Illustrations tab.
- **Workspace** — the illustration tab in its active state (`status === "illustration_workspace"`).
- **Cascade** — the automatic Stage 1b → 2 → 3 → 4 re-run triggered by "reject image with feedback".

## B. Proposed file layout

```
server/
  src/
    illustration/                          ← NEW root for illustration code
      types/
        visual-bible.ts                    ← VisualBibleArtefact + EnvironmentEntry
        scene-plan.ts                      ← ScenePlanArtefact + SceneDirection
        structured-prompt.ts               ← StructuredPrompt
        final-prompt.ts                    ← FinalPromptArtefact
        image.ts                           ← ImageArtefact
        job.ts                             ← IllustrationJob
        index.ts                           ← barrel
      stage1-visual-director/
        index.ts                           ← runVisualDirector(story) → artefact
        prompt-builder.ts
        output-parser.ts
        __tests__/
      stage1-scene-planner/
        index.ts                           ← runScenePlanner(story, vb, target?) → artefact[]
        prompt-builder.ts
        output-parser.ts
        __tests__/
      stage2-prompt-engineer/
        index.ts                           ← runPromptEngineer(scenePlan, vb) → StructuredPrompt
        prompt-builder.ts
        output-parser.ts
        __tests__/
      stage3-final-prompt/
        index.ts                           ← assembleFinalPrompt(scenePlan, vb) → FinalPromptArtefact
        __tests__/
      stage4-image-generation/
        index.ts                           ← runImageGeneration(finalPrompt) → ImageArtefact
        __tests__/
      orchestrator/
        openWorkspace.ts                   ← runs 1a + 1b, returns artefacts
        regenerateScenePlan.ts             ← runs 1b for one page (+ optional feedback)
        generateImage.ts                   ← runs 2 + 3 + 4 for one page
        cascadeAfterReject.ts              ← runs 1b + 2 + 3 + 4 for one page
      worker/
        index.ts                           ← polling worker
        handlers.ts                        ← per-job-type handlers
        __tests__/
      shared/
        llm-client.ts                      ← reused Anthropic wrapper (similar shape to agent1's)
        artefact-store.ts                  ← Firestore CRUD for artefacts
        history-events.ts                  ← EditHistoryEvent helpers
      docs/
        00-overview.md                     ← this file's TL;DR
        ... (further deep docs as needed)
    routes/
      specialist/
        stories.router.ts                  ← existing file, new endpoints added per §14
        illustration.router.ts             ← OPTIONAL: split if stories.router.ts grows too large
    providers/
      seedream.provider.ts                 ← simplified, v2 signature
client/
  src/
    types/
      illustration.ts                      ← mirror of server illustration types
    specialist/
      components/
        illustration/                      ← NEW dir
          IllustrationsTab.tsx             ← REPLACES current IllustrationsTab.tsx
          VisualBibleCard.tsx              ← top of workspace
          PageCard.tsx                     ← the unified page card from §12.2
          ScenePlanView.tsx                ← Region 2
          ImageView.tsx                    ← Region 3
          DeveloperPanel.tsx               ← §13 expandable
          MarkReadyButton.tsx              ← footer bar
      api/
        illustrationApi.ts                 ← typed client for §14 endpoints

experiments/                               ← MOVED OUT of server/
  README.md                                ← kept
  rubric.md                                ← kept
  test-set-v2.json                         ← Phase 0 deliverable
  src/
    runner.ts
    list-stories.ts
    helpers.ts
    variants/                              ← variant code lives ONLY here, not in src/
```

## C. Old-vs-new comparison

| Concern | Current (image-gen-experiments) | v2 |
|---|---|---|
| Macro states (illustration phase) | 4 (`prompt_review`, `illustrating`, `illustration_review`, `illustration_ready`) | 2 (`illustration_workspace`, `illustration_ready`) |
| Auto-advance | Yes — on every per-page approval | No — explicit "Mark ready" button |
| Consistency mechanism | Page-1-as-reference + Visual Bible text | Visual Bible text only |
| Visual Bible shape | 4 fields, flat env map | 8 fields, structured env entries (atmosphere + spatialLayout) |
| LLM calls per workspace open | 1 (VB + N prompts in one call) | 2 (Stage 1a Visual Director, Stage 1b Scene Planner) |
| LLM calls per page regeneration | 1 (whole batch re-run) | 2 (Stage 1b for the page, Stage 2 cascade) |
| LLM call per image generation | 0 (just provider call) | 0 (Stage 3 is pure function, Stage 4 is provider) |
| LLM models | Haiku for everything | Sonnet for Stage 1a/1b (creative), Haiku for Stage 2 (technical) |
| Image generation execution | Sync for-loop in HTTP request, fire-and-forget | Per-page job in queue, 3-way concurrency |
| Reference images | page-1 rolling, +5 experimental variants | None |
| Prompt persistence | Overwritten in `pages[].imagePrompt` | Versioned artefacts in subcollections |
| Specialist-facing review surface | Raw LLM prompt string | Human-readable Scene Plan (prose + intent + key detail) |
| Developer observability | Raw prompt visible by default | Expandable developer panel, role-gated |
| Per-page regeneration | Re-runs whole batch (bug F7) | Re-runs one page only |
| Per-page rejection feedback | Stored as string, no LLM use | Drives Stage 1b regen with feedback note in prompt |
| Image storage path | Overwritten in place | Versioned: `p{n}-v{ver}.{ext}` |
| Job model | Fire-and-forget Promises | Firestore-backed jobs with retry + idempotency |
| Telemetry | `.jsonl` files on local disk | Per-artefact records in Firestore |
| Image safety check | None | Reserved `safetyFlags` field; pluggable v2.x |
| Experiment harness location | `server/experiments/` (in production build) | `experiments/` (out of production build) |

---

**End of specification.**

Implementation begins after Phase 0 sign-off. The first PR (Phase 1) lands no earlier than the spec is approved.
