# Phase 2 — Stage 1a + 1b + workspace open

> **Goal.** First end-to-end vertical slice of v2. Specialist clicks "Open illustration workspace" on an approved story → background job runs Visual Director (Stage 1a) and Scene Planner (Stage 1b) → Story transitions to `illustration_workspace` with a populated Visual Bible and one Scene Plan per page. **No image generation yet** (Phase 3).
>
> **Why this scope.** This is the "does the brain work?" milestone. Stage 1a is the upstream bottleneck — if the Visual Bible is thin, everything downstream is thin (spec R1). Specialist eyeballs the artefacts at the end of Phase 2 and either signs off ("good enough to spend image-gen money on") or we iterate on prompts before building anything else.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §11.1, §11.2, §12.1, §14.1, §14.2, §14.3, §15, §20 Phase 2.
>
> **Branch.** Continue on `feat/illustration-v2`. Will be commit #5+ (after Phase 1's implementation lands).

---

## 0. Decision required before starting

Phase 1's implementation kept the v1 illustration statuses alive (`prompt_review`, `illustrating`, `illustration_review`) alongside the new `illustration_workspace`. Two paths forward:

**A. Replace (spec-aligned).** Treat Phase 2 as the moment v2 takes over. The new `approved → illustration_workspace` button replaces the v1 trigger. v1 endpoints/services stay temporarily as dead code for one PR cycle, then get deleted in a "cleanup PR 3" once Phase 3 ships. Specialist sees one button, one flow.

**B. Coexist (current implementation direction).** Both paths live side by side. Specialist sees two buttons on an approved story: "Use v1 pilot pipeline" and "Open v2 workspace". v1 keeps running for the pilot; v2 builds in parallel until it's strictly better.

**Recommendation:** **A.** The spec was built around the principle that v1's single-call architecture is the wrong shape (spec F1, F2, F4) — keeping both alive is a long-term maintenance tax and confuses specialists. A short window of dead-but-not-deleted v1 code while Phase 3 stabilises is cheap; permanent parallel paths are not. If the pilot needs continuity, lock the v1 button out behind an admin flag so existing test data still works but new stories go through v2.

**If you choose B**, the only changes to this plan are: don't remove the v1 transition handlers, keep both buttons in the IllustrationsTab, add a clear visual distinction so specialists never mix them up on the same story. The rest of Phase 2 is identical.

The plan below assumes **A**. Diff for B is small and called out where it matters.

---

## 1. Acceptance criteria

A PR satisfies Phase 2 when **all** of these are true:

1. New code lives under `server/src/illustration/` per the directory layout in spec Appendix B.
2. `runVisualDirector(input)` returns a complete `VisualBibleArtefact` for a given story, sourced from Claude Sonnet, with full `llmCall` populated.
3. `runScenePlanner(input)` returns one `ScenePlanArtefact` per page (initial run) or for a single page (regen — stubbed in Phase 2, properly wired in Phase 4). Each artefact has both the human-readable view and `director` populated; `structuredPrompt` is `null` until Stage 2 runs.
4. `openWorkspace(storyId, uid)` orchestrator: calls 1a, persists the VB, then calls 1b in parallel-per-page (concurrency 3), persists each Scene Plan, then updates the Story document atomically — status flips to `illustration_workspace`, `illustrationPages[]` materialised, history entries appended.
5. The Firestore-backed polling worker (`server/src/illustration/worker/`) is started by `server/src/app.ts` on boot, polls every 2 seconds, claims `workspace_open` jobs via transactional `pending → running`, runs them, marks `succeeded` or `failed` with error detail.
6. `POST /api/specialist/stories/:id/transitions { to: "illustration_workspace" }` enqueues a `workspace_open` job in `stories/{id}/illustrationJobs/` and returns `{ jobId, status: "pending" }`. The Story status does **not** flip to `illustration_workspace` until the job succeeds.
7. The Illustrations tab on an `approved` story renders Panel A: a CTA card with one button. Click → POST the transition → tab switches to a loading state with progress text driven by the Story document subscription (no polling).
8. After the job succeeds (Story status flips to `illustration_workspace`, `illustrationPages` populated), the tab renders a **read-only preview** of the Visual Bible (one collapsible card) and a vertically stacked list of Scene Plans (one card per page, human-readable view only). Sufficient for the specialist to eyeball quality. No image-generation UI in Phase 2.
9. If the job fails, the tab renders an error card with a "Try again" button that re-enqueues the job. The previous (failed) VisualBibleArtefact is **not** persisted on failure.
10. End-to-end test: run the pipeline on the canonical test story from `experiments/test-set.json`; assert that one VB and N Scene Plans land in Firestore with the expected shapes.
11. Server typecheck, client typecheck, server tests, client tests all pass.
12. Manual smoke: open workspace on two real stories, eyeball the artefacts, no crashes.

---

## 2. Files to create

All paths repo-relative.

### 2.1 Shared infrastructure

| File | Purpose |
|---|---|
| `server/src/illustration/shared/llm-client.ts` | Thin Anthropic SDK wrapper. Single `callClaude({ model, systemPrompt, userPrompt, maxTokens, expectJson })` function. Returns `{ text, jsonParsed?, inputTokens, outputTokens, latencyMs, model }`. Throws on 5xx / parse failure with a typed error. Mirrors the shape of `server/src/agent1/shared/llm-client.ts` for consistency; do **not** import that file (the agent1 wrapper is brief-specific). |
| `server/src/illustration/shared/llm-call-record.ts` | `buildLLMCallRecord(call, success, error?)` helper that produces the `LLMCallRecord` envelope from a `callClaude` result. One place to format the record so VB / Scene Plan / Stage 2 / Stage 4 don't drift. |
| `server/src/illustration/shared/artefact-store.ts` | Typed Firestore CRUD: `writeVisualBible(storyId, artefact)`, `writeScenePlan(storyId, artefact)`, `readVisualBible(storyId, version)`, etc. Centralises the subcollection paths (uses `COLLECTIONS.STORY_VISUAL_BIBLES` etc. from Phase 1). Phase 2 only needs the VB + Scene Plan writers + readers. |
| `server/src/illustration/shared/version-allocator.ts` | `nextVersion(storyId, kind)`: reads the current max version in a subcollection inside a transaction, returns max + 1. Used by 1a and 1b to keep `version` monotonic per story. |
| `server/src/illustration/shared/history-events.ts` | `appendIllustrationEvent(storyId, event, byUid)` helper. Wraps a transactional `arrayUnion` on `Story.editHistory`. Phase 2 uses the `illustration_workspace_opened`, `visual_bible_generated`, `scene_plan_generated` kinds. |

### 2.2 Stage 1a — Visual Director

| File | Purpose |
|---|---|
| `server/src/illustration/stage1-visual-director/index.ts` | Public entry: `runVisualDirector(input: VisualDirectorInput): Promise<VisualBibleArtefact>`. Composes prompt-builder + LLM call + parser + validator. No Firestore writes here — caller (orchestrator) persists. |
| `server/src/illustration/stage1-visual-director/prompt-builder.ts` | `buildVisualDirectorPrompt(input)` — pure function. Returns `{ systemPrompt, userPrompt }`. Adapted from `experiments/src/style-bible.generator.ts` `callClaudeForStyleBible` prompt. Phase-2-specific additions (per spec §11.1): `avoidList[0]` is the no-text constraint, mandated wording exact; explicit "consistencyAnchors must be short, repeatable, embeddable in 1200-char prompts" instruction. |
| `server/src/illustration/stage1-visual-director/output-parser.ts` | `parseVisualDirectorOutput(raw: string): ParsedVisualBible` — parses JSON, returns a `ParsedVisualBible` (without the artefact envelope; the index.ts wraps with id/version/etc). Throws `VisualBibleParseError` with the raw text on failure. |
| `server/src/illustration/stage1-visual-director/validator.ts` | `validateVisualBible(parsed): { ok: true } \| { ok: false; reasons: string[] }`. Checks: all required fields populated; characterAnchor 1-2 sentences; consistencyAnchors length 3-5; environmentRegistry has at least one entry; avoidList[0] matches the mandated no-text string. |
| `server/src/illustration/stage1-visual-director/types.ts` | `VisualDirectorInput` = `{ story: Story; manuscriptText: string }`. Keeps the boundary explicit so a future caller (script, test) can pass a synthetic input. |
| `server/src/illustration/stage1-visual-director/__tests__/prompt-builder.test.ts` | Snapshot-style test: given a fixed input, the prompt includes the mandated avoid-list line, the manuscript text, and the brief metadata fields. Format-only — not testing the LLM. |
| `server/src/illustration/stage1-visual-director/__tests__/output-parser.test.ts` | Parses three fixtures: (a) well-formed VB JSON, (b) JSON missing a field, (c) plain prose (no JSON). |
| `server/src/illustration/stage1-visual-director/__tests__/validator.test.ts` | One assertion per validation rule. |

### 2.3 Stage 1b — Scene Planner

| File | Purpose |
|---|---|
| `server/src/illustration/stage1-scene-planner/index.ts` | Public entry: `runScenePlanner(input: ScenePlannerInput): Promise<ScenePlanArtefact[]>` for the bulk case, `runScenePlannerForPage(input, pageNumber): Promise<ScenePlanArtefact>` for the regen case (stub returning "not implemented" in Phase 2 — Phase 4 wires it up). Bulk case runs pages **in parallel with concurrency 3** using a Promise.allSettled batch helper. Per-page failures are returned as a `ScenePlanError` so the orchestrator can decide whether to fail the whole job or accept partial success. |
| `server/src/illustration/stage1-scene-planner/prompt-builder.ts` | `buildScenePlannerPrompt(input, pageNumber)` — pure. Adapted from `experiments/src/scene-director.ts` `buildSceneDirectorPrompt`. Includes the full manuscript (every page text) for narrative context (spec R2). Output schema instructs Claude to return both the human-readable view AND the `director` view in one JSON object. Carries forward the experiment's critical rules: literal language only, no metaphors, no emotion names in `keyPhysicalDetail`, each page visually distinct from neighbours. |
| `server/src/illustration/stage1-scene-planner/output-parser.ts` | `parseScenePlanOutput(raw)` — returns `ParsedScenePlan` (without artefact envelope). Throws `ScenePlanParseError` on failure. |
| `server/src/illustration/stage1-scene-planner/validator.ts` | Per-page validation: title non-empty, prose 2-4 sentences (heuristic: 1-4 periods), emotionalIntent one sentence, keyVisibleDetail one sentence, all 5 director fields non-empty. |
| `server/src/illustration/stage1-scene-planner/types.ts` | `ScenePlannerInput` = `{ story: Story; manuscriptPages: { pageNumber: number; text: string }[]; visualBible: VisualBibleArtefact; feedbackNote?: string; previousScenePlan?: ScenePlanArtefact }`. The last two are for the Phase-4 regen path; required-in-type but stubbed-in-runtime here. |
| `server/src/illustration/stage1-scene-planner/__tests__/*.test.ts` | Same shape as Stage 1a — prompt format, parser, validator. |

### 2.4 Orchestrator

| File | Purpose |
|---|---|
| `server/src/illustration/orchestrator/openWorkspace.ts` | `openWorkspace({ storyId, uid }): Promise<OpenWorkspaceResult>`. Sequence: (1) load story, assert `status === "approved"`; (2) compose `VisualDirectorInput`, call `runVisualDirector`, write artefact, append history; (3) compose `ScenePlannerInput`, call `runScenePlanner` bulk, write N artefacts in parallel, append N history entries (batched in one transaction if Firestore allows, else looped); (4) build `IllustrationPage[]` from the manuscript pages; (5) update Story document atomically — status flips, `currentVisualBibleVersion = 1`, `illustrationPages` set, `illustrationWorkspaceOpenedAt = Date.now()`, history `illustration_workspace_opened` appended. Idempotency: re-running on an already-`illustration_workspace` story is a no-op that returns the existing artefact IDs (don't double-charge for Sonnet calls). |
| `server/src/illustration/orchestrator/__tests__/openWorkspace.test.ts` | Integration test using an in-memory Firestore mock + stubbed LLM client. Asserts: status flips, artefacts written, history correct, idempotent on re-run. |

### 2.5 Worker

| File | Purpose |
|---|---|
| `server/src/illustration/worker/index.ts` | `startIllustrationWorker(config?)` — singleton. Starts a polling loop on a `setInterval(2000)` (or `setTimeout` chain) that queries `collectionGroup("illustrationJobs").where("status", "==", "pending").limit(3)`, claims each via a transactional `pending → running` update (returns `false` if already claimed), dispatches to `handlers[job.type]`, marks `succeeded` or `failed` with error string. Concurrency: at most N in-flight (config.concurrency, default 3). Heartbeat: every claimed job updates `startedAt` and a `lastHeartbeatAt` field every 10s — the recovery scan reclaims jobs with stale heartbeats. **Worker only runs in the long-running Express process**, not in script invocations — guard with an `if (process.env.ILLUSTRATION_WORKER_ENABLED !== "false")` check that defaults on. |
| `server/src/illustration/worker/handlers.ts` | `handlers: Record<IllustrationJobType, JobHandler>`. Phase 2 implements only `workspace_open` → calls `openWorkspace(job.storyId, job.enqueuedBy)`. Other types throw `UnsupportedJobTypeError`. |
| `server/src/illustration/worker/claim.ts` | `claimJob(jobRef): Promise<boolean>` — the transactional pending → running flip + heartbeat init. Extracted so it's unit-testable. |
| `server/src/illustration/worker/recovery.ts` | `reclaimStaleJobs()` — on worker startup and every 60s, query `status == "running" && lastHeartbeatAt < now - 60s`, flip back to `pending` (and increment `attempt`). Caps `attempt` at 3 before marking `failed` with `"max attempts exceeded"`. |
| `server/src/illustration/worker/__tests__/claim.test.ts` | Two-worker race: assert exactly one claims a given job. |
| `server/src/illustration/worker/__tests__/recovery.test.ts` | Stale job is reclaimed; fresh running job is left alone; attempt cap respected. |

### 2.6 Job enqueue helper

| File | Purpose |
|---|---|
| `server/src/illustration/shared/job-enqueue.ts` | `enqueueJob({ storyId, type, pageNumber, enqueuedBy, inputRefs, idempotencyKey })` — writes an `IllustrationJob` doc with `status: "pending"`, `attempt: 1`. The `idempotencyKey` is checked via a `where` query first — if a `pending`/`running` job with the same key exists, return that job's ID instead of creating a duplicate (covers the case of a specialist double-clicking the CTA). |
| `server/src/illustration/shared/__tests__/job-enqueue.test.ts` | Duplicate-idempotency-key returns the existing job. |

### 2.7 Route handler

Add to `server/src/routes/specialist/stories.router.ts` (or extract to `illustration.router.ts` if the file is already large — judgment call). The handler hangs off the existing `POST /:storyId/transitions` endpoint:

- New branch in `handleTransition`: when `to === "illustration_workspace"`, instead of writing the status directly, build an `IllustrationJob` of type `workspace_open` with `idempotencyKey = ${storyId}:workspace_open:v1`, enqueue it, return `200 { jobId, status: "pending" }`. **Do not** flip the Story status here — the worker does it on success.
- All other transitions (`illustration_workspace → illustration_ready`, `→ in_review`, `→ archived`) are still synchronous status updates as before.

### 2.8 Tests — top-level

| File | Purpose |
|---|---|
| `server/src/__tests__/openWorkspace.e2e.test.ts` | End-to-end test (mocks Anthropic, uses Firestore emulator if configured, else in-memory mock): create a fixture Story in `approved` state with 3 pages → enqueue workspace_open → tick worker → assert Story is in `illustration_workspace` with 1 VB + 3 Scene Plans in subcollections. |

### 2.9 Client

| File | Purpose |
|---|---|
| `client/src/api/illustrationApi.ts` | `openIllustrationWorkspace(storyId): Promise<{ jobId; status }>` — POST wrapper. (Other endpoints land in Phase 3+.) |
| `client/src/specialist/components/illustration/IllustrationsTabV2.tsx` | New component replacing the current "coming soon" placeholder. Top-level state machine: `approved` → PanelACta, `job pending/running` → LoadingPanel, `illustration_workspace` (job done) → WorkspacePreview, `failed` → ErrorPanel. |
| `client/src/specialist/components/illustration/PanelACta.tsx` | The CTA card: title, one-paragraph description of what "Open workspace" does, one MUI Button. Disabled while a pending job exists for this story. |
| `client/src/specialist/components/illustration/LoadingPanel.tsx` | Spinner + status text. Subscribes to the Story document (Firestore SDK `onSnapshot`) and renders "Generating Visual Bible…" / "Generating Scene Plans (3 of 7)…" based on Story.editHistory tail. Cap render to recent events to avoid re-rendering on every history append. |
| `client/src/specialist/components/illustration/WorkspacePreview.tsx` | Read-only preview after workspace_open succeeds. Renders `VisualBibleCard` (collapsible) at top, then a stacked list of `ScenePlanCard` per page (one card per `illustrationPages[i]`). |
| `client/src/specialist/components/illustration/VisualBibleCard.tsx` | Read-only display of the VB artefact. Collapsible. Renders character anchor prominently, then expandable sections for character sheet, style guide, palette, environment registry, consistency anchors, avoid list. Loaded via Firestore SDK from `stories/{id}/visualBibles/{currentVisualBibleVersion}`. |
| `client/src/specialist/components/illustration/ScenePlanCard.tsx` | Read-only per-page display. Shows pageNumber, the manuscript text (from `Story.pages` — already available client-side), then the Scene Plan's `title`, `prose`, `emotionalIntent`, `keyVisibleDetail`. No "Generate image" button yet (Phase 3). Loaded from `stories/{id}/scenePlans/` by `(pageNumber, currentScenePlanVersion)`. |
| `client/src/specialist/components/illustration/ErrorPanel.tsx` | Error message + "Try again" button. Re-POSTs the same transition. |
| `client/src/specialist/hooks/useIllustrationWorkspaceState.ts` | Custom hook: subscribes to Story doc + latest job doc (when one exists) and returns a discriminated-union view-model: `{ kind: "cta" | "pending" | "running" | "ready" | "failed", … }`. The component switches on the kind. Decouples the data-loading from the rendering. |
| `client/src/specialist/__tests__/IllustrationsTabV2.test.tsx` | Render-state tests: each of the 5 states renders correctly with mocked hook output. |
| `client/src/specialist/components/IllustrationsTab.tsx` | Replace the Cleanup-PR-1 placeholder with `<IllustrationsTabV2 story={story} />`. Keep the wrapper for backwards-compat with the parent that imports `IllustrationsTab`. |

---

## 3. Files to modify

### 3.1 `server/src/app.ts`

- Import and call `startIllustrationWorker()` after the existing image-provider registrations. Wrap in a conditional that skips the worker when `NODE_ENV === "test"` so Jest doesn't start a polling loop in unit tests (alternatively: `process.env.ILLUSTRATION_WORKER_ENABLED === "false"`).

### 3.2 `server/src/routes/specialist/stories.router.ts`

- Inside `handleTransition`, intercept `to === "illustration_workspace"` to enqueue the workspace_open job instead of writing the status directly. See §2.7.
- No removal of existing v1 illustration transition handlers in Phase 2 (deferred to cleanup PR 3 in Phase 3+).

### 3.3 `firestore.rules`

Add read-only rules for the new subcollections so the client SDK can subscribe:

```
match /stories/{storyId}/visualBibles/{vbId} {
  allow read: if isSpecialistOrAdmin() && resource.data.storyId == storyId;
  allow write: if false;   // Admin SDK only
}
match /stories/{storyId}/scenePlans/{spId} {
  allow read: if isSpecialistOrAdmin();
  allow write: if false;
}
match /stories/{storyId}/illustrationJobs/{jobId} {
  allow read: if isSpecialistOrAdmin();
  allow write: if false;
}
// finalPrompts, images — defer to Phase 3 when they're written
```

(Reuse the existing helper function names — adjust to match the actual file.)

### 3.4 `firestore.indexes.json`

Add a composite index for the worker query:

```json
{
  "collectionGroup": "illustrationJobs",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "enqueuedAt", "order": "ASCENDING" }
  ]
}
```

(The worker query is `where("status", "==", "pending").orderBy("enqueuedAt").limit(3)` to drain FIFO.)

### 3.5 `client/src/specialist/components/WorkspaceTabs.tsx`

- The `ILLUSTRATION_STATUSES` set already includes `illustration_workspace` from Phase 1. No change.
- If you went with Decision A (replace v1): remove `prompt_review`, `illustrating`, `illustration_review` from the set (and from `client/src/types/story.ts` `STORY_STATUSES`). If B (coexist): leave as-is.

### 3.6 `.env.example` (or whatever env doc exists)

Document `ILLUSTRATION_WORKER_ENABLED` (defaults to true; set to `"false"` to disable on script-only invocations).

---

## 4. Detailed contracts

### 4.1 `callClaude` signature (shared/llm-client.ts)

```
callClaude({
  model: "claude-sonnet-4-5-20250929" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001",
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  expectJson: boolean,           // if true, append "Return only JSON, no prose." reminder
  retries?: number               // default 1; retries only on 5xx + JSON parse errors
}): Promise<{
  text: string,
  jsonParsed: unknown | null,   // populated iff expectJson and parse succeeded
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  model: string                  // the actual model used (sometimes Anthropic remaps)
}>
```

The error taxonomy: `AnthropicHttpError` (5xx, retryable), `AnthropicClientError` (4xx, not retryable), `JsonParseError` (LLM returned non-JSON when JSON was expected). The Stage 1a/1b indexes wrap these into `VisualBibleGenerationError` / `ScenePlanGenerationError` with stage context.

### 4.2 `runVisualDirector` signature

```
runVisualDirector(input: {
  story: Story;
  manuscriptText: string;
}): Promise<VisualBibleArtefact>
```

Internals:
1. `buildVisualDirectorPrompt(input)` → `{ systemPrompt, userPrompt }`
2. `callClaude({ model: "claude-sonnet-4-6", systemPrompt, userPrompt, maxTokens: 4000, expectJson: true, retries: 1 })`
3. `parseVisualDirectorOutput(result.text)` → `parsed`
4. `validateVisualBible(parsed)` → throw `VisualBibleValidationError` with reasons if invalid
5. Build the artefact envelope: `id = uuid`, `storyId`, `version = await nextVersion(storyId, "visualBibles")`, `createdAt = Date.now()`, `createdBy: { kind: "system" }`, `parentVersion = null` (first run), `source: "llm_generated"`, `llmCall = buildLLMCallRecord(result, true)`, then spread `parsed`.

**Token budget alarm.** If `inputTokens > 5000` or `outputTokens > 3000`, log a warning. These are red flags that the manuscript or output is bigger than expected.

### 4.3 `runScenePlanner` signature

```
runScenePlanner(input: {
  story: Story;
  manuscriptPages: { pageNumber: number; text: string }[];
  visualBible: VisualBibleArtefact;
}): Promise<ScenePlanArtefact[]>
```

Concurrency: `manuscriptPages.length` parallel tasks, capped at 3 in flight via a batch helper. Each task builds its own prompt (page-specific) and calls Claude. Results collected, sorted by pageNumber, returned. Any per-page failure becomes a `ScenePlanError` in the returned array — orchestrator decides what to do.

**Per-page prompt input includes the full manuscript** (every page's text) so the model has narrative context. Spec R2. Don't be tempted to "save tokens" by only sending the target page — that's the v1 mistake (spec F4).

**Artefact envelope per page:** `id = uuid`, `storyId`, `pageNumber`, `version = 1` (first run, no prior), `createdAt = Date.now()`, `parentVersion = null`, `llmCall`, `visualBibleVersion = visualBible.version`, `feedbackNote = null`, then the parsed content fields, `structuredPrompt = null`.

### 4.4 `openWorkspace` orchestrator pseudocode

```
async function openWorkspace({ storyId, uid }):
  storyRef = db.doc(`stories/${storyId}`)
  story = (await storyRef.get()).data() as Story

  // Idempotency: already-opened story is a no-op success.
  if (story.status === "illustration_workspace" || story.status === "illustration_ready"):
    return { vbId: ..., scenePlanIds: ... }   // load existing references
  if (story.status !== "approved"):
    throw new IllegalStateError(...)

  // --- Stage 1a ---
  manuscriptText = composeManuscript(story.pages)   // concat page texts with separators
  vb = await runVisualDirector({ story, manuscriptText })
  await writeVisualBible(storyId, vb)
  await appendIllustrationEvent(storyId, {
    kind: "visual_bible_generated", version: vb.version, source: "llm"
  }, uid)

  // --- Stage 1b ---
  scenePlans = await runScenePlanner({
    story, manuscriptPages: story.pages, visualBible: vb
  })
  await Promise.all(scenePlans.map(sp => writeScenePlan(storyId, sp)))
  await Promise.all(scenePlans.map(sp => appendIllustrationEvent(storyId, {
    kind: "scene_plan_generated", pageNumber: sp.pageNumber, version: sp.version, withFeedback: false
  }, uid)))

  // --- Materialise IllustrationPage[] + flip status ---
  illustrationPages = story.pages.map(p => ({
    pageNumber: p.pageNumber,
    text: p.text,
    currentScenePlanVersion: scenePlans.find(sp => sp.pageNumber === p.pageNumber)?.version ?? null,
    currentImageVersion: null,
    status: "plan_only",
    pendingJobId: null,
    lastError: null
  }))

  await storyRef.update({
    status: "illustration_workspace",
    currentVisualBibleVersion: vb.version,
    illustrationPages,
    illustrationWorkspaceOpenedAt: Date.now(),
    updatedAt: Date.now(),
    editHistory: arrayUnion({ kind: "illustration_workspace_opened", ... })
  })

  return { vbId: vb.id, scenePlanIds: scenePlans.map(s => s.id) }
```

**Failure handling.** If Stage 1a fails: throw — worker marks job failed. Nothing written to Firestore (no orphan VB doc). If Stage 1b fails partway (e.g., 5 of 7 pages succeed): for **Phase 2**, treat as job failure — write nothing, throw. (Partial success is real but adds UX complexity that isn't worth it for the first cut; Phase 4 can revisit.) The Visual Bible already written stays — but the next retry will see `currentVisualBibleVersion === null` (we never updated the Story), so it'll re-run Stage 1a too. **To avoid the double Sonnet charge on retry**, check inside `openWorkspace`: if a `visualBibles/v1` exists for this storyId at start, reuse it instead of re-running Stage 1a. The artefact is durable and free to reuse.

### 4.5 Worker poll loop pseudocode

```
async function pollLoop():
  while (!stopped):
    try:
      pending = await db.collectionGroup("illustrationJobs")
                          .where("status", "==", "pending")
                          .orderBy("enqueuedAt")
                          .limit(config.concurrency - inFlight.size)
                          .get()
      for (jobDoc of pending.docs):
        if (await claimJob(jobDoc.ref)):
          // Fire-and-forget inside the worker; the handler updates the job status itself
          runHandlerWith(jobDoc).finally(() => inFlight.delete(jobDoc.id))
          inFlight.add(jobDoc.id)
    catch (err):
      logger.error("pollLoop", err)
    await sleep(2000)
```

**Heartbeat timer.** Each in-flight handler starts a 10s `setInterval` that updates its job doc's `lastHeartbeatAt`. Cleared on completion. Recovery scan (60s interval) finds jobs with `lastHeartbeatAt < now - 60s`, flips to pending (and increments `attempt`). Cap `attempt` at 3.

### 4.6 Client view-model contract

```
type WorkspaceViewModel =
  | { kind: "cta" }                                              // story.status === "approved", no pending job
  | { kind: "pending", jobId: string }                           // job exists, status === "pending"
  | { kind: "running", jobId: string, progressHint?: string }    // job exists, status === "running"; progressHint derived from latest history event kind
  | { kind: "ready", visualBibleVersion: number, pages: IllustrationPage[] }   // status === "illustration_workspace"
  | { kind: "failed", jobId: string, error: string }             // job.status === "failed"
```

The `useIllustrationWorkspaceState` hook returns this exact shape. The component switches on `vm.kind`.

---

## 5. Prompt templates

The bulk of Phase 2's intellectual content is in the prompt builders. Both prompt templates already exist in research form in `experiments/src/style-bible.generator.ts` and `experiments/src/scene-director.ts`. Use them as starting points, but reread the spec sections (§11.1, §11.2) before copying — there are mandatory adjustments.

### 5.1 Stage 1a prompt skeleton

```
[SYSTEM]
You are an art director for illustrated children's books. You produce structured
"Visual Bibles" that ensure every illustration in a story is visually consistent
in character, environment, and style.

Your output must be a single JSON object matching the schema provided below.
Return only JSON — no commentary, no markdown fences.

[USER]
## Story brief
- Title: {{title}}
- Age range: {{ageRange}}
- Story type: {{storyType}}
- Therapeutic intention: {{therapeuticIntention}}
- Creative vision: {{creativeVision}}

## Manuscript
{{fullManuscript}}

## Output schema (JSON)
{
  "characterSheet": "5-7 sentences. Full physical description of the protagonist...",
  "characterAnchor": "1-2 sentences. The verbatim string that will be embedded in every page prompt.",
  "styleGuide": "Medium, line quality, palette mood, level of stylisation.",
  "consistencyAnchors": ["3 to 5 short phrases, 4-6 words each, each repeatable in a 1200-char prompt."],
  "environmentRegistry": {
    "<envKey>": {
      "atmosphere": "1 sentence: feeling, light quality, visual tone.",
      "spatialLayout": "1 sentence: prop positions using wall references."
    }
  },
  "palette": "5-7 comma-separated colour names.",
  "avoidList": [
    "text, letters, words, captions, labels, speech bubbles, logos of any kind",
    "5 to 7 more short phrases of things to avoid"
  ]
}

## Critical rules
- avoidList[0] MUST be exactly the text above (the no-text constraint).
- consistencyAnchors must each be short enough to embed verbatim in every page prompt.
- Identify every distinct location in the manuscript and add an entry to environmentRegistry.
- Use literal descriptive language — no metaphors, no similes, no emotional adjectives in spatial descriptions.
```

(Exact wording is your call; this is the structural skeleton. The `experiments/` version has more flavour and may be worth keeping verbatim where it earned its keep in research.)

### 5.2 Stage 1b prompt skeleton

```
[SYSTEM]
You are a scene director for illustrated children's books. For one page at a
time, you decide what is in the frame, how it's framed, the lighting, and the
single visual detail that carries the emotional weight of that page.

You always have access to the full manuscript and the Visual Bible so that
your scenes are narratively coherent across pages and visually consistent.

Return only JSON — no commentary.

[USER]
## Visual Bible
{{visualBibleAsJson}}

## Full manuscript (all pages)
{{allPages}}

## Target page
Page number: {{pageNumber}}
Text: {{pageText}}

## Adjacent context
Previous page text: {{prevPageText | "(none — first page)"}}
Next page text:     {{nextPageText | "(none — last page)"}}

## Output schema (JSON)
{
  "title": "Short label, e.g. 'Hesitation at the doorway'.",
  "prose": "2-4 sentences in plain language describing what is in the image.",
  "emotionalIntent": "1 sentence: what the reader should feel.",
  "keyVisibleDetail": "1 sentence: the one physical element that carries the scene.",
  "director": {
    "moment": "Exact split-second, present tense.",
    "cameraSpec": "Distance, angle, framing.",
    "lightingChoice": "Source, quality, mood.",
    "visualHook": "The memorable element.",
    "keyPhysicalDetail": "Single-detail body language anchor — no emotion names."
  }
}

## Critical rules
- Literal language only — no metaphors, no similes.
- No emotion names in keyPhysicalDetail (no "scared", "anxious", "worried"; only physical observations like "shoulders rolled forward, weight back on heels").
- This page must be visually distinct from the previous and next pages (different framing OR angle OR proximity).
- Reuse environment names from the Visual Bible's environmentRegistry when applicable; don't invent new ones.
- The protagonist appearance MUST match characterAnchor verbatim — do not redescribe.
```

(Same caveat as 5.1 — adapt from `experiments/src/scene-director.ts` and the spec, this is just the skeleton.)

### 5.3 Locked test cases for prompt regression

After Stage 1a and Stage 1b prompts are settled, capture the prompts as snapshot fixtures and add a test that flags any unintentional drift. The prompts are the product — they should not change accidentally during a refactor.

---

## 6. State machine — what already exists, what to wire

From Phase 1: `ALLOWED_TRANSITIONS` already contains `approved → illustration_workspace`. The validator accepts the transition. Phase 2's change is that the route handler **does not** synchronously flip the status — it enqueues a job, and the worker flips the status when the job succeeds.

No new transitions in Phase 2. The per-page sub-state transitions (`plan_only → generating_image` etc.) belong to Phase 3.

---

## 7. Test plan

### 7.1 Unit tests

**Stage 1a:**
- prompt-builder: snapshot test (input → expected prompt structure containing mandated lines).
- output-parser: 3 fixtures (valid / missing field / non-JSON).
- validator: 1 assertion per rule (6-8 rules).

**Stage 1b:**
- Same shape as Stage 1a.

**Orchestrator (`openWorkspace`):**
- Happy path with stubbed LLM client + in-memory Firestore mock.
- Idempotency: calling twice on the same `approved` story returns the same VB IDs without re-running the LLM.
- Re-entry after partial failure: a story with an existing VB but no Scene Plans re-runs Stage 1b only.

**Worker:**
- `claim.ts`: two concurrent claims, exactly one wins.
- `recovery.ts`: stale running job reclaimed; fresh one untouched; attempt cap enforced.
- `handlers.ts`: `workspace_open` handler invokes `openWorkspace` and marks job succeeded.

**Job enqueue:**
- Duplicate idempotencyKey returns existing job, doesn't create duplicate.

### 7.2 Integration test

`openWorkspace.e2e.test.ts`:
- Set up: in-memory Firestore mock with a fixture Story in `approved`, 3 pages. Stubbed `callClaude` returning fixture VB and 3 fixture Scene Plans.
- Enqueue `workspace_open` via the public route handler.
- Manually tick the worker once.
- Assert: Story status === `illustration_workspace`, `currentVisualBibleVersion === 1`, `illustrationPages.length === 3`, all `status === "plan_only"`. One VB doc in `visualBibles/`, 3 docs in `scenePlans/`. EditHistory contains the expected events.

### 7.3 Client tests

- `IllustrationsTabV2`: 5 render-state tests using a mocked `useIllustrationWorkspaceState`.
- Hook itself: tests using a Firestore subscription mock to verify the view-model produced for each Story / job state.

### 7.4 Manual verification (spec §20 Phase 2 verification)

> Specialist manual test: open workspace on 2 test stories, eyeball the Visual Bible and Scene Plans for sanity. No image generation yet.

Concrete script:
1. `npm run dev` in both server and client.
2. Sign in as specialist.
3. Pick a story in `approved` state (or generate one via brief → Agent 1 → approve).
4. Open the Illustrations tab. Verify Panel A renders with the CTA.
5. Click "Open workspace". Verify the tab switches to the loading state. Verify the progress text updates as VB and Scene Plans are generated.
6. After 60-90s, the workspace preview appears. Verify the VB card shows the character anchor prominently. Expand each section — character sheet, style guide, environment registry — and read them. Eyeball: do these read like a competent art director's notes, or are they generic boilerplate?
7. Scroll through Scene Plans. Each page should have a distinct title, prose, and key visible detail. Eyeball: is page N visually distinct from page N-1?
8. Click "Open workspace" a second time on the same story (if the button reappears anywhere). Verify it's a no-op (same artefacts, no new Sonnet charges in the LLM logs).
9. Repeat on a second story with different age range / story type. Verify the prompts adapt.

**This is the gate.** If the VB or Scene Plans look thin, the prompts need iteration before Phase 3. Better to spend a week tweaking prompts now than to discover Stage 3 produces bad images because Stage 1 was thin.

---

## 8. Explicit non-goals (do NOT do in Phase 2)

- ❌ Stage 2 (Prompt Engineer), Stage 3 (Final Prompt Assembly), Stage 4 (Image Generation) — Phase 3.
- ❌ Per-page image generation UI / "Generate" button — Phase 3.
- ❌ Page Card with image region — Phase 3.
- ❌ Feedback loop, reject-with-feedback — Phase 4.
- ❌ Visual Bible editing UI — Phase 5.
- ❌ Developer panel / observability UI — Phase 5.
- ❌ Cancellation flow — Phase 6 (workspace_open is 60-90s; survivable without cancel).
- ❌ Cloud Functions worker — pilot ships with the polling worker baked into Express (spec §15.2). Cloud Functions is v2.1+.
- ❌ Image safety check — spec §15 puts it behind a `safetyFlags: []` stub in Stage 4 (Phase 3 minimum, Phase 6 polish).
- ❌ Removing v1 illustration code — decision A leaves it as temporary dead code; cleanup PR 3 in Phase 3+ removes it.
- ❌ Multi-process / multi-instance worker safety — pilot is single-process. If we later run two Express instances, the transactional claim already handles it, but we don't need to test that scenario in Phase 2.
- ❌ Touching the Agent 1 pipeline or any non-illustration code.

---

## 9. Risks specific to this phase

**R1 — Stage 1a prompt produces thin Visual Bibles.** Mitigation: snapshot the prompt as a regression test, hand-tune on real stories before declaring Phase 2 done. Budget at least 2-3 days of prompt iteration after the code is wired.

**R2 — Stage 1b per-page calls produce repetitive or incoherent scenes.** Mitigation: the prompt includes full manuscript context (R2 from spec) AND adjacent-page text. If repetition persists, add "must be visually distinct" rule explicitly with examples in the prompt.

**R3 — Worker doesn't start on Render deployment.** Render dynamically restarts processes; the worker must register itself on every cold start. Mitigation: smoke test on a Render preview before merge — open the workspace on a story and watch the logs.

**R4 — Firestore subscription rate / cost.** The client subscribes to the Story doc continuously while the workspace is open. On Firestore's pricing model this is fine for the pilot scale, but if a specialist has 20 tabs open we'd see it. Mitigation: defer until it shows up in billing.

**R5 — Specialist double-clicks the CTA and we charge Sonnet twice.** Mitigation: the idempotency key on the job (`${storyId}:workspace_open:v1`) + the "skip Stage 1a if VB already exists" check inside `openWorkspace`. Belt and suspenders.

**R6 — Long-running job blocks transition response.** Mitigation: route handler returns 200 immediately with `{ jobId }`; the work happens out-of-band in the worker. Client polls Firestore for completion.

**R7 — A retried failed job re-runs Stage 1a and double-charges.** Mitigation: as above (orchestrator checks for existing VB before running Stage 1a).

---

## 10. PR checklist

```
Phase 2 — Stage 1a + 1b + workspace open

Decision (recorded in PR description)
- [ ] A (replace v1) — chosen / B (coexist) — chosen
- [ ] If B: parallel-flow UI distinction implemented

Server — types & shared
- [ ] llm-client.ts with callClaude
- [ ] llm-call-record.ts helper
- [ ] artefact-store.ts (writeVisualBible, writeScenePlan, readers)
- [ ] version-allocator.ts
- [ ] history-events.ts (appendIllustrationEvent)
- [ ] job-enqueue.ts with idempotency

Server — Stage 1a
- [ ] index.ts runVisualDirector
- [ ] prompt-builder.ts with spec §11.1 adjustments
- [ ] output-parser.ts
- [ ] validator.ts
- [ ] types.ts
- [ ] all 3 __tests__ files

Server — Stage 1b
- [ ] index.ts runScenePlanner bulk + (stubbed) per-page
- [ ] prompt-builder.ts with spec §11.2 adjustments
- [ ] output-parser.ts
- [ ] validator.ts
- [ ] types.ts
- [ ] all 3 __tests__ files

Server — orchestrator + worker + routes
- [ ] openWorkspace.ts with idempotency and re-entry safety
- [ ] worker/index.ts with poll loop + concurrency limit + heartbeat
- [ ] worker/handlers.ts (workspace_open only)
- [ ] worker/claim.ts (transactional)
- [ ] worker/recovery.ts (stale reclaim, attempt cap)
- [ ] stories.router.ts: handleTransition enqueues job for illustration_workspace
- [ ] app.ts boots the worker

Firestore
- [ ] rules: read for visualBibles, scenePlans, illustrationJobs
- [ ] indexes: composite on illustrationJobs (status, enqueuedAt)

Client
- [ ] illustrationApi.openIllustrationWorkspace
- [ ] useIllustrationWorkspaceState hook
- [ ] IllustrationsTabV2 (replaces placeholder)
- [ ] PanelACta, LoadingPanel, WorkspacePreview, ErrorPanel
- [ ] VisualBibleCard, ScenePlanCard (read-only)
- [ ] render-state tests

E2E + checks
- [ ] openWorkspace.e2e.test.ts passes
- [ ] server tsc --noEmit clean
- [ ] client tsc --noEmit clean
- [ ] server npm test green
- [ ] client npm test green
- [ ] Manual: workspace opens cleanly on 2 test stories
- [ ] Manual: VB + Scene Plan content read as quality output
- [ ] Manual: idempotent re-click does not charge Sonnet again
- [ ] Manual: deliberately fail the LLM (e.g. wrong API key) and verify error UI + retry
- [ ] Render preview deploy: worker boots, job processes

Documentation
- [ ] Brief PR description with the prompt snapshots attached as exhibit
- [ ] Cost estimate (Sonnet input+output tokens × pilot story count) in the PR
```

---

## 11. Estimated commit shape

**Two PRs**, possibly three, to keep review feasible:

- **PR 5a — Stage 1a + scaffolding.** llm-client, artefact-store, version-allocator, history-events, full Stage 1a (prompt-builder + parser + validator + tests + index). No worker yet, no UI. Tests use a manual orchestrator harness for now. **~20 files, +1200 / −0 net.**
- **PR 5b — Stage 1b + orchestrator + worker + route + UI.** Stage 1b, openWorkspace, worker, route handler, client surfaces. **~25 files, +1500 / −20 net.**
- **PR 5c — Prompt tuning (if needed).** Iteration on Stage 1a and 1b prompts after manual eyeballing. Pure prompt changes + snapshot updates. **~3-5 files.**

If the team can review 50 files in one PR, fold 5a + 5b together. Otherwise split — the seam between Stage 1a-only and the rest is clean.

Suggested commit message for PR 5b (the big one):

```
feat(illustration): Stage 1a + 1b + workspace open

Lands the first end-to-end v2 vertical slice. Specialist opens an approved
story's illustration workspace → background job runs Visual Director (Stage
1a) and Scene Planner (Stage 1b) → Story flips to illustration_workspace
with a populated Visual Bible and one Scene Plan per page. No image
generation yet (Phase 3).

Server:
- server/src/illustration/stage1-visual-director — Sonnet prompt, parser,
  validator (spec §11.1).
- server/src/illustration/stage1-scene-planner — per-page Sonnet calls in
  batches of 3, full-manuscript context (spec §11.2, R2).
- server/src/illustration/orchestrator/openWorkspace — idempotent, re-entry
  safe; reuses existing VB on retry.
- server/src/illustration/worker — single-process Firestore-polling job
  worker with transactional claim, heartbeat, attempt-capped recovery
  (spec §15.2).
- POST /api/specialist/stories/:id/transitions handler enqueues a
  workspace_open job for the new transition; status flips when the
  job succeeds.

Client:
- IllustrationsTab replaces the placeholder with a 5-state view (CTA /
  pending / running / ready / failed) driven by a Firestore subscription.
- Read-only VisualBibleCard + per-page ScenePlanCard preview after
  workspace_open completes — sufficient for the Phase 2 specialist
  eyeball test before Phase 3 builds the image-generation UX.

Spec: docs/illustration/spec.md §11.1, §11.2, §12.1, §14, §15.
```

---

## 12. What Phase 3 unlocks

With Phase 2 producing a populated `illustration_workspace`, Phase 3 layers on:

- Stage 2 (Prompt Engineer) — Haiku call per page that takes a Scene Plan + Visual Bible and produces a `StructuredPrompt`.
- Stage 3 (Final Prompt Assembly) — pure function that concatenates the StructuredPrompt with the Visual Bible's character anchor, palette, style guide, avoid list into the final string sent to Seedream.
- Stage 4 (Image Generation) — Seedream provider call, image stored, ImageArtefact written.
- Per-page "Generate image" button in the Page Card.
- Per-page substate transitions: `plan_only → generating_image → awaiting_review`.
- "Mark as ready to publish" gate.

Phase 3 is **the v2 minimum viable pipeline** (spec §20). Phase 2 is the gate that proves the prompts are worth spending Stage 4 dollars on.

---

## 13. Open questions to resolve during implementation

1. **Anthropic SDK choice.** Agent 1 uses `@anthropic-ai/sdk` directly. Phase 2 should reuse it (not Vercel AI SDK or other). Confirm the exact model ID — `claude-sonnet-4-6` per spec, but verify against the latest Anthropic docs in case the ID was renamed.
2. **Firestore mock for tests.** `@firebase/rules-unit-testing` works for integration tests; for unit tests use a thin in-memory mock. Decide if the team wants to invest in `firebase-emulator` for the E2E test or hand-roll a mock.
3. **Worker startup race.** If the Express process starts the worker before the Firestore admin SDK is fully initialised, the first poll throws. Sequence the boot: admin init → worker start.
4. **Heartbeat granularity.** 10s heartbeat / 60s stale threshold is conservative. Tune after observing pilot behaviour.
5. **Logging.** Each LLM call's full prompt + response should land somewhere queryable for prompt-engineering debugging. The artefact's `llmCall` field has it, but querying across many artefacts is awkward in Firestore. For the pilot, accept this; in Phase 5 the developer panel will surface them.
6. **What does "approved" mean for v2 now?** If the v1 illustration flow still exists (decision B), specialists can take the same `approved` story down two paths. Confirm whether a story can be in both `prompt_review` (v1) and have an active `workspace_open` job (v2) at the same time. The cleanest answer: no — opening v2 workspace flips status to `illustration_workspace`, which leaves the v1 sub-states. The conflict only exists during the pilot window.
