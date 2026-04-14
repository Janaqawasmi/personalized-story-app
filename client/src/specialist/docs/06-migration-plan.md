# 06 — Migration Plan

This file is the sequencing plan for shipping the dashboard rewrite. It is structured as **three independent PRs**, each one shippable on its own, each one reversible. None of the three depends on Agent 1 being feature-complete — the dashboard rewrite can ship in parallel with Agent 1 development and only the third PR has any coupling at all.

The order is fixed: storage adapter first, Story model second, routes third. Doing them in any other order produces a worse outcome.

## Why this order

**Why storage adapter first.** Because it's the only PR that touches every consumer of the current draft system. If we do it last, we'd have to refactor every consumer twice — once for the new model, once for the new storage abstraction. Doing it first means the model and route refactors land into a codebase that already has clean storage boundaries.

**Why Story model second.** Because the Story model is the largest semantic change but it can be made entirely behind the storage adapter — the routes and components don't have to know about it yet. We migrate the data shape inside the adapter, then update consumers one at a time.

**Why routes third.** Because route changes are user-visible. They should land last, when everything underneath is stable. Routes are also the easiest thing to roll back (just point the redirect back).

## PR 1 — Storage Adapter

**Goal.** Introduce the `DraftStore` interface and `LocalDraftStore` implementation. Migrate every existing localStorage call site to go through the adapter. **Zero behavior change for the user.** No new features, no deleted features, no UI changes.

**What ships.**

- New file: `client/src/specialist/storage/DraftStore.ts` (the interface)
- New file: `client/src/specialist/storage/LocalDraftStore.ts` (the implementation, wrapping the existing logic in `briefDraftStorage.ts`)
- New file: `client/src/specialist/storage/index.ts` (the singleton selector)
- New file: `client/src/specialist/__tests__/no-direct-localStorage.test.ts` (the grep test)
- Modified: `briefDraftStorage.ts` becomes a thin re-export from `LocalDraftStore` for backward compatibility (so existing call sites keep working without change). All public functions delegate to the singleton.
- Modified: `BriefForm.tsx`, `SpecialistBriefsPage.tsx`, `BriefFormDraftRedirect.tsx`, and any other current consumers updated to import from the storage adapter where they currently call functions in `briefDraftStorage.ts`. Behavior unchanged.

**The interface in this PR is intentionally narrower than the final spec.** It only exposes the methods the current code actually uses: `getDraft`, `saveDraft`, `deleteDraft`, `listDrafts`, `createNewDraftId`. The Story-aware methods (`createStory`, `transitionStatus`, `updateBrief`) are added in PR 2.

**This means PR 1 keeps the current data shape too.** No `Story` entity yet, no status field, no `agent1Result`. Just the existing `CompleteBrief` shape behind a clean interface.

### Acceptance criteria for PR 1

1. The grep test passes — no file under `client/src/specialist/` (other than the storage adapter and the test itself) contains `localStorage.`.
2. The existing dashboard works exactly as before. Drafts can be created, edited, listed, deleted. No regression.
3. All existing tests pass.
4. New unit tests for `LocalDraftStore` cover: create, read, update, delete, list, registry migration from `dammah_brief_drafts_v2` (the existing key) to whatever key the new store uses.
5. The bundle size delta is within a few KB.

### Rollback for PR 1

Trivial. Revert the PR. The adapter and the test are additive; the call site changes are mechanical and easily reverted.

### Estimated time

**Two days.** One day to write the interface and implementation, one day to migrate call sites and write tests.

---

## PR 2 — Story Model

**Goal.** Introduce the `Story` entity and the status state machine. Migrate the storage adapter to operate on `Story` objects internally. Existing consumers of the brief continue to work because the storage adapter exposes both the old brief-shaped methods (deprecated) and the new Story-shaped methods.

**What ships.**

- New file: `client/src/specialist/types/Story.ts` — the `Story`, `StoryStatus`, `BriefStatus`, `EditHistoryEntry`, `EditHistoryEvent` types.
- New file: `client/src/specialist/stateMachine.ts` — `ALLOWED_TRANSITIONS`, `isTransitionAllowed`.
- New file: `client/src/specialist/__tests__/state-machine.test.ts` — exhaustive test of the transition table.
- Modified: `client/src/specialist/storage/DraftStore.ts` — extended with the Story-aware methods (`createStory`, `getStory`, `listStories`, `updateStory`, `updateBrief`, `submitBrief`, `transitionStatus`, `subscribeToStory`, `subscribeToList`).
- Modified: `client/src/specialist/storage/LocalDraftStore.ts` — implements the new methods. Internal storage migrates from `dammah_brief_drafts_v2` (containing `Record<string, CompleteBrief>`) to `dammah_stories_v1` (containing `Record<string, Story>`). The migration runs once on first read after the upgrade.
- New file: `client/src/specialist/storage/migrations/2026-04-stories-v1.ts` — the one-time migration function.
- The old brief-shaped methods (`getDraft`, `saveDraft`, etc.) are kept as deprecated shims that wrap the new methods, extracting `story.brief` to return.

**The route layer and components do not change in this PR.** They continue to call the old brief-shaped methods through the deprecated shims. The new methods exist but are not yet used by any consumer.

This PR is the largest of the three but it touches the smallest surface area in user-facing code. Almost all the work is in the storage adapter and the migration.

### The migration

```ts
// client/src/specialist/storage/migrations/2026-04-stories-v1.ts

import type { Story } from '../../types';
import type { CompleteBrief } from '@/types/storyBrief';

const OLD_KEY = 'dammah_brief_drafts_v2';
const NEW_KEY = 'dammah_stories_v1';

interface OldRegistry {
  drafts: Record<string, CompleteBrief & { savedAt?: number }>;
}

interface NewRegistry {
  stories: Record<string, Story>;
  schemaVersion: 1;
}

export function migrateBriefsToStories(): void {
  // Idempotent — safe to run multiple times
  if (localStorage.getItem(NEW_KEY)) return;

  const oldRaw = localStorage.getItem(OLD_KEY);
  if (!oldRaw) {
    // No old data; initialize empty new registry
    localStorage.setItem(NEW_KEY, JSON.stringify({ stories: {}, schemaVersion: 1 }));
    return;
  }

  let oldRegistry: OldRegistry;
  try {
    oldRegistry = JSON.parse(oldRaw);
  } catch {
    localStorage.setItem(NEW_KEY, JSON.stringify({ stories: {}, schemaVersion: 1 }));
    return;
  }

  const newRegistry: NewRegistry = { stories: {}, schemaVersion: 1 };
  const now = Date.now();

  for (const [draftId, brief] of Object.entries(oldRegistry.drafts)) {
    const savedAt = brief.savedAt ?? now;
    newRegistry.stories[draftId] = {
      id: draftId,                                  // preserve the ID — old draftIds become new storyIds
      ownerUid: 'local',
      parentStoryId: null,
      title: 'Untitled story',                      // old briefs don't have titles
      storyType: brief.storyType ?? 'fear_anxiety',
      ageRange: brief.ageAndScope?.ageRange ?? null,
      tags: [],
      status: 'draft_brief',                         // old drafts were all drafts
      briefStatus: 'draft',
      brief,
      agent1Result: null,
      agent1Versions: [],
      currentDraft: null,
      editHistory: [
        {
          id: crypto.randomUUID(),
          at: savedAt,
          byUid: 'local',
          event: { kind: 'draft_created', agent1Version: 0 },
        },
      ],
      createdAt: savedAt,
      updatedAt: savedAt,
      lastOpenedAt: savedAt,
      submittedAt: null,
      approvedAt: null,
    };
  }

  localStorage.setItem(NEW_KEY, JSON.stringify(newRegistry));
  // Don't delete the old key yet — leave it for one release as a safety net.
  // PR 3's cleanup phase removes it.
}
```

The migration is idempotent and runs on every app load (it short-circuits if `NEW_KEY` exists). It preserves IDs, so a specialist who had bookmarked `/specialist/briefs/abc-123` will find `abc-123` as a Story ID after the migration.

### Acceptance criteria for PR 2

1. The migration runs cleanly on every existing draft format we can find in production-like data. Test with: empty registry, one draft, multiple drafts, drafts with all sections complete, drafts with no sections complete, drafts with the legacy `dammah_brief_draft_v1` single-slot key.
2. The state machine test passes — every allowed transition is allowed, every other transition is rejected.
3. The deprecated shims work — existing components using `getDraft`/`saveDraft` see no behavior change.
4. New unit tests for the Story-aware methods cover create, get, list, update, status transitions, brief updates.
5. No UI changes are visible to the user.

### Rollback for PR 2

Mostly trivial — revert the PR. The migration leaves `dammah_brief_drafts_v2` intact, so reverting restores the old behavior. The only thing to be careful about: if a specialist created or modified a story between PR 2 landing and the rollback, their changes are in `dammah_stories_v1` and won't be visible after the revert. For the pilot (single specialist on one device), this is acceptable; for production with many users, the migration would need a reverse-migration script. Document this limitation in the PR.

### Estimated time

**Four days.** Two days for the model, types, state machine, and migration. Two days for the adapter changes and tests.

---

## PR 3 — Routes and Components

**Goal.** Replace the brief-as-unit UI with the Story-as-unit UI. Update routes, build the Workspace page, build the new dashboard table, delete the deprecated shims.

**What ships.**

- New file: `client/src/specialist/pages/SpecialistStoriesPage.tsx` — the new dashboard.
- New file: `client/src/specialist/pages/StoryWorkspacePage.tsx` — the new Workspace.
- New file: `client/src/specialist/pages/NewStoryRedirect.tsx` — the create-and-redirect handler.
- New files: `client/src/specialist/components/StoriesTable.tsx`, `StoriesFilterBar.tsx`, `StoryRow.tsx`, `WorkspaceHeader.tsx`, `WorkspaceTabs.tsx`, `BriefTab.tsx`, `DraftTab.tsx`, `HistoryTab.tsx`.
- Modified: `client/src/App.tsx` — new routes added, old routes redirect via `BriefsListRedirect` etc.
- Deleted: `client/src/pages/SpecialistBriefsPage.tsx`, `client/src/pages/SpecialistBriefReviewPage.tsx`, `client/src/components/brief/BriefFormDraftRedirect.tsx`. The old brief-list and brief-review pages no longer have a route.
- Modified: `client/src/components/brief/BriefForm.tsx` — its only change is that it operates on a `storyId` and uses `draftStore.updateBrief` and `draftStore.submitBrief`. The form internals (sections, validation, navigation) are unchanged.
- Modified: `client/src/components/specialist/SpecialistNavBar.tsx` — the "Story Brief" button now uses the most-recent-draft logic from `02-routes-and-pages.md`.
- Deleted: the deprecated shims in `LocalDraftStore` (the old brief-shaped methods).
- Deleted: the legacy `dammah_brief_drafts_v2` and `dammah_brief_draft_v1` keys are wiped from `localStorage` after one app load (with a console log explaining what was removed).

**Old route redirects.**

For one release, the old routes redirect to the new ones:

- `/specialist/briefs` → `/specialist/stories`
- `/specialist/briefs/:briefId` → `/specialist/stories/:briefId`
- `/specialist/create-brief` → `/specialist/stories/new`
- `/specialist/create-brief/:draftId` → `/specialist/stories/:draftId/brief`

After one release, the redirect components are deleted.

**This PR is where Agent 1 integration happens.** The Draft tab calls `POST /api/specialist/stories/:storyId/generate` to invoke Agent 1. If Agent 1 isn't feature-complete by the time PR 3 ships, the Draft tab works against a stub that returns a fixed `Agent1Result` (suitable for layout testing). The cutover from stub to real Agent 1 is a one-line change.

### Acceptance criteria for PR 3

1. The new dashboard renders. Filters, search, sort all work.
2. The new Workspace renders for a Story in every status. Each tab works.
3. The brief editor inside the Workspace's Brief tab functions identically to the current `BriefForm`. No section is lost.
4. Old route URLs redirect to new ones.
5. The grep test for `localStorage.` still passes.
6. The state machine test still passes.
7. End-to-end test: create a story, fill in the brief, submit (mocked Agent 1), review the draft, edit the prose, regenerate, approve, archive.
8. Bundle size is within 50KB of the previous version.

### Rollback for PR 3

Less trivial than PR 1 and 2 because user-visible URLs change. Rollback procedure:

1. Revert the PR.
2. The old routes are restored. The old pages render against the deprecated shims (which still exist in PR 2's state).
3. Stories created in the new format are still in `localStorage` under `dammah_stories_v1`. They won't be visible in the old dashboard because the old dashboard reads from `dammah_brief_drafts_v2`.
4. Manual rescue: if a specialist created stories during the brief window between PR 3 landing and rollback, their work is in `dammah_stories_v1`. A small script can extract the briefs and write them back into `dammah_brief_drafts_v2`. This is an edge case for the pilot but should be documented in the PR.

For the pilot, rollback risk is low because there's only one specialist actively creating data.

### Estimated time

**Eight days.** This is the largest PR by lines of code:

- Two days for the dashboard table and filtering.
- Three days for the Workspace shell, tabs, and the read-only Brief tab.
- Two days for the Draft tab including Agent 1 integration (against a stub if needed).
- One day for the History tab, redirects, end-to-end testing, polish.

---

## Total timeline

| PR | Estimate | Cumulative |
|---|---|---|
| PR 1 — Storage adapter | 2 days | 2 days |
| PR 2 — Story model | 4 days | 6 days |
| PR 3 — Routes and components | 8 days | 14 days |

**Roughly three weeks of focused work** for one engineer, with parallel time for review and integration testing. This assumes Agent 1 is being built in parallel (the dashboard PR 3 only needs Agent 1 to be invocable via a function call, not feature-complete).

## What this plan deliberately does not include

- **Server-side draft storage.** That's a future PR (PR 4, post-pilot). The `FirestoreDraftStore` implementation, the Express routes, the Firestore security rules. Documented in `03-storage-adapter.md` and `05-api-surface.md`, not implemented in this plan.
- **Real Agent 1 integration if Agent 1 isn't ready.** PR 3 ships against a stub. The cutover is a separate small change.
- **Multi-user collaboration.** Single specialist per Story.
- **Notifications.** No notification system in any of the three PRs.
- **Analytics.** No analytics events fired by any of the three PRs.

## CI gates that should not be skipped

Before any of these PRs can merge, CI must run and pass:

1. **The grep test for `localStorage.`** — added in PR 1, kept forever.
2. **The state machine test** — added in PR 2, kept forever.
3. **The token-discipline test from the Agent 1 spec set** — already exists, must keep passing throughout the dashboard work because the dashboard imports types from the brief model file.
4. **End-to-end test of the brief flow** — exists today against the old routes; in PR 3, it's rewritten against the new routes.

If any of these tests becomes flaky, fix the test or the code — do not skip it. Skipped tests for storage and state machines reliably correlate with production bugs in this kind of system.

Now read `07-out-of-scope.md`.
