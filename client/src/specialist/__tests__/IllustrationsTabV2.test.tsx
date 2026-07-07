import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ScenePlanArtefact } from "../../types/illustration";
import { SPECIALIST_DESK_EN } from "../../i18n/specialistDeskLocales";
import { LanguageProvider } from "../../i18n/context/LanguageContext";
import IllustrationsTabV2 from "../components/illustration/IllustrationsTabV2";
import { useScenePlanArtefact } from "../components/illustration/pageCard/useScenePlanArtefact";
import type { PageCardViewModel } from "../hooks/useIllustrationWorkspaceState";
import { useIllustrationWorkspaceState } from "../hooks/useIllustrationWorkspaceState";
import { useIllustrationDevPanelsGate } from "../hooks/useIsAdminOrDevPanelEnabled";
import { fetchSituationsByTopic } from "../../api/referenceData";
import type { Story } from "../../types/story";

jest.mock("../hooks/useIllustrationWorkspaceState", () => ({
  useIllustrationWorkspaceState: jest.fn(),
}));

jest.mock("../components/illustration/pageCard/useScenePlanArtefact", () => ({
  useScenePlanArtefact: jest.fn(),
}));
jest.mock("../hooks/useIsAdminOrDevPanelEnabled", () => ({
  useIllustrationDevPanelsGate: jest.fn(() => ({ ready: true, allowed: false })),
  useIsAdminOrDevPanelEnabled: jest.fn(() => false),
}));
jest.mock("../../api/illustrationApi", () => ({
  publishStoryToLibrary: jest.fn(),
}));
jest.mock("../../api/referenceData", () => ({
  fetchSituationsByTopic: jest.fn(),
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
const mockDevGate = useIllustrationDevPanelsGate as unknown as jest.Mock;
const mockFetchSituations = fetchSituationsByTopic as jest.MockedFunction<typeof fetchSituationsByTopic>;

function renderTab(story: Story) {
  render(
    <MemoryRouter initialEntries={["/en/specialist/stories/s1/illustrations"]}>
      <LanguageProvider initialLanguage="en">
        <Routes>
          <Route
            path="/:lang/specialist/stories/:storyId/illustrations"
            element={<IllustrationsTabV2 story={story} />}
          />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

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
    // react-scripts' jest config sets `resetMocks: true`, which wipes the
    // inline `jest.fn(() => ...)` implementation from the module factory
    // before every test — so the default must be re-armed here.
    mockDevGate.mockReset();
    mockDevGate.mockReturnValue({ ready: true, allowed: false });
    mockFetchSituations.mockReset();
    mockFetchSituations.mockResolvedValue([]);
  });

  it("renders CTA when view-model is cta", () => {
    mockUseVm.mockReturnValue({ kind: "cta" });
    renderTab(approvedStory());
    expect(screen.getByRole("button", { name: /Open illustration workspace/i })).toBeTruthy();
  });

  it("renders loading when view-model is pending", () => {
    mockUseVm.mockReturnValue({ kind: "pending", jobId: "j1" });
    renderTab(approvedStory());
    expect(screen.getByText(/Queued/i)).toBeTruthy();
  });

  it("renders running state", () => {
    mockUseVm.mockReturnValue({
      kind: "running",
      jobId: "j1",
      progressHint: "Generating Visual Bible…",
    });
    renderTab(approvedStory());
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
    renderTab(approvedStory());
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
    renderTab(story);
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
    renderTab(approvedStory());
    expect(screen.getByText(/boom/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeTruthy();
  });

  it("renders incomplete-metadata warning", () => {
    mockUseVm.mockReturnValue({ kind: "illustration_metadata_incomplete" });
    const story = { ...approvedStory(), status: "illustration_ready" as const };
    renderTab(story);
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
    renderTab(story);
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
    renderTab(story);
    expect(screen.getByText(SPECIALIST_DESK_EN.illRejectedHeader)).toBeTruthy();
    expect(screen.getByText(/Too much shadow on the face/i)).toBeTruthy();
  });

  it.each(PAGE_STATUS_CHIP_CASES)(
    "exposes page status chip aria-label for subStatus $subStatus",
    ({ subStatus, expectedAria, pagePartial }) => {
      mockUseVm.mockReturnValue(readyVmOnePage({ subStatus, ...pagePartial }));
      renderTab(approvedStory());
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
    renderTab(story);
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
    renderTab(staleStory);
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
    renderTab(approvedStory());
    expect(
      screen.queryByRole("button", { name: SPECIALIST_DESK_EN.illWorkspacePublishLibrary }),
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------
  // Top-level illustration progress indicator — must reflect the same live
  // `pages`/`status` the hook already reports, updating without a refresh.
  // ---------------------------------------------------------------------

  function twoPageVm(overrides: {
    subStatuses: [PageCardViewModel["subStatus"], PageCardViewModel["subStatus"]];
    status: "illustration_workspace" | "illustration_ready" | "published";
    allApproved: boolean;
    readOnly: boolean;
  }) {
    const basePage = {
      text: "Hi.",
      scenePlanVersion: 1,
      scenePlanVisualBibleVersion: 1,
      visualBibleIsStale: false,
      imageVersion: 1,
      imageUrl: "https://example.com/p.png",
      lastError: null,
      pendingJobId: null,
      rejectionNote: null,
      scenePlanRegenBusy: false,
      versionCount: { scenePlans: 1, images: 1 },
      imageVersionsDesc: [1],
    };
    return {
      kind: "ready" as const,
      status: overrides.status,
      publishedTemplateId: null,
      visualBibleVersion: 1,
      visualBible: null,
      visualBibleVersionsDesc: [],
      visualBibleRegenJob: null,
      pages: [
        { ...basePage, pageNumber: 1, subStatus: overrides.subStatuses[0] },
        { ...basePage, pageNumber: 2, subStatus: overrides.subStatuses[1] },
      ],
      allApproved: overrides.allApproved,
      readOnly: overrides.readOnly,
      previewModel: null,
    };
  }

  it("shows the top-level progress indicator with the correct approved count out of the live pages", () => {
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "awaiting_review"],
        status: "illustration_workspace",
        allApproved: false,
        readOnly: false,
      }),
    );
    renderTab(approvedStory());

    expect(screen.getByText("1 of 2 illustrations approved")).toBeTruthy();
    expect(screen.getByText(SPECIALIST_DESK_EN.illProgressStatusWorkspace)).toBeTruthy();
  });

  it("updates the top-level progress indicator once the live vm reports every page approved", () => {
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "approved"],
        status: "illustration_ready",
        allApproved: true,
        readOnly: true,
      }),
    );
    renderTab(approvedStory());

    expect(screen.getByText("2 of 2 illustrations approved")).toBeTruthy();
    expect(screen.getByText(SPECIALIST_DESK_EN.illProgressStatusReady)).toBeTruthy();
  });

  // ---------------------------------------------------------------------
  // Regression: the bottom publish/action bar used to render its own
  // "Approval progress" / "N of 2 pages approved." readout, duplicating the
  // top-level indicator above. Only one tracker (IllustrationProgressHeader)
  // should render its count/status; the bottom bar is action-only.
  // ---------------------------------------------------------------------

  it("shows exactly one approval-progress readout with zero pages approved", () => {
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["awaiting_review", "awaiting_review"],
        status: "illustration_workspace",
        allApproved: false,
        readOnly: false,
      }),
    );
    renderTab(approvedStory());

    expect(screen.getByText("0 of 2 illustrations approved")).toBeTruthy();
    expect(screen.queryByText(/pages approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Approval progress")).not.toBeInTheDocument();
  });

  it("shows exactly one approval-progress readout once all pages are approved", () => {
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "approved"],
        status: "illustration_ready",
        allApproved: true,
        readOnly: true,
      }),
    );
    renderTab(approvedStory());

    expect(screen.getByText("2 of 2 illustrations approved")).toBeTruthy();
    expect(screen.queryByText(/pages approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Approval progress")).not.toBeInTheDocument();
    expect(screen.queryByText("All pages approved")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------
  // Ready-to-publish state used to render two readiness messages: the top
  // progress card ("N of N approved" / "Ready to publish") and a second,
  // lower "All illustrations approved" gallery hero card repeating the same
  // information. The hero is now reserved for the "published" state only —
  // "illustration_ready" shows a single status card (with the Preview/
  // Publish actions folded in) followed directly by the approved grid.
  // ---------------------------------------------------------------------

  it("shows a single ready-to-publish message, keeps Preview/Publish actions, and still renders the approved grid", () => {
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "approved"],
        status: "illustration_ready",
        allApproved: true,
        readOnly: true,
      }),
    );
    renderTab(approvedStory());

    // Only the top progress card's readiness message is present.
    expect(screen.getByText("2 of 2 illustrations approved")).toBeTruthy();
    expect(screen.getByText(SPECIALIST_DESK_EN.illProgressStatusReady)).toBeTruthy();
    expect(screen.queryByText(SPECIALIST_DESK_EN.illGalAllApproved)).not.toBeInTheDocument();
    expect(
      screen.queryByText(SPECIALIST_DESK_EN.illGalAllApprovedSub(2)),
    ).not.toBeInTheDocument();

    // Preview/Publish actions are still available (now on the status card).
    expect(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illGalPreview }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illGalPublish }),
    ).toBeTruthy();

    // The approved illustration grid still renders directly below.
    expect(screen.getByText("p.1")).toBeTruthy();
    expect(screen.getByText("p.2")).toBeTruthy();

    // Debug table link stays hidden for a normal (non-admin, non-dev-flag) specialist.
    expect(screen.queryByText(/open illustration debug table/i)).not.toBeInTheDocument();
  });

  it("shows the illustration debug table link when the dev-panels gate allows it", () => {
    mockDevGate.mockReturnValueOnce({ ready: true, allowed: true });
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "approved"],
        status: "illustration_ready",
        allApproved: true,
        readOnly: true,
      }),
    );
    renderTab(approvedStory());

    expect(
      screen.getByRole("link", { name: /open illustration debug table/i }),
    ).toBeTruthy();
  });

  it("keeps the publish flow working from the ready-to-publish status card", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    mockUseVm.mockReturnValue(
      twoPageVm({
        subStatuses: ["approved", "approved"],
        status: "illustration_ready",
        allApproved: true,
        readOnly: true,
      }),
    );
    renderTab(approvedStory());

    await userEvent.click(
      screen.getByRole("button", { name: SPECIALIST_DESK_EN.illGalPublish }),
    );

    expect(await screen.findByText(SPECIALIST_DESK_EN.illPubFormTitle)).toBeTruthy();
  });
});
