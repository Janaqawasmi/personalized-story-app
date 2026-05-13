# Phase 5 — Visual Bible editing + developer panels

> **Goal.** Make the Visual Bible specialist-editable, and give admins/devs forensic visibility into every artefact. Today, the VB is set by Stage 1a at workspace-open time and never touched again. Phase 5 lets the specialist tune `characterAnchor`, `styleGuide`, `palette`, `environmentRegistry`, `avoidList`, `consistencyAnchors` directly — each edit produces a new VB version, with `source: "specialist_edited"`. Page cards show a banner when their Scene Plan is based on a stale VB version. Plus: admin-gated developer panels on each page card and a flat per-story debug page.
>
> **Reference.** [docs/illustration/spec.md](docs/illustration/spec.md) §10.1 (VB shape + provenance), §12.3 (VB editing UX), §13 (developer/observability), §14.2 (VB API), §20 Phase 5.
>
> **Branch.** `feat/illustration-v2-phase5` off `feat/illustration-v2` after Phase 4 lands on the integration branch.

---

## 0. Phase 4 review — what to lean on and what to fix

Phase 4 is solid. Plan deliverables landed:

- **Stage 1b regen** with `buildScenePlannerRegenPrompt` carrying prior plan + feedback ([stage1-scene-planner/prompt-builder.ts:87-119](server/src/illustration/stage1-scene-planner/prompt-builder.ts))
- **`runScenePlannerForPage`** implemented (was Phase 4 stub) — sets `parentVersion` to the previous version and `feedbackNote` on the new artefact ([stage1-scene-planner/index.ts:35-94](server/src/illustration/stage1-scene-planner/index.ts))
- **Two orchestrators**: `regenerateScenePlan.ts` for the standalone button and `cascadeAfterReject.ts` for full 1b→2→3→4 ([regenerateScenePlan.ts](server/src/illustration/orchestrator/regenerateScenePlan.ts), [cascadeAfterReject.ts](server/src/illustration/orchestrator/cascadeAfterReject.ts))
- **`runStage2Through4` helper extracted** from `generateImage.ts` and reused by `cascadeAfterReject` — no duplication ([generateImage.ts:59](server/src/illustration/orchestrator/generateImage.ts))
- **Worker handlers** for `scene_plan_regen` and `image_regen` ([handlers.ts:80-140](server/src/illustration/worker/handlers.ts))
- **Routes**: `POST /pages/:n/scene-plan/regenerate`, `GET /pages/:n/history`, and the changed `POST /pages/:n/image/reject` that now enqueues `image_regen` and returns `{ jobId, status }` ([stories.router.ts:703-867](server/src/routes/specialist/stories.router.ts))
- **Phase 3 destructive null fixed**: reject no longer sets `currentImageVersion: null`; the image artefact stays reachable via `images` subcollection so the version picker works ([stories.router.ts:765-770](server/src/routes/specialist/stories.router.ts))
- **Client**: `PageCardVersionPicker` dropdown + `PageCardComparisonModal` side-by-side compare ([PageCardVersionPicker.tsx](client/src/specialist/components/illustration/PageCardVersionPicker.tsx), [PageCardComparisonModal.tsx](client/src/specialist/components/illustration/PageCardComparisonModal.tsx))
- **Hook subscribes to scenePlans subcollection** (Phase 4 addition) and derives `versionCount`, `imageVersionsDesc`, `scenePlanRegenBusy`, and the latest-rejection-note thumbnail ([useIllustrationWorkspaceState.ts:215-235, 103-127](client/src/specialist/hooks/useIllustrationWorkspaceState.ts))

### Smart Phase 4 details worth calling out

1. **`expectedPendingJobId` on cascade.** [cascadeAfterReject.ts:85-87](server/src/illustration/orchestrator/cascadeAfterReject.ts) — the transactional update asserts that the page's `pendingJobId` still matches the job currently executing. If a second reject squeezed in between (race), the second cascade refuses to clobber the first. This is the right pattern; reuse in Phase 5 where VB regen meets in-flight per-page work.

2. **Worker-side regen idempotency keys** rotate per scene plan version (`...sp${currentScenePlanVersion}`) and per image version (`...sp${...}:img${...}`). Re-clicking Reject mid-flight returns the same job ID via the existing-job lookup. No double work.

3. **Thumb-for-rejected** logic in `buildPageCards`: when an image's `reviewStatus === "needs_revision"` but it's the latest version, the card still shows the rejected image (greyed via UI state) instead of going blank. Specialist gets visual context for the "Reject" they just did. Nice.

### Three Phase 4 details Phase 5 must work around

1. **Edit-history events do not include `visual_bible_edited` or `visual_bible_regenerated` kinds.** Phase 1 added `visual_bible_generated` only. Phase 5 needs new variants on the `EditHistoryEvent` union — server + client. Recommend:
   ```ts
   | { kind: "visual_bible_edited"; version: number; fields: string[] }
   | { kind: "visual_bible_regenerated"; version: number }
   ```
   The `fields` array lets the History tab show what changed without storing the whole diff.

2. **`buildScenePlannerRegenPrompt` does not currently flag the VB version it's about to use.** When the specialist regenerates a scene plan after editing the VB, the prompt will pick up the new VB automatically (because `regenerateScenePlan` reads the latest via `currentVisualBibleVersion`). That's correct behavior, but the **history event doesn't record which VB version was the input**. Phase 5 should add `visualBibleVersion: number` to `scene_plan_generated` events so the dev panel can show "based on VB v3".

3. **Spec §14.2 calls for a synchronous PATCH endpoint** (no job). VB edits are pure-text Firestore updates; no Stage 1a LLM call. But VB regenerate (POST `/visual-bible/regenerate`) is asynchronous via a new job type. Phase 5 needs **both** code paths.

### One Phase 4 concern that informs Phase 5

**`cascadeAfterReject` reads the latest VB at the moment the job runs**, not at the moment the user clicked Reject ([cascadeAfterReject.ts:51-59](server/src/illustration/orchestrator/cascadeAfterReject.ts)). If the specialist (a) clicks Reject, then (b) edits the VB while the regen job is pending, the cascade uses the new VB. Probably the desired behavior — the user's "intent" is the latest configuration. But worth noting and documenting in Phase 5: any page card with a pending regen job should show "Visual Bible changed since this regen was queued" if the user edits the VB mid-flight.

---

## 1. Acceptance criteria

Phase 5 is done when:

1. **VB editing.** Specialist clicks "Edit" on the Visual Bible card at the top of the workspace. Each editable field (per spec §12.3) becomes an inline form. Save creates a new VB version with `source: "specialist_edited"`. The Story's `currentVisualBibleVersion` updates.
2. **VB regenerate.** A "Regenerate Visual Bible" button enqueues a `visual_bible_regen` job that runs Stage 1a in isolation (no Stage 1b cascade). Confirmation dialog: "This produces a new Visual Bible version; per-page scene plans become stale (banner appears). Continue?"
3. **Stale-VB banner.** Each page card whose latest Scene Plan's `visualBibleVersion < currentVisualBibleVersion` shows a small inline banner: "Visual Bible has changed since this scene plan was generated. [Regenerate scene plan]". Clicking the link calls the Phase 4 `POST /pages/:n/scene-plan/regenerate` (no feedback note).
4. **VB version history.** A dropdown next to the Edit button lists prior VB versions with `source` and `createdAt`. Read-only — Phase 5 does not include "revert VB to v1" because that's a cascade-explosion problem (every scene plan would silently go stale).
5. **Developer panels on each Page Card.** An expandable "Developer" section (admin-only) at the bottom of every Page Card, with the four blocks from spec §13: Scene Plan, Structured Prompt, Final Image-Model Prompt, Image.
6. **Per-story debug page.** A new admin-only route `/specialist/stories/:id/illustration/debug` showing a flat table of every artefact across every page.
7. **Role gating works correctly.** Developer panels and the debug page are invisible to non-admin specialists. Admins see both. The new `featureFlag.illustrationDevPanels` custom claim path is recognized but defaults off for the pilot.
8. **History tab shows VB events.** Two new event kinds (`visual_bible_edited`, `visual_bible_regenerated`) render in the History tab and the last-activity-summary maps. The existing `scene_plan_generated` event gains a `visualBibleVersion: number` field so the dev panel can show "Scene Plan v3 based on VB v2".
9. **Server typecheck clean. Client typecheck clean. Tests for the PATCH/regenerate endpoints, the stale-VB banner trigger, and the dev panel role gating.**
10. **Manual e2e**: open workspace, edit `characterAnchor`, save → VB v2 created → page 1's card shows the stale banner → click "Regenerate scene plan" → scene plan v2 is based on VB v2 → banner disappears.

---

## 2. Server work

### 2.1 Type extensions

Add to [server/src/models/story.model.ts](server/src/models/story.model.ts) `EditHistoryEvent` union (mirror in client):

```ts
| { kind: "visual_bible_edited"; version: number; fields: string[] }
| { kind: "visual_bible_regenerated"; version: number }
```

Update the existing `scene_plan_generated` variant to carry the input VB version:

```ts
| { kind: "scene_plan_generated"; pageNumber: number; version: number; withFeedback: boolean; visualBibleVersion: number }
```

Phase 4 orchestrators must be touched to populate this new field — `regenerateScenePlan.ts:97-105` and `cascadeAfterReject.ts:96-106` and `openWorkspace.ts:114-123`. Three small edits; the `visualBibleVersion` is already in scope.

**Client mirror:** [client/src/types/story.ts](client/src/types/story.ts) `EditHistoryEvent` union — same additions.

**`IllustrationJob` type:** add `"visual_bible_regen"` to `IllustrationJobType` union ([server/src/illustration/types/job.ts](server/src/illustration/types/job.ts) and the client mirror).

### 2.2 Visual Bible PATCH endpoint (synchronous)

Add to [stories.router.ts](server/src/routes/specialist/stories.router.ts):

```
PATCH /api/specialist/stories/:storyId/visual-bible
  body: {
    characterAnchor?: string;
    characterSheet?: string;
    styleGuide?: string;
    palette?: string;
    consistencyAnchors?: string[];
    avoidList?: string[];
    environmentRegistry?: Record<string, EnvironmentEntry>;
  }
  → { artefact: VisualBibleArtefact, version: number }
```

**Behavior (synchronous — no job):**

1. `requireAuth + requireRole + readAndVerifyOwnership`. Reject if `story.status !== "illustration_workspace"`.
2. Read the current VB artefact via `readVisualBible(storyId, story.currentVisualBibleVersion)`.
3. Build the new content by merging body fields into the current artefact's content. Validate:
   - `characterAnchor`: non-empty, ≤ 240 chars.
   - `styleGuide`: non-empty.
   - `palette`: comma-separated, ≥ 3 entries after split.
   - `consistencyAnchors`: array, 3–5 entries, each 4–6 words (warning, not hard reject).
   - `avoidList`: array, ≥ 1 entry; **item [0] must contain "text" and "no" or "no-text"** to preserve the mandated no-text constraint. If the specialist's edit removes it, server prepends the default `NO_TEXT_LEAD` to the list.
   - `environmentRegistry`: each entry has both `atmosphere` and `spatialLayout` non-empty.
4. Allocate `nextVisualBibleVersion(storyId)`.
5. Build the new `VisualBibleArtefact`:
   ```ts
   {
     id: randomUUID(),
     storyId,
     version: newVersion,
     createdAt: Date.now(),
     createdBy: { kind: "specialist", uid: ownerUid },
     parentVersion: currentVbVersion,
     source: "specialist_edited",
     llmCall: null,
     // ...merged content fields
   }
   ```
6. `writeVisualBible(storyId, newArtefact)`.
7. Transactional Story update: `currentVisualBibleVersion: newVersion`, `updatedAt: now`.
8. Append history event `{ kind: "visual_bible_edited", version: newVersion, fields: [<keys present in body>] }`.
9. Return the new artefact.

**Why synchronous:** no LLM call, no expensive work. The specialist sees the result immediately. Race protection: the transactional Story update means a concurrent VB regen job can detect the change and refuse.

### 2.3 Visual Bible regenerate endpoint (async via job)

```
POST /api/specialist/stories/:storyId/visual-bible/regenerate
  → { jobId, status: "pending" }
```

**Behavior:** identical pattern to Phase 2 `workspace_open`:
- Enqueue `visual_bible_regen` job with idempotency key `${storyId}:visual_bible_regen:vb${currentVisualBibleVersion}`.
- Worker handler runs Stage 1a only (not Stage 1b).
- Writes new VB version, updates Story doc, appends `visual_bible_regenerated` event.

**New orchestrator file:** `server/src/illustration/orchestrator/regenerateVisualBible.ts`. Mirror the shape of `regenerateScenePlan.ts`.

**New worker handler** in [handlers.ts](server/src/illustration/worker/handlers.ts):

```ts
async function handleVisualBibleRegen(job, jobRef): Promise<void> {
  const result = await regenerateVisualBible({ storyId: job.storyId, uid: job.enqueuedBy });
  await jobRef.update({
    status: "succeeded",
    completedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    outputRefs: { vbId: result.vbId, version: String(result.version) },
    error: null,
  });
}

export const handlers = {
  workspace_open: handleWorkspaceOpen,
  scene_plan_regen: handleScenePlanRegen,
  image_generation: handleImageGeneration,
  image_regen: handleImageRegen,
  visual_bible_regen: handleVisualBibleRegen,   // new
};
```

**Stage 1a reuse:** the existing `runVisualDirector` function already produces a `VisualBibleArtefact` with `source: "llm_generated"`. The orchestrator just needs to call it with the current manuscript, allocate the next version, and write. Same shape as Phase 2's `openWorkspace.ts:95-104` — extract this into a shared helper or just inline.

### 2.4 VB version history endpoint

```
GET /api/specialist/stories/:storyId/visual-bible/versions
  → { versions: VisualBibleArtefact[] }
```

Add to [artefact-store.ts](server/src/illustration/shared/artefact-store.ts):

```ts
listVisualBibleVersions(storyId: string): Promise<VisualBibleArtefact[]>
```

Direct subcollection read, `orderBy("version", "desc")`. No new index needed — Phase 2's existing primary-key ordering covers this query.

### 2.5 VB single-version fetch

```
GET /api/specialist/stories/:storyId/visual-bible
  → { artefact: VisualBibleArtefact, version: number }
```

Returns the current version (already accessible via existing collection subscription on the client, but a REST surface is in the spec — supports the version-picker dropdown in the VB card).

### 2.6 Routes summary (additions)

Phase 5 adds 3 new endpoints:

| Method | Path | Sync/Async | Returns |
|---|---|---|---|
| `PATCH` | `/:storyId/visual-bible` | sync | new `VisualBibleArtefact` |
| `POST` | `/:storyId/visual-bible/regenerate` | async (job) | `{ jobId, status }` |
| `GET` | `/:storyId/visual-bible/versions` | sync | `{ versions: VisualBibleArtefact[] }` |

(Plus the `GET /:storyId/visual-bible` if it doesn't already exist — verify Phase 3/4 didn't add this; if not, add it for completeness with the version history endpoint.)

### 2.7 Race-condition handling

Three races to think about:

1. **Specialist edits VB while a scene plan regen is in flight.** Phase 4's `cascadeAfterReject` and `regenerateScenePlan` read the VB at job-execution time, so the job picks up the latest VB. Document in the Phase 5 PR description that this is intentional ("user intent is the latest VB").

2. **Two simultaneous PATCH requests on VB.** The transactional Story update on `currentVisualBibleVersion` protects against lost updates. If two PATCH requests land at exactly the same time, both write new VB artefact docs (different versions because `nextVisualBibleVersion` allocates atomically), and the transactional `currentVisualBibleVersion` flip resolves which becomes current. The losing PATCH still produces a valid orphan artefact — visible in the history dropdown — and the specialist's UI re-renders to show the winning version. Acceptable.

3. **VB regenerate job runs while specialist is editing.** The regenerate worker reads the manuscript at job-run time. If the specialist's PATCH lands first (allocating VB v3 by edit), the regen job will produce VB v4. If the regen runs first (v3), the PATCH will overlap. Either way, both artefacts are saved and the user sees the latest one. **No correctness issue**, just possibly confusing — Phase 5 can show a "Regenerate cancelled by edit" toast if the user edits while a regen job is pending, but this is polish, not a requirement.

### 2.8 The mandated no-text constraint

`avoidList[0]` is the mandated no-text constraint per Phase 1 spec. The PATCH validator (§2.2 step 3) must:

1. Either accept the specialist's first entry IF it contains the keywords `no text`, `text`, `letters`, `wordless`, or
2. Auto-prepend the default `NO_TEXT_LEAD` string and shift the user's first entry to position 1.

Recommend option 2 — strict validation gets annoying; auto-prepend keeps the constraint immutable from the user's perspective. Log a warning at the API level if the user's submission would have dropped the constraint.

---

## 3. Client work

### 3.1 API client

Add to [client/src/api/illustrationApi.ts](client/src/api/illustrationApi.ts):

```ts
patchVisualBible(storyId, fields): Promise<{ artefact: VisualBibleArtefact, version: number }>
regenerateVisualBible(storyId): Promise<{ jobId: string }>
fetchVisualBibleVersions(storyId): Promise<{ versions: VisualBibleArtefact[] }>
fetchVisualBible(storyId): Promise<{ artefact: VisualBibleArtefact, version: number }>  // current
```

### 3.2 Hook extension

Extend [useIllustrationWorkspaceState.ts](client/src/specialist/hooks/useIllustrationWorkspaceState.ts):

- Subscribe to `stories/{id}/visualBibles` (`onSnapshot`) and expose:
  - `currentVisualBible: VisualBibleArtefact | null`
  - `visualBibleVersionsDesc: VisualBibleArtefact[]`
- Per page-card view model adds:
  - `scenePlanVisualBibleVersion: number` — read from the page's latest scene plan
  - `visualBibleIsStale: boolean` — `scenePlanVisualBibleVersion < currentVisualBibleVersion`
  - `scenePlanRegenJobActive: boolean` — already exists in Phase 4 (rename if Phase 4 used a different name)

Active VB regen state at the workspace level:

```ts
type WorkspaceViewModel = (
  | { kind: "loading" }
  | { kind: "cta" }
  | { kind: "pending"; jobId: string }
  | { kind: "running"; jobId: string; progressHint?: string }
  | {
      kind: "ready";
      visualBibleVersion: number;
      visualBible: VisualBibleArtefact;            // new — full artefact for the card
      visualBibleVersionsDesc: VisualBibleArtefact[]; // new — for dropdown
      visualBibleRegenJob: IllustrationJob | null; // new — drives loading state on the VB card
      pages: PageCardViewModel[];
      allApproved: boolean;
      readOnly: boolean;
    }
  | { kind: "failed"; jobId: string; error: string }
);
```

### 3.3 New: `VisualBibleCard.tsx`

Drop-in replacement for whatever Phase 2 rendered at the top of the workspace ([WorkspacePreview.tsx](client/src/specialist/components/illustration/WorkspacePreview.tsx) is currently doing some of this).

**Layout (collapsed by default):**
- Header row: "Visual Bible (v3)" · version-picker dropdown · "Edit" button · "Regenerate Visual Bible" button (with confirmation dialog).
- Below: read-only summary — character anchor, style guide one-liner, palette swatches.

**Edit mode (per spec §12.3):**
- `characterAnchor` — textarea, 240-char counter.
- `characterSheet` — textarea, larger.
- `styleGuide` — textarea.
- `palette` — chip list with add/remove; show colour swatch per entry where parseable.
- `environmentRegistry` — accordion per key, each with two textareas (atmosphere, spatialLayout) + a "Remove" button. Plus an "Add environment" button.
- `consistencyAnchors` — list with add/remove.
- `avoidList` — list with add/remove. The first item is rendered greyed-out with a "Mandated" badge — read-only — to communicate the constraint without making the validation feel arbitrary.
- "Save" button at the bottom — disabled until at least one field differs from the current VB.
- "Cancel" reverts.

**Regenerate:** confirmation dialog warns about cascade: "This produces a new Visual Bible version. Per-page scene plans created from older versions will be flagged stale. Continue?"

**Loading state (while `visualBibleRegenJob` is pending/running):** the card becomes a skeleton with "Regenerating Visual Bible…".

### 3.4 New: stale-VB banner on Page Cards

A small inline banner inside the `PageCardScenePlan` region:

```
Visual Bible has changed since this scene plan was generated. 
[Regenerate scene plan]   [What changed?]
```

Visible iff `page.visualBibleIsStale === true`. "Regenerate scene plan" calls the Phase 4 endpoint (no feedback note). "What changed?" opens a modal showing the diff between the scene plan's VB version and current — Phase 5 can ship without the diff modal initially; if so, hide that button.

### 3.5 New: developer panel

Component: `client/src/specialist/components/illustration/DeveloperPanel.tsx`.

Renders four expandable blocks (collapsed by default) per the spec §13 mockup:
- Scene Plan: header (version, model, tokens, latency, parent VB version) → "Director's notes" prose → toggle to show raw LLM prompt + response.
- Structured Prompt: header (Stage 2 metadata) → 5-section breakdown → raw prompt toggle.
- Final Image-Model Prompt: char count, section ordering, full prompt with copy-to-clipboard.
- Image: provider, model, seed, latency, dimensions, storage path.

**Role gating.** A new client helper `useIsAdminOrDevPanelEnabled()` reads:
- `auth.token.role === "admin"`, OR
- `auth.token.featureFlag?.illustrationDevPanels === true` (custom claim — the spec calls this out as a pilot opt-in)

The Page Card and the debug page both consume this hook. If false, the developer panel and the debug-page link are not rendered. **Do not** rely on conditional CSS for this — full conditional render so the data fetches don't fire.

### 3.6 New: per-story debug page

Route: `/:lang/specialist/stories/:storyId/illustration/debug` ([client/src/App.tsx](client/src/App.tsx) — wire next to the existing workspace route).

Layout: a flat sortable table with columns:
- Page number
- Artefact type (`VB`, `Scene Plan`, `Final Prompt`, `Image`)
- Version
- Created at
- Source/Model
- Status / metadata (for VB: `llm_generated` / `specialist_edited`; for Image: `reviewStatus`; etc.)
- Action: "View JSON" — opens a modal with the raw artefact

Fetches: collection reads on `stories/{id}/visualBibles`, `scenePlans`, `finalPrompts`, `images`. Server doesn't need a new endpoint — the existing Firestore rules already permit read on these subcollections.

**Page guard:** role-gated via the same `useIsAdminOrDevPanelEnabled` hook. Non-admin specialists redirected back to the workspace.

### 3.7 IllustrationsTabV2 integration

Update [IllustrationsTabV2.tsx](client/src/specialist/components/illustration/IllustrationsTabV2.tsx):
- Render `<VisualBibleCard>` at the top (above the page list).
- Each `<PageCard>` includes the stale-VB banner (in the Scene Plan region) and the optional `<DeveloperPanel>` at the bottom.
- Footer banner — for admins only — links to the debug page.

### 3.8 History tab + last-activity-summary

[client/src/specialist/components/HistoryTab.tsx](client/src/specialist/components/HistoryTab.tsx):

Add two cases to the event-rendering switch:

```tsx
case "visual_bible_edited":
  mainLabel = `Visual Bible edited (v${event.version}) — changed: ${event.fields.join(", ")}`;
  break;
case "visual_bible_regenerated":
  mainLabel = `Visual Bible regenerated (v${event.version})`;
  break;
```

[client/src/specialist/utils/lastActivitySummary.ts](client/src/specialist/utils/lastActivitySummary.ts):

Add two verb entries:
- `visual_bible_edited`: "Visual Bible edited"
- `visual_bible_regenerated`: "Visual Bible regenerated"

Update the existing `scene_plan_generated` handler to optionally read `visualBibleVersion` when present (additive type change is backwards-compatible for older events without the field, but the TypeScript narrowing needs `withFeedback` and `visualBibleVersion` to be required on the new shape — handle older events stored before this PR with a `?? 0` fallback in the renderer).

---

## 4. Firestore

### 4.1 Rules

No changes needed. Phase 2 rules already cover `visualBibles` (read for specialist/admin, write false). PATCH endpoint writes via Admin SDK.

### 4.2 Indexes

No new indexes needed. VB version-history query is `orderBy version desc` against a small collection (typically ≤5 entries) — direct subcollection read works without composite index.

---

## 5. Test plan

### 5.1 Unit tests (new)

| File | Cases |
|---|---|
| `__tests__/visual-bible-patch.test.ts` (new — server) | PATCH with a single field produces a new VB version with `source: "specialist_edited"`. Missing fields preserved from prior version. New version is `currentVisualBibleVersion`. avoidList sanitization auto-prepends NO_TEXT_LEAD when missing. environmentRegistry validation rejects entries with empty `atmosphere`. |
| `orchestrator/__tests__/regenerateVisualBible.test.ts` (new) | Mocked LLM returns new VB content. Writes new artefact version. Updates Story. Emits `visual_bible_regenerated` event. parentVersion linking correct. |
| `worker/__tests__/handlers.test.ts` (extend) | `visual_bible_regen` handler succeeds. Failure path doesn't break Story. |
| `routes/__tests__/visual-bible-routes.test.ts` (new) | PATCH happy path returns new artefact. PATCH with empty body 400s. POST regenerate enqueues job with correct idempotency key. GET versions returns ordered list. |
| `client/__tests__/VisualBibleCard.test.tsx` (new) | Render in current state shows fields. Edit mode shows form. Save button disabled until field changes. Mandated avoidList[0] not editable. |
| `client/__tests__/DeveloperPanel.test.tsx` (new) | Renders all four blocks. Copy-to-clipboard works. Role gating: returns null for non-admin. |
| `client/__tests__/useIsAdminOrDevPanelEnabled.test.ts` (new) | Returns true for role=admin. Returns true for featureFlag.illustrationDevPanels=true. False otherwise. |

### 5.2 Integration / E2E

`server/src/__tests__/visual-bible-flow.e2e.test.ts`:

1. Seed a story in `illustration_workspace` with VB v1, page 1 scene plan v1 with `visualBibleVersion: 1`, image v1 approved.
2. PATCH `/visual-bible` with `{ characterAnchor: "Updated anchor" }`.
3. Verify VB v2 written with `source: "specialist_edited"`, `parentVersion: 1`. Story `currentVisualBibleVersion: 2`. History has `visual_bible_edited` event with `fields: ["characterAnchor"]`.
4. POST `/pages/1/scene-plan/regenerate`.
5. Verify scene plan v2 written with `visualBibleVersion: 2`, scene plan v1's reference to VB v1 still in Firestore (history preserved).
6. Page 1 row no longer flagged stale (server doesn't compute this — client does).

### 5.3 Manual e2e

Story setup: any `illustration_workspace` story with at least one approved page.

1. Open the Visual Bible card. Click Edit.
2. Update `characterAnchor` (e.g. "Sara has shoulder-length brown hair, large brown eyes, and a small mole on her left cheek.").
3. Save. Verify VB version increments to v2 in the card header. Confirm `Edit` collapses.
4. Look at page cards. All previously-approved pages show the stale-VB banner.
5. Click "Regenerate scene plan" on an approved page. Verify the page sub-status flips to `generating_image` (Phase 4) — wait — actually the regenerate-scene-plan button only updates the scene plan, not the image; clarify behavior.
   - **Verify:** scene plan version increments, image version stays (it's still approved). Banner clears for that page.
6. Open the version dropdown next to the VB card header. Verify v1 and v2 listed; v2 marked current.
7. Click "Regenerate Visual Bible". Confirm in the dialog.
8. Verify the VB card shows the loading state, then renders v3 (LLM-generated). Every page card now shows the stale banner.
9. As an admin user, expand the Developer panel on a page card. Verify the four blocks render with real data.
10. Navigate to `/specialist/stories/{id}/illustration/debug`. Verify the flat artefact table renders. Sort by version. Click "View JSON" on a row.
11. As a non-admin specialist user, verify the Developer panels and debug route are hidden.

---

## 6. Explicit non-goals (defer to later phases)

- ❌ "Revert VB to version N" — cascade-explosion problem. Phase 6 or never.
- ❌ "Regenerate all stale scene plans" bulk action — too much LLM cost in one click. Specialist regenerates per page.
- ❌ VB regenerate with a feedback note — Phase 5 does plain regenerate only. Spec doesn't require feedback for VB.
- ❌ Diff modal for "What changed?" — optional polish; Phase 5 can ship without it. If included, simple field-by-field text diff.
- ❌ Image safety classifier — Phase 6.
- ❌ Cancellation of in-flight VB regen — best-effort, Phase 6.
- ❌ Publishing to `story_templates` — Phase 6.

---

## 7. PR checklist (paste into description)

```
Phase 5 — Visual Bible editing + developer panels

Types
- [ ] EditHistoryEvent: visual_bible_edited, visual_bible_regenerated
- [ ] scene_plan_generated event gains visualBibleVersion: number
- [ ] IllustrationJobType: visual_bible_regen
- [ ] All four type additions mirrored client-side

Server: VB endpoints
- [ ] PATCH /visual-bible (sync) — validates, writes new artefact, updates Story, emits event
- [ ] POST /visual-bible/regenerate (async job)
- [ ] GET /visual-bible (current)
- [ ] GET /visual-bible/versions (list desc)
- [ ] avoidList[0] no-text constraint auto-prepended when missing
- [ ] environmentRegistry validation

Server: orchestrator + worker
- [ ] regenerateVisualBible.ts orchestrator
- [ ] visual_bible_regen worker handler
- [ ] listVisualBibleVersions helper in artefact-store
- [ ] Phase 4 orchestrators populate visualBibleVersion on scene_plan_generated events

Client
- [ ] illustrationApi: patchVisualBible, regenerateVisualBible, fetchVisualBibleVersions, fetchVisualBible
- [ ] useIllustrationWorkspaceState subscribes to visualBibles subcollection
- [ ] PageCardViewModel gains scenePlanVisualBibleVersion + visualBibleIsStale
- [ ] WorkspaceViewModel(ready) gains visualBible + visualBibleVersionsDesc + visualBibleRegenJob
- [ ] VisualBibleCard component (collapsed, edit, version picker, regenerate)
- [ ] Stale-VB banner in PageCardScenePlan
- [ ] DeveloperPanel component
- [ ] useIsAdminOrDevPanelEnabled hook
- [ ] Per-story debug page route + table
- [ ] IllustrationsTabV2 integrates all of the above
- [ ] HistoryTab renders two new event kinds
- [ ] lastActivitySummary verbs for new events

Tests
- [ ] visual-bible-patch.test.ts
- [ ] regenerateVisualBible.test.ts
- [ ] visual-bible-routes.test.ts
- [ ] worker handler test for visual_bible_regen
- [ ] VisualBibleCard rendering + edit mode + save gating
- [ ] DeveloperPanel + role gating
- [ ] useIsAdminOrDevPanelEnabled hook
- [ ] E2E: edit VB → stale banner → regen scene plan → banner clears

Manual
- [ ] Edit characterAnchor → VB v2 → stale banners appear
- [ ] Regenerate VB → all pages stale, regen one by one
- [ ] Admin sees Developer panel + debug page; non-admin doesn't
- [ ] Version dropdown lists all VB versions
```

---

## 8. Estimated shape

One PR. ~25–35 files changed. +2,000 / −100 LOC. Heavier on the client (new VB card, dev panel, debug page) than the server (3 endpoints + 1 orchestrator + 1 handler).

Suggested commit message structure:

```
feat(illustration): Phase 5 — Visual Bible editing + developer panels

Specialists can now edit the Visual Bible inline — character anchor,
style guide, palette, environments, avoid list, consistency anchors —
with each edit producing a versioned artefact. Stale-VB banners on
page cards drive per-page scene-plan regeneration so the specialist
controls the cascade. Plus admin-gated developer panels showing all
artefacts and LLM call records for each page, and a per-story debug
table.

[then per-area bullets]

Spec: docs/illustration/spec.md §10.1, §12.3, §13, §14.2, §20 Phase 5.
```

---

## 9. What Phase 6 unlocks

Phase 6 = Polish + publish bridge:
- `illustration_ready → published` flow that produces a `story_templates` document for the public site.
- Final illustrated book preview via the existing `BookReader` as the approval preview.
- History tab entries for any remaining event kinds.
- Cancellation flow for in-flight jobs.
- Image safety-check stub (`safetyFlags: []` on the ImageArtefact; classifier in v3.0).
- Move spec + plan docs into the specialist-dashboard docs index.

Phase 5's developer panel sets up the visual scaffolding for the v3 safety classifier — when it lands, the panel just adds a new block. No structural change required.
