import { buildScenePlannerPrompt, buildScenePlannerRegenPrompt } from "../prompt-builder";
import type { ScenePlannerInput, ScenePlannerRegenInput } from "../types";
import type { VisualBibleArtefact } from "@/illustration/types";
import type { Story } from "@/models/story.model";

const vb: VisualBibleArtefact = {
  id: "vb",
  storyId: "s1",
  version: 1,
  createdAt: 1,
  createdBy: { kind: "system" },
  parentVersion: null,
  source: "llm_generated",
  llmCall: null,
  characterSheet: "cs",
  characterAnchor: "anchor",
  styleGuide: "sg",
  consistencyAnchors: ["a", "b", "c"],
  environmentRegistry: { room: { atmosphere: "x", spatialLayout: "y" } },
  palette: "p",
  avoidList: ["no text", "x"],
};

function story(): Story {
  return {
    id: "s1",
    ownerUid: "u",
    parentStoryId: null,
    title: "T",
    storyType: "fear_anxiety",
    ageRange: "5-7",
    tags: [],
    status: "approved",
    briefStatus: "submitted",
    brief: {} as Story["brief"],
    agent1Result: null,
    agent1Versions: [],
    currentDraft: null,
    pages: null,
    editHistory: [],
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: 1,
    submittedAt: 1,
    approvedAt: 1,
    illustrationPages: null,
    currentVisualBibleVersion: null,
    illustrationWorkspaceOpenedAt: null,
  };
}

describe("buildScenePlannerPrompt", () => {
  it("includes full manuscript and target page markers", () => {
    const input: ScenePlannerInput = {
      story: story(),
      manuscriptPages: [
        { pageNumber: 1, text: "First." },
        { pageNumber: 2, text: "Second." },
      ],
      visualBible: vb,
    };
    const { userPrompt } = buildScenePlannerPrompt(input, 2);
    expect(userPrompt).toContain("[Page 1]");
    expect(userPrompt).toContain("[Page 2]");
    expect(userPrompt).toContain("First.");
    expect(userPrompt).toContain("Second.");
    expect(userPrompt).toContain("Page number: 2");
    expect(userPrompt).toContain("anchor");
  });
});

describe("buildScenePlannerRegenPrompt", () => {
  const prevPlan = {
    id: "sp1",
    storyId: "s1",
    pageNumber: 1,
    version: 1,
    createdAt: 1,
    parentVersion: null as null,
    llmCall: {
      model: "m",
      prompt: "p",
      response: "{}",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      success: true,
      error: null,
    },
    visualBibleVersion: 1,
    feedbackNote: null as null,
    title: "Old title",
    prose: "Old prose.",
    emotionalIntent: "Calm.",
    keyVisibleDetail: "A shoe.",
    director: {
      moment: "Standing.",
      cameraSpec: "Wide.",
      lightingChoice: "Soft window.",
      visualHook: "Door frame.",
      keyPhysicalDetail: "Weight on back foot.",
    },
    structuredPrompt: null as null,
  };

  it("includes previous plan fields and feedback note verbatim", () => {
    const input: ScenePlannerRegenInput = {
      story: story(),
      manuscriptPages: [{ pageNumber: 1, text: "Page one." }],
      visualBible: vb,
      pageNumber: 1,
      previousScenePlan: prevPlan,
      feedbackNote: "show the door clearly",
    };
    const { userPrompt } = buildScenePlannerRegenPrompt(input);
    expect(userPrompt).toContain("PREVIOUS SCENE PLAN");
    expect(userPrompt).toContain("Old title");
    expect(userPrompt).toContain("Old prose.");
    expect(userPrompt).toContain("SPECIALIST FEEDBACK");
    expect(userPrompt).toContain("show the door clearly");
  });

  it("uses alternate direction when feedback is null", () => {
    const input: ScenePlannerRegenInput = {
      story: story(),
      manuscriptPages: [{ pageNumber: 1, text: "Page one." }],
      visualBible: vb,
      pageNumber: 1,
      previousScenePlan: prevPlan,
      feedbackNote: null,
    };
    const { userPrompt } = buildScenePlannerRegenPrompt(input);
    expect(userPrompt).toContain("SPECIALIST DIRECTION");
    expect(userPrompt).toContain("meaningfully different framing");
  });
});
