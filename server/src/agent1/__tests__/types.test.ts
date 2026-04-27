import type { StoryPage, Step2Output, LLMCallRecord } from "@/agent1/types";

// ============================================================================
// StoryPage type
// ============================================================================

describe("StoryPage", () => {
  test("a well-formed StoryPage object satisfies the type at runtime", () => {
    const page: StoryPage = {
      pageNumber: 1,
      text: "Lina sat on the edge of her bed, holding her stuffed elephant.",
      wordCount: 11,
    };

    expect(page.pageNumber).toBe(1);
    expect(typeof page.text).toBe("string");
    expect(page.text.length).toBeGreaterThan(0);
    expect(typeof page.wordCount).toBe("number");
    expect(page.wordCount).toBeGreaterThan(0);
  });

  test("pageNumber is 1-indexed (rejects 0 by convention check)", () => {
    const page: StoryPage = { pageNumber: 1, text: "First page.", wordCount: 2 };
    expect(page.pageNumber).toBeGreaterThanOrEqual(1);
  });

  test("an array of StoryPage objects preserves order", () => {
    const pages: StoryPage[] = [
      { pageNumber: 1, text: "Page one text.", wordCount: 3 },
      { pageNumber: 2, text: "Page two text.", wordCount: 3 },
      { pageNumber: 3, text: "Page three text.", wordCount: 3 },
    ];

    expect(pages).toHaveLength(3);
    for (let i = 0; i < pages.length; i++) {
      expect(pages[i]!.pageNumber).toBe(i + 1);
    }
  });

  test("totalWordCount across pages equals sum of per-page wordCounts", () => {
    const pages: StoryPage[] = [
      { pageNumber: 1, text: "One two three.", wordCount: 3 },
      { pageNumber: 2, text: "Four five.", wordCount: 2 },
      { pageNumber: 3, text: "Six seven eight nine.", wordCount: 4 },
    ];
    const total = pages.reduce((sum, p) => sum + p.wordCount, 0);
    expect(total).toBe(9);
  });

  test("wordCount reflects the number of words in text", () => {
    const text = "She looked out the window and smiled.";
    const words = text.trim().split(/\s+/).length;
    const page: StoryPage = { pageNumber: 1, text, wordCount: words };

    expect(page.wordCount).toBe(7);
  });
});

// ============================================================================
// Step2Output — new pages fields (optional until parser is updated in Step 0.4)
// ============================================================================

function makeLLMCallRecord(): LLMCallRecord {
  return {
    step: "step2_author",
    model: "claude-sonnet-4-6",
    inputTokens: 1000,
    outputTokens: 400,
    latencyMs: 1500,
    attempt: 1,
    promptHash: "a".repeat(64),
  };
}

describe("Step2Output — pages fields", () => {
  test("Step2Output without pages fields is still valid (backward compat)", () => {
    const output: Step2Output = {
      title: "The Night Sounds Game",
      story: "Pip was a small rabbit.",
      wordCount: 5,
      targetWordRange: [150, 250],
      wordCountDrift: "under",
      rawResponse: "...",
      promptHash: "b".repeat(64),
      llmCallRecord: makeLLMCallRecord(),
    };

    expect(output.title).toBe("The Night Sounds Game");
    expect(output.pages).toBeUndefined();
    expect(output.pageCount).toBeUndefined();
    expect(output.targetPageRange).toBeUndefined();
    expect(output.pageCountDrift).toBeUndefined();
  });

  test("Step2Output with pages populated carries all new fields", () => {
    const pages: StoryPage[] = [
      { pageNumber: 1, text: "Page one.", wordCount: 2 },
      { pageNumber: 2, text: "Page two.", wordCount: 2 },
    ];

    const output: Step2Output = {
      title: "The Night Sounds Game",
      story: pages.map((p) => p.text).join("\n\n"),
      wordCount: 4,
      targetWordRange: [150, 250],
      wordCountDrift: "under",
      pages,
      pageCount: 2,
      targetPageRange: [4, 8],
      pageCountDrift: "under",
      rawResponse: "...",
      promptHash: "c".repeat(64),
      llmCallRecord: makeLLMCallRecord(),
    };

    expect(output.pages).toHaveLength(2);
    expect(output.pageCount).toBe(2);
    expect(output.targetPageRange).toEqual([4, 8]);
    expect(output.pageCountDrift).toBe("under");
  });

  test("story field is derivable from joining pages text", () => {
    const pages: StoryPage[] = [
      { pageNumber: 1, text: "First sentence.", wordCount: 2 },
      { pageNumber: 2, text: "Second sentence.", wordCount: 2 },
    ];

    const derivedStory = pages.map((p) => p.text).join("\n\n");
    expect(derivedStory).toBe("First sentence.\n\nSecond sentence.");
  });

  test("pageCountDrift values are one of the three valid tokens", () => {
    const valid = ["within_range", "under", "over"] as const;
    for (const drift of valid) {
      const output: Step2Output = {
        title: "T",
        story: "s",
        wordCount: 1,
        targetWordRange: [100, 200],
        wordCountDrift: "within_range",
        pageCountDrift: drift,
        rawResponse: "",
        promptHash: "d".repeat(64),
        llmCallRecord: makeLLMCallRecord(),
      };
      expect(valid).toContain(output.pageCountDrift);
    }
  });
});
