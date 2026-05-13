import type {
  FinalPromptArtefact,
  IllustrationJob,
  IllustrationJobType,
  IllustrationPageStatus,
  ScenePlanArtefact,
  VisualBibleArtefact,
} from "@/illustration/types";
import type { EditHistoryEvent } from "@/models/story.model";

function labelIllustrationPageStatus(s: IllustrationPageStatus): string {
  switch (s) {
    case "plan_only":
      return "plan_only";
    case "generating_image":
      return "generating_image";
    case "awaiting_review":
      return "awaiting_review";
    case "approved":
      return "approved";
    case "needs_revision":
      return "needs_revision";
  }
}

function labelJobType(t: IllustrationJobType): string {
  switch (t) {
    case "workspace_open":
      return "workspace_open";
    case "scene_plan_regen":
      return "scene_plan_regen";
    case "image_generation":
      return "image_generation";
    case "image_regen":
      return "image_regen";
    case "visual_bible_regen":
      return "visual_bible_regen";
  }
}

function labelEditHistoryKind(e: EditHistoryEvent): string {
  switch (e.kind) {
    case "draft_created":
      return e.kind;
    case "draft_edited":
      return e.kind;
    case "status_changed":
      return e.kind;
    case "brief_submitted":
      return e.kind;
    case "agent1_generated":
      return e.kind;
    case "regeneration_requested":
      return e.kind;
    case "archived":
      return e.kind;
    case "restored":
      return e.kind;
    case "visual_bible_generated":
      return e.kind;
    case "visual_bible_edited":
      return e.kind;
    case "visual_bible_regenerated":
      return e.kind;
    case "scene_plan_generated":
      return e.kind;
    case "image_generated":
      return e.kind;
    case "image_approved":
      return e.kind;
    case "image_rejected":
      return e.kind;
    case "illustration_workspace_opened":
      return e.kind;
    case "illustration_ready_marked":
      return e.kind;
  }
}

describe("Illustration type shapes", () => {
  test("minimal VisualBibleArtefact (system-generated)", () => {
    const vb: VisualBibleArtefact = {
      id: "vb-1",
      storyId: "s1",
      version: 1,
      createdAt: 1,
      createdBy: { kind: "system" },
      parentVersion: null,
      source: "llm_generated",
      llmCall: {
        model: "m",
        prompt: "p",
        response: "r",
        inputTokens: 1,
        outputTokens: 2,
        latencyMs: 3,
        success: true,
        error: null,
      },
      characterSheet: "cs",
      characterAnchor: "ca",
      styleGuide: "sg",
      consistencyAnchors: ["a"],
      environmentRegistry: {
        forest: { atmosphere: "calm", spatialLayout: "wide" },
      },
      palette: "p",
      avoidList: [],
    };
    expect(vb.version).toBe(1);
  });

  test("minimal VisualBibleArtefact (specialist-edited, llmCall null)", () => {
    const vb: VisualBibleArtefact = {
      id: "vb-2",
      storyId: "s1",
      version: 2,
      createdAt: 2,
      createdBy: { kind: "specialist", uid: "u1" },
      parentVersion: 1,
      source: "specialist_edited",
      llmCall: null,
      characterSheet: "cs",
      characterAnchor: "ca",
      styleGuide: "sg",
      consistencyAnchors: [],
      environmentRegistry: {},
      palette: "p",
      avoidList: ["x"],
    };
    expect(vb.llmCall).toBeNull();
  });

  test("minimal ScenePlanArtefact (structuredPrompt null)", () => {
    const llmCall = {
      model: "m",
      prompt: "p",
      response: "r",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      success: true,
      error: null,
    };
    const sp: ScenePlanArtefact = {
      id: "sp-1",
      storyId: "s1",
      pageNumber: 1,
      version: 1,
      createdAt: 1,
      parentVersion: null,
      llmCall,
      visualBibleVersion: 1,
      feedbackNote: null,
      title: "t",
      prose: "pr",
      emotionalIntent: "e",
      keyVisibleDetail: "k",
      director: {
        moment: "m",
        cameraSpec: "c",
        lightingChoice: "l",
        visualHook: "v",
        keyPhysicalDetail: "k",
      },
      structuredPrompt: null,
    };
    expect(sp.structuredPrompt).toBeNull();
  });

  test("minimal IllustrationJob for each job type", () => {
    const base = {
      id: "j",
      storyId: "s",
      pageNumber: null as number | null,
      enqueuedBy: "u",
      enqueuedAt: 1,
      startedAt: null as number | null,
      completedAt: null as number | null,
      lastHeartbeatAt: null as number | null,
      status: "pending" as const,
      attempt: 0,
      idempotencyKey: "k",
      inputRefs: {},
      outputRefs: {},
      error: null as string | null,
    };
    const jobs: IllustrationJob[] = [
      { ...base, id: "j1", type: "workspace_open" },
      { ...base, id: "j2", type: "scene_plan_regen", pageNumber: 1 },
      { ...base, id: "j3", type: "image_generation", pageNumber: 2 },
      { ...base, id: "j4", type: "image_regen", pageNumber: 3 },
      { ...base, id: "j5", type: "visual_bible_regen" },
    ];
    expect(jobs.map((j) => j.type).map(labelJobType)).toHaveLength(5);
  });

  test("IllustrationPageStatus union is exhaustive", () => {
    const all: IllustrationPageStatus[] = [
      "plan_only",
      "generating_image",
      "awaiting_review",
      "approved",
      "needs_revision",
    ];
    expect(all.map(labelIllustrationPageStatus)).toEqual(all);
  });

  test("IllustrationJobType union is exhaustive", () => {
    const all: IllustrationJobType[] = [
      "workspace_open",
      "scene_plan_regen",
      "image_generation",
      "image_regen",
      "visual_bible_regen",
    ];
    expect(all.map(labelJobType)).toEqual(all);
  });

  test("EditHistoryEvent includes all seven new kinds (exhaustive switch)", () => {
    const samples: EditHistoryEvent[] = [
      { kind: "visual_bible_generated", version: 1, source: "llm" },
      { kind: "visual_bible_edited", version: 2, fields: ["characterAnchor"] },
      { kind: "visual_bible_regenerated", version: 3 },
      {
        kind: "scene_plan_generated",
        pageNumber: 1,
        version: 1,
        withFeedback: false,
        visualBibleVersion: 1,
      },
      { kind: "image_generated", pageNumber: 1, version: 1 },
      { kind: "image_approved", pageNumber: 1, version: 1 },
      {
        kind: "image_rejected",
        pageNumber: 1,
        version: 1,
        feedbackNote: "n",
      },
      { kind: "illustration_workspace_opened" },
      { kind: "illustration_ready_marked" },
    ];
    expect(samples.map(labelEditHistoryKind)).toEqual([
      "visual_bible_generated",
      "visual_bible_edited",
      "visual_bible_regenerated",
      "scene_plan_generated",
      "image_generated",
      "image_approved",
      "image_rejected",
      "illustration_workspace_opened",
      "illustration_ready_marked",
    ]);
  });

  test("FinalPromptArtefact minimal", () => {
    const fp: FinalPromptArtefact = {
      id: "f1",
      storyId: "s",
      pageNumber: 1,
      version: 1,
      createdAt: 1,
      parentScenePlanVersion: 1,
      parentVisualBibleVersion: 1,
      finalPromptString: "x",
      promptOrder: ["a"],
      charCount: 1,
      warnings: [],
    };
    expect(fp.charCount).toBe(1);
  });
});
