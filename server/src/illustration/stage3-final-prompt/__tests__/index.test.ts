import { assembleFinalPrompt, resolveEnvironmentEntry } from "../index";

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
      `"Wordless children's book illustration in , round face soft hair and blue cardigan. CHAR_ANCHOR child seated straight back. The eye is drawn to steam from mug. kitchen corner table two chairs. warm lamp right soft shadow left. over shoulder medium. Color palette limited to navy, cream, soft gold, pale wood."`,
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
      "style-lead",
      "character",
      "focal",
      "setting",
      "lighting",
      "composition",
      "palette",
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
    expect(fp.charCount).toBeGreaterThan(900);
    expect(fp.warnings).toContain("prompt exceeds 900 chars");
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

  test("does not include Avoid section", () => {
    const fp = assembleFinalPrompt({
      scenePlan: scenePlan as never,
      visualBible: vb as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString).not.toContain("Avoid:");
  });

  test("styleGuide from visualBible appears in the prompt lead", () => {
    const vbStyled = { ...vb, styleGuide: "soft watercolor with ink outlines" };
    const fp = assembleFinalPrompt({
      scenePlan: scenePlan as never,
      visualBible: vbStyled as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString).toContain(
      "Wordless children's book illustration in soft watercolor with ink outlines",
    );
  });

  test("injects first spatialLayout sentence for wide shots when environment matches", () => {
    const vbWithEnv = {
      ...vb,
      environmentRegistry: {
        kitchen_morning: {
          atmosphere: "quiet dawn kitchen",
          spatialLayout:
            "Sink under east window; round table center; fridge on north wall beside doorway.",
        },
      },
    };
    const sp = {
      ...scenePlan,
      structuredPrompt: {
        ...scenePlan.structuredPrompt!,
        setting: "kitchen_morning, east window light, mug steam",
        composition: "wide establishing shot from doorway",
      },
    };
    const fp = assembleFinalPrompt({
      scenePlan: sp as never,
      visualBible: vbWithEnv as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString).toContain("east window light, mug steam.");
    expect(fp.finalPromptString).toContain("Sink under east window;");
    expect(fp.finalPromptString).not.toContain("round table center");
    expect(fp.finalPromptString).not.toContain("Spatial layout");
  });

  test("skips spatial layout injection for close-up composition", () => {
    const vbWithEnv = {
      ...vb,
      environmentRegistry: {
        kitchen_morning: {
          atmosphere: "quiet dawn kitchen",
          spatialLayout:
            "Sink under east window; round table center; fridge on north wall beside doorway.",
        },
      },
    };
    const sp = {
      ...scenePlan,
      structuredPrompt: {
        ...scenePlan.structuredPrompt!,
        setting: "kitchen_morning, east window light, mug steam",
        composition: "extreme close-up on mug steam",
      },
    };
    const fp = assembleFinalPrompt({
      scenePlan: sp as never,
      visualBible: vbWithEnv as never,
      version: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 2,
    });
    expect(fp.finalPromptString).toContain("east window light, mug steam.");
    expect(fp.finalPromptString).not.toContain("Sink under east window");
  });
});

describe("resolveEnvironmentEntry", () => {
  const registry = {
    classroom_morning: {
      atmosphere: "bright",
      spatialLayout: "Desks in three rows facing north whiteboard.",
    },
    lab: { atmosphere: "cool", spatialLayout: "Steel tables along walls." },
  };

  it("matches exact first segment before comma", () => {
    expect(resolveEnvironmentEntry("classroom_morning, soft side light", registry)).toEqual(
      registry.classroom_morning,
    );
  });

  it("matches normalized human-readable first segment", () => {
    expect(resolveEnvironmentEntry("Classroom morning | frame props", registry)).toEqual(
      registry.classroom_morning,
    );
  });

  it("matches longest registry key prefix", () => {
    expect(resolveEnvironmentEntry("classroom_morning east light", registry)).toEqual(
      registry.classroom_morning,
    );
  });

  it("returns null when no key matches", () => {
    expect(resolveEnvironmentEntry("unknown hall, dim", registry)).toBeNull();
  });
});
