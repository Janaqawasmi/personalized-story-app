import { render, screen } from "@testing-library/react";
import IllustrationsTabV2 from "../components/illustration/IllustrationsTabV2";
import type { Story } from "../../types/story";
import { useIllustrationWorkspaceState } from "../hooks/useIllustrationWorkspaceState";

jest.mock("../hooks/useIllustrationWorkspaceState", () => ({
  useIllustrationWorkspaceState: jest.fn(),
}));

const mockUseVm = useIllustrationWorkspaceState as jest.MockedFunction<
  typeof useIllustrationWorkspaceState
>;

function approvedStory(): Story {
  return {
    id: "s1",
    ownerUid: "u1",
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
    pages: [{ pageNumber: 1, text: "Hi.", wordCount: 1 }],
    editHistory: [],
    illustrationPages: null,
    currentVisualBibleVersion: null,
    illustrationWorkspaceOpenedAt: null,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: 1,
    submittedAt: 1,
    approvedAt: 1,
    publishedAt: null,
  };
}

describe("IllustrationsTabV2", () => {
  beforeEach(() => {
    mockUseVm.mockReset();
  });

  it("renders CTA when view-model is cta", () => {
    mockUseVm.mockReturnValue({ kind: "cta" });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByRole("button", { name: /Open illustration workspace/i })).toBeTruthy();
  });

  it("renders loading when view-model is pending", () => {
    mockUseVm.mockReturnValue({ kind: "pending", jobId: "j1" });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByText(/Queued/i)).toBeTruthy();
  });

  it("renders running state", () => {
    mockUseVm.mockReturnValue({
      kind: "running",
      jobId: "j1",
      progressHint: "Generating Visual Bible…",
    });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByText(/Generating Visual Bible/i)).toBeTruthy();
  });

  it("renders ready state with scene section", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      visualBibleVersion: 1,
      pages: [
        {
          pageNumber: 1,
          text: "Hi.",
          currentScenePlanVersion: 1,
          currentImageVersion: null,
          status: "plan_only",
          pendingJobId: null,
          lastError: null,
        },
      ],
    });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByText(/Scene plans/i)).toBeTruthy();
  });

  it("renders failed state", () => {
    mockUseVm.mockReturnValue({
      kind: "failed",
      jobId: "j1",
      error: "boom",
    });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByText(/boom/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeTruthy();
  });
});
