import {
  assemblePersonalizedPrompt,
  MissingStructuredPromptError,
} from "../assemblePersonalizedPrompt";
import type { TemplatePageArtDirection, ArtDirectionSnapshot } from "@/shared/types/storyTemplate";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** The specialist's approved sample protagonist appearance — must never appear in personalized prompts. */
const SAMPLE_CHARACTER_ANCHOR =
  "A small girl with curly red hair, freckles, and a yellow raincoat.";

/** What the stored imagePromptTemplate looks like (characterAnchor baked in). */
const SAMPLE_IMAGE_PROMPT_TEMPLATE =
  `${SAMPLE_CHARACTER_ANCHOR} In this scene: standing at fork in path, one hand on tree, looking ahead. ` +
  `Focal point: child's face and the path ahead. Lighting: dappled morning sunlight through leaves. ` +
  `Color palette: forest green, warm amber, soft white, sky blue. ` +
  `Avoid: no text; no weapons; no dark shadows. Children's book illustration.`;

const basePage: TemplatePageArtDirection = {
  pageNumber: 1,
  emotionalIntent: "child feels safe exploring",
  structuredPrompt: {
    setting: "forest_path, morning dew",
    character: "standing at fork in path, one hand on tree, looking ahead",
    focalPoint: "child's face and the path ahead",
    composition: "low angle, wide shot",
    lighting: "dappled morning sunlight through leaves",
  },
};

const baseSnapshot: Pick<ArtDirectionSnapshot, "consistencyAnchors" | "environmentRegistry" | "palette" | "avoidList"> = {
  consistencyAnchors: ["round face soft hair", "blue cardigan"],
  environmentRegistry: {},
  palette: "forest green, warm amber, soft white, sky blue",
  avoidList: ["no text", "no weapons", "no dark shadows"],
};

// ─────────────────────────────────────────────────────────────────────────────
// §16-D: No-leak & scene preservation
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — appearance leak prevention (§16-D)", () => {
  test("does NOT contain the sample characterAnchor text", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toContain(SAMPLE_CHARACTER_ANCHOR);
  });

  test("is NOT equal to the stored imagePromptTemplate", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toBe(SAMPLE_IMAGE_PROMPT_TEMPLATE);
  });

  test("does not contain any fragment of the sample protagonist appearance", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toContain("curly red hair");
    expect(prompt).not.toContain("yellow raincoat");
    expect(prompt).not.toContain("freckles");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16-D: Scene preservation
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — scene preservation (§16-D)", () => {
  let prompt: string;

  beforeEach(() => {
    prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
  });

  test("preserves setting from structuredPrompt", () => {
    expect(prompt).toContain("forest_path, morning dew");
  });

  test("preserves character pose/action from structuredPrompt (not protagonist appearance)", () => {
    expect(prompt).toContain("standing at fork in path, one hand on tree, looking ahead");
  });

  test("preserves focalPoint", () => {
    expect(prompt).toContain("child's face and the path ahead");
  });

  test("preserves lighting", () => {
    expect(prompt).toContain("dappled morning sunlight through leaves");
  });

  test("preserves palette anchors", () => {
    expect(prompt).toContain("forest green");
    expect(prompt).toContain("warm amber");
  });

  test("preserves avoid list", () => {
    expect(prompt).toContain("no text");
    expect(prompt).toContain("no weapons");
  });

  test("preserves no-text lead", () => {
    expect(prompt).toContain("No text, no letters, no words");
  });

  test("preserves consistency anchors", () => {
    expect(prompt).toContain("round face soft hair");
    expect(prompt).toContain("blue cardigan");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Child identity injection
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — child identity anchor", () => {
  test("contains child name", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("Maya");
  });

  test("contains protagonist-in-every-frame instruction", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("protagonist in every frame");
  });

  test("contains reference photo instruction", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("reference photo");
  });

  test("uses gender label: girl for female", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("girl");
  });

  test("uses gender label: boy for male", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "David", gender: "male", ageGroup: "6_9" },
      selectedIllustrationStyle: "flat_cartoon",
    });
    expect(prompt).toContain("boy");
    expect(prompt).toContain("David");
  });

  test("uses correct age label for 0_3", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Lena", gender: "female", ageGroup: "0_3" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("toddler");
  });

  test("uses correct age label for 9_12", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Sam", gender: "male", ageGroup: "9_12" },
      selectedIllustrationStyle: "semi_realistic",
    });
    expect(prompt).toContain("aged 9 to 12");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16-C: Style override — changes rendering tokens only, not scene
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — style override scope (§16-C)", () => {
  const baseInput = {
    pageArtDirection: basePage,
    snapshot: baseSnapshot,
    child: { firstName: "Maya", gender: "female", ageGroup: "3_6" as const },
  } as const;

  const SCENE_FIELDS = [
    "forest_path, morning dew",
    "standing at fork in path, one hand on tree, looking ahead",
    "child's face and the path ahead",
    "dappled morning sunlight through leaves",
    "forest green",
  ] as const;

  test("switching style produces different prompts", () => {
    const p1 = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "watercolor" });
    const p2 = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "flat_cartoon" });
    expect(p1).not.toEqual(p2);
  });

  test("watercolor prompt contains watercolor rendering tokens", () => {
    const prompt = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "watercolor" });
    expect(prompt.toLowerCase()).toContain("watercolor");
  });

  test("flat_cartoon prompt contains cartoon rendering tokens", () => {
    const prompt = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "flat_cartoon" });
    expect(prompt.toLowerCase()).toContain("cartoon");
  });

  test("semi_realistic prompt contains semi-realistic rendering tokens", () => {
    const prompt = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "semi_realistic" });
    expect(prompt.toLowerCase()).toContain("semi-realistic");
  });

  test("paper_craft prompt contains paper-craft rendering tokens", () => {
    const prompt = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "paper_craft" });
    expect(prompt.toLowerCase()).toContain("paper-craft");
  });

  test("scene fields are preserved when style changes from watercolor to flat_cartoon", () => {
    const p1 = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "watercolor" });
    const p2 = assemblePersonalizedPrompt({ ...baseInput, selectedIllustrationStyle: "flat_cartoon" });
    for (const field of SCENE_FIELDS) {
      expect(p1).toContain(field);
      expect(p2).toContain(field);
    }
  });

  test("scene fields are preserved when style changes to vintage_1950s_little_golden", () => {
    const prompt = assemblePersonalizedPrompt({
      ...baseInput,
      selectedIllustrationStyle: "vintage_1950s_little_golden",
    });
    expect(prompt.toLowerCase()).toContain("golden");
    for (const field of SCENE_FIELDS) {
      expect(prompt).toContain(field);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — error handling", () => {
  test("throws MissingStructuredPromptError when structuredPrompt is null", () => {
    expect(() =>
      assemblePersonalizedPrompt({
        pageArtDirection: { ...basePage, structuredPrompt: null },
        snapshot: baseSnapshot,
        child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
        selectedIllustrationStyle: "watercolor",
      }),
    ).toThrow(MissingStructuredPromptError);
  });

  test("MissingStructuredPromptError message includes page number", () => {
    expect(() =>
      assemblePersonalizedPrompt({
        pageArtDirection: { ...basePage, pageNumber: 3, structuredPrompt: null },
        snapshot: baseSnapshot,
        child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
        selectedIllustrationStyle: "watercolor",
      }),
    ).toThrow("page 3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Environment registry / spatial layout injection
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — environment registry", () => {
  test("injects spatialLayout when setting matches environmentRegistry key", () => {
    const snapshotWithEnv = {
      ...baseSnapshot,
      environmentRegistry: {
        forest_path: {
          atmosphere: "quiet morning forest",
          spatialLayout: "Narrow dirt trail between tall oaks; light breaks through canopy from the east.",
        },
      },
    };
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: snapshotWithEnv,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).toContain("Spatial layout (fixed for this location):");
    expect(prompt).toContain("Narrow dirt trail between tall oaks");
  });

  test("omits spatialLayout when setting does not match any registry key", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot, // empty environmentRegistry
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toContain("Spatial layout");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No-fallback guarantee: personalized prompt ≠ imagePromptTemplate
//
// The stored imagePromptTemplate has the specialist characterAnchor baked in.
// The personalized assembler must never produce that string — it builds from
// structured parts and excludes the characterAnchor entirely.
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — never produces imagePromptTemplate output", () => {
  test("output is not equal to the stored imagePromptTemplate", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toBe(SAMPLE_IMAGE_PROMPT_TEMPLATE);
  });

  test("output does not contain any fragment of SAMPLE_IMAGE_PROMPT_TEMPLATE that includes characterAnchor", () => {
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    // The first sentence of SAMPLE_IMAGE_PROMPT_TEMPLATE is the characterAnchor.
    // If the personalized prompt contained it, the protagonist appearance would leak.
    const characterAnchorSentence = SAMPLE_CHARACTER_ANCHOR;
    expect(prompt).not.toContain(characterAnchorSentence);
  });

  test("output differs from imagePromptTemplate even when the child has the same name as the sample protagonist", () => {
    // Worst case: the child's name matches the sample protagonist's — prompt must still
    // be structurally different (child-identity section replaces characterAnchor).
    const prompt = assemblePersonalizedPrompt({
      pageArtDirection: basePage,
      snapshot: baseSnapshot,
      child: { firstName: "Tali", gender: "female", ageGroup: "3_6" },
      selectedIllustrationStyle: "watercolor",
    });
    expect(prompt).not.toContain(SAMPLE_CHARACTER_ANCHOR);
    expect(prompt).toContain("protagonist in every frame");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fail-safe: MissingStructuredPromptError prevents generation with bad data
//
// Verifies that the assembler throws rather than producing a partial/wrong prompt
// when the structured prompt is absent. The caller (generatePreviewPages) must
// let this error propagate to markPreviewFailed — never swallow it.
// ─────────────────────────────────────────────────────────────────────────────

describe("assemblePersonalizedPrompt — fail-safe on missing data", () => {
  test("throws when structuredPrompt is null — does not produce a partial prompt", () => {
    let result: string | undefined;
    let threw = false;
    try {
      result = assemblePersonalizedPrompt({
        pageArtDirection: { ...basePage, structuredPrompt: null },
        snapshot: baseSnapshot,
        child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
        selectedIllustrationStyle: "watercolor",
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(result).toBeUndefined();
  });

  test("thrown error is MissingStructuredPromptError (not a generic Error)", () => {
    expect(() =>
      assemblePersonalizedPrompt({
        pageArtDirection: { ...basePage, structuredPrompt: null },
        snapshot: baseSnapshot,
        child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
        selectedIllustrationStyle: "watercolor",
      }),
    ).toThrow(MissingStructuredPromptError);
  });

  test("missing structuredPrompt on page 2 also throws (not silently skipped)", () => {
    const page2: TemplatePageArtDirection = {
      pageNumber: 2,
      emotionalIntent: "child finds courage",
      structuredPrompt: null,
    };
    expect(() =>
      assemblePersonalizedPrompt({
        pageArtDirection: page2,
        snapshot: baseSnapshot,
        child: { firstName: "Maya", gender: "female", ageGroup: "3_6" },
        selectedIllustrationStyle: "flat_cartoon",
      }),
    ).toThrow(MissingStructuredPromptError);
  });
});
