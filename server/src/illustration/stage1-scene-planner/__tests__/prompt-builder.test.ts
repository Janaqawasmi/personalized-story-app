import { buildScenePlannerPrompt } from "../prompt-builder";
import type { ScenePlannerInput } from "../types";
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
