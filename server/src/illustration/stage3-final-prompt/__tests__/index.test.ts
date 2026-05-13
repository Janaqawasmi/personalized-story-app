import { assembleFinalPrompt } from "../index";

describe("assembleFinalPrompt", () => {
  const vb = {
    id: "vb",
    storyId: "s",
    version: 2,
    createdAt: 0,
    createdBy: { kind: "system" as const },
    parentVersion: null,
    source: "llm_generated" as const,
    llmCall: null,
    characterSheet: "",
    characterAnchor: "CHAR_ANCHOR",
    styleGuide: "",
    consistencyAnchors: ["round face soft hair", "blue cardigan"],
    environmentRegistry: {},
    palette: "navy, cream, soft gold, pale wood",
    avoidList: ["no text", "no weapons", "no photoreal skin pores"],
  };

  const scenePlan = {
    id: "sp",
    storyId: "s",
    pageNumber: 3,
    version: 1,
    createdAt: 0,
    parentVersion: null,
    llmCall: {} as never,
    visualBibleVersion: 2,
    feedbackNote: null,
    title: "",
    prose: "",
    emotionalIntent: "",
    keyVisibleDetail: "",
    director: {} as never,
    structuredPrompt: {
      setting: "kitchen corner table two chairs",
      character: "child seated straight back",
      focalPoint: "steam from mug",
      composition: "over shoulder medium",
      lighting: "warm lamp right soft shadow left",
    },
  };

  test("snapshot assembled string", () => {
    const fp = assembleFinalPrompt({
      scenePlan: scenePlan as never,
      visualBible: vb as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString).toMatchInlineSnapshot(
      `"No text, no letters, no words, no captions, no labels, no speech bubbles, no logos, wordless illustration. round face soft hair | blue cardigan. Setting: kitchen corner table two chairs. CHAR_ANCHOR In this scene: child seated straight back. Focal point: steam from mug. Lighting: warm lamp right soft shadow left. Color palette: navy, cream, soft gold, pale wood. Avoid: no text; no weapons; no photoreal skin pores. Children's book illustration."`,
    );
  });

  test("section ordering labels", () => {
    const fp = assembleFinalPrompt({
      scenePlan: scenePlan as never,
      visualBible: vb as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.promptOrder).toEqual([
      "no-text",
      "consistency",
      "setting",
      "character",
      "focal",
      "lighting",
      "palette",
      "avoid",
      "footer",
    ]);
  });

  test("char-count warning when over threshold", () => {
    const longSetting = Array(400).fill("brick").join(" ");
    const sp = {
      ...scenePlan,
      structuredPrompt: {
        ...scenePlan.structuredPrompt!,
        setting: longSetting,
      },
    };
    const fp = assembleFinalPrompt({
      scenePlan: sp as never,
      visualBible: vb as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.charCount).toBeGreaterThan(1200);
    expect(fp.warnings).toContain("prompt exceeds 1200 chars");
  });

  test("no reference-image instruction text", () => {
    const fp = assembleFinalPrompt({
      scenePlan: scenePlan as never,
      visualBible: vb as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString.toLowerCase()).not.toContain("reference");
  });
});
