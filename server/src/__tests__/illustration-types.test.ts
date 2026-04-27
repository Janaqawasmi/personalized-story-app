import type {
  PageIllustration,
  PromptStatus,
  IllustrationStatus,
  VisualBible,
} from "@/models/story.model";
import type { StoryPage } from "@/agent1/types";

// ============================================================================
// PromptStatus
// ============================================================================

describe("PromptStatus", () => {
  test("accepts all valid values", () => {
    const values: PromptStatus[] = ["pending", "approved", "rejected"];
    expect(values).toHaveLength(3);
  });
});

// ============================================================================
// IllustrationStatus
// ============================================================================

describe("IllustrationStatus", () => {
  test("accepts all valid values", () => {
    const values: IllustrationStatus[] = [
      "pending",
      "generating",
      "done",
      "failed",
    ];
    expect(values).toHaveLength(4);
  });
});

// ============================================================================
// PageIllustration
// ============================================================================

function makePageIllustration(
  overrides?: Partial<PageIllustration>,
): PageIllustration {
  return {
    pageNumber: 1,
    text: "The rabbit looked up.",
    wordCount: 4,
    imagePrompt: null,
    promptStatus: "pending",
    promptRejectionNote: null,
    illustrationUrl: null,
    illustrationStatus: "pending",
    illustrationRejectionNote: null,
    ...overrides,
  };
}

describe("PageIllustration", () => {
  test("has all StoryPage base fields", () => {
    const page = makePageIllustration();
    expect(typeof page.pageNumber).toBe("number");
    expect(typeof page.text).toBe("string");
    expect(typeof page.wordCount).toBe("number");
  });

  test("imagePrompt is null when not yet generated", () => {
    const page = makePageIllustration();
    expect(page.imagePrompt).toBeNull();
  });

  test("promptStatus defaults to 'pending'", () => {
    const page = makePageIllustration();
    expect(page.promptStatus).toBe("pending");
  });

  test("promptRejectionNote is null when not rejected", () => {
    const page = makePageIllustration();
    expect(page.promptRejectionNote).toBeNull();
  });

  test("illustrationUrl is null when not yet generated", () => {
    const page = makePageIllustration();
    expect(page.illustrationUrl).toBeNull();
  });

  test("illustrationStatus defaults to 'pending'", () => {
    const page = makePageIllustration();
    expect(page.illustrationStatus).toBe("pending");
  });

  test("illustrationRejectionNote is null when not rejected", () => {
    const page = makePageIllustration();
    expect(page.illustrationRejectionNote).toBeNull();
  });

  test("approved state — prompt and url populated", () => {
    const page = makePageIllustration({
      imagePrompt: "A small rabbit in a moonlit field, watercolour style.",
      promptStatus: "approved",
      illustrationUrl: "https://storage.example.com/page-1.png",
      illustrationStatus: "done",
    });
    expect(page.promptStatus).toBe("approved");
    expect(page.imagePrompt).not.toBeNull();
    expect(page.illustrationUrl).not.toBeNull();
    expect(page.illustrationStatus).toBe("done");
  });

  test("rejected state — rejection note populated", () => {
    const page = makePageIllustration({
      imagePrompt: "A dark scary creature.",
      promptStatus: "rejected",
      promptRejectionNote: "Prompt is too intense for the age range.",
    });
    expect(page.promptStatus).toBe("rejected");
    expect(page.promptRejectionNote).toBe(
      "Prompt is too intense for the age range.",
    );
  });
});

// ============================================================================
// VisualBible
// ============================================================================

function makeVisualBible(overrides?: Partial<VisualBible>): VisualBible {
  return {
    protagonist:
      "A small brown rabbit with floppy ears and a white cotton tail.",
    styleGuide:
      "Soft watercolour, warm earthy tones, gentle rounded shapes, no harsh lines.",
    environmentRegistry: {
      bedroom: "Cosy bedroom with wooden floorboards and a patchwork quilt.",
      garden: "Sunny garden with tall grass and daisies.",
    },
    palette: "#F5E6C8, #A8C5A0, #7B5EA7, #E8A87C",
    generatedAt: Date.now(),
    ...overrides,
  };
}

describe("VisualBible", () => {
  test("has protagonist string", () => {
    const vb = makeVisualBible();
    expect(typeof vb.protagonist).toBe("string");
    expect(vb.protagonist.length).toBeGreaterThan(0);
  });

  test("has styleGuide string", () => {
    const vb = makeVisualBible();
    expect(typeof vb.styleGuide).toBe("string");
  });

  test("environmentRegistry is a Record<string, string>", () => {
    const vb = makeVisualBible();
    expect(typeof vb.environmentRegistry).toBe("object");
    for (const [k, v] of Object.entries(vb.environmentRegistry)) {
      expect(typeof k).toBe("string");
      expect(typeof v).toBe("string");
    }
  });

  test("palette is a string", () => {
    const vb = makeVisualBible();
    expect(typeof vb.palette).toBe("string");
  });

  test("generatedAt is a number (ms since epoch)", () => {
    const vb = makeVisualBible();
    expect(typeof vb.generatedAt).toBe("number");
    expect(vb.generatedAt).toBeGreaterThan(0);
  });

  test("environmentRegistry can be empty", () => {
    const vb = makeVisualBible({ environmentRegistry: {} });
    expect(Object.keys(vb.environmentRegistry)).toHaveLength(0);
  });
});

// ============================================================================
// PageIllustration extends StoryPage (structural check)
// ============================================================================

describe("PageIllustration is assignable to StoryPage", () => {
  test("a PageIllustration can be used where StoryPage is expected", () => {
    const page: PageIllustration = makePageIllustration({
      pageNumber: 3,
      text: "She stepped outside.",
      wordCount: 3,
    });
    const asBase: StoryPage = page;
    expect(asBase.pageNumber).toBe(3);
    expect(asBase.text).toBe("She stepped outside.");
    expect(asBase.wordCount).toBe(3);
  });
});
