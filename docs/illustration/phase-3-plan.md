# Phase 3 — Page cards + image generation (Stage 2, 3, 4)

> **Goal.** Make the workspace actually produce images. After Phase 2 the specialist can open the workspace and see a Visual Bible + Scene Plans for every page. Phase 3 adds: per-page "Generate image" button → Stage 2 (Prompt Engineer) → Stage 3 (Final Prompt Assembly) → Stage 4 (Image Generation) → approve / reject → "Mark as ready to publish".
>
> **This is the v2 minimum viable pipeline.** When Phase 3 ships, a specialist can go from approved manuscript → published illustrated book without any v1 plumbing.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §11.3, §11.4, §11.5, §12.2, §17, §20 Phase 3.
>
> **Branch.** `feat/illustration-v2-phase3` off `feat/illustration-v2` after Phase 2 lands on the integration branch.

---

## 0. Phase 2 review — what to lean on

Phase 2 is solid; Phase 3 builds on top of it without rewriting any of these mechanisms:

| Mechanism | Phase 2 location | Phase 3 reuses it as |
|---|---|---|
| Polling worker + transactional claim + heartbeat + 60s recovery | `server/src/illustration/worker/` | Add `image_generation` handler — same loop |
| `enqueueJob` with idempotency key | `server/src/illustration/shared/job-enqueue.ts` | Use for per-page Stage 4 with key `${storyId}:image:${pageNumber}:${finalPromptId}` |
| `writeVisualBible` / `readVisualBible` / `writeScenePlan` / `readScenePlan` | `server/src/illustration/shared/artefact-store.ts` | Add `writeFinalPrompt`, `writeImage`, `updateScenePlanStructuredPrompt` |
| `appendIllustrationEvent` (arrayUnion-safe) | `server/src/illustration/shared/history-events.ts` | Reuse for `image_generated`, `image_approved`, `image_rejected`, `illustration_ready_marked` |
| `callClaude` LLM client wrapper | `server/src/illustration/shared/llm-client.ts` | Reuse with Haiku model id for Stage 2 |
| `nextVisualBibleVersion` / `nextScenePlanVersion` | `server/src/illustration/shared/version-allocator.ts` | Add `nextImageVersion(storyId, pageNumber)` and `nextFinalPromptVersion(storyId, pageNumber)` |
| Real-time client subscription via `useIllustrationWorkspaceState` | `client/src/specialist/hooks/` | Extend the view model with per-page derived state |

**Three small Phase 2 gaps that Phase 3 must fix:**

1. **`handlers.ts` throws `UnsupportedJobTypeError`** for `image_generation` ([handlers.ts:34-42](server/src/illustration/worker/handlers.ts)). Phase 3 implements the handler.
2. **Heartbeat update is fire-and-forget.** Acceptable for `workspace_open` (single LLM call sequence). For `image_generation` jobs that can run 20–40s, an unawaited heartbeat that fails mid-flight could let recovery race the actual completion. Phase 3 should `await` the heartbeat or use a Firestore transaction.
3. **No image-side cancellation path.** Spec §15.4. Phase 3 doesn't have to fully implement cancellation, but per-page jobs make it a more obvious gap — call out in the Phase 3 follow-ups.

---

## 1. Acceptance criteria

Phase 3 is done when:

1. A specialist can click **Generate** on a single page card. Within ~30s the page shows the generated image with **Approve** / **Reject** buttons.
2. Approving a page sets its sub-status to `approved`. The "Mark as ready to publish" footer button enables only when **all** pages are approved.
3. Clicking "Mark as ready" transitions the story `illustration_workspace → illustration_ready`. The footer becomes a read-only banner; the page cards become read-only.
4. Rejection in Phase 3 is **simple revert**: page sub-status goes back to `plan_only`, the image is kept as a prior version (artefact retained), the next Generate click produces a new image version. **Feedback-driven scene-plan regeneration is Phase 4.**
5. Image artefacts live in `stories/{id}/finalPrompts/{id}` and `stories/{id}/images/{id}` with versioned IDs; storage objects under `specialist-illustrations/{storyId}/p{n}-v{ver}.{ext}`.
6. Server typecheck clean, client typecheck clean. New unit tests for Stage 2 parser + Stage 3 assembler + worker handler.
7. Firestore rules + indexes updated for the two new subcollections.
8. `SeedreamProvider` simplified to v2 signature (per §17 of the spec).
9. Manual e2e on a test-set story: open workspace → generate every page → approve every page → mark ready → confirm status `illustration_ready`.

---

## 2. Server work

### 2.1 Stage 2 — Prompt Engineer

**Files to create:**

```
server/src/illustration/stage2-prompt-engineer/
  index.ts                                    # runPromptEngineer(scenePlan, vb) → StructuredPrompt
  prompt-builder.ts                           # buildPromptEngineerPrompt(scenePlan, vb)
  output-parser.ts                            # parsePromptEngineerOutput(text) + PromptEngineerParseError
  validator.ts                                # validateStructuredPrompt(parsed)
  __tests__/output-parser.test.ts
  __tests__/prompt-builder.test.ts
  __tests__/validator.test.ts
```

**Shape of `runPromptEngineer`:**
- Input: `{ scenePlan: ScenePlanArtefact, visualBible: VisualBibleArtefact }`.
- Model: `claude-haiku-4-5-20251001` (from `PROMPT_ENGINEER_MODEL` constant — add to `constants.ts`).
- Max tokens: ~600. Cheap call.
- Retry: 1 on parse/schema failure (match Stage 1 pattern).
- **Returns a `StructuredPrompt` object plus an `LLMCallRecord`** — does NOT create a separate artefact. Caller (orchestrator) writes both back onto the existing Scene Plan document via `artefact-store.updateScenePlanStructuredPrompt`.

**Why this shape:** the spec §11.3 says "Stage 2 does not create its own artefact — it's an extension of the Scene Plan." Avoids artefact proliferation. The `LLMCallRecord` for the Stage 2 call is stored on the Scene Plan in a nested `stage2LLMCall` field (add to `ScenePlanArtefact` type — Phase 1 didn't include it, this is a Phase 3 type addition).

**Prompt template:** Adapt [experiments/src/scene-director.ts](experiments/src/scene-director.ts) `buildPromptConverterPrompt`. Strict word budgets per section (setting ≤25w, character ≤30w, focalPoint ≤10w, composition ≤20w, lighting ≤30w). "Literal language only — no metaphors, no emotion words, no body coordinates the camera can't see."

**Validator:** schema check on the 5 fields + reject empty strings, reject any field containing words from a small set of metaphor flags ("like", "as if", "metaphorically"). Same `{ ok: boolean, reasons: string[] }` shape as Stage 1 validators.

### 2.2 Stage 3 — Final Prompt Assembly (pure function)

**Files to create:**

```
server/src/illustration/stage3-final-prompt/
  index.ts                                    # assembleFinalPrompt(scenePlan, vb) → FinalPromptArtefact
  __tests__/index.test.ts
```

**Shape of `assembleFinalPrompt`:**
- Input: `{ scenePlan: ScenePlanArtefact (with structuredPrompt non-null), visualBible: VisualBibleArtefact, version: number, parentScenePlanVersion: number, parentVisualBibleVersion: number }`.
- Output: a fully-populated `FinalPromptArtefact` (§10.4).
- **Pure function. No LLM call. No Firestore call.** Deterministic byte-for-byte for identical inputs.

**Algorithm (per spec §11.4):**

```
1. avoidList[0] = "no text, no letters..."  (mandated)
2. consistencyAnchors top 2  (joined " | ")
3. "Setting: <structuredPrompt.setting>."
4. "<visualBible.characterAnchor> In this scene: <structuredPrompt.character>."
5. "Focal point: <structuredPrompt.focalPoint>."
6. "Lighting: <structuredPrompt.lighting>."
7. "Color palette: <top 4 palette colours>."
8. "Avoid: <top 3 avoidList items>."
9. "Children's book illustration."
```

Adapt directly from [experiments/src/style-bible.assembler.ts](experiments/src/style-bible.assembler.ts) `assembleStyleBiblePagePrompt`. **Remove every `referenceInstruction` parameter** — v2 has no reference images.

**FinalPromptArtefact fields populated:**
- `id`: `randomUUID()`
- `storyId`, `pageNumber`, `version`, `parentScenePlanVersion`, `parentVisualBibleVersion`
- `createdAt`: `Date.now()`
- `finalPromptString`: the assembled string
- `promptOrder`: ordered string labels for audit (`["no-text", "consistency", "setting", "character", "focal", "lighting", "palette", "avoid", "footer"]`)
- `charCount`: `finalPromptString.length`
- `warnings`: `["prompt exceeds 1200 chars"]` if `charCount > 1200`, else `[]`

**Tests:**
- Given a fixture Scene Plan + Visual Bible, the assembled string matches a snapshot byte-for-byte.
- Char-count warning fires correctly.
- Section ordering is correct.
- No `referenceInstruction` text appears anywhere in the output.

### 2.3 Stage 4 — Image Generation

**Files to create:**

```
server/src/illustration/stage4-image-generation/
  index.ts                                    # runImageGeneration(finalPrompt) → ImageArtefact
  storage.ts                                  # uploadImageToStorage(...) → { storagePath, publicUrl, bytes, mimeType }
  __tests__/index.test.ts
  __tests__/storage.test.ts
```

**Shape of `runImageGeneration`:**
- Input: `{ finalPrompt: FinalPromptArtefact, version: number }`.
- Returns: an `ImageArtefact` (§10.5) with `reviewStatus: "awaiting_review"`.

**Provider call:**

```ts
const provider = requireImageProvider();    // v2 contract (see §2.4)
const result = await provider.generateImage({
  textPrompt: finalPrompt.finalPromptString,
  seed: Math.floor(Math.random() * 2**31),  // fresh random seed per call
  outputWidth: 1024,
  outputHeight: 1024,
});
```

**Storage:**
- Path: `STORAGE_PATHS.specialistIllustrationV2(storyId, pageNumber, version, ext)` (already in Phase 1).
- Upload to Firebase Storage. Make publicly readable. Record the public URL on the artefact.

**Retry strategy (per spec §11.5):**
- 2 automatic retries on provider 5xx / timeout.
- Exponential backoff: 1s, 4s.
- After 3 total attempts, propagate the error. Job worker marks the job `failed`.

**Idempotency:**
- Job-level: `${storyId}:image:${pageNumber}:${finalPromptId}` — enqueueJob already handles this.
- Within `runImageGeneration`: if a storage object already exists at the target path (unlikely but possible on cosmic retry), generate a fresh version. Storage paths are versioned, so collision is structurally impossible unless the same job runs twice — which the transactional claim prevents.

### 2.4 `SeedreamProvider` v2 contract

Per spec §17. Update [server/src/providers/seedream.provider.ts](server/src/providers/seedream.provider.ts):

**v2 signature:**

```ts
interface ImageGenerationProvider {
  generateImage(params: {
    textPrompt: string;
    seed: number;             // required in v2 (was optional)
    outputWidth: number;
    outputHeight: number;
    referenceImage?: string;  // KEPT for caregiver flow only — see comment
  }): Promise<{
    imageBuffer: Buffer;
    mimeType: string;
    providerId: string;
    modelId: string;
    seed: number;             // echo back for audit
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
  }>;
}
```

**Important:** `referenceImage` stays on the interface (the caregiver personalization flow at [server/src/services/preview.service.ts](server/src/services/preview.service.ts) and [fullStoryGeneration.service.ts](server/src/services/fullStoryGeneration.service.ts) uses it for the child photo). The Phase 3 specialist pipeline never passes it. Keep the existing comment in the interface file clarifying the distinction.

**Test:** add a unit test asserting Stage 4 calls the provider **without** `referenceImage`.

### 2.5 Orchestrator for per-page generation

**File to create:**

```
server/src/illustration/orchestrator/generateImage.ts
```

**Shape:**

```ts
generateImage({ storyId, pageNumber, uid }): Promise<{ imageId, storagePath, publicUrl }>
```

**Sequence:**

1. Read Story doc; verify status === `illustration_workspace` and `illustrationPages[pageNumber]` exists.
2. Read the latest Scene Plan for the page.
3. **If `scenePlan.structuredPrompt` is null:** run Stage 2 (`runPromptEngineer`), then `updateScenePlanStructuredPrompt` to persist back. Use the now-populated structuredPrompt.
4. Allocate `nextFinalPromptVersion(storyId, pageNumber)` and run Stage 3 (`assembleFinalPrompt`). Write the FinalPromptArtefact.
5. Allocate `nextImageVersion(storyId, pageNumber)` and run Stage 4 (`runImageGeneration`).
6. Write the ImageArtefact.
7. Update the Story doc: `illustrationPages[pageNumber].currentImageVersion`, `.status = "awaiting_review"`, `.pendingJobId = null`, `.lastError = null`. Use arrayUnion-safe transaction so concurrent updates don't clobber each other (multiple page generations can complete out of order).
8. Append history event `{ kind: "image_generated", pageNumber, version }`.

**Error handling:**
- Catch + re-throw with context. The worker handler will mark the job failed.
- On failure, set `illustrationPages[pageNumber].lastError` to the error message. Sub-status returns to `plan_only` so the specialist can retry.

### 2.6 Worker handler

Update [server/src/illustration/worker/handlers.ts](server/src/illustration/worker/handlers.ts):

```ts
async function handleImageGeneration(job, jobRef): Promise<void> {
  const result = await generateImage({
    storyId: job.storyId,
    pageNumber: job.pageNumber!,
    uid: job.enqueuedBy,
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
}

export const handlers = {
  workspace_open: handleWorkspaceOpen,
  image_generation: handleImageGeneration,           // new in Phase 3
  scene_plan_regen: async () => { throw new UnsupportedJobTypeError("scene_plan_regen"); },
  image_regen: async () => { throw new UnsupportedJobTypeError("image_regen"); },
};
```

**Heartbeat fix from Phase 2 review:** in [illustration-worker-impl.ts:24-26](server/src/illustration/worker/illustration-worker-impl.ts), change `void jobRef.update(...)` to `await jobRef.update(...).catch(err => console.warn(...))`. This costs nothing and prevents the silent-failure mode where a network hiccup makes recovery think a healthy job is stale.

### 2.7 API endpoints

Add to [server/src/routes/specialist/stories.router.ts](server/src/routes/specialist/stories.router.ts):

```
POST   /api/specialist/stories/:storyId/pages/:pageNumber/image
  → enqueues image_generation job
  → idempotency key: ${storyId}:image:${pageNumber}:${currentFinalPromptId ?? currentScenePlanVersion}
  → returns { jobId, status: "pending" }

POST   /api/specialist/stories/:storyId/pages/:pageNumber/image/approve
  → updates the latest image artefact's reviewStatus to "approved"
  → updates illustrationPages[pageNumber].status to "approved"
  → appends history event { kind: "image_approved", pageNumber, version }
  → no job — synchronous Firestore update
  → returns { ok: true }

POST   /api/specialist/stories/:storyId/pages/:pageNumber/image/reject
  → body: { feedbackNote: string } (optional — stored on artefact even if blank)
  → updates the latest image artefact's reviewStatus to "needs_revision", rejectionNote: body.feedbackNote ?? null
  → updates illustrationPages[pageNumber].status to "plan_only"   (Phase 3 simple revert — Phase 4 will cascade)
  → appends history event { kind: "image_rejected", pageNumber, version, feedbackNote }
  → returns { ok: true }
```

All three gated by `requireAuth + requireRole("specialist", "admin")` + `readAndVerifyOwnership` (Phase 2 helper).

Also add to the existing `POST /api/specialist/stories/:id/transitions` handler: when `to === "illustration_ready"`, validate that **every** illustrationPage has `status === "approved"`. If not, return 409 with the list of unapproved pages. This is the gate spec §9.3 mandates.

### 2.8 Type extensions (Phase 1 types — small additions)

Add to [server/src/illustration/types/scene-plan.ts](server/src/illustration/types/scene-plan.ts):

```ts
// Optional, populated only after Stage 2 runs
stage2LLMCall?: LLMCallRecord | null;
```

Mirror in client.

**No other Phase 1 type changes** — `FinalPromptArtefact` and `ImageArtefact` are already defined. The artefact store gets new helpers but the types are stable.

### 2.9 Artefact store additions

Add to [server/src/illustration/shared/artefact-store.ts](server/src/illustration/shared/artefact-store.ts):

```ts
writeFinalPrompt(storyId, artefact)            // docId = `${pageNumber}-${version}`
readFinalPrompt(storyId, pageNumber, version)
readLatestFinalPrompt(storyId, pageNumber)
writeImage(storyId, artefact)                  // docId = `${pageNumber}-${version}`
readImage(storyId, pageNumber, version)
readLatestImage(storyId, pageNumber)
updateScenePlanStructuredPrompt(storyId, pageNumber, version, structuredPrompt, stage2LLMCall)
```

Match the existing patterns. All read-only on the client; server writes via Admin SDK.

### 2.10 Version allocators

Add to [server/src/illustration/shared/version-allocator.ts](server/src/illustration/shared/version-allocator.ts):

```ts
nextFinalPromptVersion(storyId, pageNumber): Promise<number>
nextImageVersion(storyId, pageNumber): Promise<number>
```

Same shape as `nextScenePlanVersion`.

---

## 3. Client work

### 3.1 API client

Add to [client/src/api/illustrationApi.ts](client/src/api/illustrationApi.ts):

```ts
generateImage(storyId, pageNumber): Promise<{ jobId: string }>
approveImage(storyId, pageNumber): Promise<void>
rejectImage(storyId, pageNumber, feedbackNote?: string): Promise<void>
markReadyToPublish(storyId): Promise<void>           // wraps the transition endpoint
```

### 3.2 Hook extension

Extend [useIllustrationWorkspaceState](client/src/specialist/hooks/useIllustrationWorkspaceState.ts) view model:

```ts
type WorkspaceViewModel =
  | { kind: "loading" }
  | { kind: "cta" }
  | { kind: "pending"; jobId: string }
  | { kind: "running"; jobId: string; progressHint?: string }
  | {
      kind: "ready";
      visualBibleVersion: number;
      pages: PageCardViewModel[];
      allApproved: boolean;                     // gate for the "Mark ready" button
    }
  | { kind: "failed"; jobId: string; error: string };

type PageCardViewModel = {
  pageNumber: number;
  text: string;
  scenePlanVersion: number | null;
  imageVersion: number | null;
  imageUrl: string | null;
  subStatus: "plan_only" | "generating_image" | "awaiting_review" | "approved" | "needs_revision";
  lastError: string | null;
  pendingJobId: string | null;
};
```

The hook subscribes to:
1. `stories/{id}` (existing — Phase 2)
2. `stories/{id}/illustrationJobs` ordered by enqueuedAt (existing — Phase 2)
3. **New:** `stories/{id}/images` ordered by `${pageNumber}-${version}` for the `imageUrl` and `imageVersion` per page.

Image URLs come from the `ImageArtefact.publicUrl` field — no extra fetches required.

**Sub-status derivation per page:**
- If `pendingJobId !== null` and a matching running/pending job exists → `generating_image`.
- Else if `currentImageVersion !== null` and the latest Image artefact has `reviewStatus === "awaiting_review"` → `awaiting_review`.
- Else if latest Image artefact has `reviewStatus === "approved"` → `approved`.
- Else → `plan_only` (with `lastError` populated when a prior job failed).

### 3.3 Page Card component

Files to create:

```
client/src/specialist/components/illustration/
  PageCard.tsx                                # the main component
  PageCardManuscript.tsx                      # Region 1: manuscript text (read-only)
  PageCardScenePlan.tsx                       # Region 2: human-readable scene plan + dev expandable
  PageCardImage.tsx                           # Region 3: generate / image / approve / reject
  __tests__/PageCard.test.tsx
```

**Region 1 (manuscript):** plain `<Typography variant="body1">` of `page.text`. Read-only.

**Region 2 (scene plan):** `prose`, `emotionalIntent`, `keyVisibleDetail` rendered as labeled fields. Below that, a collapsed expandable "Developer view" panel that shows `SceneDirection` and `StructuredPrompt` (when present). Read-only in Phase 3 — Phase 4 adds the regenerate buttons.

**Region 3 (image):**
- **`plan_only`** (no image yet): show a placeholder + "Generate" button. Click calls `generateImage(...)`, button disables, sub-status flips to `generating_image` via subscription.
- **`generating_image`**: show a spinner + "Generating illustration…" + the job's `progressHint` if available.
- **`awaiting_review`**: show the image + Approve / Reject buttons. Reject opens a small modal asking for an optional feedback note.
- **`approved`**: show the image + green check + version label. No buttons (Phase 4 adds "reopen").
- **`needs_revision`** (after Phase 3 reject): identical to `plan_only` since Phase 3 simple-reverts on reject. Display the rejection note above the "Generate" button.

### 3.4 Workspace integration

Update [IllustrationsTabV2.tsx](client/src/specialist/components/illustration/IllustrationsTabV2.tsx):

- In the `ready` panel state, render a list of `<PageCard>` (sorted by pageNumber).
- Add a sticky footer bar with **"Mark as ready to publish"** button.
  - Disabled when `!allApproved`.
  - Click opens a confirmation dialog: "All N pages are approved. Mark this story ready to publish?"
  - On confirm, calls `markReadyToPublish(storyId)`.
- After successful transition, the panel re-renders as the `illustration_ready` view (existing).

### 3.5 Existing `IllustrationsTab.tsx`

Should already just delegate to `IllustrationsTabV2.tsx` (Phase 2 changed this). Verify still works; no edits expected.

---

## 4. Firestore

### 4.1 Rules

Add to [firestore.rules](firestore.rules) under `match /stories/{storyId}`:

```
match /finalPrompts/{fpId} {
  allow read: if isSpecialistOrAdmin()
    && (isAdmin() || get(/databases/$(database)/documents/stories/$(storyId)).data.ownerUid == request.auth.uid);
  allow write: if false;
}

match /images/{imageId} {
  allow read: if isSpecialistOrAdmin()
    && (isAdmin() || get(/databases/$(database)/documents/stories/$(storyId)).data.ownerUid == request.auth.uid);
  allow write: if false;
}
```

Same pattern as the Phase 2 subcollections. All writes via Admin SDK only.

### 4.2 Indexes

Add to [firestore.indexes.json](firestore.indexes.json):

```json
{
  "collectionGroup": "finalPrompts",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "pageNumber", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "images",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "pageNumber", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
}
```

### 4.3 Storage rules

Update [storage.rules](storage.rules) if not already covered. The `specialist-illustrations/{storyId}/...` prefix needs:
- Public read (the public URL is embedded on the artefact and rendered in the workspace).
- No write from clients — Admin SDK only.

Verify the existing rule covers this prefix; add a section if not.

---

## 5. Test plan

### 5.1 Unit tests (new)

| File | Cases |
|---|---|
| `stage2-prompt-engineer/__tests__/prompt-builder.test.ts` | System prompt mentions Haiku-style brevity. User prompt includes Visual Bible character anchor + Scene Plan director fields. No mention of reference images. |
| `stage2-prompt-engineer/__tests__/output-parser.test.ts` | Parses valid JSON. Throws on missing fields. Throws on metaphor flags. |
| `stage2-prompt-engineer/__tests__/validator.test.ts` | Accepts valid 5-section structured prompt. Rejects empty fields. Rejects metaphor words ("like a butterfly"). |
| `stage3-final-prompt/__tests__/index.test.ts` | Snapshot test on the assembled string. Char-count warning threshold. Section ordering. No reference-image text leaks. |
| `stage4-image-generation/__tests__/index.test.ts` | Calls provider once with expected params + seed range. Uploads to storage at versioned path. Returns ImageArtefact with reviewStatus: "awaiting_review". |
| `worker/__tests__/handlers.test.ts` (extend) | `image_generation` handler invokes `generateImage`, updates job to succeeded with outputRefs. Failure path marks job failed. |

### 5.2 Integration / E2E

Real integration test (mocked Anthropic + mocked Seedream + Firestore emulator) under `server/src/__tests__/generateImage.e2e.test.ts`:

1. Seed a story in `illustration_workspace` with a Visual Bible + Scene Plan in Firestore emulator.
2. Mock `callClaude` to return a canned structured prompt JSON.
3. Mock `SeedreamProvider.generateImage` to return a small PNG buffer + metadata.
4. Mock Firebase Storage to capture upload.
5. Call `generateImage({ storyId, pageNumber, uid })` directly.
6. Assert:
   - Scene Plan doc updated with `structuredPrompt` and `stage2LLMCall`.
   - FinalPromptArtefact doc written at `${pageNumber}-${version}`.
   - ImageArtefact doc written, `reviewStatus: "awaiting_review"`.
   - Story.illustrationPages[i].status === "awaiting_review", currentImageVersion === 1.
   - editHistory has an `image_generated` event.

### 5.3 Client tests

Extend [IllustrationsTabV2.test.tsx](client/src/specialist/components/illustration/__tests__/IllustrationsTabV2.test.tsx) and add:
- `PageCard` renders correct region for each sub-status.
- Generate button click calls the API + disables during pending.
- Approve/Reject buttons appear only in `awaiting_review`.
- "Mark as ready to publish" disabled when not all approved.

### 5.4 Manual test (v2 minimum viable pipeline)

The spec defines this as the Phase 3 verification:

1. Start server (`npm run dev`) + client.
2. Pick an approved story from `experiments/test-set.json`.
3. Open the Illustrations tab.
4. Click "Open workspace" → wait for Phase 2 Stage 1a+1b job → workspace renders.
5. Click "Generate" on page 1. Wait. Approve.
6. Repeat for every page.
7. Click "Mark as ready to publish". Confirm.
8. Verify the story status flips to `illustration_ready`. Page cards become read-only.

**This is the minimum viable v2 pipeline.** Phases 4+ add feedback-driven regeneration, VB editing, debug panels, publish bridge — all of which assume Phase 3 works.

---

## 6. Explicit non-goals (defer to Phase 4+)

- ❌ Feedback note → LLM-rewritten scene plan (Phase 4).
- ❌ Per-page "Regenerate scene plan" / "Regenerate with feedback" buttons (Phase 4).
- ❌ Visual Bible editing UI (Phase 5).
- ❌ Developer debug panels (Phase 5).
- ❌ Per-page version history dropdown (Phase 4).
- ❌ Cancellation flow for in-flight image jobs (Phase 6 — best-effort only).
- ❌ Image safety / age-appropriateness check (Phase 6 stub; v3.0 classifier).
- ❌ Publishing to `story_templates` (Phase 6 — bridges illustration_ready to public).
- ❌ Multi-instance worker correctness — pilot remains single-instance per Render service.

---

## 7. PR checklist (paste into PR description)

```
Phase 3 — Page cards + image generation

Server: Stage 2 (Prompt Engineer)
- [ ] stage2-prompt-engineer/{index,prompt-builder,output-parser,validator}.ts
- [ ] Unit tests for parser, builder, validator
- [ ] ScenePlanArtefact gains stage2LLMCall field (server + client)
- [ ] artefact-store.updateScenePlanStructuredPrompt

Server: Stage 3 (Final Prompt Assembly)
- [ ] stage3-final-prompt/index.ts as pure function
- [ ] Snapshot test on assembled prompt
- [ ] writeFinalPrompt / readFinalPrompt / readLatestFinalPrompt
- [ ] nextFinalPromptVersion

Server: Stage 4 (Image Generation)
- [ ] stage4-image-generation/{index,storage}.ts
- [ ] Provider call uses v2 signature (no referenceImage from specialist path)
- [ ] Retry: 2x with exponential backoff
- [ ] Versioned storage path: specialist-illustrations/{storyId}/p{n}-v{ver}.{ext}
- [ ] writeImage / readImage / readLatestImage
- [ ] nextImageVersion

Server: SeedreamProvider v2
- [ ] generateImage signature: textPrompt, seed (required), outputWidth, outputHeight
- [ ] referenceImage kept for caregiver flow only (commented)
- [ ] Test: Stage 4 does NOT pass referenceImage

Server: orchestrator + worker
- [ ] orchestrator/generateImage.ts
- [ ] worker/handlers.ts: image_generation handler implemented
- [ ] Heartbeat update awaited (Phase 2 review fix)

Server: routes
- [ ] POST /pages/:n/image (enqueues job)
- [ ] POST /pages/:n/image/approve
- [ ] POST /pages/:n/image/reject
- [ ] POST /transitions gated: illustration_workspace → illustration_ready requires all approved

Client
- [ ] api/illustrationApi.ts: generateImage, approveImage, rejectImage, markReadyToPublish
- [ ] useIllustrationWorkspaceState extended with per-page view model
- [ ] PageCard + 3 sub-region components
- [ ] IllustrationsTabV2 renders page list + sticky footer

Firestore
- [ ] Rules for finalPrompts + images subcollections
- [ ] Indexes for both collection groups
- [ ] Storage rules cover specialist-illustrations/ prefix

Tests
- [ ] Stage 2 unit tests (3 files)
- [ ] Stage 3 snapshot + ordering test
- [ ] Stage 4 + provider + storage tests
- [ ] Worker handler test for image_generation
- [ ] E2E: seed → generate → assert all artefacts written

Manual verification
- [ ] Open workspace on test-set story
- [ ] Generate every page, approve every page
- [ ] Mark ready → status flips to illustration_ready
- [ ] No regression in caregiver preview/full-story flows (referenceImage still works there)
```

---

## 8. Estimated shape

One PR. ~25–35 files changed. +2,500 / −150 LOC. Mostly new code — minimal edits to Phase 2 outputs (`handlers.ts`, `illustration-worker-impl.ts` heartbeat fix, `IllustrationsTabV2.tsx`, types in `scene-plan.ts`).

Suggested single commit message structure:

```
feat(illustration): Phase 3 — Stage 2/3/4, page cards, image generation

The v2 minimum viable pipeline. Specialist can now drive a story from
approved manuscript to illustration_ready end-to-end:

  approved
    → illustration_workspace                 (Phase 2 lands the workspace)
    → per-page generate (Stage 2 → 3 → 4)    (this PR)
    → per-page approve                       (this PR)
    → mark ready                             (this PR)
    → illustration_ready                     (gated on all pages approved)

[then per-area bullets]

Spec: docs/illustration/spec.md §11.3–5, §12.2, §17, §20 Phase 3.
```

---

## 9. What Phase 4 unlocks

Phase 4 builds on Phase 3 with feedback-driven regeneration:
- Reject with feedback note → enqueue `image_regen` job → cascade Stage 1b (scene plan rewrite using feedback) → 2 → 3 → 4.
- Per-page Scene Plan "Regenerate" and "Regenerate with feedback" buttons (without rejecting an image).
- Version-history dropdown on page cards.

None of those require Phase 3 types to change — they're additive. If Phase 3 ships with stable artefact shapes, Phase 4 is pure handler + UI work.
