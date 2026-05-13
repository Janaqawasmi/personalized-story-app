import { createEmptyBrief, type CompleteBrief } from "../../../types/storyBrief";
import type { Story } from "../../../types/story";
import type { Agent1Result } from "../../../types/agent1Result";
import { HybridDraftStore } from "../HybridDraftStore";
import * as api from "../../../api/specialistStories";

jest.mock("../../../api/specialistStories");

const mockApi = api as jest.Mocked<typeof api>;
const STORAGE_KEY = "dammah_stories_v1";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

function readRegistry(): { stories: Record<string, Story> } {
  const raw = window["localStorage"].getItem(STORAGE_KEY);
  if (!raw) return { stories: {} };
  return JSON.parse(raw) as { stories: Record<string, Story> };
}

function seedLocalStories(stories: Story[]): void {
  const registry: { stories: Record<string, Story> } = { stories: {} };
  stories.forEach((story) => {
    registry.stories[story.id] = story;
  });
  window["localStorage"].setItem(STORAGE_KEY, JSON.stringify(registry));
}

function makeStory(overrides: Partial<Story> = {}): Story {
  const now = Date.now();
  return {
    id: overrides.id ?? `story-${Math.random().toString(36).slice(2)}`,
    ownerUid: overrides.ownerUid ?? "local",
    parentStoryId: overrides.parentStoryId ?? null,
    title: overrides.title ?? "Story title",
    storyType: overrides.storyType ?? "fear_anxiety",
    ageRange: overrides.ageRange ?? null,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "draft_brief",
    briefStatus: overrides.briefStatus ?? "draft",
    brief: overrides.brief ?? createEmptyBrief(),
    agent1Result: overrides.agent1Result ?? null,
    agent1Versions: overrides.agent1Versions ?? [],
    currentDraft: overrides.currentDraft ?? null,
    editHistory: overrides.editHistory ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastOpenedAt: overrides.lastOpenedAt ?? now,
    submittedAt: overrides.submittedAt ?? null,
    approvedAt: overrides.approvedAt ?? null,
    pages: overrides.pages ?? null,
    publishedAt: overrides.publishedAt ?? null,
    illustrationPages: overrides.illustrationPages ?? null,
    currentVisualBibleVersion: overrides.currentVisualBibleVersion ?? null,
    illustrationWorkspaceOpenedAt: overrides.illustrationWorkspaceOpenedAt ?? null,
  };
}

function makeAgent1Result(overrides: Partial<Agent1Result> = {}): Agent1Result {
  return {
    generationId: overrides.generationId ?? "gen-1",
    emotionalTruth: overrides.emotionalTruth ?? "Fear can feel huge but can shrink with support.",
    blueprint: overrides.blueprint ?? [
      { index: 1, text: "Setup" },
      { index: 2, text: "Worry appears" },
      { index: 3, text: "Support arrives" },
      { index: 4, text: "Practice tool" },
      { index: 5, text: "Small success" },
      { index: 6, text: "Calm ending" },
    ],
    copingToolPlacement: overrides.copingToolPlacement ?? "middle",
    approachInstruction: overrides.approachInstruction ?? "Use calm validating language.",
    title: overrides.title ?? "The Brave Lantern",
    story: overrides.story ?? "Story body",
    wordCount: overrides.wordCount ?? 420,
    targetWordRange: overrides.targetWordRange ?? [380, 450],
    wordCountDrift: overrides.wordCountDrift ?? "within_range",
    alignmentNote: overrides.alignmentNote ?? "Aligned to brief.",
    postValidationFlags: overrides.postValidationFlags ?? [],
    preCheckWarnings: overrides.preCheckWarnings ?? [],
    exampleBankStatus: overrides.exampleBankStatus ?? "examples_used",
    rerunCount: overrides.rerunCount ?? 0,
    totalLatencyMs: overrides.totalLatencyMs ?? 1500,
    llmCalls: overrides.llmCalls ?? [],
    generatedAt: overrides.generatedAt ?? new Date().toISOString(),
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("HybridDraftStore", () => {
  let store: HybridDraftStore;

  beforeAll(() => {
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, "crypto", {
        value: {},
      });
    }
    if (!globalThis.crypto.randomUUID) {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: () => `test-${Math.random().toString(36).slice(2)}`,
      });
    }
  });

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    mockApi.listStories.mockResolvedValue([]);
    mockApi.getStory.mockRejectedValue(new Error("not found"));
    mockApi.generateStory.mockResolvedValue(
      makeStory({ id: "generated-story", status: "awaiting_review", briefStatus: "submitted" }),
    );
    mockApi.updateStory.mockResolvedValue(makeStory({ id: "updated-server-story" }));
    mockApi.updateBrief.mockResolvedValue(makeStory({ id: "updated-server-brief" }));
    mockApi.transitionStory.mockResolvedValue(makeStory({ id: "transitioned-server-story" }));

    store = new HybridDraftStore();
  });

  describe("Group 1: createStory", () => {
    it("returns a draft_brief story with empty brief defaults", async () => {
      const story = await store.createStory();

      expect(story.id).toBeTruthy();
      expect(story.ownerUid).toBe("local");
      expect(story.status).toBe("draft_brief");
      expect(story.briefStatus).toBe("draft");
      expect(story.brief).toEqual(createEmptyBrief());
    });

    it("uses provided title when passed", async () => {
      const story = await store.createStory({ title: "My story" });
      expect(story.title).toBe("My story");
    });

    it('defaults title to "Untitled story" when not provided', async () => {
      const story = await store.createStory();
      expect(story.title).toBe("Untitled story");
    });

    it("persists to localStorage and getStory returns the same object", async () => {
      const created = await store.createStory({ title: "Persisted" });
      const fetched = await store.getStory(created.id);

      expect(fetched).toEqual(created);
      expect(mockApi.getStory).toHaveBeenCalledWith(created.id);
    });
  });

  describe("Group 2: getStory", () => {
    it("returns story from localStorage when present", async () => {
      const local = makeStory({ id: "local-1", title: "Local story" });
      seedLocalStories([local]);

      const fetched = await store.getStory(local.id);

      expect(fetched).toEqual(local);
      expect(mockApi.getStory).toHaveBeenCalledWith("local-1");
    });

    it("falls back to API when not found locally", async () => {
      const server = makeStory({ id: "server-1", ownerUid: "server-user", title: "Server story" });
      mockApi.getStory.mockResolvedValue(server);

      const fetched = await store.getStory(server.id);

      expect(mockApi.getStory).toHaveBeenCalledWith(server.id);
      expect(fetched).toEqual(server);
    });

    it("returns null when story exists nowhere", async () => {
      mockApi.getStory.mockRejectedValue(new Error("missing"));
      await expect(store.getStory("missing-story")).resolves.toBeNull();
    });

    it("does not cache server results in localStorage", async () => {
      const server = makeStory({ id: "server-no-cache", ownerUid: "server-user" });
      mockApi.getStory.mockResolvedValue(server);

      const first = await store.getStory(server.id);
      const second = await store.getStory(server.id);

      expect(first).toEqual(server);
      expect(second).toEqual(server);
      expect(mockApi.getStory).toHaveBeenCalledTimes(2);
      expect(readRegistry().stories[server.id]).toBeUndefined();
    });
  });

  describe("Group 3: listStories - merge and dedup", () => {
    it("returns local stories when only localStorage has data", async () => {
      const localA = makeStory({ id: "local-a" });
      const localB = makeStory({ id: "local-b" });
      seedLocalStories([localA, localB]);

      const stories = await store.listStories();

      expect(stories).toHaveLength(2);
      expect(stories.map((s) => s.id).sort()).toEqual(["local-a", "local-b"]);
    });

    it("returns server stories when only API has data", async () => {
      const serverA = makeStory({ id: "server-a", ownerUid: "server-user" });
      mockApi.listStories.mockResolvedValue([serverA]);

      const stories = await store.listStories();

      expect(stories).toEqual([serverA]);
    });

    it("merges local and server stories with no duplicates", async () => {
      const local = makeStory({ id: "local-merge" });
      const server = makeStory({ id: "server-merge", ownerUid: "server-user" });
      seedLocalStories([local]);
      mockApi.listStories.mockResolvedValue([server]);

      const stories = await store.listStories();

      expect(stories).toHaveLength(2);
      expect(new Set(stories.map((s) => s.id)).size).toBe(2);
    });

    it("dedups crash-recovery duplicates by keeping server copy and cleaning localStorage", async () => {
      const local = makeStory({ id: "same-id", title: "Local stale copy" });
      const server = makeStory({ id: "same-id", ownerUid: "server-user", title: "Server canonical copy" });
      seedLocalStories([local]);
      mockApi.listStories.mockResolvedValue([server]);
      mockApi.getStory.mockResolvedValue(server);

      const listed = await store.listStories();
      const fetched = await store.getStory("same-id");

      expect(listed).toEqual([server]);
      expect(readRegistry().stories["same-id"]).toBeUndefined();
      expect(fetched).toEqual(server);
      expect(mockApi.getStory).toHaveBeenCalledWith("same-id");
    });

    it("returns all local stories when API returns empty (UI filters archived)", async () => {
      const active = makeStory({ id: "active", status: "draft_brief" });
      const archived = makeStory({ id: "archived", status: "archived" });
      seedLocalStories([active, archived]);

      const stories = await store.listStories();

      expect(stories.map((s) => s.id).sort()).toEqual(["active", "archived"].sort());
    });

    it("returns only archived stories when statuses filter includes archived", async () => {
      const active = makeStory({ id: "active2", status: "draft_brief" });
      const archived = makeStory({ id: "archived2", status: "archived" });
      seedLocalStories([active, archived]);

      const stories = await store.listStories({ statuses: ["archived"] });

      expect(stories).toHaveLength(1);
      expect(stories[0].status).toBe("archived");
    });

    it("falls back to localStorage-only when API list fails", async () => {
      const local = makeStory({ id: "local-fallback" });
      seedLocalStories([local]);
      mockApi.listStories.mockRejectedValue(new Error("network down"));

      const stories = await store.listStories();

      expect(stories).toEqual([local]);
    });

    it("sorts by lastOpenedAt desc by default", async () => {
      const oldest = makeStory({ id: "oldest", lastOpenedAt: 100 });
      const newest = makeStory({ id: "newest", lastOpenedAt: 300 });
      const middle = makeStory({ id: "middle", lastOpenedAt: 200 });
      seedLocalStories([oldest, newest, middle]);

      const stories = await store.listStories();

      expect(stories.map((s) => s.id)).toEqual(["newest", "middle", "oldest"]);
    });

    it("filters by searchQuery against title", async () => {
      const one = makeStory({ id: "search-1", title: "Dragon adventure" });
      const two = makeStory({ id: "search-2", title: "Calm bedtime tale" });
      seedLocalStories([one, two]);

      const stories = await store.listStories({ searchQuery: "dragon" });

      expect(stories).toHaveLength(1);
      expect(stories[0].id).toBe("search-1");
    });

    it("filters by searchQuery against tags, population, and trigger", async () => {
      const withTag = makeStory({ id: "t1", title: "A", tags: ["separation"] });
      const withPop = makeStory({
        id: "t2",
        title: "B",
        brief: {
          ...createEmptyBrief(),
          section2: { population: "School refusal cohort" },
        },
      });
      const withTrig = makeStory({
        id: "t3",
        title: "C",
        brief: {
          ...createEmptyBrief(),
          section2: { trigger: "Loud thunder at night" },
        },
      });
      const other = makeStory({ id: "t4", title: "Unrelated" });
      seedLocalStories([withTag, withPop, withTrig, other]);

      const byTag = await store.listStories({ searchQuery: "separation" });
      expect(byTag.map((s) => s.id)).toEqual(["t1"]);

      const byPop = await store.listStories({ searchQuery: "refusal" });
      expect(byPop.map((s) => s.id)).toEqual(["t2"]);

      const byTrig = await store.listStories({ searchQuery: "thunder" });
      expect(byTrig.map((s) => s.id)).toEqual(["t3"]);
    });
  });

  describe("Group 4: updateStory - status guard", () => {
    it("updates title successfully", async () => {
      const local = makeStory({ id: "update-local", title: "Old" });
      seedLocalStories([local]);

      const updated = await store.updateStory(local.id, { title: "New" });

      expect(updated.title).toBe("New");
      expect(readRegistry().stories[local.id].title).toBe("New");
    });

    it("throws when patch includes direct status update", async () => {
      const local = makeStory({ id: "status-guard" });
      seedLocalStories([local]);

      await expect(
        store.updateStory(local.id, { status: "approved" } as Partial<Story>),
      ).rejects.toThrow("Direct status updates are not allowed.");
    });

    it("bumps updatedAt when updated", async () => {
      const local = makeStory({ id: "updated-at", updatedAt: 1 });
      seedLocalStories([local]);

      const updated = await store.updateStory(local.id, { title: "Changed" });

      expect(updated.updatedAt).toBeGreaterThan(1);
    });
  });

  describe("Group 5: updateBrief - briefStatus guard", () => {
    it("updates brief for draft stories", async () => {
      const local = makeStory({ id: "brief-draft", briefStatus: "draft" });
      seedLocalStories([local]);
      const nextBrief: CompleteBrief = {
        ...createEmptyBrief(),
        section2: { ...createEmptyBrief().section2, population: "Updated population" },
      };

      const updated = await store.updateBrief(local.id, nextBrief);

      expect(updated.brief.section2?.population).toBe("Updated population");
    });

    it("throws when briefStatus is submitted", async () => {
      const local = makeStory({ id: "brief-submitted", briefStatus: "submitted" });
      seedLocalStories([local]);

      await expect(store.updateBrief(local.id, createEmptyBrief())).rejects.toThrow(
        "Create a revision instead.",
      );
    });
  });

  describe("Group 6: submitBrief - Option C handoff", () => {
    it("calls generateStory with brief and parentStoryId", async () => {
      const local = makeStory({
        id: "submit-local",
        parentStoryId: "parent-123",
        status: "draft_brief",
        briefStatus: "draft",
      });
      seedLocalStories([local]);

      await store.submitBrief(local.id);

      expect(mockApi.generateStory).toHaveBeenCalledWith(
        "submit-local",
        local.brief,
        "parent-123",
      );
    });

    it("deletes local draft on success and returns server data", async () => {
      const local = makeStory({ id: "submit-success", status: "draft_brief" });
      const server = makeStory({
        id: "submit-success",
        ownerUid: "server-user",
        status: "awaiting_review",
        briefStatus: "submitted",
        agent1Result: makeAgent1Result(),
      });

      seedLocalStories([local]);
      mockApi.generateStory.mockResolvedValue(server);
      mockApi.getStory.mockResolvedValue(server);

      const submitted = await store.submitBrief(local.id);
      const fetchedAfter = await store.getStory(local.id);

      expect(submitted).toEqual(server);
      expect(submitted.status).toBe("awaiting_review");
      expect(submitted.agent1Result).not.toBeNull();
      expect(readRegistry().stories[local.id]).toBeUndefined();
      expect(fetchedAfter).toEqual(server);
    });

    it("preserves local draft and rethrows when API generation fails", async () => {
      const local = makeStory({ id: "submit-fail", status: "draft_brief" });
      seedLocalStories([local]);
      mockApi.generateStory.mockRejectedValue(new Error("generation failed"));

      await expect(store.submitBrief(local.id)).rejects.toThrow("generation failed");

      expect(readRegistry().stories[local.id]).toEqual(local);
      await expect(store.getStory(local.id)).resolves.toEqual(local);
      expect(mockApi.getStory).toHaveBeenCalledWith(local.id);
    });
  });

  describe("Group 7: transitionStatus", () => {
    it("allows legal local transitions and updates status", async () => {
      const local = makeStory({ id: "trans-local-ok", status: "draft_brief" });
      seedLocalStories([local]);

      const transitioned = await store.transitionStatus(local.id, "generating");

      expect(transitioned.status).toBe("generating");
    });

    it("throws on illegal local transition", async () => {
      const local = makeStory({ id: "trans-local-bad", status: "draft_brief" });
      seedLocalStories([local]);

      await expect(store.transitionStatus(local.id, "approved")).rejects.toThrow(
        "Cannot transition from draft_brief to approved.",
      );
    });

    it("appends regeneration_requested history entry when feedback is provided", async () => {
      const local = makeStory({ id: "trans-feedback", status: "in_review", editHistory: [] });
      seedLocalStories([local]);

      const transitioned = await store.transitionStatus(local.id, "needs_revision", {
        feedback: "Please reduce intensity.",
      });

      expect(transitioned.editHistory).toHaveLength(2);
      expect(transitioned.editHistory[0].event.kind).toBe("status_changed");
      expect(transitioned.editHistory[1].event).toEqual({
        kind: "regeneration_requested",
        feedback: "Please reduce intensity.",
      });
    });

    it("calls API transitionStory for server stories", async () => {
      const serverCurrent = makeStory({
        id: "server-trans",
        ownerUid: "server-user",
        status: "in_review",
      });
      const serverNext = makeStory({
        id: "server-trans",
        ownerUid: "server-user",
        status: "approved",
      });
      mockApi.getStory.mockResolvedValue(serverCurrent);
      mockApi.transitionStory.mockResolvedValue(serverNext);

      const transitioned = await store.transitionStatus("server-trans", "approved", {
        reviewer: "qa",
      });

      expect(mockApi.transitionStory).toHaveBeenCalledWith("server-trans", "approved", {
        reviewer: "qa",
      });
      expect(transitioned).toEqual(serverNext);
    });
  });

  describe("Group 8: deleteStory", () => {
    it("removes local stories", async () => {
      const local = makeStory({ id: "delete-local" });
      seedLocalStories([local]);

      await store.deleteStory(local.id);

      expect(readRegistry().stories[local.id]).toBeUndefined();
    });

    it("throws for server stories (pilot restriction)", async () => {
      const server = makeStory({ id: "delete-server", ownerUid: "server-user" });
      mockApi.getStory.mockResolvedValue(server);

      await expect(store.deleteStory(server.id)).rejects.toThrow(
        "Server-side delete is not implemented in the pilot.",
      );
    });
  });

  describe("Group 9: subscriptions", () => {
    it("calls subscribeToStory listeners on updateStory", async () => {
      const local = makeStory({ id: "sub-story", title: "Before" });
      seedLocalStories([local]);
      const callback = jest.fn();
      store.subscribeToStory(local.id, callback);

      await store.updateStory(local.id, { title: "After" });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].title).toBe("After");
    });

    it("calls subscribeToList listeners when a story is created", async () => {
      const callback = jest.fn();
      store.subscribeToList(callback);

      const created = await store.createStory({ title: "List update story" });
      await flushPromises();

      expect(callback).toHaveBeenCalled();
      const latestList = callback.mock.calls[callback.mock.calls.length - 1][0] as Story[];
      expect(latestList.some((s) => s.id === created.id)).toBe(true);
    });

    it("unsubscribe stops further callbacks", async () => {
      const local = makeStory({ id: "sub-unsub" });
      seedLocalStories([local]);
      const callback = jest.fn();

      const unsubscribe = store.subscribeToStory(local.id, callback);
      unsubscribe();
      await store.updateStory(local.id, { title: "Changed" });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
