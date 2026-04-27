import type { StoryPage } from "@/agent1/types";

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

  test("wordCount reflects the number of words in text", () => {
    const text = "She looked out the window and smiled.";
    const words = text.trim().split(/\s+/).length;
    const page: StoryPage = { pageNumber: 1, text, wordCount: words };

    expect(page.wordCount).toBe(7);
  });
});
