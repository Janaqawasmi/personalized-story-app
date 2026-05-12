# Phase 1 — Foundations (types, state machine, no LLM, no UI)

> **Goal.** Land the static scaffolding for the v2 illustration pipeline:
> types, state-machine entries, Firestore paths, and constants. **Zero behaviour change** from `main` — the new code is dead code until Phase 2 wires it up.
>
> **Why this scope.** Foundations land first so that Phase 2+ can be implemented as pure additions: every later stage will *import* these types and *transition into* these states. If we mix foundations with logic, every typo in a stage's prompt builder blocks the foundation merge.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §9 (state machine), §10 (data model), §15 (job model), §20 Phase 1.
>
> **Branch.** Continue on `feat/illustration-v2` (already 3 commits ahead of `image-gen-experiments`). This work becomes commit #4 on the branch.

---

## 1. Acceptance criteria

A PR satisfies Phase 1 when **all** of these are true:

1. New type modules exist under `server/src/illustration/types/` and are exported through a barrel.
2. Client mirror exists at `client/src/types/illustration.ts` with **identical field names and value-type unions** as the server types.
3. `STORY_STATUSES` includes `"illustration_workspace"`. `ALLOWED_TRANSITIONS` includes the five new macro transitions from spec §9.3.
4. `Story` interface (server + client) gains the three new top-level fields: `illustrationPages`, `currentVisualBibleVersion`, `illustrationWorkspaceOpenedAt`.
5. `EditHistoryEvent` union (server + client) gains the seven new variants from spec §16. Existing label/verb maps in the History tab and last-activity summary are extended.
6. `STORAGE_PATHS` gains a versioned `specialistIllustrationV2(storyId, pageNumber, version, ext)` helper. `COLLECTIONS` documents the five new subcollection names (constants, not deep helpers).
7. `createStoryForGeneration` (and the client `createStory`) initialise the three new fields to safe defaults (`null` / `[]`).
8. `STATUS_LABELS` and `STATUS_TO_ACTIVITY_VERB` maps in the specialist UI cover `"illustration_workspace"` (no UI surface yet — just a string so the History tab renders any stray test data without crashing).
9. Unit tests cover:
   - State-machine transitions (allowed + denied cases for the five new edges).
   - Artefact-shape sanity (`VisualBibleArtefact`, `ScenePlanArtefact`, `IllustrationJob` — the rest can wait until Phase 2).
   - `IllustrationPage` sub-status union completeness.
10. Server typecheck (`tsc --noEmit`) and client typecheck pass clean.
11. `npm test` in the server passes (existing tests must still be green — they will not exercise the new code).
12. The Story document write path still works end-to-end: a manuscript can be generated and approved through the existing flow with no regression. **Manual UI check is sufficient — no new UI to verify.**

---

## 2. Files to create

All paths are repo-relative.

### 2.1 Server — type modules

| File | Exports |
|---|---|
| `server/src/illustration/types/visual-bible.ts` | `VisualBibleArtefact`, `EnvironmentEntry`, `LLMCallRecord` (or import shared) |
| `server/src/illustration/types/scene-plan.ts` | `ScenePlanArtefact`, `SceneDirection` |
| `server/src/illustration/types/structured-prompt.ts` | `StructuredPrompt` |
| `server/src/illustration/types/final-prompt.ts` | `FinalPromptArtefact` |
| `server/src/illustration/types/image.ts` | `ImageArtefact`, `ImageReviewStatus` (string-literal union as a named alias) |
| `server/src/illustration/types/job.ts` | `IllustrationJob`, `IllustrationJobType`, `IllustrationJobStatus` |
| `server/src/illustration/types/illustration-page.ts` | `IllustrationPage`, `IllustrationPageStatus` |
| `server/src/illustration/types/llm-call.ts` | `LLMCallRecord` — shared envelope (`model`, `prompt`, `response`, `inputTokens`, `outputTokens`, `latencyMs`, `success`, `error?`). Reused by VB + ScenePlan. |
| `server/src/illustration/types/index.ts` | Barrel — re-exports everything above |

**Source of truth.** Field-by-field shape is in spec §10.1–§10.6, §15.1. Copy those verbatim; do **not** invent extra fields. If a field is missing from the spec but feels needed, that's a Phase-N+ decision — leave it out of the type now, file a note in the PR description.

**Discriminator pattern.** Both `VisualBibleArtefact.createdBy` and `IllustrationJob.type` are unions; keep them as discriminated unions (literal strings) for `switch`-exhaustiveness, **not** open enums.

### 2.2 Client — type mirror

| File | Exports |
|---|---|
| `client/src/types/illustration.ts` | All of the above, re-exported from one file (the client doesn't need the directory split). |

**Mirror discipline.** The client file declares the types independently (not via shared package) but the **shape must match exactly**. To prevent drift, add a single failing-test comment to the spec PR description listing the field names that must match — but no compile-time enforcement in Phase 1. Phase 6 can move both into `packages/illustration-types/` if drift becomes a real problem.

### 2.3 Server — directory placeholders

Create the following empty directories with a `.gitkeep` so Phase 2 can land in pure additions:

```
server/src/illustration/stage1-visual-director/
server/src/illustration/stage1-scene-planner/
server/src/illustration/stage2-prompt-engineer/
server/src/illustration/stage3-final-prompt/
server/src/illustration/stage4-image-generation/
server/src/illustration/orchestrator/
server/src/illustration/worker/
server/src/illustration/shared/
```

Why placeholders: keeps the proposed file layout (spec Appendix B) visible to anyone browsing the tree right after Phase 1 merges. Optional — if the team prefers "create directories when there's a file to put in them", skip this.

### 2.4 Tests

| File | Cases |
|---|---|
| `server/src/__tests__/illustration-state-machine.test.ts` | Five new allowed transitions return `true` from `isTransitionAllowed`. Five known-denied transitions return `false` (e.g. `draft_brief → illustration_workspace`, `awaiting_review → illustration_ready`, `illustration_workspace → published` direct, etc.). |
| `server/src/__tests__/illustration-types.test.ts` | Compile-time-only: construct one instance of each artefact with all required fields populated. Asserts the union members of `IllustrationPageStatus` and `IllustrationJobType` are exhaustively listed (use `satisfies` + a switch). |
| `server/src/__tests__/illustration-page-substate.test.ts` | (Optional — covered by the artefact test above if you prefer to consolidate.) |

No tests for individual artefact CRUD yet — there's no CRUD code to test in Phase 1.

---

## 3. Files to modify

### 3.1 `server/src/models/story.model.ts`

- Add `"illustration_workspace"` to `STORY_STATUSES` (insert between `"approved"` and `"illustration_ready"` for readable progression).
- Add to `ALLOWED_TRANSITIONS`:
  ```
  approved              → illustration_workspace
  illustration_workspace → illustration_ready
  illustration_workspace → in_review
  illustration_workspace → archived
  illustration_ready    → illustration_workspace
  ```
  (Replace the existing `// Phase 1 will add:` placeholder comment with the actual entries.)
- Extend the `Story` interface with three new top-level fields:
  - `illustrationPages: IllustrationPage[] | null` (null until `approved → illustration_workspace` runs)
  - `currentVisualBibleVersion: number | null`
  - `illustrationWorkspaceOpenedAt: number | null`
- Add the seven new `EditHistoryEvent` variants from spec §16.
- Update `createStoryForGeneration` (and any other factory) to initialise the three new fields to `null`.
- Import the new types from `@/illustration/types`.

### 3.2 `client/src/types/story.ts`

Mirror everything above:
- `STORY_STATUSES` adds `"illustration_workspace"`.
- `Story` gains the three new fields.
- `EditHistoryEvent` gains the seven new variants.
- Import the new types from `../types/illustration`.

### 3.3 `server/src/shared/firestore/paths.ts`

- Add to `COLLECTIONS` (or a sibling constant for subcollections):
  ```
  VISUAL_BIBLES_SUBCOLLECTION   = "visualBibles"
  SCENE_PLANS_SUBCOLLECTION     = "scenePlans"
  FINAL_PROMPTS_SUBCOLLECTION   = "finalPrompts"
  IMAGES_SUBCOLLECTION          = "images"
  ILLUSTRATION_JOBS_SUBCOLLECTION = "illustrationJobs"
  ```
- Add `STORAGE_PATHS.specialistIllustrationV2(storyId, pageNumber, version, ext)` returning `specialist-illustrations/{storyId}/p{pageNumber}-v{version}.{ext}`.
- Keep the existing comment that flagged this addition; remove the "v2 versioned path coming in Phase 1" stub once filled in.

### 3.4 `client/src/specialist/storage/HybridDraftStore.ts`

- Update `createStory` to seed the three new Story fields to `null`.
- No other behavioural change.

### 3.5 `client/src/specialist/storage/__tests__/HybridDraftStore.test.ts`

- Update the `makeStory` helper to include the three new fields with `null` defaults.

### 3.6 `client/src/specialist/components/HistoryTab.tsx`

- Extend `STATUS_LABELS` with `illustration_workspace: "Illustration workspace"`.
- Extend the `EntryDescription` switch with handlers for the seven new event kinds (use short, past-tense labels: e.g. `"Visual Bible generated"`, `"Scene plan generated for page N"`, `"Image generated for page N"`, etc.). These will not fire until Phase 2+ but the switch must be exhaustive against the union.

### 3.7 `client/src/specialist/utils/lastActivitySummary.ts`

- Extend `STATUS_TO_ACTIVITY_VERB` with `illustration_workspace: "Illustration workspace opened"`.
- Extend `verbFromEvent` with cases for the seven new event kinds. Brief past-tense verbs only — this map is for the at-a-glance row in the stories table.

### 3.8 `client/src/i18n/specialistDeskLocales.ts`

- Add `illustration_workspace` status label string in EN / HE / AR.
- Add a status-hint string in all three locales (one short sentence — what the state means).
- Do **not** add UI strings for the new event kinds yet (no UI surface).

### 3.9 `client/src/specialist/components/statusColors.ts`

- Add a colour mapping for `illustration_workspace` (suggest neutral/blue — same family as `in_review`).

### 3.10 `client/src/specialist/utils/storyPipeline.ts`

- Add a case for `illustration_workspace` returning a sensible `nextHint` (e.g. "Generate illustrations for each page, then mark ready"). The function is consumed by the workspace empty/transitional states.

### 3.11 `client/src/specialist/components/WorkspaceTabs.tsx`

- Add `"illustration_workspace"` to the `ILLUSTRATION_STATUSES` set so the Illustrations tab unlocks. (The tab will still show the "coming soon" placeholder added in Cleanup PR 1; Phase 2 replaces the placeholder with real UI.)

### 3.12 `client/src/specialist/pages/StoryWorkspacePage.tsx`

- Add an entry in `DEFAULT_TAB` for `illustration_workspace` → `"illustrations"`.

### 3.13 `client/src/specialist/components/StoriesFilterBar.tsx`

- Add a filter chip for `illustration_workspace`.

---

## 4. Detailed type contracts (copy into the type files)

> The spec is the canonical source. This section restates the shapes for convenience and to call out the **exact** field names so the client mirror matches verbatim.

### 4.1 `IllustrationPage` (server + client)

```
IllustrationPageStatus = "plan_only"
                        | "generating_image"
                        | "awaiting_review"
                        | "approved"
                        | "needs_revision"

IllustrationPage:
  pageNumber: number
  text: string                       // copy from manuscript at workspace-open; immutable here
  currentScenePlanVersion: number | null
  currentImageVersion: number | null
  status: IllustrationPageStatus
  pendingJobId: string | null
  lastError: string | null
```

### 4.2 `VisualBibleArtefact`

```
EnvironmentEntry:
  atmosphere: string
  spatialLayout: string

VisualBibleArtefact:
  id: string
  storyId: string
  version: number                    // monotonic per story, starts at 1
  createdAt: number                  // ms since epoch
  createdBy: { kind: "system" } | { kind: "specialist"; uid: string }
  parentVersion: number | null
  source: "llm_generated" | "specialist_edited"
  llmCall: LLMCallRecord | null     // null when source = specialist_edited
  characterSheet: string
  characterAnchor: string
  styleGuide: string
  consistencyAnchors: string[]
  environmentRegistry: Record<string, EnvironmentEntry>
  palette: string
  avoidList: string[]
```

**Note on `createdBy`.** Spec uses `"system" | { uid: string }` (loose union). Use a tagged discriminated union (`{ kind: "system" }` / `{ kind: "specialist"; uid: string }`) so callers can `switch (createdBy.kind)` without runtime type-checks. The spec doesn't forbid this — it's a refinement.

### 4.3 `ScenePlanArtefact`

```
SceneDirection:
  moment: string
  cameraSpec: string
  lightingChoice: string
  visualHook: string
  keyPhysicalDetail: string

ScenePlanArtefact:
  id: string
  storyId: string
  pageNumber: number
  version: number
  createdAt: number
  parentVersion: number | null
  llmCall: LLMCallRecord
  visualBibleVersion: number
  feedbackNote: string | null

  // Human-readable view
  title: string
  prose: string
  emotionalIntent: string
  keyVisibleDetail: string

  // Developer view
  director: SceneDirection
  structuredPrompt: StructuredPrompt | null   // populated after Stage 2 runs
```

### 4.4 `StructuredPrompt`

```
StructuredPrompt:
  setting: string
  character: string
  focalPoint: string
  composition: string
  lighting: string
```

### 4.5 `FinalPromptArtefact`

```
FinalPromptArtefact:
  id: string
  storyId: string
  pageNumber: number
  version: number
  createdAt: number
  parentScenePlanVersion: number
  parentVisualBibleVersion: number
  finalPromptString: string
  promptOrder: string[]
  charCount: number
  warnings: string[]
```

### 4.6 `ImageArtefact`

```
ImageReviewStatus = "awaiting_review" | "approved" | "needs_revision"

ImageArtefact:
  id: string
  storyId: string
  pageNumber: number
  version: number
  createdAt: number
  parentFinalPromptId: string
  providerId: string
  modelId: string
  modelParams: Record<string, unknown>
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  storagePath: string
  publicUrl: string
  mimeType: string
  bytes: number
  reviewStatus: ImageReviewStatus
  approvedAt: number | null
  rejectionNote: string | null
```

### 4.7 `IllustrationJob`

```
IllustrationJobType = "workspace_open"
                    | "scene_plan_regen"
                    | "image_generation"
                    | "image_regen"

IllustrationJobStatus = "pending" | "running" | "succeeded" | "failed"

IllustrationJob:
  id: string
  storyId: string
  type: IllustrationJobType
  pageNumber: number | null
  enqueuedBy: string                 // uid
  enqueuedAt: number
  startedAt: number | null
  completedAt: number | null
  status: IllustrationJobStatus
  attempt: number
  idempotencyKey: string
  inputRefs: Record<string, string>
  outputRefs: Record<string, string>
  error: string | null
```

### 4.8 `LLMCallRecord` (shared envelope)

```
LLMCallRecord:
  model: string
  prompt: string
  response: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  success: boolean
  error: string | null
```

---

## 5. State machine — the five new edges (spec §9.3)

Add to `ALLOWED_TRANSITIONS`:

```
approved              → illustration_workspace      (specialist "Open workspace")
illustration_workspace → illustration_ready          (specialist "Mark ready" — gated externally)
illustration_workspace → in_review                   (specialist re-opens manuscript)
illustration_workspace → archived
illustration_ready    → illustration_workspace       (specialist re-opens for fixes)
```

**Phase 1 does not enforce the "all pages approved" gate** on `illustration_workspace → illustration_ready` — that's a route-handler concern in Phase 3. The state machine only validates that the transition is *structurally* allowed.

**Phase 1 does not implement per-page substate transitions** as a separate state machine. The `IllustrationPage.status` field is a string union; transitions between sub-statuses live inside Phase 3 service code (e.g. `generateImage.ts`). Documented in the type, not in `ALLOWED_TRANSITIONS`.

---

## 6. EditHistory event extensions (spec §16)

Add to the `EditHistoryEvent` union in **both** `server/src/models/story.model.ts` and `client/src/types/story.ts`:

```
| { kind: "visual_bible_generated", version: number, source: "llm" | "edit" }
| { kind: "scene_plan_generated", pageNumber: number, version: number, withFeedback: boolean }
| { kind: "image_generated", pageNumber: number, version: number }
| { kind: "image_approved", pageNumber: number, version: number }
| { kind: "image_rejected", pageNumber: number, version: number, feedbackNote: string }
| { kind: "illustration_workspace_opened" }
| { kind: "illustration_ready_marked" }
```

The exhaustive-switch tests in the History tab + last-activity-summary maps will catch missing handlers at typecheck time (these maps use `Record<EditHistoryEventKind, string>` or `switch` with `never`-return — keep the existing pattern).

---

## 7. Firestore additions

### 7.1 Subcollection name constants

In `server/src/shared/firestore/paths.ts`:

```
COLLECTIONS.STORY_VISUAL_BIBLES        = "visualBibles"
COLLECTIONS.STORY_SCENE_PLANS          = "scenePlans"
COLLECTIONS.STORY_FINAL_PROMPTS        = "finalPrompts"
COLLECTIONS.STORY_IMAGES               = "images"
COLLECTIONS.STORY_ILLUSTRATION_JOBS    = "illustrationJobs"
```

(Naming style: match existing `STORY_TEMPLATES`, `STORY_PREVIEWS`. If subcollections are gathered into a separate `SUBCOLLECTIONS` const elsewhere, follow that convention instead.)

### 7.2 Storage path helper

```
STORAGE_PATHS.specialistIllustrationV2(storyId, pageNumber, version, ext)
  → `specialist-illustrations/${storyId}/p${pageNumber}-v${version}.${ext}`
```

Document the **versioned** invariant inline: rejection never overwrites; every new image gets a new version.

### 7.3 Firestore security rules

**Defer to Phase 2.** Phase 1 introduces no read/write paths against the new subcollections. Adding rules now means rules for endpoints that don't exist. Phase 2 will pair each new endpoint with the matching rule update.

### 7.4 Firestore indexes

**Defer to Phase 2.** No queries against the new collections in Phase 1.

---

## 8. Test plan

### 8.1 Unit tests to add

**`server/src/__tests__/illustration-state-machine.test.ts`**

```
Suite: ALLOWED_TRANSITIONS — v2 illustration edges
  ✓ approved → illustration_workspace is allowed
  ✓ illustration_workspace → illustration_ready is allowed
  ✓ illustration_workspace → in_review is allowed
  ✓ illustration_workspace → archived is allowed
  ✓ illustration_ready → illustration_workspace is allowed
  ✓ approved → illustration_ready is denied (must go through workspace)
  ✓ awaiting_review → illustration_workspace is denied
  ✓ illustration_workspace → published is denied (must go through illustration_ready)
  ✓ in_review → illustration_workspace is denied (must re-approve first)
  ✓ draft_brief → illustration_workspace is denied
```

**`server/src/__tests__/illustration-types.test.ts`**

```
Suite: Illustration type shapes
  ✓ can construct a minimal valid VisualBibleArtefact (system-generated)
  ✓ can construct a minimal valid VisualBibleArtefact (specialist-edited, llmCall null)
  ✓ can construct a minimal valid ScenePlanArtefact (initial — structuredPrompt null)
  ✓ can construct a minimal valid IllustrationJob for each of the 4 types
  ✓ IllustrationPageStatus union is exhaustive (switch-without-default returns string)
  ✓ IllustrationJobType union is exhaustive (switch-without-default returns string)
  ✓ EditHistoryEvent union includes all seven new kinds (exhaustive switch test)
```

The "exhaustive switch" pattern: define a helper that takes the union, switches on the discriminator, returns a string, with a `default: const _exhaustive: never = x;` line. TypeScript fails the build if a member is missing. This is the strongest available compile-time guarantee.

**Client tests** — extend the existing `HybridDraftStore.test.ts` `makeStory` helper. No new test file required.

### 8.2 Regression check

`npm test` in `server/` and `client/` must stay green. The state-machine test file is new; existing tests should not need edits.

### 8.3 Manual verification

The user explicitly said no Phase 0 dry-run — testing happens via the UI. After Phase 1 merges, the manual check is:

1. Start server + client locally.
2. Open the Specialist Dashboard.
3. Pick a story in `approved` state (or generate one via the brief → Agent 1 flow).
4. Confirm: the workspace loads, the Illustrations tab is **still visible** with the "coming soon" placeholder. No regressions in Brief / Draft / History tabs.
5. Optionally: directly write `status: "illustration_workspace"` on a test Story doc in Firestore and confirm the Story loads in the workspace without crashing (the Illustrations tab placeholder should show; History tab should render any `illustration_workspace_opened` event if one is hand-inserted).

If step 5 feels risky, skip it — Phase 2 will exercise the path properly.

---

## 9. Explicit non-goals (do NOT do in Phase 1)

These are tempting to bundle but belong to later phases. The PR must reject scope-creep on any of them:

- ❌ Any LLM call, prompt builder, or output parser (Phase 2+).
- ❌ Any orchestrator function (`openWorkspace.ts`, `generateImage.ts`, …) — Phase 2+.
- ❌ The polling job worker (Phase 2).
- ❌ Any new API endpoints (Phase 2+).
- ❌ Firestore security rules updates (paired with endpoints in Phase 2).
- ❌ Firestore composite indexes (paired with queries in Phase 2).
- ❌ Real UI for the Illustrations tab — keep the placeholder from Cleanup PR 1. Only update the `STATUS_LABELS`, status-hint, and tab-visibility wiring.
- ❌ Replacing the existing `ImageGenerationProvider` interface (already simplified in Cleanup PR 1; the v2 signature change happens in Phase 3 when Stage 4 lands).
- ❌ `STORAGE_PATHS.specialistIllustration` removal — already deleted in Cleanup PR 1.
- ❌ Migrating any existing Firestore data. There is no v1 illustration data to migrate (v1 was never live), and the v2 docs are new collections.
- ❌ Adding `experiments/tsconfig.json` / restoring the harness — that's a separate future PR if/when v2-shaped experiments are needed.
- ❌ Touching `docs/illustration/spec.md`. The spec is the source; Phase 1 implements it, doesn't edit it. The only doc change is to *delete* this file (`phase-1-plan.md`) at the end of the Phase 1 PR — or merge its acceptance-criteria checklist into the PR description.

---

## 10. PR checklist (paste into the PR description)

```
Phase 1 — Foundations

Type modules
- [ ] server/src/illustration/types/visual-bible.ts
- [ ] server/src/illustration/types/scene-plan.ts
- [ ] server/src/illustration/types/structured-prompt.ts
- [ ] server/src/illustration/types/final-prompt.ts
- [ ] server/src/illustration/types/image.ts
- [ ] server/src/illustration/types/job.ts
- [ ] server/src/illustration/types/illustration-page.ts
- [ ] server/src/illustration/types/llm-call.ts
- [ ] server/src/illustration/types/index.ts (barrel)
- [ ] client/src/types/illustration.ts (mirror)

State machine
- [ ] STORY_STATUSES includes "illustration_workspace"
- [ ] ALLOWED_TRANSITIONS includes 5 new edges
- [ ] Removed stub comment in story.model.ts about Phase 1
- [ ] Client STORY_STATUSES + transitions match server

Story interface
- [ ] illustrationPages: IllustrationPage[] | null
- [ ] currentVisualBibleVersion: number | null
- [ ] illustrationWorkspaceOpenedAt: number | null
- [ ] createStoryForGeneration initialises all three to null
- [ ] Client createStory matches

Edit history
- [ ] 7 new EditHistoryEvent variants on server
- [ ] 7 new EditHistoryEvent variants on client
- [ ] HistoryTab switch handles all new kinds
- [ ] lastActivitySummary verbFromEvent handles all new kinds
- [ ] specialistDeskLocales updated for illustration_workspace status

UI plumbing (no new tab content)
- [ ] WorkspaceTabs ILLUSTRATION_STATUSES includes illustration_workspace
- [ ] StoryWorkspacePage DEFAULT_TAB maps illustration_workspace → "illustrations"
- [ ] StoriesFilterBar has chip for illustration_workspace
- [ ] statusColors has entry for illustration_workspace
- [ ] storyPipeline nextHint case for illustration_workspace

Firestore
- [ ] 5 subcollection name constants in COLLECTIONS
- [ ] specialistIllustrationV2 storage path helper

Tests
- [ ] illustration-state-machine.test.ts (10+ assertions)
- [ ] illustration-types.test.ts (exhaustive-switch coverage)
- [ ] HybridDraftStore.test.ts updated

Checks
- [ ] server tsc --noEmit clean
- [ ] client tsc --noEmit clean
- [ ] server npm test green
- [ ] client npm test green (if any tests run on CI)
- [ ] Manual: existing flow draft_brief → approved unchanged
- [ ] Manual: workspace loads on a Story with status="illustration_workspace" (placeholder tab)
```

---

## 11. Estimated commit shape

One PR, ~12–18 files changed, +600 / −60 net. No deletions of substance (Cleanup PRs 1 + 2 already did the deletes).

Suggested single commit:

```
feat(illustration): phase 1 — types, state machine, Firestore paths

Lands the v2 illustration foundation. No behaviour change from main —
this is dead code until Phase 2 wires up the Visual Director and
Scene Planner stages.

- Adds illustration_workspace to the Story state machine with 5 new
  edges per spec §9.3.
- Introduces 7 typed artefacts (VisualBible, ScenePlan, StructuredPrompt,
  FinalPrompt, Image, Job, LLMCallRecord) under server/src/illustration/
  types/, mirrored client-side.
- Extends Story with illustrationPages[], currentVisualBibleVersion,
  illustrationWorkspaceOpenedAt.
- Adds 7 new EditHistoryEvent variants and corresponding UI label maps.
- Adds 5 Firestore subcollection name constants and a versioned
  specialistIllustrationV2 storage path helper.
- Tests: state-machine transitions + exhaustive-union shape checks.

Spec: docs/illustration/spec.md §9, §10, §15, §20.
```

---

## 12. What Phase 2 unlocks

Phase 2 = Stage 1a (Visual Director) + Stage 1b (Scene Planner) + the "Open workspace" job. With Phase 1's foundations in place, Phase 2 is *purely additive*:

- Implement `runVisualDirector(story)` returning a `VisualBibleArtefact`.
- Implement `runScenePlanner(story, vb)` returning an array of `ScenePlanArtefact`s.
- Implement the polling `worker/` (handles `workspace_open` job type only).
- Wire `POST /api/specialist/stories/:id/transitions { to: "illustration_workspace" }` to enqueue a `workspace_open` job.
- Replace the placeholder Illustrations tab with Panel A ("Open workspace" CTA) + loading state.

No Phase 1 types should need editing in Phase 2 — if they do, that's a Phase 1 scope leak and the right fix is to land a follow-up to Phase 1 first, not to silently mutate types alongside logic.
