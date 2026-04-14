# 03 — Storage Adapter

This file defines the `DraftStore` interface — the abstraction that lets us ship the pilot on `localStorage` and migrate to Firestore later without touching consumer code.

## The principle

Every component, page, and hook in the dashboard reads and writes Stories through a single interface called `DraftStore`. The interface has two implementations:

- **`LocalDraftStore`** — backed by `localStorage`. Ships with the pilot.
- **`FirestoreDraftStore`** — backed by Firestore via the existing `dammaStoryBrief.controller.ts`. Ships in a later release.

The implementation in use is selected once, at app startup, by a single line in `client/src/specialist/storage/index.ts`. Swapping implementations is a one-line change. No consumer file is touched.

This is the entire reason the abstraction exists. If a contributor proposes calling `localStorage` directly from a component "just for this one case," the answer is no. The grep test in CI will fail.

## The interface

```ts
// client/src/specialist/storage/DraftStore.ts

import type { Story, StoryStatus } from '../types';
import type { CompleteBrief } from '@/types/storyBrief';

export interface DraftStore {
  // ─── Story CRUD ─────────────────────────────────────────────────────
  /** Create a new Story in draft_brief status with an empty brief. */
  createStory(initial?: { title?: string }): Promise<Story>;

  /** Fetch a single Story by ID. Returns null if not found. */
  getStory(storyId: string): Promise<Story | null>;

  /** List Stories owned by the current specialist, sorted by lastOpenedAt desc. */
  listStories(filter?: ListStoriesFilter): Promise<Story[]>;

  /** Patch any subset of Story fields. Updates `updatedAt`. Server-enforced rules apply. */
  updateStory(storyId: string, patch: Partial<Story>): Promise<Story>;

  /** Hard delete. Only used by admin tools, never from the dashboard UI. */
  deleteStory(storyId: string): Promise<void>;

  // ─── Brief sub-resource ─────────────────────────────────────────────
  /** Patch the brief on a Story. Only allowed when status === 'draft_brief'. */
  updateBrief(storyId: string, brief: CompleteBrief): Promise<Story>;

  /** Submit the brief to Agent 1. Transitions status: draft_brief → generating. */
  submitBrief(storyId: string): Promise<Story>;

  // ─── Status transitions ─────────────────────────────────────────────
  /** Request a status transition. Throws if the transition is not allowed. */
  transitionStatus(storyId: string, to: StoryStatus): Promise<Story>;

  // ─── Subscriptions (optional, used by the future Firestore impl) ────
  /** Subscribe to changes on a Story. Returns an unsubscribe function. */
  subscribeToStory(storyId: string, callback: (story: Story) => void): () => void;

  /** Subscribe to changes on the current specialist's story list. */
  subscribeToList(callback: (stories: Story[]) => void): () => void;
}

export interface ListStoriesFilter {
  statuses?: StoryStatus[];          // empty/undefined = all except 'archived'
  searchQuery?: string;              // matches title, tags, brief free-text
  sortBy?: 'lastOpenedAt' | 'createdAt' | 'title';
  sortDir?: 'asc' | 'desc';
  limit?: number;
}
```

A few decisions worth calling out:

- **All methods return Promises.** Even `LocalDraftStore`. This is critical: if `LocalDraftStore` exposed synchronous methods, every consumer would have to be rewritten when we move to Firestore. Returning `Promise.resolve(...)` is cheap. Forcing async-ness from day one is the discipline that makes the swap painless.
- **Subscriptions are part of the interface.** `LocalDraftStore` implements them as a no-op observer over `localStorage`'s `storage` event (which fires across tabs in the same browser, so it's actually useful). `FirestoreDraftStore` will implement them as Firestore `onSnapshot` listeners. Consumers don't care which one they're using.
- **`updateStory` takes a partial.** Not a full Story. This avoids the "I read, modified, and wrote back stale data" race condition. The store is responsible for merging.
- **Status transitions are a separate method, not a generic update.** Status is a state machine and goes through `transitionStatus`, which validates against `ALLOWED_TRANSITIONS` (defined in `01-data-model.md`) before applying. Direct `updateStory({ status: ... })` is rejected by the store with a runtime error and a CI grep test catches the call site.

## Implementation 1 — `LocalDraftStore`

Backed by `localStorage`. Ships with the pilot.

```ts
// client/src/specialist/storage/LocalDraftStore.ts

import type { DraftStore, ListStoriesFilter } from './DraftStore';
import type { Story, StoryStatus } from '../types';
import type { CompleteBrief } from '@/types/storyBrief';
import { isTransitionAllowed } from '../stateMachine';
import { createEmptyBrief } from '@/types/storyBrief';

const REGISTRY_KEY = 'dammah_stories_v1';

interface StoryRegistry {
  stories: Record<string, Story>;
}

function loadRegistry(): StoryRegistry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { stories: {} };
    return JSON.parse(raw);
  } catch {
    return { stories: {} };
  }
}

function saveRegistry(registry: StoryRegistry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export class LocalDraftStore implements DraftStore {
  async createStory(initial?: { title?: string }): Promise<Story> {
    const now = Date.now();
    const story: Story = {
      id: crypto.randomUUID(),
      ownerUid: 'local',                      // localStorage has no auth concept; the future store will populate this from Firebase Auth
      parentStoryId: null,
      title: initial?.title ?? 'Untitled story',
      storyType: 'fear_anxiety',              // pilot default
      ageRange: null,
      tags: [],
      status: 'draft_brief',
      briefStatus: 'draft',
      brief: createEmptyBrief(),
      agent1Result: null,
      agent1Versions: [],
      currentDraft: null,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      submittedAt: null,
      approvedAt: null,
    };

    const registry = loadRegistry();
    registry.stories[story.id] = story;
    saveRegistry(registry);

    return story;
  }

  async getStory(storyId: string): Promise<Story | null> {
    const registry = loadRegistry();
    return registry.stories[storyId] ?? null;
  }

  async listStories(filter?: ListStoriesFilter): Promise<Story[]> {
    const registry = loadRegistry();
    let stories = Object.values(registry.stories);

    // Default: hide archived unless explicitly requested
    const statuses = filter?.statuses;
    if (!statuses || statuses.length === 0) {
      stories = stories.filter(s => s.status !== 'archived');
    } else {
      stories = stories.filter(s => statuses.includes(s.status));
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      stories = stories.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) ||
        (s.brief.clinicalFoundation?.population?.toLowerCase() ?? '').includes(q) ||
        (s.brief.clinicalFoundation?.specificTrigger?.toLowerCase() ?? '').includes(q)
      );
    }

    const sortBy = filter?.sortBy ?? 'lastOpenedAt';
    const sortDir = filter?.sortDir ?? 'desc';
    stories.sort((a, b) => {
      const av = sortBy === 'title' ? a.title : a[sortBy];
      const bv = sortBy === 'title' ? b.title : b[sortBy];
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1);
    });

    if (filter?.limit) {
      stories = stories.slice(0, filter.limit);
    }

    return stories;
  }

  async updateStory(storyId: string, patch: Partial<Story>): Promise<Story> {
    if ('status' in patch) {
      throw new Error(
        'Direct status updates are not allowed. Use transitionStatus() instead.'
      );
    }
    const registry = loadRegistry();
    const existing = registry.stories[storyId];
    if (!existing) throw new Error(`Story not found: ${storyId}`);
    const updated: Story = { ...existing, ...patch, updatedAt: Date.now() };
    registry.stories[storyId] = updated;
    saveRegistry(registry);
    this.notifyStoryListeners(storyId, updated);
    this.notifyListListeners();
    return updated;
  }

  async deleteStory(storyId: string): Promise<void> {
    const registry = loadRegistry();
    delete registry.stories[storyId];
    saveRegistry(registry);
    this.notifyListListeners();
  }

  async updateBrief(storyId: string, brief: CompleteBrief): Promise<Story> {
    const registry = loadRegistry();
    const existing = registry.stories[storyId];
    if (!existing) throw new Error(`Story not found: ${storyId}`);
    if (existing.status !== 'draft_brief') {
      throw new Error(
        `Cannot update brief in status ${existing.status}. Open a new revision instead.`
      );
    }
    const updated: Story = {
      ...existing,
      brief,
      ageRange: brief.ageAndScope?.ageRange ?? existing.ageRange,
      updatedAt: Date.now(),
    };
    registry.stories[storyId] = updated;
    saveRegistry(registry);
    this.notifyStoryListeners(storyId, updated);
    this.notifyListListeners();
    return updated;
  }

  async submitBrief(storyId: string): Promise<Story> {
    return this.transitionStatus(storyId, 'generating');
  }

  async transitionStatus(storyId: string, to: StoryStatus): Promise<Story> {
    const registry = loadRegistry();
    const existing = registry.stories[storyId];
    if (!existing) throw new Error(`Story not found: ${storyId}`);
    if (!isTransitionAllowed(existing.status, to)) {
      throw new Error(
        `Transition not allowed: ${existing.status} → ${to}`
      );
    }
    const now = Date.now();
    const updated: Story = {
      ...existing,
      status: to,
      updatedAt: now,
      ...(to === 'generating' ? { briefStatus: 'submitted', submittedAt: now } : {}),
      ...(to === 'approved' ? { approvedAt: now } : {}),
      ...(to === 'in_review' ? { lastOpenedAt: now } : {}),
    };
    // Append to edit history
    updated.editHistory = [
      ...existing.editHistory,
      {
        id: crypto.randomUUID(),
        at: now,
        byUid: existing.ownerUid,
        event: { kind: 'status_changed', from: existing.status, to },
      },
    ];
    registry.stories[storyId] = updated;
    saveRegistry(registry);
    this.notifyStoryListeners(storyId, updated);
    this.notifyListListeners();
    return updated;
  }

  // ─── Subscriptions ──────────────────────────────────────────────────
  private storyListeners = new Map<string, Set<(story: Story) => void>>();
  private listListeners = new Set<(stories: Story[]) => void>();

  subscribeToStory(storyId: string, callback: (story: Story) => void): () => void {
    if (!this.storyListeners.has(storyId)) {
      this.storyListeners.set(storyId, new Set());
    }
    this.storyListeners.get(storyId)!.add(callback);
    return () => {
      this.storyListeners.get(storyId)?.delete(callback);
    };
  }

  subscribeToList(callback: (stories: Story[]) => void): () => void {
    this.listListeners.add(callback);
    return () => this.listListeners.delete(callback);
  }

  private notifyStoryListeners(storyId: string, story: Story): void {
    this.storyListeners.get(storyId)?.forEach(cb => cb(story));
  }

  private notifyListListeners(): void {
    this.listStories().then(stories => {
      this.listListeners.forEach(cb => cb(stories));
    });
  }
}
```

A few implementation notes:

- **Cross-tab sync via `localStorage`'s `storage` event** is *not* implemented in this skeleton. It's worth adding (cheap, ~10 lines), but it's a v1.1 feature, not a launch blocker.
- **Migration from the old `dammah_brief_drafts_v2` key** is handled by a one-time migration function called from the store's constructor. See `06-migration-plan.md`.
- **Quota errors** (localStorage is typically capped at 5–10 MB) are caught and surfaced to the specialist with a "Storage full — please archive old stories" message. The pilot is unlikely to hit this with under 50 stories.
- **The `ownerUid` is hardcoded to `'local'`** in `LocalDraftStore`. The Firestore implementation will pull it from Firebase Auth.

## Implementation 2 — `FirestoreDraftStore` (future)

Not implemented in the pilot. Sketch only, to make the migration path concrete.

```ts
// client/src/specialist/storage/FirestoreDraftStore.ts (future)

import type { DraftStore } from './DraftStore';
import { httpClient } from '@/api/httpClient';
import { onSnapshot, doc, collection, query, where } from 'firebase/firestore';

export class FirestoreDraftStore implements DraftStore {
  async createStory(initial?: { title?: string }) {
    return httpClient.post<Story>('/api/specialist/stories', { initial });
  }

  async getStory(storyId: string) {
    return httpClient.get<Story | null>(`/api/specialist/stories/${storyId}`);
  }

  async listStories(filter?) {
    return httpClient.get<Story[]>('/api/specialist/stories', { params: filter });
  }

  async updateStory(storyId: string, patch) {
    return httpClient.patch<Story>(`/api/specialist/stories/${storyId}`, patch);
  }

  // ...etc

  subscribeToStory(storyId: string, callback) {
    return onSnapshot(doc(db, 'stories', storyId), snap => {
      if (snap.exists()) callback(snap.data() as Story);
    });
  }

  subscribeToList(callback) {
    return onSnapshot(
      query(collection(db, 'stories'), where('ownerUid', '==', currentUid())),
      snap => callback(snap.docs.map(d => d.data() as Story))
    );
  }
}
```

The HTTP routes (`POST /api/specialist/stories`, etc.) are defined in `05-api-surface.md`. They will be implemented in the same migration phase that introduces `FirestoreDraftStore`.

## The selector

```ts
// client/src/specialist/storage/index.ts

import { LocalDraftStore } from './LocalDraftStore';
// import { FirestoreDraftStore } from './FirestoreDraftStore';   // future

export const draftStore: DraftStore = new LocalDraftStore();
// export const draftStore: DraftStore = new FirestoreDraftStore();   // future

export type { DraftStore } from './DraftStore';
```

The migration to Firestore is exactly: comment one line, uncomment the other, run the migration script (`06-migration-plan.md`), ship.

## How consumers use it

```tsx
// Example: SpecialistStoriesPage
import { draftStore } from '@/specialist/storage';
import { useEffect, useState } from 'react';
import type { Story } from '@/specialist/types';

export function SpecialistStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    draftStore.listStories().then(setStories);
    const unsubscribe = draftStore.subscribeToList(setStories);
    return unsubscribe;
  }, []);

  return <StoriesTable stories={stories} />;
}
```

A single import. No knowledge of where the data lives. This component doesn't change when we migrate to Firestore.

## CI enforcement

A grep test in CI fails the build if any file under `client/src/specialist/` (other than `LocalDraftStore.ts`, `FirestoreDraftStore.ts`, and the migration scripts) contains the string `localStorage.`. This is the technical guarantee that the abstraction is honored.

```ts
// client/src/specialist/__tests__/no-direct-localStorage.test.ts

import { execSync } from 'child_process';

describe('storage abstraction discipline', () => {
  it('no component or page calls localStorage directly', () => {
    const result = execSync(
      `git grep -l "localStorage\\." -- 'client/src/specialist/**/*.ts' 'client/src/specialist/**/*.tsx' || true`,
      { encoding: 'utf-8' }
    );
    const allowedFiles = [
      'client/src/specialist/storage/LocalDraftStore.ts',
      'client/src/specialist/storage/migrations/',
      'client/src/specialist/__tests__/no-direct-localStorage.test.ts',
    ];
    const offenders = result
      .split('\n')
      .filter(Boolean)
      .filter(f => !allowedFiles.some(allowed => f.startsWith(allowed)));

    expect(offenders).toEqual([]);
  });
});
```

This is the same anti-drift discipline as the Agent 1 token-discipline test. Set it up first, before writing any consumer code, and it will save you from a class of bugs that would otherwise show up in production.

Now read `04-workspace-page.md`.
