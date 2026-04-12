import { useMemo } from "react";
import { useLanguage } from "./context/useLanguage";
import { SPECIALIST_UI_HE } from "./specialistUiHebrew";
import type { SpecialistUi } from "./specialistUi.types";

export type { SpecialistUi } from "./specialistUi.types";

function buildEnglishSpecialistUi(): SpecialistUi {
  return {
    workspaceTitle: "Specialist workspace",
    workspaceNavAriaLabel: "Specialist workspace",
    navBriefs: "Briefs",
    navStoryBrief: "Story brief",

    briefsPageTitle: "Story briefs",
    briefsPageHeroOverline: "Specialist workspace",
    briefsPageIntro:
      "Drafts are saved in this browser only. Submitted briefs are stored on the server and listed below for review.",
    newStoryBrief: "New story brief",
    refreshListTooltip: "Reload submitted list",
    refresh: "Refresh",
    loadSubmittedError: "Could not load submitted briefs",
    permissionHelpBeforeCode:
      "Story brief APIs require the specialist role on your Firebase account (not caregiver/parent). Ask a project admin to run from the server folder:",
    permissionHelpAfterCode:
      "Then sign out and sign in again so your ID token includes the new role.",

    sectionInProgress: "In progress",
    inProgressHint:
      "Resume where you left off. Clearing your browser data will remove these drafts.",
    colStoryFocus: "Story focus",
    colLastSaved: "Last saved",
    colActions: "Actions",
    colBriefId: "Brief ID",
    colSubmitted: "Submitted",

    draftsEmptyTitle: "No drafts yet",
    draftsEmptyBody:
      "When you start a new brief, it will appear here so you can continue editing.",
    startABrief: "Start a brief",
    notStarted: "Not started",
    resume: "Resume",
    deleteDraftTooltip: "Delete draft",
    deleteDraftAria: "Delete draft",

    sectionSubmitted: "Submitted",
    submittedHint:
      "Final briefs you have sent to the server. Open to review the full JSON or download a backup.",
    submittedEmptyTitle: "Nothing submitted yet",
    submittedEmptyBody:
      "Complete and send a brief from the editor. It will show up here with the server timestamp.",

    copyFullIdTooltip: "Copy full ID",
    copyBriefIdAria: "Copy brief ID",
    view: "View",

    deleteDraftDialogTitle: "Delete this draft?",
    deleteDraftDialogWithLabel: (label) =>
      `This will remove your in-progress brief (${label}).`,
    deleteDraftDialogGeneric: "This will remove your in-progress brief.",
    cannotUndo: "This cannot be undone.",
    cancel: "Cancel",
    deleteDraftConfirm: "Delete draft",

    snackbarDraftRemoved: "Draft removed",
    snackbarBriefIdCopied: "Brief ID copied",
    snackbarCopyFailed: "Could not copy — select the ID manually",

    reviewAllBriefsLink: "All briefs",
    reviewSubmittedOverline: "Submitted brief",
    reviewPageTitle: "Brief review",
    copyJsonButton: "Copy JSON",
    copyJsonTooltip: "Copy JSON to clipboard",
    payloadReadOnly: "Payload (read-only)",
    copyTooltip: "Copy",
    copyJsonAria: "Copy JSON",
    reviewBackBottom: "← Back to all briefs",
    loadBriefError: "Failed to load brief",
    reviewMissingBriefId: "Missing brief id in the URL.",

    draftRedirectTitle: "Opening your brief",
    draftRedirectBody:
      "Taking you to your most recently saved draft, or a new brief if you have not started one yet.",
    draftRedirectLoadingAria: "Loading",
    copyJsonSuccess: "JSON copied to clipboard",
    copyJsonFail: "Could not copy — select the text below",

    reviewTabBrief: "Brief",
    reviewTabJson: "Raw JSON",
    reviewTabsAriaLabel: "Brief summary or raw JSON payload",
    reviewFieldEmpty: "—",
    reviewParseWarning: "Some stored fields could not be read; the summary below may be incomplete. Use Raw JSON for the exact payload.",
    reviewAcknowledgedTitle: "Acknowledged clinical checks",
  };
}

const SPECIALIST_UI_EN = buildEnglishSpecialistUi();

export function useSpecialistUi(): SpecialistUi {
  const { language } = useLanguage();
  return useMemo(
    () => (language === "en" ? SPECIALIST_UI_EN : SPECIALIST_UI_HE),
    [language],
  );
}
