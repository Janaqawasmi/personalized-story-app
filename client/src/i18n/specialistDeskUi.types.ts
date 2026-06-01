import type { Story, StoryStatus } from "../types/story";

/** Desk / workspace copy for specialist stories list and story workspace (not brief editor). */
export interface SpecialistDeskUi {
  /** e.g. “Saved 5 minutes ago” — word order differs by language. */
  formatSavedAt(relativePhrase: string): string;
  formatCountSummary(allStories: Story[]): string;
  formatTableFooter(
    filteredLen: number,
    allStories: Story[],
    activeStatuses: StoryStatus[],
  ): string;

  deskOverline: string;
  deskTitlePrefix: string;
  deskTitleEmphasis: string;
  deskSummaryFallback: string;

  statInCare: string;
  statAwaitsYou: string;
  statApproved: string;

  newStory: string;
  retry: string;

  loadStoriesFailed: string;
  archiveStoryFailed: string;
  restoreStoryFailed: string;

  serverWarningBold: string;
  serverWarningRest: string;
  serverWarningReasonPrefix: string;

  reviewQueueOverline: string;
  reviewQueueTitleOne: string;
  reviewQueueTitleMany: (count: number) => string;
  reviewQueueBodyLine: (title: string) => string;
  untitledStory: string;
  skimQueue: string;
  openNamedStory: (firstWord: string) => string;
  /** When title is empty, label for the “open” CTA (e.g. “story”). */
  openStoryShort: string;

  revisionOverline: string;
  revisionTitleOne: string;
  revisionTitleMany: (count: number) => string;
  revisionBodyLine: (title: string) => string;
  showQueue: string;

  viewArchivedLink: (count: number) => string;

  chipAll: string;
  chipAwaitingReview: string;
  chipInReview: string;
  chipBriefInProgress: string;
  chipGenerating: string;
  chipNeedsRevision: string;
  chipApproved: string;
  chipIllustrationWorkspace: string;
  chipPromptReview: string;
  chipIllustrating: string;
  chipIllustrationReview: string;
  chipIllustrationReady: string;
  chipArchived: string;

  sortLastActivity: string;
  sortNewestFirst: string;
  sortOldestFirst: string;
  sortTitleAZ: string;
  filterAriaLabel: string;
  searchPlaceholder: string;
  sortLabelPrefix: string;
  clearSearchAria: string;

  colNumber: string;
  colManuscript: string;
  colStage: string;
  colPopulationAge: string;
  colStatus: string;
  colLastEvent: string;

  emptyFirstTimeTitle: string;
  emptyFirstTimeBody: string;
  emptyFiltered: string;
  clearAllFilters: string;

  statusLabels: Record<StoryStatus, string>;
  revisionBadge: string;

  editEventCreated: string;
  editEventStoryEdited: string;
  editEventUpdated: string;
  editEventSubmitted: string;
  editEventDraftGenerated: string;
  editEventGenerationFailed: string;
  editEventRegenerationRequested: string;
  editEventArchived: string;
  editEventRestored: string;

  rowMenuArchive: string;
  rowMenuRestore: string;
  rowAriaStoryActions: string;

  timeJustNow: string;
  formatMinutesAgo: (n: number) => string;
  formatHoursAgo: (n: number) => string;
  formatDaysAgo: (n: number) => string;
  timeYesterday: string;

  pipelineSteps: readonly [string, string, string, string, string, string];
  pipelineListPublish: string;
  pipelineListArchived: string;
  pipelineArchivedHint: string;
  pipelineAriaLabel: string;
  pipelineHints: Record<Exclude<StoryStatus, "archived">, string>;

  tabBrief: string;
  tabStory: string;
  tabIllustrations: string;
  tabHistory: string;
  tabStoryDisabledTooltip: string;
  tabsAriaLabel: string;

  workspaceStillLoading: string;
  workspaceSkeletonTabs: readonly [string, string, string, string];
  workspaceStoryNotFound: string;
  workspaceBackToStories: string;
  workspaceLoadStoryFailed: string;
  workspaceCouldNotOpenReview: string;
  workspaceErrorBanner: string;
  workspaceTryAgain: string;
  /** Illustrations tab when Firestore story lacks `currentVisualBibleVersion` and no VB/scene-plan artefacts were found. */
  illustrationsTabIncompleteMetadata: string;

  /** Illustrations tab redesign (workspace / gallery / dialog). */
  illSourceText: string;
  illIntentLabel: string;
  illDetailLabel: string;
  illStaleBibleBanner: string;
  illStaleBibleAction: string;
  illRejectedHeader: string;
  illSecAltPlan: string;
  illSecSuggestChange: string;
  illSecTechDetails: string;
  illStatusPlanOnly: string;
  illStatusGenerating: string;
  illStatusAwaiting: string;
  illStatusApproved: string;
  illStatusRejected: string;
  illActGenerate: string;
  illActDrawing: string;
  illActApprove: string;
  illActReject: string;
  illActReopen: string;
  illActRegen: string;
  illNoImageHead: string;
  illNoImageHint: string;
  illDrawingPage: (pageIndex: number) => string;
  illUnderThirty: string;
  illNewVersionLabel: string;
  illPubApprovedTitle: string;
  illPubProgressTitle: string;
  illPubApprovedSub: string;
  illPubProgressSub: (approved: number, total: number) => string;
  illPubReady: string;
  illPubMore: (remaining: number) => string;
  illGalAllApproved: string;
  illGalPublished: string;
  illGalAllApprovedSub: (pageCount: number) => string;
  illGalPublishedSub: string;
  illGalPreview: string;
  illGalPublish: string;
  illGalReopen: string;
  illDlgTitle: string;
  illDlgSubtitle: (title: string, pageCount: number) => string;
  illDlgPartialSubtitle: (
    title: string,
    pageCount: number,
    illustratedCount: number,
  ) => string;
  illDlgManuscriptSubtitle: (title: string, pageCount: number) => string;
  illDlgAllApproved: string;
  illDlgWorkInProgress: string;
  illDlgManuscriptOnly: string;
  illDlgSpread: (spreadIndex: number, totalSpreads: number) => string;
  illDlgExport: string;
  illDlgPublish: string;
  illDlgPrev: string;
  illDlgNext: string;
  illDlgClose: string;
  illVbCharacterAnchor: string;
  illVbCharacterHint: string;
  illVbStyleGuide: string;
  illVbAnchors: string;
  illVbAnchorsHint: string;
  illVbPalette: string;
  illVbEnvironments: string;
  illVbAvoid: string;
  illVbEnvAtmosphere: string;
  illVbEnvLayout: string;
  illVbEditedTag: string;
  illVbTitle: string;
  illVbSubtitle: string;
  illVbVersion: (version: number) => string;
  illVbEdit: string;
  illVbRegenerate: string;
  illVbLoading: string;
  illVbRegenerating: string;
  illVbVersionField: string;
  illVbHistoricalView: string;
  illVbRegenDialogTitle: string;
  illVbRegenDialogBody: string;
  illVbRegenDialogConfirm: string;
  illVbSave: string;
  illVbCharacterSheet: string;
  illVbPaletteEditorHint: string;
  illVbMandatedAvoidHint: string;
  illVbAddColour: string;
  illVbRemoveRow: string;
  illVbAddAnchor: string;
  illVbAddAvoidEntry: string;
  illVbAddEnvironment: string;
  illVbRemoveEnvironment: string;
  illRejectIllustrationTitle: string;
  illRejectFeedbackLabel: string;
  illScenePlanUnavailable: string;
  illScenePlanLoading: string;
  illScenePlanUpdating: string;
  illWorkspaceMarkReadyTitle: string;
  illWorkspaceMarkReadyBody: (pageCount: number) => string;
  illWorkspacePreviewAsBook: string;
  illWorkspacePublishLibrary: string;
  illCtaHeadline: string;
  illCtaBody: (pageCount: number) => string;
  illCtaButton: string;
  illCtaMeta: (scenePlanCount: number) => string;
  illCtaSteps: readonly Readonly<[stepId: string, title: string, desc: string]>[];
  illGenTitle: string;
  illGenSub: string;
  illGenPendingQueue: string;
  illGenFailedTitle: string;
  illGenStage1Label: string;
  illGenStage2Label: string;
  illGenStage1Meta: string;
  illGenStage2PendingMeta: string;
  illPagesEyebrow: string;
  illPagesTitleMixed: (pageCount: number) => string;
  illPagesTitleApproved: (pageCount: number) => string;
  illRegenAllPlans: string;
  illGenerateAllImages: string;
  illPageNumber: (pageIndex: number) => string;

  unsavedDialogTitle: string;
  unsavedDialogBody: string;
  unsavedLeave: string;
  unsavedStay: string;

  workspaceArchiveFailed: string;
  workspaceRestoreFailed: string;
  workspaceCreateRevisionFailed: string;

  headerBackToStories: string;
  headerPreviewBook: string;
  headerPreviewBookDisabledTooltip: string;
  headerStoryTitleAria: string;
  headerClickToEditTitle: string;
  headerStatusAria: (statusLabel: string) => string;
  headerStoryActionsAria: string;
  headerMenuArchive: string;
  headerMenuRestore: string;
  headerMenuNewRevision: string;
  headerMenuNewRevisionTooltip: string;
  headerMenuCopyId: string;
  headerArchiveDialogTitle: string;
  headerArchiveDialogBody: string;
  headerCancel: string;
  headerArchiveConfirm: string;
  headerCopiedSnackbar: string;
  agesChipPrefix: string;

  footCareTitle: string;
  footCareBody: string;
  footWorkflowTitle: string;
  footWorkflow1: string;
  footWorkflow2: string;
  footWorkflow3: string;
  footTipsTitle: string;
  footTipsBody: string;
}
