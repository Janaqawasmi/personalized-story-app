import { assembleSeedreamPrompt } from "@/specialist/prompt-builder";
import type { PageIllustration, VisualBible } from "@/models/story.model";

function makePage(overrides?: Partial<PageIllustration>): PageIllustration {
  return {
    pageNumber: 1,
    text: "Pip looked at the stars.",
    wordCount: 5,
    imagePrompt: "A small brown rabbit sitting in a moonlit meadow, gazing upward.",
    promptStatus: "approved",
    promptRejectionNote: null,
    illustrationUrl: null,
    illustrationStatus: "pending",
    illustrationRejectionNote: null,
    ...overrides,
  };
}

function makeVisualBible(overrides?: Partial<VisualBible>): VisualBible {
  return {
    protagonist: "A small brown rabbit with floppy ears and a white cotton tail.",
    styleGuide: "Soft watercolour, warm earthy tones, gentle rounded shapes.",
    environmentRegistry: {
      meadow: "A moonlit meadow with tall grass and fireflies.",
    },
    palette: "#F5E6C8, #A8C5A0, #E8A87C",
    generatedAt: Date.now(),
    ...overrides,
  };
}

describe("assembleSeedreamPrompt", () => {
  test("includes the imagePrompt text", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).toContain("A small brown rabbit sitting in a moonlit meadow");
  });

  test("includes Style from styleGuide", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).toContain("Style: Soft watercolour, warm earthy tones, gentle rounded shapes.");
  });

  test("includes Character from protagonist", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).toContain("Character: A small brown rabbit with floppy ears");
  });

  test("includes Palette", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).toContain("Palette: #F5E6C8");
  });

  test("includes negative instruction line", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).toContain("No text, no speech bubbles, no logos.");
    expect(out).toContain("Children's book illustration.");
  });

  test("imagePrompt appears first", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    const promptIdx = out.indexOf("A small brown rabbit sitting");
    const styleIdx = out.indexOf("Style:");
    expect(promptIdx).toBeLessThan(styleIdx);
  });

  test("throws when imagePrompt is null", () => {
    expect(() =>
      assembleSeedreamPrompt(makePage({ imagePrompt: null }), makeVisualBible()),
    ).toThrow("has no imagePrompt");
  });

  test("includes page number in error message when imagePrompt is null", () => {
    expect(() =>
      assembleSeedreamPrompt(
        makePage({ pageNumber: 3, imagePrompt: null }),
        makeVisualBible(),
      ),
    ).toThrow("page 3");
  });

  test("does not contain 'undefined' in output", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    expect(out).not.toContain("undefined");
  });

  test("each section is on its own line", () => {
    const out = assembleSeedreamPrompt(makePage(), makeVisualBible());
    const lines = out.split("\n");
    expect(lines.some((l) => l.startsWith("Style:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Character:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Palette:"))).toBe(true);
  });
});
