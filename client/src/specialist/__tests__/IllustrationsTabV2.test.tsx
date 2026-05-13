import { render, screen } from "@testing-library/react";
import IllustrationsTabV2 from "../components/illustration/IllustrationsTabV2";
import { useIllustrationWorkspaceState } from "../hooks/useIllustrationWorkspaceState";

jest.mock("../hooks/useIllustrationWorkspaceState", () => ({
  useIllustrationWorkspaceState: jest.fn(),
}));

jest.mock("../hooks/useIsAdminOrDevPanelEnabled", () => ({
  useIllustrationDevPanelsGate: () => ({ ready: true, allowed: false }),
  useIsAdminOrDevPanelEnabled: () => false,
}));

jest.mock("../../i18n/specialistDeskUi", () => ({
  useSpecialistDeskUi: () => ({
    illustrationsTabIncompleteMetadata: "Illustration metadata on this story is incomplete.",
  }),
}));

const mockUseVm = useIllustrationWorkspaceState as unknown as jest.Mock;

function approvedStory() {
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
    brief: {},
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
    publishedTemplateId: null,
  } as unknown as import("../../types/story").Story;
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

  it("renders ready state with pages section", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      visualBibleVersion: 1,
      visualBible: null,
      visualBibleVersionsDesc: [],
      visualBibleRegenJob: null,
      pages: [
        {
          pageNumber: 1,
          text: "Hi.",
          scenePlanVersion: 1,
          scenePlanVisualBibleVersion: 1,
          visualBibleIsStale: false,
          imageVersion: null,
          imageUrl: null,
          subStatus: "plan_only",
          lastError: null,
          pendingJobId: null,
          rejectionNote: null,
          scenePlanRegenBusy: false,
          versionCount: { scenePlans: 1, images: 0 },
          imageVersionsDesc: [],
        },
      ],
      allApproved: false,
      readOnly: false,
      previewModel: null,
    });
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(screen.getByText(/^Pages$/i)).toBeTruthy();
  });

  it("does not show mark ready when not all approved (workspace)", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      visualBibleVersion: 1,
      visualBible: null,
      visualBibleVersionsDesc: [],
      visualBibleRegenJob: null,
      pages: [
        {
          pageNumber: 1,
          text: "Hi.",
          scenePlanVersion: 1,
          scenePlanVisualBibleVersion: 1,
          visualBibleIsStale: false,
          imageVersion: null,
          imageUrl: null,
          subStatus: "plan_only",
          lastError: null,
          pendingJobId: null,
          rejectionNote: null,
          scenePlanRegenBusy: false,
          versionCount: { scenePlans: 1, images: 0 },
          imageVersionsDesc: [],
        },
      ],
      allApproved: false,
      readOnly: false,
      previewModel: null,
    });
    const story = { ...approvedStory(), status: "illustration_workspace" as const };
    render(<IllustrationsTabV2 story={story} />);
    expect(
      screen.queryByRole("button", { name: /Mark as ready to publish/i }),
    ).not.toBeInTheDocument();
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

  it("renders incomplete-metadata warning", () => {
    mockUseVm.mockReturnValue({ kind: "illustration_metadata_incomplete" });
    const story = { ...approvedStory(), status: "illustration_ready" as const };
    render(<IllustrationsTabV2 story={story} />);
    expect(screen.getByText(/Illustration metadata on this story is incomplete/i)).toBeTruthy();
  });
});
