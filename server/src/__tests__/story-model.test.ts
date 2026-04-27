import type { StoryBrief } from "@/models/storyBrief.model";
import {
  ALLOWED_TRANSITIONS,
  STORY_STATUSES,
  createStoryForGeneration,
  isTransitionAllowed,
  toPageIllustrations,
} from "@/models/story.model";
import type { StoryPage } from "@/agent1/types";

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

  test('approved → pages_review is allowed', () => {
    expect(isTransitionAllowed("approved", "pages_review")).toBe(true);
  });

  test('pages_review → illustrating is allowed', () => {
    expect(isTransitionAllowed("pages_review", "illustrating")).toBe(true);
  });

  test('illustrating → illustration_review is allowed', () => {
    expect(isTransitionAllowed("illustrating", "illustration_review")).toBe(true);
  });

  test('illustrating → pages_review is allowed (catastrophic failure fallback)', () => {
    expect(isTransitionAllowed("illustrating", "pages_review")).toBe(true);
  });

  test('illustration_review → illustration_ready is allowed', () => {
    expect(isTransitionAllowed("illustration_review", "illustration_ready")).toBe(true);
  });

  test('illustration_review → illustrating is allowed (re-trigger failed pages)', () => {
    expect(isTransitionAllowed("illustration_review", "illustrating")).toBe(true);
  });

  test('illustration_ready → published is allowed', () => {
    expect(isTransitionAllowed("illustration_ready", "published")).toBe(true);
  });

  test('illustration_ready → illustration_review is allowed (reopen review)', () => {
    expect(isTransitionAllowed("illustration_ready", "illustration_review")).toBe(true);
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

  test("visualBible is null on initial creation", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.visualBible).toBeNull();
  });

  test("illustrationSeed is null on initial creation", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.illustrationSeed).toBeNull();
  });

  test("illustration timestamps are all null on initial creation", () => {
    const story = createStoryForGeneration({ id: "s1", ownerUid: "u1", brief });
    expect(story.promptsGeneratedAt).toBeNull();
    expect(story.promptsApprovedAt).toBeNull();
    expect(story.illustrationCompletedAt).toBeNull();
    expect(story.illustrationReadyAt).toBeNull();
  });
});

// ============================================================================
// Group 5: toPageIllustrations helper
// ============================================================================

describe("toPageIllustrations", () => {
  const storyPages: StoryPage[] = [
    { pageNumber: 1, text: "The rabbit looked up.", wordCount: 4 },
    { pageNumber: 2, text: "She stepped outside.", wordCount: 3 },
  ];

  test("returns same number of pages as input", () => {
    const result = toPageIllustrations(storyPages);
    expect(result).toHaveLength(2);
  });

  test("preserves StoryPage base fields", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.pageNumber).toBe(1);
    expect(result[0]?.text).toBe("The rabbit looked up.");
    expect(result[0]?.wordCount).toBe(4);
  });

  test("imagePrompt defaults to null", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.imagePrompt).toBeNull();
    expect(result[1]?.imagePrompt).toBeNull();
  });

  test("promptStatus defaults to 'pending'", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.promptStatus).toBe("pending");
    expect(result[1]?.promptStatus).toBe("pending");
  });

  test("promptRejectionNote defaults to null", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.promptRejectionNote).toBeNull();
  });

  test("illustrationUrl defaults to null", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.illustrationUrl).toBeNull();
  });

  test("illustrationStatus defaults to 'pending'", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.illustrationStatus).toBe("pending");
  });

  test("illustrationRejectionNote defaults to null", () => {
    const result = toPageIllustrations(storyPages);
    expect(result[0]?.illustrationRejectionNote).toBeNull();
  });

  test("empty array returns empty array", () => {
    expect(toPageIllustrations([])).toEqual([]);
  });
});
