# Phase 6 — Polish + publish bridge

> **Goal.** Close the loop from approved illustrations to a public, purchasable book. Today (Phase 5) the workflow stops at `illustration_ready`. Phase 6 wires the `illustration_ready → published` transition into the existing `story_templates` collection that the public site reads, gives the specialist a final "approval preview" using the public `BookReader` component, lands cancellation, an image safety-flag stub, and moves the spec into the canonical docs index.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §11.5 (safety flag mention), §15.4 (cancellation), §20 Phase 6.
>
> **Branch.** `feat/illustration-v2-phase6` off `feat/illustration-v2` after Phase 5 lands on the integration branch.

---

## 0. Phase 5 review — what to lean on and what to fix

Phase 5 cleanly delivered the spec §10.1 / §12.3 / §13 / §14.2 set:

- **`patchVisualBible` orchestrator** with field-level merge + no-text auto-prepend + transactional Story update + `visual_bible_edited` history event ([patchVisualBible.ts:169-241](server/src/illustration/orchestrator/patchVisualBible.ts))
- **No-text constraint** auto-prepends `MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID` when the user submission would drop it ([patchVisualBible.ts:29-42](server/src/illustration/orchestrator/patchVisualBible.ts))
- **Validation rules** match the plan spec: characterAnchor ≤240, palette ≥3 entries, environmentRegistry per-entry atmosphere+spatialLayout, consistencyAnchors 4-6 words warning ([patchVisualBible.ts:44-91](server/src/illustration/orchestrator/patchVisualBible.ts))
- **`regenerateVisualBible` orchestrator** calls Stage 1a in isolation; sets `parentVersion` linking artefact versions ([regenerateVisualBible.ts:50-65](server/src/illustration/orchestrator/regenerateVisualBible.ts))
- **Worker handler** for `visual_bible_regen` ([handlers.ts:143-162](server/src/illustration/worker/handlers.ts))
- **Routes**: `PATCH /visual-bible`, `POST /visual-bible/regenerate`, `GET /visual-bible`, `GET /visual-bible/versions` ([stories.router.ts:1020-1035](server/src/routes/specialist/stories.router.ts))
- **EditHistoryEvent extended**: `visual_bible_edited` (with `fields`), `visual_bible_regenerated`, and a backwards-compatible optional `visualBibleVersion?: number` on `scene_plan_generated` ([story.model.ts:80-90](server/src/models/story.model.ts))
- **`useIllustrationDevPanelsGate` hook** reads role + `featureFlag.illustrationDevPanels` claim, with `ready` flag to prevent flash-deny ([useIsAdminOrDevPanelEnabled.ts](client/src/specialist/hooks/useIsAdminOrDevPanelEnabled.ts))
- **`IllustrationDebugPage`** route + flat sortable artefact table ([IllustrationDebugPage.tsx](client/src/specialist/pages/IllustrationDebugPage.tsx))
- **`VisualBibleCard`** with inline edit forms + version dropdown + regenerate confirmation ([VisualBibleCard.tsx](client/src/specialist/components/illustration/VisualBibleCard.tsx))
- **`DeveloperPanel`** with Scene Plan / Final Prompt / Image blocks, copy-to-clipboard ([DeveloperPanel.tsx](client/src/specialist/components/illustration/DeveloperPanel.tsx))
- **Operational hardening Phase 5 also landed:**
  - **`isFirestoreCompositeIndexBuilding`** detector + throttled warning ([firestore-index-errors.ts](server/src/illustration/worker/firestore-index-errors.ts)) — handles the post-deploy index-building window gracefully
  - **`reclaimStaleJobs` wraps the index query** in the building-check ([recovery.ts:11-24](server/src/illustration/worker/recovery.ts))
  - **Auth context** force-refreshes ID token to pick up `featureFlag` claims after admin updates

### Three small Phase 5 details that Phase 6 inherits

1. **`visual_bible_generated` (Phase 1) and `visual_bible_regenerated` (Phase 5) are separate event kinds.** `visual_bible_generated` only fires on the very first workspace-open VB. Phase 6 should make sure the History tab labels both kinds clearly — they're not interchangeable.

2. **`patchVisualBible` runs everything inside one Firestore transaction** ([patchVisualBible.ts:186-238](server/src/illustration/orchestrator/patchVisualBible.ts)) — including the `arrayUnion` history append. This is correct (atomicity), but it means any cascading work in Phase 6 (e.g. invalidating cached preview thumbnails) must be either inside this transaction or after it commits. Use the post-commit pattern.

3. **The `BookReader` set on the public site** ([client/src/pages/BookReaderPage.tsx](client/src/pages/BookReaderPage.tsx), [components/book/](client/src/components/book/)) consumes a `StoryTemplate`-shaped object today, not a Story directly. Phase 6's "specialist approval preview" needs to **either** project Story+approved-images into a `StoryTemplate` shape on the client, or refactor `BookReader` to accept a smaller "previewable" interface. The latter is cleaner — see §3.4.

### Two minor follow-ups Phase 5 left

- **Per-environment removal UI** in the VisualBibleCard. The card lets specialists edit existing environments; the "Add" and "Remove" buttons may or may not be fully wired — check during Phase 6 testing and patch if missing.
- **The `scene_plan_generated` event's optional `visualBibleVersion`** is populated by Phase 5's orchestrator updates. Older Phase 1-4 events stored before Phase 5 lacks the field — Phase 6's specialist-side BookReader preview doesn't depend on this, but the Developer Panel "based on VB v2" line falls back to `?? "unknown"` for older events. Defensible.

---

## 1. Acceptance criteria

Phase 6 is done when:

1. **Publish flow lands.** Specialist on a story in `illustration_ready` clicks "Publish to library". Within ~3s a `story_templates` document is written with the approved per-page images, manuscript text, cover image (page 1), preview spreads (pages 1–2), and personalization config. Story status flips `illustration_ready → published`. The public site shows the book in `AllBooksPage` immediately (live Firestore listen).
2. **Approval-preview reader.** Before "Publish to library", a specialist can click "Preview as published book" on the workspace footer. The existing public `BookReader` UI renders inline using the approved illustrations + manuscript text, exactly as caregivers will see it (sans personalization). Read-only.
3. **Cancellation flow.** In-flight `workspace_open`, `image_generation`, `image_regen`, `scene_plan_regen`, or `visual_bible_regen` jobs show a "Cancel" button on the card/banner. Click sets the job's `cancelRequested: true`; the worker checks at stage boundaries (between Stage 1a→1b, between Stage 2→3, between Stage 3→4) and aborts cleanly. Best-effort — in-flight Anthropic/Seedream calls finish, the result is discarded, the page returns to `plan_only`.
4. **Image safety-flag stub.** `ImageArtefact.safetyFlags: string[]` field added (empty array set by Stage 4 — no classifier yet). Developer Panel renders a "Safety checks" line that shows "No flags raised" for now. v3.0 will plug in a classifier that populates the array.
5. **History tab labels every Phase-2–6 event kind.** Walk the History tab against a story that went through every flow (open → generate → reject → regen → edit VB → regen VB → publish) and confirm no `Unknown event` labels appear.
6. **README + spec migrated into the docs index.** [docs/specialist-dashboard/README.md](docs/specialist-dashboard/README.md) gets an "Illustration pipeline" section linking to `docs/illustration/spec.md` plus a brief summary of the v2 architecture. The phase plan docs (1–6) stay under `docs/illustration/` as historical record.
7. **Server typecheck clean. Client typecheck clean. New tests for the publish orchestrator, cancellation worker path, and the safety-flag persistence.**
8. **Manual e2e**: pick a story in `illustration_ready`, click "Preview as published book" → BookReader renders → close → click "Publish to library" → confirmation → status becomes `published` → public homepage shows the book.

---

## 2. Server work

### 2.1 Publish orchestrator

**New file:** `server/src/illustration/orchestrator/publishStory.ts`

**Shape:**

```ts
publishStory({
  storyId: string;
  uid: string;
}): Promise<{ templateId: string }>
```

**Sequence:**

1. Read Story; verify `status === "illustration_ready"`. Reject otherwise.
2. Verify `illustrationPages` is non-empty, every page has `currentImageVersion !== null`, every approved.
3. Read all approved `ImageArtefact` docs for each page (via `readLatestImage` per page, then assert `reviewStatus === "approved"`).
4. Read the brief from `story.brief` for `ageGroup`, `language`, personalization config.
5. Build the `StoryTemplate` document (per [server/src/shared/types/storyTemplate.ts](server/src/shared/types/storyTemplate.ts)):
   - `draftId`: `storyId` (reuse — links template back to the authoring Story)
   - `briefId`: `storyId` (legacy field; both stories and templates can reference)
   - `title`: from `story.title`
   - `status`: `"approved"`
   - `primaryTopic`: derive from `brief.therapeuticArchitecture.primaryApproach` (or whatever Section 3 field is canonical)
   - `specificSituation`: from `brief.clinicalFoundation.trigger`
   - `ageGroup`: from `brief.ageAndScope.ageRange`
   - `generationConfig`: language, targetAgeGroup, length, tone, emphasis — projection from brief
   - `approvedBy`: `uid`
   - `approvedAt`: `new Date().toISOString()`
   - `revisionCount`: number of Agent 1 versions on Story (`story.agent1Versions.length`)
   - `isActive`: `true`
   - `pages`: project each approved image's `publicUrl` into a `StoryTemplatePage` — the manuscript text variants come from `story.brief.section5` (the personalization config), or from the manuscript directly if no personalization
   - `slug`: derive from title (slugify, dedup-check against existing `story_templates`)
   - `shortDescription`: TBD — derived from brief or specialist-provided at publish time (see §2.3)
   - `coverImageUrl` (legacy) + `coverImage`: the `publicUrl` of page 1's approved image
   - `previewSpreads`: an array of exactly the first 2 spreads. Each spread is `{ imageUrl, text }` from pages 1 and 2.
   - `displayTopic`: localized name for the topic
   - `isPublished`: `true`
   - `publishedAt`: server `Timestamp.now()`
   - `purchaseCount`: `0`
   - `previewPageCount`: `2` (matches `PREVIEW_SPREAD_LIMIT`)
   - `totalPageCount`: `story.pages.length`
   - `previewSentence`: omit — the existing `autoFillPreviewSentence` Firestore trigger ([server/src/functions/onStoryTemplateWrite.ts](server/src/functions/onStoryTemplateWrite.ts)) fills it on write
6. Allocate a `templateId` (Firestore auto-id) and `set` the document into the `story_templates` collection.
7. Update the Story doc: `status: "published"`, `publishedAt: Date.now()`, `publishedTemplateId: templateId` (new field — see §2.2).
8. Emit history event `{ kind: "published"; templateId; at: number }` (new event kind — see §2.2).

**Note on personalization vs. straight manuscript:** the Story's brief Section 5 (`isPersonalizable`) determines whether the published template uses pronoun-aware variants. If `false`, both `textTemplate.masculine` and `textTemplate.feminine` get the same string (the manuscript page text). If `true`, the manuscript already has masculine/feminine variants from Agent 1's output — project them. **For Phase 6, support both paths**; the pilot story can be either.

### 2.2 Type extensions

[server/src/models/story.model.ts](server/src/models/story.model.ts) — add to `Story`:

```ts
publishedAt: number | null;          // ms since epoch when published
publishedTemplateId: string | null;  // story_templates doc id
```

Mirror in [client/src/types/story.ts](client/src/types/story.ts).

Add to `EditHistoryEvent` union (server + client):

```ts
| { kind: "published"; templateId: string }
| { kind: "job_cancelled"; jobId: string; jobType: IllustrationJobType }
```

[server/src/illustration/types/job.ts](server/src/illustration/types/job.ts) — add to `IllustrationJob`:

```ts
cancelRequested?: boolean;    // set by route handler; checked by worker at stage boundaries
cancelledAt?: number | null;  // set by worker when it observes cancelRequested
```

[server/src/illustration/types/image.ts](server/src/illustration/types/image.ts) — add to `ImageArtefact`:

```ts
safetyFlags: string[];   // Phase 6: always [] from Stage 4. v3.0 classifier populates.
```

`createStoryForGeneration` factory needs `publishedAt: null, publishedTemplateId: null` in the returned object. `fillIllustrationV2DocDefaults` should also handle these as Phase 6 defaults so old docs work.

### 2.3 Publish endpoint

```
POST /api/specialist/stories/:storyId/publish
  body: {
    shortDescriptionHe?: string;
    shortDescriptionAr?: string;
    displayTopicHe?: string;
    displayTopicAr?: string;
  }
  → { templateId: string }
```

**Behavior:**

- `requireAuth + requireRole + readAndVerifyOwnership`.
- Verify status === `illustration_ready`.
- Call `publishStory({ storyId, uid })` with the body fields merged into the template document.
- Synchronous (no job) — the work is one Firestore write + one Story update. <3s.

**Why a body for descriptions:** the brief has clinical descriptions but not consumer-facing copy. The specialist adds the description at publish time in a small dialog. Alternative: pull from the brief's `creativeVision` field. Phase 6 should add the dialog because it gives the specialist last-mile control over the customer-facing copy.

### 2.4 State machine

[server/src/models/story.model.ts](server/src/models/story.model.ts) — `ALLOWED_TRANSITIONS` already has `illustration_ready → published`. Confirm. No state-machine change needed.

### 2.5 Cancellation

**Pattern:** spec §15.4 — best-effort. In-flight Anthropic/Seedream calls finish, the result is discarded, the page reverts to `plan_only`.

**Server work:**

1. `POST /api/specialist/stories/:storyId/jobs/:jobId/cancel` route. Looks up the job by ID inside the story's subcollection. If status is `pending` or `running`, sets `cancelRequested: true`. Returns `{ ok: true, status: <currentStatus> }`.
2. **Pending jobs short-circuit immediately.** The worker's `claimJob` ([claim.ts:8-17](server/src/illustration/worker/claim.ts)) reads `cancelRequested` inside the transaction and, if true, sets `status: "cancelled"` (new status — see below) and returns `false`.
3. **Running jobs check at stage boundaries.** Add a helper `checkCancellation(jobId): Promise<boolean>` that reads the job doc, returns `true` if `cancelRequested === true`. Insert calls between stages in the orchestrators:
   - `openWorkspace.ts`: after Stage 1a writes the VB, before Stage 1b runs
   - `generateImage.ts`: after each of Stage 2, 3, 4 starts
   - `cascadeAfterReject.ts`: between Stage 1b and Stage 2-4 helper
   - `regenerateScenePlan.ts`: after the LLM call returns
   - `regenerateVisualBible.ts`: after the LLM call returns
4. **On cancellation observed during run:** orchestrator throws `JobCancelledError`. Worker handler catches and updates job to `status: "cancelled"`. `markImageGenerationFailedOnStory` (or its VB equivalent) revertes the page to `plan_only` for image jobs, no-ops for VB regen.
5. **`IllustrationJobStatus` gets a new variant** `"cancelled"` — add to the union, update worker query (it already filters `status === "pending"` so won't pick up cancelled jobs, but the version-picker UI and recovery loop need to skip).

**Worker changes — new helpers:**

- `server/src/illustration/worker/cancellation.ts`:
  - `isJobCancelled(jobRef): Promise<boolean>` — reads the doc inside a read-only transaction, returns the `cancelRequested` flag.
  - Throws `JobCancelledError` for orchestrators to catch.

**Orchestrator changes:** wrap stage transitions in `await checkCancelled(jobRef)`. If cancelled, throw `JobCancelledError`.

**Handler changes:** catch `JobCancelledError` in each handler and update job to `"cancelled"` with `cancelledAt: now` and emit a `job_cancelled` history event.

### 2.6 Safety-flag stub

[server/src/illustration/stage4-image-generation/index.ts](server/src/illustration/stage4-image-generation/index.ts) — the returned `ImageArtefact` already has all required fields; add:

```ts
safetyFlags: [],
```

That's it for Phase 6. v3.0 will replace the empty array with a real classifier output.

[server/src/illustration/types/image.ts](server/src/illustration/types/image.ts) — add the field (server + client).

### 2.7 Job status visibility for cancellation UI

Add `GET /api/specialist/stories/:storyId/jobs/:jobId` — used by the cancel dialog to fetch latest job status. Server-side: direct Firestore read by `(storyId, jobId)` path. Already covered by Firestore rules (Phase 2 added rules for `illustrationJobs` subcollection).

---

## 3. Client work

### 3.1 API client

Add to [client/src/api/illustrationApi.ts](client/src/api/illustrationApi.ts):

```ts
publishStory(storyId, body: {
  shortDescriptionHe?: string;
  shortDescriptionAr?: string;
  displayTopicHe?: string;
  displayTopicAr?: string;
}): Promise<{ templateId: string }>

cancelJob(storyId, jobId): Promise<{ ok: true; status: IllustrationJobStatus }>
fetchJob(storyId, jobId): Promise<{ job: IllustrationJob }>
```

### 3.2 Publish dialog component

`client/src/specialist/components/illustration/PublishDialog.tsx`:

- Open from the workspace footer "Publish to library" button (only enabled when `status === "illustration_ready"`).
- Two-column form: Hebrew and Arabic short description + display-topic name.
- Pre-fills Hebrew/Arabic short descriptions from brief if possible (read from `brief.creativeVision`).
- "Publish" button → `publishStory(storyId, body)` → on success, close dialog, show toast, browser doesn't navigate (the Firestore subscription on story doc picks up the status change and re-renders).

### 3.3 Cancel button component

`client/src/specialist/components/illustration/CancelJobButton.tsx`:

- Renders when a `pending` or `running` job exists for the relevant scope (workspace_open, image_generation, scene_plan_regen, image_regen, visual_bible_regen).
- Click → confirmation dialog ("Cancel illustration generation? Work in progress may still complete.").
- Confirm → `cancelJob(storyId, jobId)` → button changes to "Cancelling…" until the job's status flips via subscription.

Placement:
- **Page Card**: in the `generating_image` state row, beside the spinner.
- **WorkspacePreview**: in the workspace-open running state.
- **VisualBibleCard**: when `visualBibleRegenBusy === true`.

### 3.4 Specialist approval preview (BookReader on specialist side)

**The challenge:** the existing `BookReader` consumes a `StoryTemplate`. The specialist's Story isn't yet a `StoryTemplate` until publish.

**Two options:**

**Option A — refactor `BookReader` to accept a smaller "BookReaderModel" interface.** Let `BookReader` consume:

```ts
interface BookReaderModel {
  title: string;
  pages: Array<{ pageNumber: number; text: string; imageUrl: string | null }>;
  language: "ar" | "he";
  coverImageUrl: string | null;
}
```

Update [client/src/pages/BookReaderPage.tsx](client/src/pages/BookReaderPage.tsx) and [components/book/](client/src/components/book/) to use this. Provide a `templateToReaderModel(template)` adapter for the public side, and a `storyToReaderModel(story, images)` adapter for the specialist side. **Recommended** — clean separation; public flow unchanged.

**Option B — project the Story to a `StoryTemplate` on the client just for preview.** Reuse the publish projection logic but without writing to Firestore. Brittler; the projection is non-trivial and lives on the server today.

**Take Option A.** Create:

- `client/src/components/book/BookReaderModel.ts` — the interface.
- `client/src/components/book/storyToReaderModel.ts` — adapter taking a Story + a map of latest approved ImageArtefacts → BookReaderModel.
- `client/src/specialist/components/illustration/ApprovalPreviewDialog.tsx` — wraps `BookReader` in a dialog.

Footer button: "Preview as published book" (shows for both `illustration_workspace` with all-approved and `illustration_ready`).

### 3.5 IllustrationsTabV2 footer

Update [IllustrationsTabV2.tsx](client/src/specialist/components/illustration/IllustrationsTabV2.tsx) sticky footer:

- For `illustration_workspace` + `allApproved`: "Preview as published book" (primary) + "Mark as ready to publish" (primary).
- For `illustration_ready`: "Preview as published book" + "Publish to library" (primary, opens PublishDialog).
- For `published`: read-only banner with link to the public-site URL.

### 3.6 History tab labels

Add three new event kind cases to [HistoryTab.tsx](client/src/specialist/components/HistoryTab.tsx):

```tsx
case "published":
  mainLabel = `Published to library (template: ${event.templateId.slice(0, 8)}…)`;
  break;
case "job_cancelled":
  mainLabel = `Job cancelled (${event.jobType})`;
  break;
```

(The `visual_bible_generated` and other Phase-2-5 cases already exist; just verify they all render and add anything missing during testing.)

### 3.7 Public-side homepage refresh

No work needed. The public site already lists `story_templates where isPublished == true && isActive == true` — once a template is written, the homepage shows it via the existing Firestore subscription.

### 3.8 Docs migration

- New section in [docs/specialist-dashboard/README.md](docs/specialist-dashboard/README.md): "Illustration pipeline" with a 3-paragraph summary + link to `docs/illustration/spec.md`.
- The 6 phase plans (`phase-1-plan.md` through `phase-6-plan.md`) stay where they are — they're the migration record, not specs.
- Update [CLAUDE.md](CLAUDE.md) §4.5 ("Illustration approval — in design") to point at the v2 implementation and remove the "active development" framing. Replace with "Specialist-side illustration: v2 architecture per `docs/illustration/spec.md`, all phases shipped."

---

## 4. Firestore

### 4.1 Rules

[firestore.rules](firestore.rules) — `story_templates` rules already allow specialist/admin writes ([firestore.rules:51](firestore.rules)). Phase 6's `publishStory` orchestrator uses the Admin SDK so rules don't apply, but verify the existing rules block client-side direct writes to `story_templates`.

### 4.2 Indexes

No new indexes needed. Phase 5's `illustrationJobs (status, lastHeartbeatAt)` index supports the cancellation flow's reads.

### 4.3 Storage rules

[storage.rules](storage.rules) — verify that `specialist-illustrations/{storyId}/...` is publicly readable (Phase 3 confirmed this; double-check still applies for `published` stories where the public site loads images directly).

---

## 5. Test plan

### 5.1 Unit tests

| File | Cases |
|---|---|
| `orchestrator/__tests__/publishStory.test.ts` | Story not in illustration_ready → 409. All-approved pages → `story_templates` doc written with correct field mapping. `coverImage` from page 1's approved URL. `previewSpreads` is exactly 2 entries. Story status flips to published. History event emitted. |
| `routes/__tests__/publish-routes.test.ts` | POST /publish 200 happy path. Empty body OK (no localized strings — fall back to brief). Missing fields don't break the projection. |
| `worker/__tests__/cancellation.test.ts` | Pending job with cancelRequested=true → claimJob returns false, job becomes cancelled. Running job with cancelRequested=true observed at stage boundary → orchestrator throws JobCancelledError → handler marks status="cancelled". |
| `orchestrator/__tests__/openWorkspace.cancellation.test.ts` | Cancellation observed between Stage 1a and Stage 1b → VB is written but no scene plans. Story status stays approved (workspace-open never completed). |
| `stage4-image-generation/__tests__/index.test.ts` (extend) | ImageArtefact has `safetyFlags: []`. |

### 5.2 Integration / E2E

`server/src/__tests__/publish-flow.e2e.test.ts`:

1. Seed a story in `illustration_ready` with VB v1 + 3 pages all approved.
2. Mock Firestore Storage to expose URL paths for the 3 approved images.
3. POST `/publish` with `{ shortDescriptionHe: "...", shortDescriptionAr: "..." }`.
4. Assert:
   - `story_templates/{templateId}` exists with `isPublished: true`, `isActive: true`, `pages.length === 3`.
   - `pages[0].textTemplate.masculine` and `.feminine` populated.
   - `coverImage === pages[0].publicUrl` (the approved image v1 URL).
   - `previewSpreads.length === 2` with image URLs for pages 1 and 2.
   - Story doc: `status: "published"`, `publishedAt` set, `publishedTemplateId === templateId`.
   - History has `published` event with `templateId`.

### 5.3 Manual e2e

1. Take a story through Phases 2–5 to `illustration_ready` with every page approved.
2. Click "Preview as published book" → BookReader renders with the approved images and manuscript text → close.
3. Click "Publish to library" → dialog opens → fill HE/AR descriptions → confirm.
4. Toast appears, status flips to `published`, footer becomes read-only banner.
5. Open `/he/library/all` (or wherever the public catalog lives). Confirm the new book appears.
6. Trigger a `workspace_open` job on a fresh story → during the "Generating Scene Plans (3 of 10)…" message, click Cancel → confirm. Verify job status flips to `cancelled` and Story status reverts to `approved`.

---

## 6. Explicit non-goals (deferred to v3.x)

- ❌ Real image safety classifier (Phase 6 just adds the `safetyFlags: []` field).
- ❌ Unpublish flow — `published → archived` exists in the state machine; a dedicated unpublish UI is post-pilot.
- ❌ Template variants per language (the brief's `language` field decides; multi-language is a brief-level concern, not an illustration-pipeline concern).
- ❌ Variant cover images — Phase 6 picks page 1. Specialist-uploaded cover thumbnails are post-pilot.
- ❌ Cancel multiple jobs at once.
- ❌ Resume cancelled jobs (cancellation is terminal in Phase 6).
- ❌ Migration of pre-v2 illustration data (none exists — v1 pipeline was never published).

---

## 7. PR checklist (paste into description)

```
Phase 6 — Polish + publish bridge

Server
- [ ] publishStory orchestrator: project Story + approved images → StoryTemplate doc
- [ ] POST /:storyId/publish endpoint (with optional localized descriptions)
- [ ] Story type: publishedAt, publishedTemplateId; factory defaults
- [ ] EditHistoryEvent: published, job_cancelled
- [ ] ImageArtefact.safetyFlags: [] populated at Stage 4
- [ ] IllustrationJob.cancelRequested + cancelledAt fields
- [ ] IllustrationJobStatus gains "cancelled"
- [ ] Worker checkCancellation helper + JobCancelledError
- [ ] Stage-boundary cancellation checks in openWorkspace, generateImage, cascadeAfterReject, regenerateScenePlan, regenerateVisualBible
- [ ] POST /:storyId/jobs/:jobId/cancel endpoint
- [ ] GET /:storyId/jobs/:jobId endpoint (status read)

Client
- [ ] api/illustrationApi: publishStory, cancelJob, fetchJob
- [ ] PublishDialog component
- [ ] CancelJobButton component (used in PageCard, WorkspacePreview, VisualBibleCard)
- [ ] BookReaderModel interface + storyToReaderModel adapter
- [ ] templateToReaderModel adapter for public side
- [ ] BookReader refactored to consume BookReaderModel (public BookReaderPage unchanged externally)
- [ ] ApprovalPreviewDialog wrapping BookReader on the specialist side
- [ ] IllustrationsTabV2 footer: Preview button, Publish button (state-gated)
- [ ] HistoryTab cases for published, job_cancelled
- [ ] lastActivitySummary verbs for new events
- [ ] Update CLAUDE.md §4.5 to reflect v2 shipped

Tests
- [ ] publishStory unit tests
- [ ] /publish route tests
- [ ] cancellation worker test
- [ ] openWorkspace cancellation E2E
- [ ] Stage 4 safetyFlags field
- [ ] Full publish E2E: seed → publish → assert template + story doc + history

Docs
- [ ] docs/specialist-dashboard/README.md: add "Illustration pipeline" section
- [ ] CLAUDE.md updated

Manual
- [ ] Preview as published book renders correctly
- [ ] Publish dialog → template appears in public catalog
- [ ] Cancel job during workspace_open returns story to approved
- [ ] No 'Unknown event' labels in History tab on a fully-exercised story
```

---

## 8. Estimated shape

One PR. ~25–30 files changed. +1,800 / −150 LOC.

- **Server**: ~+600 LOC (publishStory orchestrator + cancellation worker plumbing + new endpoints + type additions).
- **Client**: ~+900 LOC (PublishDialog, CancelJobButton, BookReader refactor + adapters, ApprovalPreviewDialog, footer state machine).
- **Tests + docs**: ~+300 LOC.

Suggested commit message structure:

```
feat(illustration): Phase 6 — polish + publish bridge

Closes the v2 illustration pipeline. Specialists can now publish to
the public library directly from the workspace, preview as published
book via the existing BookReader, and cancel in-flight jobs at stage
boundaries. Image safety-flag stub added at Stage 4 (classifier in v3).

[then per-area bullets]

Spec: docs/illustration/spec.md §11.5, §15.4, §20 Phase 6.
```

---

## 9. What's next after Phase 6

**v3.0 / post-pilot:**
- Real image safety classifier replacing the `safetyFlags: []` stub.
- Cloud Functions or Cloud Tasks worker (replace the in-process polling worker per spec §15.2).
- Aspect-ratio variants and per-spread layouts beyond 1024×1024.
- Per-language template variants.
- Bulk operations (regenerate-all-stale, publish-all-approved).
- Specialist-uploaded cover thumbnail override.
- "Reopen for edits" flow on `published` stories (currently terminal except via archive).

**v3.1 / scale concerns:**
- Multi-instance worker safety (the spec called this out — pilot is single-instance).
- Production observability: pipe job lifecycle to Datadog/Sentry (spec §16).
- Cancellation aware of in-flight provider calls (e.g. Anthropic prefix-cache eviction).
