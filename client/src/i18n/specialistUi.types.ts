/** Strings for specialist dashboard, nav, and brief review (non–story-brief-form). */

export type SpecialistUi = {
  /** Nav + page chrome */
  workspaceTitle: string;
  workspaceNavAriaLabel: string;
  navBriefs: string;
  navStoryBrief: string;

  briefsPageTitle: string;
  briefsPageHeroOverline: string;
  briefsPageIntro: string;
  newStoryBrief: string;
  refreshListTooltip: string;
  refresh: string;
  loadSubmittedError: string;
  /** Text before the monospace command block (when list shows permission error). */
  permissionHelpBeforeCode: string;
  /** Text after the command block. */
  permissionHelpAfterCode: string;

  sectionInProgress: string;
  inProgressHint: string;
  colStoryFocus: string;
  colLastSaved: string;
  colActions: string;
  colBriefId: string;
  colSubmitted: string;

  draftsEmptyTitle: string;
  draftsEmptyBody: string;
  startABrief: string;
  notStarted: string;
  resume: string;
  deleteDraftTooltip: string;
  deleteDraftAria: string;

  sectionSubmitted: string;
  submittedHint: string;
  submittedEmptyTitle: string;
  submittedEmptyBody: string;

  copyFullIdTooltip: string;
  copyBriefIdAria: string;
  view: string;

  deleteDraftDialogTitle: string;
  deleteDraftDialogWithLabel: (label: string) => string;
  deleteDraftDialogGeneric: string;
  cannotUndo: string;
  cancel: string;
  deleteDraftConfirm: string;

  snackbarDraftRemoved: string;
  snackbarBriefIdCopied: string;
  snackbarCopyFailed: string;

  reviewAllBriefsLink: string;
  reviewSubmittedOverline: string;
  reviewPageTitle: string;
  copyJsonButton: string;
  copyJsonTooltip: string;
  payloadReadOnly: string;
  copyTooltip: string;
  copyJsonAria: string;
  reviewBackBottom: string;
  loadBriefError: string;
  copyJsonSuccess: string;
  copyJsonFail: string;
};
