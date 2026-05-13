import {
  isTransitionAllowed,
  ALLOWED_TRANSITIONS,
  STORY_STATUSES,
  BRIEF_STATUSES,
} from "../story";

// ============================================================================
// Category 1: Positive tests — every allowed transition returns true
// ============================================================================

describe("isTransitionAllowed — allowed transitions", () => {
  test.each(ALLOWED_TRANSITIONS)(
    "$from → $to returns true",
    ({ from, to }) => {
      expect(isTransitionAllowed(from, to)).toBe(true);
    },
  );
});

// ============================================================================
// Category 2: Negative tests — every illegal pair returns false
// ============================================================================

describe("isTransitionAllowed — illegal transitions", () => {
  const allPairs = STORY_STATUSES.flatMap((from) =>
    STORY_STATUSES.map((to) => ({ from, to })),
  );

  const illegalPairs = allPairs.filter(
    ({ from, to }) =>
      !ALLOWED_TRANSITIONS.some((t) => t.from === from && t.to === to),
  );

  test("illegal pairs count matches n² minus allowed edges", () => {
    expect(illegalPairs).toHaveLength(
      STORY_STATUSES.length * STORY_STATUSES.length - ALLOWED_TRANSITIONS.length,
    );
  });

  test.each(illegalPairs)(
    "$from → $to returns false",
    ({ from, to }) => {
      expect(isTransitionAllowed(from, to)).toBe(false);
    },
  );
});

// ============================================================================
// Category 3: Structural assertions on the constants
// ============================================================================

describe("STORY_STATUSES structure", () => {
  test("matches specialist + illustration pipeline ordering", () => {
    expect(STORY_STATUSES).toEqual([
      "draft_brief",
      "generating",
      "awaiting_review",
      "in_review",
      "needs_revision",
      "approved",
      "illustration_workspace",
      "illustration_ready",
      "published",
      "archived",
    ]);
  });

  test.each([
    "draft_brief",
    "generating",
    "awaiting_review",
    "in_review",
    "needs_revision",
    "approved",
    "illustration_workspace",
    "illustration_ready",
    "published",
    "archived",
  ] as const)('contains "%s"', (status) => {
    expect(STORY_STATUSES).toContain(status);
  });
});

describe("BRIEF_STATUSES structure", () => {
  test("has exactly 2 entries", () => {
    expect(BRIEF_STATUSES).toHaveLength(2);
  });

  test('contains "draft"', () => {
    expect(BRIEF_STATUSES).toContain("draft");
  });

  test('contains "submitted"', () => {
    expect(BRIEF_STATUSES).toContain("submitted");
  });
});

describe("ALLOWED_TRANSITIONS structure", () => {
  test("every 'from' value is a member of STORY_STATUSES", () => {
    for (const { from } of ALLOWED_TRANSITIONS) {
      expect(STORY_STATUSES).toContain(from);
    }
  });

  test("every 'to' value is a member of STORY_STATUSES", () => {
    for (const { to } of ALLOWED_TRANSITIONS) {
      expect(STORY_STATUSES).toContain(to);
    }
  });

  test("contains no duplicate (from, to) pairs", () => {
    const seen = new Set<string>();
    for (const { from, to } of ALLOWED_TRANSITIONS) {
      const key = `${from}→${to}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
