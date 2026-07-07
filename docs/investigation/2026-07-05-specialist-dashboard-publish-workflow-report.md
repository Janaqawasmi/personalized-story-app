# Investigation Report — Specialist Dashboard: Illustration → Publish Workflow

**Date:** 2026-07-05
**Type:** Investigation only. No code changed, no commits made.
**Branch:** `specialist-dashboard-publish-workflow` (created from `main` at commit `fb54d6e`, after `git pull origin main`)
**Base branch:** `main`

---

## 1. Executive summary

The investigation covered the workflow that begins after a specialist approves a story's manuscript text and continues through the Illustration Workspace, the pre-publish metadata form, and out to the public catalog. Six things were investigated; all six turned out to be real, and root-caused with file/line precision:

1. **Illustration/publish CTA refresh bug — CONFIRMED, root-caused.** `StoryWorkspacePage` holds a "story" object that is fetched once via REST GET and never refreshed after illustration-approval or publish-readiness mutations (those calls bypass the store's notification mechanism entirely). A sibling hook (`useIllustrationWorkspaceState`) *does* hold a live, Firestore-`onSnapshot`-driven copy of the same data, but the CTA visibility logic in `WorkspacePreview.tsx` reads the stale copy, not the live one. A full page reload forces a fresh GET, which is why refreshing "fixes" it.
2. **Publish preparation form — works correctly, but has a real, live English-language gap.** The form (`PublishDialog.tsx`) collects Hebrew/Arabic short description + display topic and a required Situation selection. Data flows cleanly to `story_templates` with no field-name mismatches. However, the public-site read path (`resolveLocalizedField`, `pickLocalized`) was already built to prefer an `en` key that the write path (`LocalizedString` type, `publishStory.ts`) never produces — so `/en/...` visitors silently see Hebrew/Arabic content substituted in with no error.
3. **Situation suggestion flow — partially implemented; the "admin review" step does not exist as a web UI.** Specialists can propose a new situation from the publish dialog; it's persisted correctly as a pending object on the new template. But the only approval mechanism is a developer-run CLI script (`approveSituationProposal.ts`) — there is no admin dashboard page, badge, or notification anywhere in the client.
4. **Publish form UI/UX** has clear, fixable gaps: no persistent language-parity affordance, ambiguous optionality copy, no visible progress/status indicators, and a hidden/one-shot "suggest new situation" sub-flow with no admin-side visibility once submitted.
5. **Personalized text-variant approval workflow — exists, but is post-publish, undiscoverable, and gender-binary-only, with a real English generation bug.** It is a separate `story_templates`-scoped review page (`TextVariantsReviewPage.tsx`) reachable only via a one-time toast after publish. It is **not required before publish** — a story ships with `textPersonalizationReady: false` and can go live with unreviewed pronoun variants. The variant-*generation* step only supports Hebrew/Arabic; an English-language template silently gets Hebrew-oriented AI rewrites.
6. **Story title bug — CONFIRMED, root-caused, single clear fix site.** `Agent1Result.title` and `currentDraft.title` are populated correctly by every generation/rerun. The top-level `Story.title` field — the one actually used for display, lists, and publishing — is only ever set at story creation (defaulting to `"Untitled story"`) or via manual specialist edit. The generate-success handler (`handleGenerate` in `stories.router.ts`) never copies the AI title into `Story.title`, so it silently stays `"Untitled story"` unless a specialist manually retypes it, and this stale value gets published as-is (publish validation only checks non-empty, not meaningfulness).

None of these are the same underlying bug — they are five independent issues that happen to sit in the same corner of the codebase (illustration/publish surface). All are narrowly scoped and each has one clear "fix site" identified below.

---

## 2. Branch created and base branch used

- Base branch: `main`, pulled to latest (`git pull origin main` — already up to date at `fb54d6e Merge pull request #75 from Janaqawasmi/price`).
- New branch created: **`specialist-dashboard-publish-workflow`**, off `main`, no commits made on it. This report file itself is the only new file on the branch; it is intentionally left uncommitted per the task instructions ("do not create commits unless explicitly asked").

---

## 3. Current workflow map

```
Manuscript approved (Draft tab, ApproveBar) → status: approved
        │
        ▼
Illustration Workspace opens (illustration_workspace)
  - Visual Bible generated
  - Per-page scene plans generated
  - Per-page images generated (worker) → awaiting_review
  - Specialist approves/rejects each page image
        │  (server: Story.illustrationPages[n].status = "approved", per-page transaction)
        ▼
All pages approved (client-derived: allApproved = every page.subStatus === "approved")
        │  specialist clicks "Mark ready to publish"
        ▼
status: illustration_ready
        │  specialist opens Publish dialog, fills Hebrew/Arabic description + topic,
        │  picks Situation (or proposes a new one)
        ▼
POST /api/specialist/stories/:storyId/publish
        │  writes story_templates/{templateId}, sets Story.status = "published",
        │  Story.publishedTemplateId = templateId
        │  best-effort, async: triggers text-variant generation (Phase 3)
        ▼
Public catalog reads story_templates (StoryDetailPage, HomePage, discovery pages)
        │
        ▼ (separately, not gating publish)
Specialist may open TextVariantsReviewPage (via one-time post-publish toast)
  to review/approve masculine/feminine text variants per page
```

Two things about this map matter for the bugs below:
- The "all pages approved" → "Mark ready to publish" → "Publish to library" chain is **entirely specialist-driven and manual by design** (no auto-advance) — the *intended* UX is that CTAs appear reactively as soon as their preconditions are met, without a reload. That reactivity is broken (Bug 1).
- Text-variant approval sits **outside** this chain, after publish, and is not a gate on it (Bug 5's core finding).

---

## 4. Relevant files/components/services

### Illustration Workspace (client)
| File | Role |
|---|---|
| `client/src/specialist/pages/StoryWorkspacePage.tsx` | Owns the (buggy, stale) top-level `story` state; renders tab shell. |
| `client/src/specialist/components/IllustrationsTab.tsx` | Thin wrapper; drops the `onStoryUpdate` prop it receives. |
| `client/src/specialist/components/illustration/IllustrationsTabV2.tsx` | Main dispatcher; consumes the live `vm` from the hook below plus the stale `story` prop. |
| `client/src/specialist/hooks/useIllustrationWorkspaceState.ts` | The correct, reactive data layer — Firestore `onSnapshot` on the story doc + `illustrationJobs`/`images`/`scenePlans`/`visualBibles` subcollections; computes `allApproved`. |
| `client/src/specialist/components/illustration/WorkspacePreview.tsx` | Computes `showMarkReady`/`showPublish` — **from the stale `story` prop**, this is the bug site. |
| `client/src/specialist/components/illustration/WorkspacePanel.tsx`, `publish/PublishBar.tsx` | Presentational passthrough to the sticky CTA bar. |
| `client/src/specialist/components/illustration/PublishDialog.tsx` | The publish preparation form (description/topic/situation). |
| `client/src/specialist/components/illustration/PageCard.tsx` + `pageCard/*` | Per-page manuscript/scene-plan/image/approve-reject card. |
| `client/src/api/illustrationApi.ts` | All illustration/publish `fetch()` calls — **none go through `HybridDraftStore`**, which is central to Bug 1. |
| `client/src/specialist/storage/HybridDraftStore.ts` | `draftStore` singleton; `subscribeToStory` is local pub/sub only, not a Firestore listener. |

### Personalization / text variants
| File | Role |
|---|---|
| `server/src/services/personalization.service.ts` | Runtime pronoun/placeholder substitution for caregivers (he/ar/en pronoun maps). |
| `server/src/services/textVariants.service.ts` | LLM-driven masculine/feminine variant **generation** (he/ar only) + approve/finalize. |
| `client/src/specialist/pages/TextVariantsReviewPage.tsx` | The only specialist-facing review UI for variants; post-publish only. |
| `server/src/routes/specialist/templates.router.ts` | REST endpoints for variant get/update/approve/finalize. |
| `client/src/specialist/components/illustration/WorkspacePreview.tsx:180-193` | The sole entry point (one-time toast) into the review page. |

### Publish form / situation taxonomy
| File | Role |
|---|---|
| `client/src/specialist/components/illustration/PublishDialog.tsx` | Publish preparation form. |
| `client/src/api/referenceData.ts`, `client/src/utils/referenceDataLabel.ts` | Situation list fetch + label localization. |
| `server/src/illustration/orchestrator/publishStory.ts` | Core publish logic — builds `StoryTemplate`, resolves/validates situation, writes `story_templates`. |
| `server/src/services/referenceData.service.ts`, `server/src/routes/referenceData.routes.ts` | Server read layer for `referenceData/{topics,situations,...}/items`. |
| `server/scripts/seedReferenceData.ts` | Seeds the situations/topics taxonomy (admin-SDK only). |
| `server/scripts/approveSituationProposal.ts` | The **only** review/approve/reject mechanism for suggested situations — CLI only. |

### Title bug
| File | Role |
|---|---|
| `server/src/agent1/step2-author/output-parser.ts` | Parses AI-generated `title` out of the LLM response. |
| `server/src/agent1/pipeline.ts:124` | Copies `step2Output.title` → `Agent1Result.title`. |
| `server/src/models/story.model.ts:258` | `createStoryForGeneration` defaults `Story.title` to `"Untitled story"`. |
| `server/src/routes/specialist/stories.router.ts` (`handleGenerate`, ~1252-1503) | **Bug site** — success path never copies `agent1Result.title` into top-level `Story.title`. |
| `server/src/illustration/orchestrator/publishStory.ts:308,322,392` | Publish reads `Story.title` for the public template's title + slug; only validates non-empty. |

---

## 5. Data model and Firestore collections involved

| Collection / path | Relevant fields touched by this investigation |
|---|---|
| `stories/{storyId}` | `title` (top-level, buggy), `agent1Result.title`, `currentDraft.title`, `status`, `illustrationPages[]`, `publishedTemplateId` |
| `stories/{storyId}/illustrationJobs`, `.../images`, `.../scenePlans`, `.../visualBibles` (subcollections) | Read reactively by `useIllustrationWorkspaceState` |
| `story_templates/{templateId}` | `title`, `shortDescription: LocalizedString` (he/ar only, no `en`), `displayTopic: LocalizedString` (same gap), `situationId`, `situationProposal { status, labelHe/Ar/En, createdBy, createdAt }`, `textVariantStatus`, `textPersonalizationReady` |
| `story_templates/{templateId}/textVariants/{pageNumber}` | `masculine`, `feminine`, `reviewStatus` — populated by Phase 3 generation, reviewed via `TextVariantsReviewPage` |
| `referenceData/situations/items/{situationId}` | `label_en/ar/he`, `topicKey`, `active` — public-read, admin-SDK-write-only per `firestore.rules:191-198` |

No new collections were found beyond what CLAUDE.md already documents; the notable addition is that **situation suggestions are not a separate collection** — they live inline on the `story_templates` document that triggered them, as a `situationProposal` object.

---

## 6. API endpoints / server functions involved

| Endpoint | Handler | Role |
|---|---|---|
| `POST /:storyId/pages/:pageNumber/image/approve` | `handleApprovePageImage` (`stories.router.ts:711-771`) | Approves one page image; transactionally updates `illustrationPages[n].status`. |
| `POST /:storyId/pages/:pageNumber/image/reject` | `handleRejectPageImage` | Same, for rejection. |
| `POST /:storyId/transitions` (`to: "illustration_ready"`) | transitions handler (`stories.router.ts:487-498`) | "Mark ready to publish" — recomputes unapproved pages fresh from Firestore, 409s if any remain. |
| `POST /:storyId/publish` | `handlePublishStory` → `publishStory()` (`illustration/orchestrator/publishStory.ts`) | Validates `illustration_ready`, writes `story_templates`, flips `Story.status = "published"`. |
| `GET /api/reference-data/situations[?topicKey=]` | `getSituationsByTopic` (`referenceData.controller.ts`) | Situation dropdown source (server route; client actually reads Firestore directly via `referenceData.ts`, bypassing this REST route). |
| `GET/PATCH /api/specialist/templates/:templateId/text-variants...` | `templates.router.ts` | Variant get/update/approve/finalize. |
| `POST /:storyId/generate` | `handleGenerate` (`stories.router.ts:1252-1503`) | Runs Agent 1; **bug site** for the title issue. |
| `PATCH /:storyId` | `handlePatchStory` (`stories.router.ts:362-445`) | Generic story patch; `title` is writable here (the only place it currently gets fixed, manually). |

---

## 7. Bugs found

### Bug 1 — Illustration/publish CTA requires manual refresh (Area 1)
**Symptom:** After approving all page images, and again after clicking "Mark ready to publish," the next CTA doesn't appear until the browser is reloaded.

**Root cause:** Two independent "current story" objects live in the same component tree:
- `useIllustrationWorkspaceState.ts` maintains a Firestore `onSnapshot`-driven `story` internally and correctly derives `allApproved` (`useIllustrationWorkspaceState.ts:357`) reactively.
- `StoryWorkspacePage.tsx` maintains its own `story` state, populated by a **one-shot `GET`** on mount (`fetchStory`, lines 184-211) plus a `subscribeToStory` call that is **not actually a Firestore listener** — `HybridDraftStore.subscribeToStory` (`HybridDraftStore.ts:431-448`) is a local, in-process pub/sub that only fires when a mutation goes *through the same store instance* (`updateStory`, `transitionStatus`, etc.).
- All illustration/publish mutations (`approvePageImage`, `rejectPageImage`, `markIllustrationReadyToPublish`, `publishStoryToLibrary` — all in `illustrationApi.ts`) are **bare `fetch()` calls that never go through `HybridDraftStore`**, so they never trigger the pub/sub notification.
- `WorkspacePreview.tsx:72-74` computes `showMarkReady` and `showPublish` from **this stale `story` prop**, not from the hook's live `vm`. A full reload remounts `StoryWorkspacePage`, forcing a fresh `GET` that happens to pick up the current Firestore state — which is why refresh "fixes" it.

This is a state-architecture problem, not a Firestore/backend problem — the backend writes are correct and immediate.

### Bug 2 — English description/topic never written despite being expected by readers (Area 2)
**Root cause:** `LocalizedString` (`server/src/shared/types/storyTemplate.ts:5-8`) is defined as `{ ar?: string; he?: string }` — no `en`. `PublishDialog.tsx` only has Hebrew/Arabic inputs for description and topic. Meanwhile `resolveLocalizedField` (`client/src/api/stories.ts:44-64`) and `pickLocalized`/`toLangRecord` (`client/src/pages/StoryDetail/hooks/mapFirestoreToVM.ts:23-40, 116-131`) resolve in order `lang → en → he → ar` — i.e., the **read side was built assuming `en` would eventually exist**. Since it's always empty today, English-site visitors (`/en/...`, which is a fully-routed, first-class language per `LanguageLayout.tsx` and `LanguageContext.tsx`, not just a UI-string fallback) silently see Hebrew or Arabic prose with no error indicator.

### Bug 3 — Situation-suggestion review has no admin UI (Area 3)
**Root cause:** Not really a "bug" so much as an incomplete feature. The submit path is fully implemented and correctly persisted (`situationProposal` object on the new `story_templates` doc, status `"pending"`). But the *only* code that ever reads a pending proposal is `server/scripts/approveSituationProposal.ts` — a CLI script run manually with service-account credentials, with **zero UI surface** (no admin page, no badge, no list, not gated by `requireRole("admin")`, not reachable from the web app at all). A specialist who submits a suggestion has no way to know whether/when it was reviewed; there's no "rejected" indicator either.

### Bug 4 — Story title stays "Untitled story" after generation/regeneration (Area 6)
**Root cause:** `Agent1Result.title` and `currentDraft.title` are populated correctly on every run (`pipeline.ts:124`, `stories.router.ts:1455`). But the top-level `Story.title` field — the one read by list views, the workspace header default, and crucially by `publishStory.ts:308,322` for the public template's title and slug — is set once at story creation (defaulting to `"Untitled story"`, `story.model.ts:258`) and is **never included in the `updatedFields` object** that `handleGenerate`'s success path writes back to Firestore (`stories.router.ts`, ~lines 1450-1464). The only path that ever updates it is a manual specialist edit via `PATCH /:storyId` (title isn't in the forbidden-fields list). Reruns have the identical gap — each rerun updates `currentDraft.title` but leaves the stale top-level title untouched, and the failure-rollback path even explicitly restores `title: preGenStory.title`, underscoring that the success path is the one place `title` was forgotten. Publish-time validation (`publishStory.ts:392`) only checks non-empty, so `"Untitled story"` sails through to the public catalog.

### Bug 5 — Text-variant generation silently mis-languages English templates (Area 5)
**Root cause:** `textVariants.service.ts:263-268` branches only on `"he"` vs `"ar"`:
```ts
const language: "he" | "ar" =
  data.generationConfig?.language === "ar" ? "ar" : "he";
```
Any template with `generationConfig.language === "en"` falls through to the Hebrew branch and gets an LLM prompt explicitly instructing "Language: Hebrew" — a silent mismatch, not a rejection or fallback-to-en. Combined with Bug 2, English support across the personalization pipeline is incomplete in more than one place.

---

## 8. Root-cause hypotheses (confirmed vs. open)

| Area | Hypothesis | Status |
|---|---|---|
| Illustration/publish CTA refresh | Stale REST-fetched state coexists with a live Firestore-subscribed hook; CTA visibility reads the stale one | **Confirmed** with exact line numbers |
| Publish form English gap | Read path built ahead of write path; `LocalizedString` type never extended to `en` | **Confirmed** |
| Situation suggestion review | Feature was intentionally scoped to a CLI-only admin step (per script's own doc comment), never given a UI | **Confirmed** (by design, but incomplete for production use) |
| Story title | `handleGenerate`'s success-path field list omits `title`; asymmetric with its own failure-path rollback which does include `title` | **Confirmed** |
| Personalization variant approval gating | Not required before publish by design/comment (`// Phase 3: specialist reviews gendered variants`), but no forcing function exists to ensure it actually happens | **Confirmed as designed gap, not accidental bug** — but the *lack of any reminder/visibility* is a product gap worth treating like one |
| Text-variant English generation | Binary he/ar branch predates `en` being added elsewhere in the pipeline (pronoun maps already support `en`) | **Confirmed** |

---

## 9. UI/UX problems found

**Publish preparation form (`PublishDialog.tsx`):**
- No visual indicator of language completeness/parity — a specialist can publish with only Hebrew filled in and Arabic blank (both optional) with no warning that Arabic readers will see a fallback.
- "Display topic" fields have no helper text explaining that leaving them blank is the *recommended* path (the code deliberately treats blank as "resolve from reference data instead," but nothing in the UI communicates this — a specialist would reasonably assume blank = missing data).
- The copy "Hebrew and Arabic fields are optional; empty values fall back to the brief" is inaccurate for `displayTopic` (falls back to empty string, not brief content) — could cause a specialist to leave a field blank expecting it to be auto-filled from clinical content when it won't be.
- The "Other — request new situation" sub-form appears/disappears via a single select value with no persistent way to check on a previously-submitted suggestion's status (pending/approved/rejected) from within this dialog or anywhere else in the specialist UI.
- No indication anywhere in the dialog of how the entered data will actually look on the public story page (no live preview, no "this is what caregivers will see" framing).
- No save-as-draft affordance — if a specialist starts filling the form and navigates away, entered text is lost (the dialog holds only local component state, reset by `useEffect` on prop changes).

**Personalization/text-variant workflow:**
- Zero persistent navigation to `TextVariantsReviewPage` outside a one-time post-publish snackbar — if dismissed or missed, no other path was found in the codebase back to it (no link from stories list, story tabs, or template management).
- Nothing surfaces `textVariantStatus`/`textPersonalizationReady` anywhere a specialist would naturally look (story list, workspace header, History tab) — a specialist could publish a personalizable story and never learn that gendered review is pending.
- No gender-neutral option anywhere (schema is strictly `"male" | "female"`), which may or may not be an intentional product scope decision — worth confirming.
- No English support in the review page's underlying generation step (Bug 5) — a specialist reviewing an English-personalizable story has no way to know the "Hebrew/Arabic" variants they're approving were generated with the wrong target language baked into the prompt.

**Illustration Workspace CTAs:**
- Aside from the refresh bug itself, the fact that "Mark ready to publish" and "Publish to library" are two separate manual clicks (by design, no auto-advance) is reasonable, but there's no persistent visual "N of M pages approved" progress indicator called out in the investigated files at the top-level workspace header — progress is only visible by scrolling the page-card list itself.

---

## 10. Visual UI improvement opportunities

*(Assessed from component/prop structure — a live visual pass in the browser was not performed as part of this investigation; see Open Questions.)*

- **Publish dialog**: currently a two-column (Hebrew/Arabic) `Stack` layout inside a MUI `Dialog`. Adding a third English column will need either a language-tabbed layout (one language visible at a time, switchable) rather than three side-by-side columns, which would get visually cramped, especially in RTL contexts where Hebrew/Arabic are principal and English is secondary.
- Add a compact per-language completion indicator (e.g., small colored dot or check icon next to each language tab/column: filled = has content, empty = will fall back) so specialists get an at-a-glance read of language coverage before publishing.
- Add inline "Preview as public reader" micro-copy or a collapsed accordion showing the resolved final text (post-fallback) next to each field, directly addressing "how will this look in the library."
- Situation picker: visually distinguish the "Other — request new situation" state more clearly (e.g., a distinct border/background color while expanded) since it's currently a conditionally-rendered block that could read as a validation error rather than an intentional alternate flow.
- Add a status chip ("Pending admin review" / "Approved" / "Rejected") next to the situation field if the story's template already has a `situationProposal` on it, instead of the specialist having no visibility into prior submissions.
- Text-variant review page: promote from "toast-only" discovery to a persistent status badge on the story's row in the specialist stories list (e.g., "Personalization: 3/8 pages reviewed") so it isn't purely opt-in via a dismissible snackbar.
- Illustration workspace: add a persistent sticky progress bar/counter ("6/8 images approved") near the top of the workspace, not just inline per-card, so specialists get continuous feedback as they work through pages — this would also make the eventual CTA appearance (once Bug 1 is fixed) feel earned/expected rather than sudden.

---

## 11. Recommended fixes, grouped by priority

**P0 — user-facing correctness bugs, each independently small and low-risk**
1. **Illustration/publish CTA refresh (Bug 1).** Recommended direction: stop deriving `showMarkReady`/`showPublish` in `WorkspacePreview.tsx` from the stale `story` prop; source status from `useIllustrationWorkspaceState`'s already-live `vm` instead (it already tracks `status` internally for its own `readOnly` computation — just needs to be surfaced on the view model). This is the minimal, most surgical fix. A broader fix (replacing `HybridDraftStore.subscribeToStory`'s local pub/sub with a real Firestore `onSnapshot` for server-backed stories) would also fix the same class of staleness for the Brief/Draft/History tabs, which share the same stale `story` prop from `StoryWorkspacePage` — worth considering if this turns out to be a recurring pattern elsewhere.
2. **Story title not persisted after generation (Bug 4).** Add `title: agent1Result.title` to the `updatedFields` object in `handleGenerate`'s success path (`stories.router.ts`, ~line 1450-1464), mirroring what the failure-path rollback already does symmetrically. Needs one product decision first (see Risks below): always overwrite vs. only overwrite while still at the untouched default.

**P1 — real functional gaps affecting production readiness**
3. **English description/topic support (Bug 2).** Add `en?: string` to `LocalizedString`; add English inputs to `PublishDialog.tsx`; thread `shortDescriptionEn`/`displayTopicEn` through the request body, route whitelist, and orchestrator's field-building logic. Reader code needs no changes — it already expects this key.
4. **Text-variant generation English support (Bug 5).** Extend `textVariants.service.ts`'s language branch to include `"en"` and its own prompt language line, rather than silently defaulting to Hebrew.
5. **Situation-suggestion admin visibility (Bug 3).** At minimum, surface pending suggestions somewhere in the existing admin pages (`client/src/pages/admin/*`) with approve/reject actions that call the same logic currently only in `approveSituationProposal.ts` — even a minimal read-only list would be a large improvement over "invisible."

**P2 — workflow/UX improvements, no data-model risk**
6. Persistent navigation + status surfacing for `TextVariantsReviewPage` (story list badge, not just a toast).
7. Publish dialog UX polish: helper text accuracy, language-completion indicators, situation-proposal status visibility, live "how this will appear publicly" preview.
8. Illustration workspace: persistent top-level progress indicator.

**P3 — product decisions to make before implementing, not pure engineering**
9. Whether personalization-variant approval should become a formal gate before publish (currently explicitly not gating, by design/comment) — this is a product/clinical-safety question, not just a technical one.
10. Whether a gender-neutral personalization variant should be supported at all (current schema is strictly binary end-to-end).

---

## 12. Risks or edge cases

- **Title fix (Bug 4) risk of clobbering manual edits.** If a specialist has already retitled a story before triggering a rerun, an unconditional `title: agent1Result.title` write would silently overwrite their intentional edit. Recommend gating the auto-write to only fire when `Story.title` is still at its untouched default (`"Untitled story"` or empty), not unconditionally on every generation.
- **CTA refresh fix (Bug 1) touches shared state used by all three tabs** (Brief/Draft/History also receive the same `story` prop from `StoryWorkspacePage`) — if the broader fix (real Firestore listener at the `StoryWorkspacePage` level) is chosen over the narrower one (fix just `WorkspacePreview`'s inputs), it should be tested across all tabs, not just Illustrations, since it changes a shared data source.
- **English fields (Bug 2) are additive/backward-compatible** — existing published templates with no `en` key will continue to fall back to `he`/`ar` exactly as they do today; no migration is strictly required, only new publishes would start populating `en`.
- **Situation-suggestion admin UI (Bug 3)** currently bypasses `requireRole("admin")` entirely by using the raw service account in the CLI script — moving this into the web app needs proper role-gating (`requireRole("admin")`) to avoid regressing the access-control posture the CLI-only approach accidentally had by being unreachable.
- **Personalization gating (Item 9)** is clinically sensitive — Hebrew/Arabic are morphologically gendered languages where naive pronoun swaps can produce grammatically broken or contextually wrong text; shipping unreviewed variants live to caregivers has real quality/trust risk even though it's not currently a hard blocker.

---

## 13. Open questions

- Should the P0 illustration-refresh fix be the narrow patch (fix `WorkspacePreview`'s inputs) or the broad one (real Firestore listener replacing `HybridDraftStore`'s local pub/sub for server-backed stories)? The broad fix is more correct long-term but touches more surface area.
- Should English descriptions/topics be **required** at publish time going forward, or remain optional like Hebrew/Arabic currently are?
- Is there a business reason personalization-variant review is intentionally non-blocking on publish (e.g., to avoid delaying non-personalizable-adjacent launches), or was this simply not revisited since the Phase 3 comment was written? This determines whether Item 9 is a "add a gate" fix or an "add a reminder/visibility" fix.
- Was a gender-neutral/"kept open" personalization variant ever in scope, or is binary-only an intentional constraint given Hebrew/Arabic grammatical gender complexity?
- Should the situation-suggestion admin review move into the existing `client/src/pages/admin/*` surface, or is a lighter-weight solution (e.g., a Slack/email notification on new proposals, keeping the CLI as the actual action) more appropriate given team size?
- This report's UI/UX section (10) was produced from code/prop structure, not a live browser pass — a follow-up visual QA pass (running the dev server, logging in as a specialist, and screenshotting the actual rendered Publish dialog and Illustration workspace) would sharpen the "visual polish" recommendations with concrete before/after specifics.

---

## 14. Suggested implementation plan for a later step

Recommend tackling in this order, each as its own isolated PR (per the user's stated "one bug at a time" preference):

1. **Bug 4 (title)** — smallest, most isolated, highest user-visible payoff (fixes "Untitled" everywhere at once, including publish).
2. **Bug 1 (CTA refresh)** — second, since it's the most disruptive to daily specialist workflow (forces manual reloads mid-task).
3. **Bug 2 (English description/topic)** — schema + form + orchestrator change; can ship without touching reader code at all (already compatible).
4. **Bug 5 (English text-variant generation)** — small, isolated language-branch fix in `textVariants.service.ts`.
5. **Bug 3 (situation suggestion admin visibility)** — larger, needs a small new admin UI; do after the above land since it's more of a feature addition than a bug fix.
6. **UX polish items (Section 11, P2)** — batch into a follow-up design/implementation pass once the above functional fixes are in, since several of them (progress indicators, status badges) are easier to design well once the underlying data is reliably fresh (post Bug 1 fix).
7. **Product decisions (Section 11, P3 / Section 13 open questions)** — resolve before scheduling any further personalization-workflow work, since the answers change whether that's a gating change (bigger, state-machine-touching) or a visibility-only change (smaller, additive).
