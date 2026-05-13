import { buildPromptEngineerPrompt } from "../prompt-builder";

describe("buildPromptEngineerPrompt", () => {
  const vb = {
    id: "vb1",
    storyId: "s1",
    version: 1,
    createdAt: 0,
    createdBy: { kind: "system" as const },
    parentVersion: null,
    source: "llm_generated" as const,
    llmCall: null,
    characterSheet: "sheet",
    characterAnchor: "anchor",
    styleGuide: "soft watercolor",
    consistencyAnchors: ["a", "b"],
    environmentRegistry: {
      kitchen: { atmosphere: "warm", spatialLayout: "table center" },
    },
    palette: "blue, white",
    avoidList: ["no weapons"],
  };

  const scenePlan = {
    id: "sp1",
    storyId: "s1",
    pageNumber: 1,
    version: 1,
    createdAt: 0,
    parentVersion: null,
    llmCall: {} as never,
    visualBibleVersion: 1,
    feedbackNote: null,
    title: "T",
    prose: "P",
    emotionalIntent: "E",
    keyVisibleDetail: "K",
    director: {
      moment: "m",
      cameraSpec: "wide",
      lightingChoice: "soft window",
      visualHook: "hook",
      keyPhysicalDetail: "hands on table",
    },
    structuredPrompt: null,
  };

  test("includes character anchor and scene director fields", () => {
    const { userPrompt } = buildPromptEngineerPrompt(scenePlan as never, vb as never);
    expect(userPrompt).toContain("anchor");
    expect(userPrompt).toContain("hands on table");
    expect(userPrompt).toContain("kitchen");
  });

  test("does not mention reference images", () => {
    const { systemPrompt, userPrompt } = buildPromptEngineerPrompt(scenePlan as never, vb as never);
    expect(systemPrompt.toLowerCase() + userPrompt.toLowerCase()).not.toContain(
      "reference image attached",
    );
  });

  test("system prompt stresses literal brevity", () => {
    const { systemPrompt } = buildPromptEngineerPrompt(scenePlan as never, vb as never);
    expect(systemPrompt.toLowerCase()).toContain("literal");
  });
});
