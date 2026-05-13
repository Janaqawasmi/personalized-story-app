import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import { buildVisualDirectorPrompt } from "../prompt-builder";
import type { VisualDirectorInput } from "../types";
import type { Story } from "@/models/story.model";

function minimalStory(overrides: Partial<Story> = {}): Story {
  const base = {
    id: "s1",
    ownerUid: "u1",
    parentStoryId: null,
    title: "Test title",
    storyType: "fear_anxiety" as const,
    ageRange: "5-7" as const,
    tags: [],
    status: "approved" as const,
    briefStatus: "submitted" as const,
    brief: {
      clinicalFoundation: {
        therapeuticIntention: { feel: "safe", because: "night" },
        creativeVision: "Soft moonlight",
      },
    },
    agent1Result: null,
    agent1Versions: [],
    currentDraft: null,
    pages: [{ pageNumber: 1, text: "Hello.", wordCount: 1 }],
    editHistory: [],
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: 1,
    submittedAt: 1,
    approvedAt: 1,
    illustrationPages: null,
    currentVisualBibleVersion: null,
    illustrationWorkspaceOpenedAt: null,
  } as unknown as Story;
  return { ...base, ...overrides };
}

describe("buildVisualDirectorPrompt", () => {
  it("includes mandated avoid-list line and manuscript", () => {
    const input: VisualDirectorInput = {
      story: minimalStory(),
      manuscriptText: "[Page 1]\nOnce upon a time.",
    };
    const { userPrompt } = buildVisualDirectorPrompt(input);
    expect(userPrompt).toContain(MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID);
    expect(userPrompt).toContain("Once upon a time.");
    expect(userPrompt).toContain("Test title");
  });
});
