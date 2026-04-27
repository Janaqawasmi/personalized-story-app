import {
  buildImagePromptsPrompt,
  parseImagePromptsResponse,
} from "@/specialist/image-prompt-generator";
import type { PageIllustration } from "@/models/story.model";
import type { StoryBrief } from "@/models/storyBrief.model";
import { Timestamp } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePage(n: number, text: string): PageIllustration {
  return {
    pageNumber: n,
    text,
    wordCount: text.split(" ").length,
    imagePrompt: null,
    promptStatus: "pending",
    promptRejectionNote: null,
    illustrationUrl: null,
    illustrationStatus: "pending",
    illustrationRejectionNote: null,
  };
}

function makeBrief(overrides?: Partial<StoryBrief>): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: "uid",
    status: "submitted",
    version: 1,
    storyType: "fear_anxiety",
    ageAndScope: { ageRange: "5-7", peakIntensity: "moderate", storyLength: "standard" },
    clinicalFoundation: {
      population: "p".repeat(50),
      trigger: "t".repeat(50),
      therapeuticIntention: { feel: "brave", because: "they have tools" },
      creativeVision: "c".repeat(50),
    },
    therapeuticArchitecture: {
      primaryApproach: "graduated_exposure",
      shameDimension: "not_significant",
      typeSpecificField: { fieldType: "somatic_expression", selections: ["stomach_ache_feeling_sick"] },
      copingTool: "counting",
      resolutionCompleteness: "full",
      mustNeverList: [],
    },
    storyWorld: {
      personalization: false,
      protagonistGender: "girl",
      protagonistType: "child",
      protagonistAge: "same_age",
      caregiverPresence: "present_and_comforting",
      narrativeDistance: "direct",
    },
    personalizationConfig: {},
    ...overrides,
  } as unknown as StoryBrief;
}

const PAGES = [
  makePage(1, "Pip looked at the stars."),
  makePage(2, "She counted slowly."),
  makePage(3, "Her breath grew steady."),
];

const BRIEF = makeBrief();

// ---------------------------------------------------------------------------
// buildImagePromptsPrompt
// ---------------------------------------------------------------------------

describe("buildImagePromptsPrompt", () => {
  test("includes all page numbers as [Page N] markers", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("[Page 1]");
    expect(prompt).toContain("[Page 2]");
    expect(prompt).toContain("[Page 3]");
  });

  test("includes all page texts", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("Pip looked at the stars.");
    expect(prompt).toContain("She counted slowly.");
    expect(prompt).toContain("Her breath grew steady.");
  });

  test("mentions the age range label", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("5");
    expect(prompt).toContain("7");
  });

  test("instructs for exactly N image prompts", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("exactly 3 elements");
  });

  test("mentions Visual Bible and imagePrompts keys", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("visualBible");
    expect(prompt).toContain("imagePrompts");
  });

  test("instructs to omit markdown fences", () => {
    const prompt = buildImagePromptsPrompt(PAGES, BRIEF);
    expect(prompt).toContain("no markdown fences");
  });

  test("works with a single page", () => {
    const prompt = buildImagePromptsPrompt([PAGES[0]!], BRIEF);
    expect(prompt).toContain("[Page 1]");
    expect(prompt).toContain("exactly 1 elements");
  });
});

// ---------------------------------------------------------------------------
// parseImagePromptsResponse
// ---------------------------------------------------------------------------

function makeValidJson(pageCount = 3): string {
  return JSON.stringify({
    visualBible: {
      protagonist: "A small brown rabbit with floppy ears.",
      styleGuide: "Soft watercolour, warm tones.",
      environmentRegistry: {
        meadow: "A sunlit meadow with tall grass.",
        bedroom: "A cosy bedroom with a patchwork quilt.",
      },
      palette: "#F5E6C8, #A8C5A0, #E8A87C",
    },
    imagePrompts: Array.from({ length: pageCount }, (_, i) => `Prompt for page ${i + 1}.`),
  });
}

describe("parseImagePromptsResponse", () => {
  test("parses valid JSON correctly", () => {
    const result = parseImagePromptsResponse(makeValidJson(3), 3);
    expect(result.imagePrompts).toHaveLength(3);
    expect(result.imagePrompts[0]).toBe("Prompt for page 1.");
    expect(result.visualBible.protagonist).toBe("A small brown rabbit with floppy ears.");
    expect(result.visualBible.styleGuide).toBe("Soft watercolour, warm tones.");
    expect(typeof result.visualBible.generatedAt).toBe("number");
  });

  test("strips markdown fences before parsing", () => {
    const fenced = "```json\n" + makeValidJson(2) + "\n```";
    const result = parseImagePromptsResponse(fenced, 2);
    expect(result.imagePrompts).toHaveLength(2);
  });

  test("throws on invalid JSON", () => {
    expect(() => parseImagePromptsResponse("{not json}", 3)).toThrow(
      "failed to parse Claude response as JSON",
    );
  });

  test("throws when imagePrompts count mismatches expectedPageCount", () => {
    const json = makeValidJson(2);
    expect(() => parseImagePromptsResponse(json, 3)).toThrow(
      "expected 3 image prompts, got 2",
    );
  });

  test("throws when visualBible is missing", () => {
    const json = JSON.stringify({ imagePrompts: ["a", "b"] });
    expect(() => parseImagePromptsResponse(json, 2)).toThrow(
      "missing visualBible or imagePrompts",
    );
  });

  test("throws when imagePrompts is missing", () => {
    const json = JSON.stringify({ visualBible: { protagonist: "x", styleGuide: "y", environmentRegistry: {}, palette: "z" } });
    expect(() => parseImagePromptsResponse(json, 1)).toThrow(
      "missing visualBible or imagePrompts",
    );
  });

  test("environmentRegistry defaults to empty object when absent", () => {
    const json = JSON.stringify({
      visualBible: { protagonist: "A rabbit.", styleGuide: "Watercolour.", palette: "blue" },
      imagePrompts: ["p1"],
    });
    const result = parseImagePromptsResponse(json, 1);
    expect(result.visualBible.environmentRegistry).toEqual({});
  });

  test("generatedAt is a recent timestamp", () => {
    const before = Date.now();
    const result = parseImagePromptsResponse(makeValidJson(1), 1);
    const after = Date.now();
    expect(result.visualBible.generatedAt).toBeGreaterThanOrEqual(before);
    expect(result.visualBible.generatedAt).toBeLessThanOrEqual(after);
  });
});
