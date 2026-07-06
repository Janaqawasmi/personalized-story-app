import { render, screen } from "@testing-library/react";
import type { ScenePlanArtefact } from "../../types/illustration";
import { SPECIALIST_DESK_EN } from "../../i18n/specialistDeskLocales";
import IllustrationsTabV2 from "../components/illustration/IllustrationsTabV2";
import { useScenePlanArtefact } from "../components/illustration/pageCard/useScenePlanArtefact";
import type { PageCardViewModel } from "../hooks/useIllustrationWorkspaceState";
import { useIllustrationWorkspaceState } from "../hooks/useIllustrationWorkspaceState";

jest.mock("../hooks/useIllustrationWorkspaceState", () => ({
  useIllustrationWorkspaceState: jest.fn(),
}));

jest.mock("../components/illustration/pageCard/useScenePlanArtefact", () => ({
  useScenePlanArtefact: jest.fn(),
}));
jest.mock("../hooks/useIsAdminOrDevPanelEnabled", () => ({
  useIllustrationDevPanelsGate: () => ({ ready: true, allowed: false }),
  useIsAdminOrDevPanelEnabled: () => false,
}));

jest.mock("../../i18n/specialistDeskUi", () => {
  const { SPECIALIST_DESK_EN } = jest.requireActual("../../i18n/specialistDeskLocales");
  return {
    useSpecialistDeskUi: () => ({
      ...SPECIALIST_DESK_EN,
      illustrationsTabIncompleteMetadata:
        "Illustration metadata on this story is incomplete.",
    }),
  };
});

const mockUseVm = useIllustrationWorkspaceState as unknown as jest.Mock;
const mockUseScenePlan = useScenePlanArtefact as jest.MockedFunction<typeof useScenePlanArtefact>;

const fakeScenePlan: ScenePlanArtefact = {
  id: "1-1",
  storyId: "s1",
  pageNumber: 1,
  version: 1,
  createdAt: 1,
  parentVersion: null,
  llmCall: {
    model: "claude",
    prompt: "p",
    response: "r",
    inputTokens: 1,
    outputTokens: 1,
    latencyMs: 10,
    success: true,
    error: null,
  },
  visualBibleVersion: 1,
  feedbackNote: null,
  title: "Opening beat",
  prose: "The child pauses at the door.",
  emotionalIntent: "Hesitation",
  keyVisibleDetail: "Hand on frame",
  director: {
    moment: "m",
    cameraSpec: "c",
    lightingChoice: "l",
    visualHook: "v",
    keyPhysicalDetail: "k",
  },
  structuredPrompt: null,
};

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

function readyVmOnePage(
  pagePatch: Partial<PageCardViewModel> & Pick<PageCardViewModel, "subStatus">,
  overrides?: {
    status?: "illustration_workspace" | "illustration_ready" | "published";
    publishedTemplateId?: string | null;
    allApproved?: boolean;
    readOnly?: boolean;
  },
) {
  const defaults: Omit<PageCardViewModel, "subStatus"> = {
    pageNumber: 1,
    text: "Hi.",
    scenePlanVersion: 1,
    scenePlanVisualBibleVersion: 1,
    visualBibleIsStale: false,
    imageVersion: null,
    imageUrl: null,
    lastError: null,
    pendingJobId: null,
    rejectionNote: null,
    scenePlanRegenBusy: false,
    versionCount: { scenePlans: 1, images: 0 },
    imageVersionsDesc: [],
  };
  const page: PageCardViewModel = { ...defaults, ...pagePatch };
  return {
    kind: "ready" as const,
    status: overrides?.status ?? "illustration_workspace",
    publishedTemplateId: overrides?.publishedTemplateId ?? null,
    visualBibleVersion: 1,
    visualBible: null,
    visualBibleVersionsDesc: [],
    visualBibleRegenJob: null,
    pages: [page],
    allApproved: overrides?.allApproved ?? false,
    readOnly: overrides?.readOnly ?? false,
    previewModel: null,
  };
}

const PAGE_STATUS_CHIP_CASES: Array<{
  subStatus: PageCardViewModel["subStatus"];
  expectedAria: string;
  pagePartial?: Partial<PageCardViewModel>;
}> = [
  { subStatus: "plan_only", expectedAria: SPECIALIST_DESK_EN.illStatusPlanOnly },
  { subStatus: "generating_image", expectedAria: SPECIALIST_DESK_EN.illStatusGenerating },
  {
    subStatus: "awaiting_review",
    expectedAria: SPECIALIST_DESK_EN.illStatusAwaiting,
    pagePartial: {
      imageVersion: 1,
      imageUrl: "https://example.com/p1.png",
      versionCount: { scenePlans: 1, images: 1 },
      imageVersionsDesc: [1],
    },
  },
  {
    subStatus: "approved",
    expectedAria: SPECIALIST_DESK_EN.illStatusApproved,
    pagePartial: {
      imageVersion: 1,
      imageUrl: "https://example.com/p1.png",
      versionCount: { scenePlans: 1, images: 1 },
      imageVersionsDesc: [1],
    },
  },
  {
    subStatus: "needs_revision",
    expectedAria: SPECIALIST_DESK_EN.illStatusRejected,
    pagePartial: {
      imageVersion: 1,
      imageUrl: "https://example.com/p1.png",
      versionCount: { scenePlans: 1, images: 1 },
      imageVersionsDesc: [1],
      rejectionNote: null,
    },
  },
];

describe("IllustrationsTabV2", () => {
  beforeEach(() => {
    mockUseVm.mockReset();
    mockUseScenePlan.mockReset();
    mockUseScenePlan.mockReturnValue(fakeScenePlan);
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
      status: "illustration_workspace",
      publishedTemplateId: null,
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
    expect(screen.getByText("Story pages")).toBeTruthy();
    expect(screen.getByText(/1 pages · plans ready/i)).toBeTruthy();
  });

  it("does not show mark ready when not all approved (workspace)", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      status: "illustration_workspace",
      publishedTemplateId: null,
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

  it("shows stale Visual Bible banner when plan is behind current bible version", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      status: "illustration_workspace",
      publishedTemplateId: null,
      visualBibleVersion: 2,
      visualBible: null,
      visualBibleVersionsDesc: [],
      visualBibleRegenJob: null,
      pages: [
        {
          pageNumber: 1,
          text: "Hi.",
          scenePlanVersion: 1,
          scenePlanVisualBibleVersion: 1,
          visualBibleIsStale: true,
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
    expect(screen.getByText(SPECIALIST_DESK_EN.illStaleBibleBanner)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illStaleBibleAction }),
    ).toBeTruthy();
  });

  it("shows rejection feedback banner when a rejection note is present", () => {
    mockUseVm.mockReturnValue({
      kind: "ready",
      status: "illustration_workspace",
      publishedTemplateId: null,
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
          imageVersion: 1,
          imageUrl: "https://example.com/p1.png",
          subStatus: "needs_revision",
          lastError: null,
          pendingJobId: null,
          rejectionNote: "Too much shadow on the face.",
          scenePlanRegenBusy: false,
          versionCount: { scenePlans: 1, images: 1 },
          imageVersionsDesc: [1],
        },
      ],
      allApproved: false,
      readOnly: false,
      previewModel: null,
    });
    const story = { ...approvedStory(), status: "illustration_workspace" as const };
    render(<IllustrationsTabV2 story={story} />);
    expect(screen.getByText(SPECIALIST_DESK_EN.illRejectedHeader)).toBeTruthy();
    expect(screen.getByText(/Too much shadow on the face/i)).toBeTruthy();
  });

  it.each(PAGE_STATUS_CHIP_CASES)(
    "exposes page status chip aria-label for subStatus $subStatus",
    ({ subStatus, expectedAria, pagePartial }) => {
      mockUseVm.mockReturnValue(readyVmOnePage({ subStatus, ...pagePartial }));
      render(<IllustrationsTabV2 story={approvedStory()} />);
      expect(screen.getByLabelText(expectedAria)).toBeTruthy();
    },
  );

  // ---------------------------------------------------------------------
  // Regression coverage for the CTA-refresh bug: the outer `story` prop is
  // a one-shot REST snapshot (see StoryWorkspacePage) that does not update
  // after illustration/publish mutations. The CTA visibility in
  // WorkspacePreview must be driven by the hook's live `vm` fields
  // (status/allApproved/readOnly/publishedTemplateId), not by `story.status`.
  // These tests deliberately keep the outer `story` prop "stale" (still
  // `illustration_workspace`) while the live vm has already moved on, to
  // prove the CTA no longer depends on a page refresh.
  // ---------------------------------------------------------------------

  it("shows 'Mark as ready to publish' as soon as the live vm reports allApproved, even before the story prop's status would suggest it", () => {
    mockUseVm.mockReturnValue(
      readyVmOnePage(
        {
          subStatus: "approved",
          imageVersion: 1,
          imageUrl: "https://example.com/p1.png",
          versionCount: { scenePlans: 1, images: 1 },
          imageVersionsDesc: [1],
        },
        { status: "illustration_workspace", allApproved: true, readOnly: false },
      ),
    );
    // Outer story prop is a stale snapshot — still "approved" pre-workspace status
    // is not relevant here, so use the same "illustration_workspace" the vm reports.
    const story = { ...approvedStory(), status: "illustration_workspace" as const };
    render(<IllustrationsTabV2 story={story} />);
    expect(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illPubReady }),
    ).toBeTruthy();
  });

  it("shows 'Publish to library' immediately once the live vm status is illustration_ready, even though the stale story prop is still illustration_workspace", () => {
    mockUseVm.mockReturnValue(
      readyVmOnePage(
        {
          subStatus: "approved",
          imageVersion: 1,
          imageUrl: "https://example.com/p1.png",
          versionCount: { scenePlans: 1, images: 1 },
          imageVersionsDesc: [1],
        },
        { status: "illustration_ready", allApproved: true, readOnly: true },
      ),
    );
    // Simulates the exact bug scenario: StoryWorkspacePage's one-shot-fetched
    // `story` prop never learned about the "Mark ready to publish" transition,
    // so it is still stuck reporting the pre-transition status.
    const staleStory = { ...approvedStory(), status: "illustration_workspace" as const };
    render(<IllustrationsTabV2 story={staleStory} />);
    expect(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illWorkspacePublishLibrary }),
    ).toBeTruthy();
    // The "Mark as ready to publish" action should no longer be offered once
    // the live status has already advanced past illustration_workspace.
    expect(
      screen.queryByRole("button", { name: SPECIALIST_DESK_EN.illPubReady }),
    ).not.toBeInTheDocument();
  });

  it("does not show 'Publish to library' while the live vm status is still illustration_workspace, even if allApproved is true", () => {
    mockUseVm.mockReturnValue(
      readyVmOnePage(
        {
          subStatus: "approved",
          imageVersion: 1,
          imageUrl: "https://example.com/p1.png",
          versionCount: { scenePlans: 1, images: 1 },
          imageVersionsDesc: [1],
        },
        { status: "illustration_workspace", allApproved: true, readOnly: false },
      ),
    );
    render(<IllustrationsTabV2 story={approvedStory()} />);
    expect(
      screen.queryByRole("button", { name: SPECIALIST_DESK_EN.illWorkspacePublishLibrary }),
    ).not.toBeInTheDocument();
  });
});
