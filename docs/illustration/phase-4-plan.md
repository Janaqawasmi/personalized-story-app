# Phase 4 — Feedback loop & regeneration

> **Goal.** Make rejection productive. Today (Phase 3), rejecting a page just clears the image and asks the specialist to click Generate again — the LLM doesn't see the rejection note, so the next attempt is statistically identical. Phase 4 closes the loop: the rejection note becomes input to a fresh Scene Plan, which cascades into a fresh image. Plus per-page Scene Plan regenerate buttons (without first generating an image), and a version-history dropdown.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §11.2 (Stage 1b feedback shape), §20 Phase 4.
>
> **Branch.** `feat/illustration-v2-phase4` off `feat/illustration-v2` after Phase 3 lands on the integration branch.

---

## 0. Phase 3 review — what to lean on and what to fix

Phase 3 is solid. Architecture from the plan landed cleanly:
- 5-stage pipeline end-to-end ([generateImage.ts:58-158](server/src/illustration/orchestrator/generateImage.ts))
- Worker handler for `image_generation` with isolated-failure path via `markImageGenerationFailedOnStory` ([handlers.ts:33-68](server/src/illustration/worker/handlers.ts))
- `illustration_workspace → illustration_ready` gated by all-pages-approved ([stories.router.ts:423-434](server/src/routes/specialist/stories.router.ts))
- Idempotency key shape `${storyId}:image:${pageNumber}:sp${currentScenePlanVersion}` ([stories.router.ts:626](server/src/routes/specialist/stories.router.ts)) — rotates naturally when a new scene plan version lands
- Heartbeat fix applied ([illustration-worker-impl.ts:24-32](server/src/illustration/worker/illustration-worker-impl.ts))
- Seedream v2 contract: seed required, `referenceImage` kept only for caregiver flow ([seedream.provider.ts:65-72](server/src/providers/seedream.provider.ts))
- 3-attempt retry with exponential backoff on retryable provider errors ([stage4-image-generation/index.ts:26-77](server/src/illustration/stage4-image-generation/index.ts))

### What Phase 4 needs to change from Phase 3

These are not bugs — they were correct Phase 3 choices that need updating for Phase 4:

1. **Reject clears `currentImageVersion: null`** ([stories.router.ts:758-761](server/src/routes/specialist/stories.router.ts)). For Phase 3 (simple revert), this was right. For Phase 4 with version history, we need to **keep the rejected image artefact reachable from the page card**. Either:
   - Add `previousImageVersions: number[]` to `IllustrationPage` (history list, oldest → newest), or
   - Stop nullifying `currentImageVersion` on reject and let the version-history dropdown read all artefacts via collection query

   **Recommendation: the collection query.** The image artefacts already live at versioned docIds (`${pageNumber}-${version}`) and the index is in place. No type change required; just stop the destructive update.

2. **Reject feedback note isn't piped to anything.** The note lands on `ImageArtefact.rejectionNote` ([stories.router.ts:763-764](server/src/routes/specialist/stories.router.ts)) but the next "Generate" click reuses the same scene plan — so the note is invisible to the LLM. Phase 4 wires reject into the regen cascade.

3. **`image_regen` and `scene_plan_regen` job handlers throw `UnsupportedJobTypeError`** ([handlers.ts:72-78](server/src/illustration/worker/handlers.ts)). Phase 4 implements both.

4. **`runScenePlannerForPage` is a stub** ([stage1-scene-planner/index.ts:35-40](server/src/illustration/stage1-scene-planner/index.ts) — `throw new Error("Phase 4")`). Phase 4 implements it.

### Out-of-scope but worth flagging

- **Public storage URLs.** Phase 3 makes `ImageArtefact.publicUrl` publicly readable. If a story is archived or a rejected image needs to be unlinked, the URL stays live forever. Phase 6 might want signed URLs with expiry; not a Phase 4 item.
- **No retry on Stage 2/3 inside `generateImage`.** Stage 4 retries, but if Stage 2 throws, the whole regen job fails. Acceptable (the specialist can re-trigger), but Phase 4 should test it.

---

## 1. Acceptance criteria

Phase 4 is done when:

1. **Reject with feedback note → new image.** Specialist rejects a page with a feedback note. Within ~45s a new image appears, generated from a fresh Scene Plan that took the feedback into account. The image is visibly different (different framing / pose / composition based on the note).
2. **Regenerate Scene Plan (no feedback).** A new "Regenerate scene plan" button on each Page Card lets the specialist request a fresh Scene Plan for the page even before any image was generated. Cascades through Stage 1b only (no image generation — the specialist then clicks Generate when they like the plan).
3. **Regenerate Scene Plan with feedback.** Same button but with a "Regenerate with note…" variant that opens a feedback dialog. The note flows into Stage 1b'.
4. **Version history dropdown.** Each Page Card shows a "v3 of 5 ▾" selector. Clicking shows prior versions of the image (with their scene plans and feedback notes). Older versions are read-only — selecting one doesn't change the current pointer; it just lets the specialist compare.
5. **Edit-history shows feedback flow.** The History tab reflects every regen: `image_rejected (feedbackNote: "...")` → `scene_plan_generated (withFeedback: true)` → `image_generated (version: 2)`.
6. **Server + client typecheck clean. New unit tests for Stage 1b' (regen prompt builder, feedback input handling), orchestrator regen flow, version history hook.**
7. **Manual e2e:** Open workspace on a test story. Generate page 1. Reject with note "show the door clearly, character should look smaller". Verify the new image reflects the note. Approve. Open page 2's version dropdown and confirm only v1 exists.

---

## 2. Server work

### 2.1 Stage 1b regeneration — `runScenePlannerForPage`

**Update:** [server/src/illustration/stage1-scene-planner/index.ts:35-40](server/src/illustration/stage1-scene-planner/index.ts) — currently throws "Phase 4". Implement.

**Shape:**

```ts
export interface ScenePlannerRegenInput {
  story: Story;
  manuscriptPages: { pageNumber: number; text: string }[];
  visualBible: VisualBibleArtefact;
  pageNumber: number;
  previousScenePlan: ScenePlanArtefact;   // the latest version for this page
  feedbackNote: string | null;            // null for "regenerate without feedback"
}

export async function runScenePlannerForPage(
  input: ScenePlannerRegenInput,
): Promise<ScenePlanArtefact>
```

**Behavior:**
- Builds a *regeneration-specific* prompt — same Visual Bible / manuscript context as the original Stage 1b, plus two new sections:
  - The previous Scene Plan's `prose`, `emotionalIntent`, `director.moment`, `director.cameraSpec`, `director.lightingChoice` (so the LLM has the "before" state)
  - The feedback note (or a "no feedback — produce a meaningfully different framing" instruction when null)
- Same model (`claude-sonnet-4-6`), same retry (1 on parse/schema failure).
- Returns a fresh `ScenePlanArtefact`:
  - `version`: `nextScenePlanVersion(storyId, pageNumber)`
  - `parentVersion`: `previousScenePlan.version`
  - `feedbackNote`: input.feedbackNote
  - `structuredPrompt`: null (Stage 2 will populate downstream)

### 2.2 Stage 1b' prompt builder

Add to [server/src/illustration/stage1-scene-planner/prompt-builder.ts](server/src/illustration/stage1-scene-planner/prompt-builder.ts):

```ts
export function buildScenePlannerRegenPrompt(input: ScenePlannerRegenInput): {
  systemPrompt: string;
  userPrompt: string;
}
```

System prompt is identical to the original (the "you are a scene planner…" guidance). The user prompt adds two sections after the manuscript context:

```
PREVIOUS SCENE PLAN FOR THIS PAGE (do not repeat — produce a different one):
- Title: "..."
- Prose: "..."
- Emotional intent: "..."
- Camera: <cameraSpec>
- Lighting: <lightingChoice>
- Moment: "<moment>"

SPECIALIST FEEDBACK (interpret as direction for the new plan):
"<feedbackNote>"
```

When `feedbackNote` is null:

```
SPECIALIST DIRECTION: The previous scene plan was rejected without a written note.
Produce a meaningfully different framing — change the camera distance OR angle OR
character body position OR the visible focal detail. Do NOT replicate the previous
composition.
```

Rules to keep:
- Literal language only, no metaphors (same as original).
- No emotion names in `director.keyPhysicalDetail`.
- Stay consistent with Visual Bible character anchor.

### 2.3 Orchestrators

Add two new orchestrator files. Both write artefacts + update the Story doc + emit history events, mirroring `generateImage.ts`.

#### `server/src/illustration/orchestrator/regenerateScenePlan.ts`

```ts
regenerateScenePlan({
  storyId,
  pageNumber,
  uid,
  feedbackNote: string | null,
}): Promise<{ scenePlanId: string, version: number }>
```

**Sequence:**

1. Load Story; verify `status === "illustration_workspace"` and the page exists.
2. Read latest Visual Bible and latest Scene Plan for the page.
3. Compose the full manuscript pages array (same shape as `openWorkspace.ts:91-93`).
4. Call `runScenePlannerForPage` with feedbackNote.
5. `writeScenePlan(storyId, newPlan)`.
6. Transactional Story update: `illustrationPages[i].currentScenePlanVersion = newPlan.version`, `.status = "plan_only"` (image was implicitly invalidated, drop `currentImageVersion: null`). Keep `pendingJobId: null`. Reset `lastError: null`.
7. Append history event `{ kind: "scene_plan_generated", pageNumber, version: newPlan.version, withFeedback: feedbackNote !== null }`.

#### `server/src/illustration/orchestrator/cascadeAfterReject.ts`

```ts
cascadeAfterReject({
  storyId,
  pageNumber,
  uid,
  feedbackNote: string | null,
}): Promise<{ imageId, storagePath, publicUrl }>
```

**Sequence:**

1. Reuse `regenerateScenePlan` internals (don't duplicate the prompt/parse code — extract a shared helper or call the orchestrator directly).
2. After Scene Plan is written and Story is updated, invoke the same Stage 2 → 3 → 4 cascade as `generateImage`. Refactor `generateImage.ts` to extract `runStage2Through4(scenePlan, visualBible, storyId, pageNumber, uid)` so both flows use the same downstream code.

**Why two orchestrators not one:** "regenerate scene plan only" is a real specialist action (when they want to redirect *before* committing GPU cost). Keep them separate even if the cascade reuses helpers.

### 2.4 Worker handlers

Update [server/src/illustration/worker/handlers.ts](server/src/illustration/worker/handlers.ts):

```ts
async function handleScenePlanRegen(job, jobRef): Promise<void> {
  const pageNumber = requirePageNumber(job);
  const feedbackNote = (job.inputRefs.feedbackNote ?? null) || null;
  const result = await regenerateScenePlan({
    storyId: job.storyId,
    pageNumber,
    uid: job.enqueuedBy,
    feedbackNote: feedbackNote.length > 0 ? feedbackNote : null,
  });
  await jobRef.update({
    status: "succeeded",
    completedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    outputRefs: { scenePlanId: result.scenePlanId, version: String(result.version) },
    error: null,
  });
}

async function handleImageRegen(job, jobRef): Promise<void> {
  const pageNumber = requirePageNumber(job);
  const feedbackNote = (job.inputRefs.feedbackNote ?? null) || null;
  try {
    const result = await cascadeAfterReject({
      storyId: job.storyId,
      pageNumber,
      uid: job.enqueuedBy,
      feedbackNote: feedbackNote.length > 0 ? feedbackNote : null,
    });
    await jobRef.update({
      status: "succeeded",
      completedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      outputRefs: {
        imageId: result.imageId,
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
      },
      error: null,
    });
  } catch (err) {
    await markImageGenerationFailedOnStory({ ... });   // reuse Phase 3 helper
    throw err;
  }
}

export const handlers = {
  workspace_open: handleWorkspaceOpen,
  scene_plan_regen: handleScenePlanRegen,             // new
  image_generation: handleImageGeneration,
  image_regen: handleImageRegen,                      // new
};
```

Extract `requirePageNumber(job)` helper — both regen handlers need it.

### 2.5 API endpoints

Add to [stories.router.ts](server/src/routes/specialist/stories.router.ts):

```
POST   /:storyId/pages/:pageNumber/scene-plan/regenerate
  body: { feedbackNote?: string }
  → enqueues scene_plan_regen job
  → idempotency key: ${storyId}:scene_plan_regen:${pageNumber}:${currentScenePlanVersion}
  → returns { jobId, status: "pending" }

POST   /:storyId/pages/:pageNumber/image/reject
  → CHANGE: also enqueues an image_regen job (Phase 4 behavior)
  → body: { feedbackNote?: string }
  → idempotency key: ${storyId}:image_regen:${pageNumber}:${currentScenePlanVersion}:${currentImageVersion}
  → returns { jobId, status: "pending" }
```

**Important change to existing reject handler ([stories.router.ts:703-781](server/src/routes/specialist/stories.router.ts)):**
- KEEP: Mark image artefact `reviewStatus: "needs_revision"`, record `rejectionNote`, append history event.
- KEEP: Update Story page row's `pendingJobId: <newJobId>`, `status: "generating_image"`.
- REMOVE: The line setting `currentImageVersion: null` ([stories.router.ts:759](server/src/routes/specialist/stories.router.ts)). Keep the previous version visible until the new one lands — when the cascade completes, the orchestrator updates `currentImageVersion` to the new value.
- ADD: Enqueue `image_regen` job. Same idempotency-key pattern as `image_generation`.

This means the **Phase 3 simple-revert behavior is gone** — rejecting now always kicks off regen. If a specialist wants the simple-revert behavior (rare), they can ignore the new image when it arrives, or reject it too.

### 2.6 Version history endpoint

```
GET    /:storyId/pages/:pageNumber/history
  → returns { scenePlans: ScenePlanArtefact[], images: ImageArtefact[] }
  → ordered by version DESC
```

Server-side: collection-group-query is overkill for one page; just two direct subcollection reads with `where("pageNumber", "==", n).orderBy("version", "desc")`. Indexes already in place (Phase 2 + 3).

### 2.7 IllustrationPage substate

No type changes needed — `IllustrationPageStatus` ([server/src/illustration/types/illustration-page.ts](server/src/illustration/types/illustration-page.ts)) already has `needs_revision` and `generating_image`. Phase 4 just uses them more fully.

Sub-status transitions added in Phase 4:
- `approved → needs_revision`: very rare ("specialist re-opens an approved page"). Spec §9.3 allows it. Phase 4 deferred — handle in Phase 5 via the VB-changed banner or a "reopen page" button.
- `awaiting_review → needs_revision → generating_image`: handled by the reject endpoint + cascade.
- `plan_only → generating_image`: Phase 3 already handles this for the initial Generate. Phase 4 reuses for regen.

### 2.8 Concurrency / race notes

Two real races to handle:

1. **Specialist clicks Approve and Reject in quick succession.** The endpoints both load the latest image via `readLatestImage` and verify `version === currentImageVersion && reviewStatus === "awaiting_review"` in the transaction. ✓ Phase 3 already covers.

2. **Two regen jobs enqueued for the same page.** Idempotency key based on `currentScenePlanVersion + currentImageVersion` rotates after each regen completes. But if a user double-clicks "Reject" before the first job updates the page row, the second click may get the same key and dedup to the first job. ✓ Correct behavior — return the existing job ID.

3. **VB edit during regen.** Phase 5 introduces VB editing. Phase 4 doesn't need to handle this race; Phase 5 design will (the "VB has changed" banner per spec §12).

---

## 3. Client work

### 3.1 API client

Add to [client/src/api/illustrationApi.ts](client/src/api/illustrationApi.ts):

```ts
regenerateScenePlan(storyId, pageNumber, feedbackNote?: string): Promise<{ jobId: string }>
// rejectImage already exists from Phase 3 — return type changes to include jobId
fetchPageHistory(storyId, pageNumber): Promise<{ scenePlans: ScenePlanArtefact[], images: ImageArtefact[] }>
```

Phase 3's `rejectImage` returns `{ ok: true }`; Phase 4 changes the response shape to `{ jobId, status: "pending" }` so the UI can subscribe to the regen job's progress. Update both the route handler and the client function in lockstep.

### 3.2 Hook extension

Extend [useIllustrationWorkspaceState.ts](client/src/specialist/hooks/useIllustrationWorkspaceState.ts):

- Already subscribes to story doc + illustrationJobs + images (Phase 3). Add: scenePlans subscription per page so regenerate-scene-plan completion is visible.
- New per-page derived state:
  - `activeRegenJob: IllustrationJob | null` — most recent `image_regen` or `scene_plan_regen` job that's `pending`/`running` for this page
  - `versionCount: { scenePlans: number, images: number }` for the dropdown affordance
- Sub-status mapping update: if `activeRegenJob` exists, sub-status is `generating_image` regardless of `pendingJobId`.

### 3.3 Page Card updates

Updates to existing files:

- [PageCardImage.tsx](client/src/specialist/components/illustration/PageCardImage.tsx)
  - On Approve / Reject buttons, no behavior change visible to the user. Under the hood, Reject now triggers a regen (UI immediately flips to `generating_image` via subscription).
  - When `subStatus === "approved" || "awaiting_review"`, show a small "v{N}" tag.

- [PageCardScenePlan.tsx](client/src/specialist/components/illustration/PageCardScenePlan.tsx)
  - Add a "Regenerate scene plan" button at the bottom of the card.
  - Click opens a small popover with two buttons: "Regenerate" (no feedback) and "Regenerate with note…" (opens the feedback dialog, similar to Phase 3's reject dialog).
  - During `scene_plan_regen` job pending/running, show a skeleton + "Updating scene plan…".

New components:

- `PageCardVersionPicker.tsx` — dropdown showing scene plan and image versions; clicking a non-current version opens a comparison modal showing the alternate version's image + scene plan side-by-side with the current. **Read-only.** Phase 4 does not include "revert to this version" — that's Phase 5 (VB editing scope).
- `PageCardComparisonModal.tsx` — the comparison surface.

### 3.4 Workspace tab integration

Minor updates to [IllustrationsTabV2.tsx](client/src/specialist/components/illustration/IllustrationsTabV2.tsx):

- Render `PageCardVersionPicker` in the page header row when the page has more than 1 version.
- No footer changes — "Mark as ready to publish" gate unchanged.

---

## 4. Firestore

### 4.1 Rules

No changes needed. Phase 3 already covers `finalPrompts`, `images`, `scenePlans`, `illustrationJobs` subcollections. Regen reads/writes go through the Admin SDK on the server.

### 4.2 Indexes

No new indexes needed. The version-history endpoint queries `where pageNumber == N orderBy version DESC` — covered by the Phase 2 (`scenePlans (pageNumber, version DESC)`) and Phase 3 indexes.

---

## 5. Test plan

### 5.1 Unit tests (new)

| File | Cases |
|---|---|
| `stage1-scene-planner/__tests__/prompt-builder.test.ts` (extend) | `buildScenePlannerRegenPrompt` with feedback note includes the note verbatim. With null feedback, includes the "produce a different framing" instruction. Includes the previous scene plan content. |
| `stage1-scene-planner/__tests__/index.test.ts` (new or extend) | `runScenePlannerForPage` returns artefact with `parentVersion === input.previousScenePlan.version` and `feedbackNote` populated. |
| `orchestrator/__tests__/regenerateScenePlan.test.ts` (new) | End-to-end with mocked LLM and Firestore: scene plan written, story row updated, `currentScenePlanVersion` bumped, history event emitted. |
| `orchestrator/__tests__/cascadeAfterReject.test.ts` (new) | Mocked LLM + Seedream: full 1b → 2 → 3 → 4 cascade. Artefacts at all four collections. History has scene_plan_generated + image_generated events. |
| `worker/__tests__/handlers.test.ts` (extend) | `image_regen` handler succeeds. Failure path calls `markImageGenerationFailedOnStory`. |

### 5.2 Integration / E2E

Real integration test under `server/src/__tests__/regenerate.e2e.test.ts`:

1. Seed a story in `illustration_workspace` with VB + scene plan v1 + image v1 (`reviewStatus: "awaiting_review"`).
2. POST `/pages/1/image/reject { feedbackNote: "show door clearly" }`.
3. Wait for the worker (or invoke the handler directly with a mock LLM/Seedream).
4. Assert:
   - Image v1's `reviewStatus === "needs_revision"`, `rejectionNote === "show door clearly"`.
   - New scene plan v2 written with `parentVersion: 1`, `feedbackNote: "show door clearly"`.
   - New image v2 written, `reviewStatus: "awaiting_review"`.
   - Story page row: `currentScenePlanVersion: 2`, `currentImageVersion: 2`, `status: "awaiting_review"`.
   - History has `image_rejected` → `scene_plan_generated (withFeedback: true)` → `image_generated`.

### 5.3 Client tests

Extend [IllustrationsTabV2.test.tsx](client/src/specialist/components/illustration/__tests__/IllustrationsTabV2.test.tsx) + add:
- Reject submits feedback → page card immediately shows `generating_image`.
- Regenerate scene plan button visible, opens popover, both options call the API.
- Version picker only renders when `versionCount.images > 1`.
- Comparison modal opens with side-by-side content; "Close" returns to workspace.

### 5.4 Manual test

Full end-to-end on a test story:

1. Open workspace. Generate page 1 → wait for image. (Phase 3 flow.)
2. Reject with note "show the door clearly, character should look smaller".
3. **Verify:** UI flips to "Generating illustration…" immediately. Within ~45s, a new image appears that visibly reflects the note.
4. Open the version dropdown → v1 and v2 listed → click v1 → comparison modal shows both, with feedback note rendered. Close.
5. Approve v2.
6. On page 2, click "Regenerate scene plan" (no feedback) before generating. Verify a new scene plan appears with different `prose`. Then Generate.

---

## 6. Explicit non-goals (defer to later phases)

- ❌ "Revert to v1" action on the version picker — Phase 5 alongside VB editing.
- ❌ Visual Bible editing — Phase 5.
- ❌ "VB has changed since this plan was generated" banner — Phase 5.
- ❌ Developer debug panels — Phase 5.
- ❌ Cancellation of in-flight regen jobs — Phase 6, best-effort.
- ❌ Multi-page bulk regen ("regenerate all pages with this note") — out of scope.
- ❌ Image safety classifier — Phase 6.

---

## 7. PR checklist (paste into PR description)

```
Phase 4 — Feedback loop & regeneration

Stage 1b'
- [ ] runScenePlannerForPage implemented (was Phase 4 stub)
- [ ] buildScenePlannerRegenPrompt — includes prior plan + feedback note
- [ ] Null-feedback case produces the "different framing" instruction
- [ ] Unit tests for prompt + parser + validator

Orchestrators
- [ ] regenerateScenePlan.ts (Stage 1b only — for the regenerate button)
- [ ] cascadeAfterReject.ts (Stage 1b → 2 → 3 → 4 — for image rejection)
- [ ] Refactor: extract runStage2Through4 helper from generateImage.ts and reuse
- [ ] Story doc update keeps prior image artefacts reachable (no destructive null)

Worker
- [ ] scene_plan_regen handler implemented
- [ ] image_regen handler implemented
- [ ] requirePageNumber helper

Routes
- [ ] POST /pages/:n/scene-plan/regenerate
- [ ] POST /pages/:n/image/reject — now enqueues image_regen (response shape changes to { jobId, status })
- [ ] GET /pages/:n/history (scenePlans + images, version DESC)

Client
- [ ] regenerateScenePlan API call
- [ ] rejectImage API return type updated
- [ ] fetchPageHistory API call
- [ ] useIllustrationWorkspaceState extended: per-page activeRegenJob, versionCount
- [ ] PageCardScenePlan: Regenerate / Regenerate with note buttons + dialog
- [ ] PageCardVersionPicker component
- [ ] PageCardComparisonModal component
- [ ] IllustrationsTabV2 renders version picker when versionCount > 1

Tests
- [ ] Prompt builder + scene planner regen unit tests
- [ ] Orchestrator unit tests for both regen flows
- [ ] Worker handler tests for both new job types
- [ ] E2E: reject → cascade → assert all 4 collections + history
- [ ] Client: reject flips immediately to generating, version picker visibility

Checks
- [ ] Server tsc --noEmit clean
- [ ] Client tsc --noEmit clean
- [ ] Server jest green
- [ ] Manual: full reject-with-feedback → new image cycle
- [ ] Manual: regenerate scene plan (no feedback) → fresh plan visible
- [ ] Manual: version dropdown shows v1 and v2 after one regen
```

---

## 8. Estimated shape

One PR. ~25–30 files changed. +1,500 / −150 LOC. Mostly orchestrator + handlers + client components; touches Phase 3 outputs in 2 places (`stories.router.ts` reject handler change, `generateImage.ts` refactor extraction).

Suggested commit message structure:

```
feat(illustration): Phase 4 — feedback loop & regeneration

Closes the rejection loop. Specialist rejection now produces a fresh
scene plan that takes the feedback note into account, and cascades
into a fresh image.

- Stage 1b regeneration (was stub) with feedback-aware prompt
- regenerateScenePlan and cascadeAfterReject orchestrators
- scene_plan_regen and image_regen worker handlers
- POST /pages/:n/scene-plan/regenerate
- POST /pages/:n/image/reject now enqueues image_regen
- Per-page version dropdown with comparison modal

Spec: docs/illustration/spec.md §11.2 (feedback shape), §20 Phase 4.
```

---

## 9. What Phase 5 unlocks

Phase 5 = Visual Bible editing + developer panels:
- `PATCH /visual-bible` endpoint produces a new VB version on edit.
- Visual Bible card at the top of the workspace becomes editable.
- "Visual Bible has changed since this plan was generated" banner on stale page cards.
- Developer panels (admin-only) showing prompts / LLM call logs / artefact JSON.
- Per-story debug page at `/specialist/stories/:id/illustration/debug`.

Phase 4's version-picker comparison modal sets the visual pattern for Phase 5's "revert to version" affordance — Phase 5 just adds the action button, since Phase 4 lands the read-only comparison surface.
