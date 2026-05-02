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

  unsavedDialogTitle: string;
  unsavedDialogBody: string;
  unsavedLeave: string;
  unsavedStay: string;

  workspaceArchiveFailed: string;
  workspaceRestoreFailed: string;
  workspaceCreateRevisionFailed: string;

  headerBackToStories: string;
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
