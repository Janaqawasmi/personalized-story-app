// client/src/specialist/storage/HybridDraftStore.ts
//
// Concrete DraftStore for the Option C architecture.
// - localStorage for draft_brief stories (pre-submission)
// - Specialist stories API for post-submission stories
// - Merge in listStories; server wins on conflict

import type { DraftStore, ListStoriesFilter } from "./DraftStore";
import type { Story, StoryStatus, EditHistoryEntry } from "../../types/story";
import { isTransitionAllowed } from "../../types/story";
import type { CompleteBrief } from "../../types/storyBrief";
import { createEmptyBrief } from "../../types/storyBrief";
import * as apiClient from "../../api/specialistStories";
import type { Agent1RegenerationPayload } from "../../api/specialistStories";
import { buildSpecialistSnapshotFields } from "../utils/specialistVersionSnapshot";
import { storyMatchesSearchQuery } from "../utils/storySearchMatch";

// ============================================================================
// localStorage registry
// ============================================================================

const STORAGE_KEY = "dammah_stories_v1";

interface StoryRegistry {
  stories: Record<string, Story>;
}

function loadRegistry(): StoryRegistry {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stories: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.stories) {
      return parsed as StoryRegistry;
    }
    return { stories: {} };
  } catch {
    return { stories: {} };
  }
}

function saveRegistry(registry: StoryRegistry): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}

// ============================================================================
// HybridDraftStore
// ============================================================================

export class HybridDraftStore implements DraftStore {
  /** Set when the most recent server fetch fails. Cleared on success. */
  lastServerError: string | null = null;

  private storyListeners = new Map<string, Set<(story: Story) => void>>();
  private listListeners = new Set<(stories: Story[]) => void>();

  // ─── Story CRUD ─────────────────────────────────────────────────────────────

  async createStory(initial?: { title?: string }): Promise<Story> {
    const now = Date.now();
    const story: Story = {
      id: crypto.randomUUID(),
      ownerUid: "local",
      parentStoryId: null,
      title: initial?.title ?? "Untitled story",
      storyType: "fear_anxiety", // pilot default
      ageRange: null,
      tags: [],
      status: "draft_brief",
      briefStatus: "draft",
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
      pages: null,
      publishedAt: null,
      publishedTemplateId: null,
      illustrationPages: null,
      currentVisualBibleVersion: null,
      illustrationWorkspaceOpenedAt: null,
    };

    const registry = loadRegistry();
    registry.stories[story.id] = story;
    saveRegistry(registry);

    this.notifyListListeners();
    return story;
  }

  async getStory(storyId: string): Promise<Story | null> {
    try {
      const server = await apiClient.getStory(storyId);
      const registry = loadRegistry();
      if (registry.stories[storyId]) {
        delete registry.stories[storyId];
        saveRegistry(registry);
      }
      return server;
    } catch {
      // Offline, 404, or API error — use local draft if present
    }

    const registry = loadRegistry();
    return registry.stories[storyId] ?? null;
  }

  async listStories(filter?: ListStoriesFilter): Promise<Story[]> {
    const registry = loadRegistry();
    const localStories = Object.values(registry.stories);

    let serverStories: Story[] = [];
    try {
      serverStories = await apiClient.listStories();
      this.lastServerError = null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch server stories:", msg);
      this.lastServerError = msg;
    }

    // Merge: server wins on conflict, silently clean up localStorage duplicates
    const serverIds = new Set(serverStories.map((s) => s.id));
    let registryChanged = false;
    const dedupedLocal = localStories.filter((s) => {
      if (serverIds.has(s.id)) {
        delete registry.stories[s.id];
        registryChanged = true;
        return false;
      }
      return true;
    });
    if (registryChanged) {
      saveRegistry(registry);
    }

    let merged = [...dedupedLocal, ...serverStories];

    // Status filter — if statuses are specified, apply them; otherwise return all
    // (SpecialistStoriesPage.applyFilters() excludes archived by default)
    if (filter?.statuses && filter.statuses.length > 0) {
      const allowed = new Set(filter.statuses);
      merged = merged.filter((s) => allowed.has(s.status));
    }

    // Search query — client-side since the API doesn't support it
    if (filter?.searchQuery?.trim()) {
      merged = merged.filter((s) => storyMatchesSearchQuery(s, filter.searchQuery!));
    }

    // Sort
    const sortBy = filter?.sortBy ?? "lastOpenedAt";
    const sortDir = filter?.sortDir ?? "desc";
    const dir = sortDir === "asc" ? 1 : -1;
    merged.sort((a, b) => {
      if (sortBy === "title") {
        return dir * a.title.localeCompare(b.title);
      }
      return dir * ((a[sortBy] as number) - (b[sortBy] as number));
    });

    // Limit
    if (filter?.limit != null && filter.limit > 0) {
      merged = merged.slice(0, filter.limit);
    }

    return merged;
  }

  async updateStory(storyId: string, patch: Partial<Story>): Promise<Story> {
    if ("status" in patch) {
      throw new Error(
        "Direct status updates are not allowed. Use transitionStatus() instead.",
      );
    }

    const registry = loadRegistry();
    const local = registry.stories[storyId];

    if (local) {
      const updated: Story = { ...local, ...patch, updatedAt: Date.now() };
      registry.stories[storyId] = updated;
      saveRegistry(registry);
      this.notifyStoryListeners(storyId, updated);
      this.notifyListListeners();
      return updated;
    }

    // Route to API for server stories — only API-patchable fields are forwarded
    const { title, tags, lastOpenedAt, currentDraft } = patch;
    return await apiClient.updateStory(storyId, {
      title,
      tags,
      lastOpenedAt,
      currentDraft,
    });
  }

  async deleteStory(storyId: string): Promise<void> {
    const registry = loadRegistry();

    if (registry.stories[storyId]) {
      delete registry.stories[storyId];
      saveRegistry(registry);
      this.notifyListListeners();
      return;
    }

    // Check if it exists on the server
    try {
      await apiClient.getStory(storyId);
      throw new Error(
        "Server-side delete is not implemented in the pilot. " +
          "Use transitionStatus to archive instead.",
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("not implemented")) {
        throw err;
      }
      throw new Error(`Story ${storyId} not found.`);
    }
  }

  // ─── Brief sub-resource ─────────────────────────────────────────────────────

  async updateBrief(storyId: string, brief: CompleteBrief): Promise<Story> {
    const registry = loadRegistry();
    const local = registry.stories[storyId];

    if (local) {
      if (local.briefStatus !== "draft") {
        throw new Error(
          "Cannot update a submitted brief. Create a revision instead.",
        );
      }

      const updated: Story = { ...local, brief, updatedAt: Date.now() };
      registry.stories[storyId] = updated;
      saveRegistry(registry);
      this.notifyStoryListeners(storyId, updated);
      this.notifyListListeners();
      return updated;
    }

    // Server draft story (e.g. generation failed and reverted to draft_brief)
    const updated = await apiClient.updateBrief(storyId, brief);
    this.notifyStoryListeners(storyId, updated);
    this.notifyListListeners();
    return updated;
  }

  async submitBrief(storyId: string): Promise<Story> {
    const registry = loadRegistry();
    const local = registry.stories[storyId];

    if (local) {
      if (local.status !== "draft_brief") {
        throw new Error("Story is not in draft_brief status.");
      }

      // On failure the local draft is preserved — generateStory throws before
      // we reach the delete below.
      const serverStory = await apiClient.generateStory(
        storyId,
        local.brief,
        local.parentStoryId ?? undefined,
      );

      // Success — delete the localStorage draft
      delete registry.stories[storyId];
      saveRegistry(registry);

      this.notifyStoryListeners(storyId, serverStory);
      this.notifyListListeners();

      return serverStory;
    }

    // Story may already exist on server (e.g. prior failed generation)
    const serverDraft = await apiClient.getStory(storyId);
    if (serverDraft.status !== "draft_brief") {
      throw new Error("Story is not in draft_brief status.");
    }

    const serverStory = await apiClient.generateStory(
      storyId,
      serverDraft.brief,
      serverDraft.parentStoryId ?? undefined,
    );
    this.notifyStoryListeners(storyId, serverStory);
    this.notifyListListeners();
    return serverStory;
  }

  async runAgent1Regeneration(
    storyId: string,
    payload: Agent1RegenerationPayload,
  ): Promise<Story> {
    const registry = loadRegistry();
    if (registry.stories[storyId]) {
      throw new Error(
        "Agent 1 regeneration runs on the server. Submit the brief first.",
      );
    }

    const current = await apiClient.getStory(storyId);
    if (current.status !== "needs_revision") {
      throw new Error(
        `Cannot run regeneration: story status is '${current.status}', expected needs_revision.`,
      );
    }

    const serverStory = await apiClient.generateStory(
      storyId,
      current.brief,
      current.parentStoryId ?? undefined,
      payload,
    );
    this.notifyStoryListeners(storyId, serverStory);
    this.notifyListListeners();
    return serverStory;
  }

  // ─── Status transitions ─────────────────────────────────────────────────────

  async transitionStatus(
    storyId: string,
    to: StoryStatus,
    metadata?: Record<string, unknown>,
  ): Promise<Story> {
    const registry = loadRegistry();
    const local = registry.stories[storyId];

    if (local) {
      if (!isTransitionAllowed(local.status, to)) {
        throw new Error(
          `Cannot transition from ${local.status} to ${to}.`,
        );
      }

      let base: Story = local;
      if (to === "needs_revision" && metadata?.feedback) {
        const snap = buildSpecialistSnapshotFields(local);
        if (snap) {
          base = { ...local, ...snap };
        }
      }

      const now = Date.now();
      const newHistory: EditHistoryEntry[] = [
        ...base.editHistory,
        {
          id: crypto.randomUUID(),
          at: now,
          byUid: local.ownerUid,
          event: { kind: "status_changed", from: local.status, to },
        },
      ];

      if (to === "needs_revision" && metadata?.feedback) {
        newHistory.push({
          id: crypto.randomUUID(),
          at: now,
          byUid: local.ownerUid,
          event: {
            kind: "regeneration_requested",
            feedback: String(metadata.feedback).trim(),
          },
        });
      }

      const updated: Story = {
        ...base,
        status: to,
        updatedAt: now,
        editHistory: newHistory,
      };

      registry.stories[storyId] = updated;
      saveRegistry(registry);
      this.notifyStoryListeners(storyId, updated);
      this.notifyListListeners();
      return updated;
    }

    // Server story — fetch current status to validate, then transition via API
    let serverStory: Story;
    try {
      serverStory = await apiClient.getStory(storyId);
    } catch {
      throw new Error(`Story ${storyId} not found.`);
    }

    if (!isTransitionAllowed(serverStory.status, to)) {
      throw new Error(
        `Cannot transition from ${serverStory.status} to ${to}.`,
      );
    }

    return apiClient.transitionStory(storyId, to, metadata);
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────────

  // TODO v1.1: Cross-tab sync via storage event

  subscribeToStory(
    storyId: string,
    callback: (story: Story) => void,
  ): () => void {
    let listeners = this.storyListeners.get(storyId);
    if (!listeners) {
      listeners = new Set();
      this.storyListeners.set(storyId, listeners);
    }
    listeners.add(callback);

    return () => {
      listeners!.delete(callback);
      if (listeners!.size === 0) {
        this.storyListeners.delete(storyId);
      }
    };
  }

  subscribeToList(callback: (stories: Story[]) => void): () => void {
    this.listListeners.add(callback);
    return () => {
      this.listListeners.delete(callback);
    };
  }

  // ─── Private notification helpers ───────────────────────────────────────────

  private notifyStoryListeners(storyId: string, story: Story): void {
    const listeners = this.storyListeners.get(storyId);
    if (!listeners) return;
    listeners.forEach((cb) => cb(story));
  }

  // TODO: Debounce list refresh for production
  private notifyListListeners(): void {
    if (this.listListeners.size === 0) return;
    this.listStories().then(
      (stories) => {
        this.listListeners.forEach((cb) => cb(stories));
      },
      (err) => {
        console.error("Failed to refresh story list for listeners:", err);
      },
    );
  }
}
