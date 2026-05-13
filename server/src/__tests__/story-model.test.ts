import type { StoryBrief } from "@/models/storyBrief.model";
import {
  ALLOWED_TRANSITIONS,
  STORY_STATUSES,
  createStoryForGeneration,
  isTransitionAllowed,
} from "@/models/story.model";

// ---------------------------------------------------------------------------
// Minimal StoryBrief builder for factory tests
// ---------------------------------------------------------------------------

function makeMinimalBrief(overrides?: {
  storyType?: StoryBrief["storyType"];
  ageRange?: NonNullable<StoryBrief["ageAndScope"]>["ageRange"];
}): StoryBrief {
  return {
    storyType: overrides?.storyType ?? "fear_anxiety",
    ageAndScope: {
      ageRange: overrides?.ageRange ?? "5-7",
      peakIntensity: "moderate",
      storyLength: "standard",
    },
    // Remaining required fields are not accessed by the factory; cast is safe.
  } as unknown as StoryBrief;
}

// ============================================================================
// Group 1: State machine — isTransitionAllowed
// ============================================================================

describe("isTransitionAllowed", () => {
  test('draft_brief → generating is allowed', () => {
    expect(isTransitionAllowed("draft_brief", "generating")).toBe(true);
  });

  test('draft_brief → approved is NOT allowed', () => {
    expect(isTransitionAllowed("draft_brief", "approved")).toBe(false);
  });

  test('generating → awaiting_review is allowed', () => {
    expect(isTransitionAllowed("generating", "awaiting_review")).toBe(true);
  });

  test('generating → approved is NOT allowed', () => {
    expect(isTransitionAllowed("generating", "approved")).toBe(false);
  });

  test('in_review → needs_revision is allowed', () => {
    expect(isTransitionAllowed("in_review", "needs_revision")).toBe(true);
  });

  test('in_review → approved is allowed', () => {
    expect(isTransitionAllowed("in_review", "approved")).toBe(true);
  });

  test('in_review → draft_brief is NOT allowed', () => {
    expect(isTransitionAllowed("in_review", "draft_brief")).toBe(false);
  });

  test('approved → published is NOT allowed (must go through illustration pipeline)', () => {
    expect(isTransitionAllowed("approved", "published")).toBe(false);
  });

  // v1 illustration transitions (approved → prompt_review, prompt_review →
  // illustrating, illustrating → illustration_review, etc.) were removed in
  // cleanup PR 1. Phase 1 of the v2 redesign reintroduces a `illustration_workspace`
  // state — see docs/illustration/spec.md §9.3.

  test('illustration_ready → published is allowed', () => {
    expect(isTransitionAllowed("illustration_ready", "published")).toBe(true);
  });

  test('archived → draft_brief is allowed (restore)', () => {
    expect(isTransitionAllowed("archived", "draft_brief")).toBe(true);
  });

  test('archived → in_review is allowed', () => {
    expect(isTransitionAllowed("archived", "in_review")).toBe(true);
  });

  test('published → draft_brief is NOT allowed', () => {
    expect(isTransitionAllowed("published", "draft_brief")).toBe(false);
  });
});

// ============================================================================
// Group 2: Every ALLOWED_TRANSITIONS entry references valid StoryStatus values
// ============================================================================

describe("ALLOWED_TRANSITIONS integrity", () => {
  test("every transition's from and to are valid StoryStatus values", () => {
    const valid = new Set<string>(STORY_STATUSES);
    for (const t of ALLOWED_TRANSITIONS) {
      expect(valid.has(t.from)).toBe(true);
      expect(valid.has(t.to)).toBe(true);
    }
  });
});

// ============================================================================
// Group 3: No self-transitions
// ============================================================================

describe("no self-transitions", () => {
  test("isTransitionAllowed(status, status) is false for every status", () => {
    for (const status of STORY_STATUSES) {
      expect(isTransitionAllowed(status, status)).toBe(false);
    }
  });
});

// ============================================================================
// Group 4: createStoryForGeneration factory
// ============================================================================

describe("createStoryForGeneration", () => {
  const brief = makeMinimalBrief({ storyType: "fear_anxiety", ageRange: "7-9" });

  test("returns status === 'generating'", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.status).toBe("generating");
  });

  test("returns briefStatus === 'submitted'", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.briefStatus).toBe("submitted");
  });

  test("editHistory has exactly one entry with kind === 'brief_submitted'", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.editHistory).toHaveLength(1);
    expect(story.editHistory[0]?.event.kind).toBe("brief_submitted");
  });

  test("agent1Result is null", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.agent1Result).toBeNull();
  });

  test("pages is null on initial creation", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.pages).toBeNull();
  });

  test("agent1Versions is an empty array", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.agent1Versions).toEqual([]);
  });

  test("submittedAt is a number (not null)", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(typeof story.submittedAt).toBe("number");
    expect(story.submittedAt).not.toBeNull();
  });

  test("parentStoryId defaults to null when not provided", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.parentStoryId).toBeNull();
  });

  test("title defaults to 'Untitled story' when not provided", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.title).toBe("Untitled story");
  });

  test("storyType and ageRange are derived from the brief", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.storyType).toBe("fear_anxiety");
    expect(story.ageRange).toBe("7-9");
  });

  test("v2 illustration workspace fields are null on initial creation", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.illustrationPages).toBeNull();
    expect(story.currentVisualBibleVersion).toBeNull();
    expect(story.illustrationWorkspaceOpenedAt).toBeNull();
  });
});

// v1 toPageIllustrations helper and its tests were removed in cleanup PR 1.
