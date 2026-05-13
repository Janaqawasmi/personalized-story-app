import type { Story, StoryStatus } from "../types/story";
import type { SpecialistDeskUi } from "./specialistDeskUi.types";

function buildCountSummaryEn(allStories: Story[]): string {
  const nonArchived = allStories.filter((s) => s.status !== "archived");
  const total = nonArchived.length;
  const parts: string[] = [
    `${total} ${total === 1 ? "manuscript" : "manuscripts"} in care`,
  ];
  const segments: [StoryStatus, string][] = [
    ["in_review", "in review"],
    ["awaiting_review", "awaiting review"],
    ["generating", "generating"],
    ["needs_revision", "needs revision"],
  ];
  for (const [status, label] of segments) {
    const count = nonArchived.filter((s) => s.status === status).length;
    if (count > 0) parts.push(`${count} ${label}`);
  }
  return parts.join(" · ");
}

function buildTableFooterEn(
  filteredLen: number,
  allStories: Story[],
  activeStatuses: StoryStatus[],
): string {
  const archivedOnly =
    activeStatuses.length === 1 && activeStatuses[0] === "archived";
  const showing = filteredLen === 0 ? "0" : `1–${filteredLen}`;
  if (archivedOnly) {
    const ac = allStories.filter((s) => s.status === "archived").length;
    return `Showing ${showing} of ${ac} archived manuscript${ac === 1 ? "" : "s"}`;
  }
  const liveTotal = allStories.filter((s) => s.status !== "archived").length;
  return `Showing ${showing} of ${liveTotal} active manuscript${liveTotal === 1 ? "" : "s"}`;
}

function buildCountSummaryHe(allStories: Story[]): string {
  const nonArchived = allStories.filter((s) => s.status !== "archived");
  const total = nonArchived.length;
  const parts: string[] = [
    `${total} ${total === 1 ? "כתב יד" : "כתבי יד"} בטיפול`,
  ];
  const segments: [StoryStatus, string][] = [
    ["in_review", "בבדיקה"],
    ["awaiting_review", "ממתין לביקורת"],
    ["generating", "נוצר"],
    ["needs_revision", "דורש תיקון"],
  ];
  for (const [status, label] of segments) {
    const count = nonArchived.filter((s) => s.status === status).length;
    if (count > 0) parts.push(`${count} ${label}`);
  }
  return parts.join(" · ");
}

function buildTableFooterHe(
  filteredLen: number,
  allStories: Story[],
  activeStatuses: StoryStatus[],
): string {
  const archivedOnly =
    activeStatuses.length === 1 && activeStatuses[0] === "archived";
  const showing = filteredLen === 0 ? "0" : `1–${filteredLen}`;
  if (archivedOnly) {
    const ac = allStories.filter((s) => s.status === "archived").length;
    return `מציגים ${showing} מתוך ${ac} כתבי יד בארכיון`;
  }
  const liveTotal = allStories.filter((s) => s.status !== "archived").length;
  return `מציגים ${showing} מתוך ${liveTotal} כתבי יד פעילים`;
}

/** Narrow no-break space — avoids bidi gaps between Western digits and Arabic. */
const NNBS = "\u202f";

function buildCountSummaryAr(allStories: Story[]): string {
  const nonArchived = allStories.filter((s) => s.status !== "archived");
  const total = nonArchived.length;
  const parts: string[] = [
    `${total}${NNBS}${
      total === 1 ? "مخطوطة" : "مخطوطات"
    } قيد العناية`,
  ];
  const segments: [StoryStatus, string][] = [
    ["in_review", "قيد المراجعة"],
    ["awaiting_review", "في انتظار المراجعة"],
    ["generating", "قيد التوليد"],
    ["needs_revision", "بحاجة إلى مراجعة"],
  ];
  for (const [status, label] of segments) {
    const count = nonArchived.filter((s) => s.status === status).length;
    if (count > 0) parts.push(`${count}${NNBS}${label}`);
  }
  /** Arabic comma — reads cleaner than a middle dot in RTL. */
  return parts.join(`${NNBS}\u060c${NNBS}`);
}

function buildTableFooterAr(
  filteredLen: number,
  allStories: Story[],
  activeStatuses: StoryStatus[],
): string {
  const archivedOnly =
    activeStatuses.length === 1 && activeStatuses[0] === "archived";
  const showing = filteredLen === 0 ? "0" : `1–${filteredLen}`;
  if (archivedOnly) {
    const ac = allStories.filter((s) => s.status === "archived").length;
    return `عرض ${showing} من ${ac} مخطوطة${ac === 1 ? "" : "ات"} مؤرشفة`;
  }
  const liveTotal = allStories.filter((s) => s.status !== "archived").length;
  return `عرض ${showing} من ${liveTotal} مخطوطة${liveTotal === 1 ? "" : "ات"} نشطة`;
}

const PIPELINE_HINTS_EN = {
  draft_brief:
    "Complete the clinical brief and submit it to start AI generation.",
  generating:
    "Generation usually finishes in under a minute. You can stay on the Brief tab while it runs.",
  needs_revision:
    "The story is regenerating from your feedback—check back shortly.",
  awaiting_review:
    "Open the Story tab to read the generated text and complete your review.",
  in_review:
    "Finish reviewing the generated story, then approve, edit, or request changes.",
  approved:
    "This story is approved. Open the illustration workspace to generate a Visual Bible and per-page scene plans.",
  illustration_workspace:
    "The illustration workspace is open — work through each page, then mark illustration ready.",
  illustration_ready: "All illustrations are approved. Publish when you are ready.",
  published: "This story has been published.",
} as const;

const PIPELINE_HINTS_HE = {
  draft_brief:
    "השלימו את המוגז הקליני ושלחו אותו כדי להתחיל יצירה בבינה מלאכותית.",
  generating:
    "היצירה בדרך כלל מסתיימת תוך דקה. אפשר להישאר בלשונית המוגז בזמן הריצה.",
  needs_revision: "הסיפור מתעדכן מהמשוב שלכם — בדקו שוב בעוד רגע.",
  awaiting_review:
    "פתחו את לשונית הסיפור כדי לקרוא את הטקסט שהופק ולהשלים את הביקורת.",
  in_review:
    "סיימו לבדוק את הסיפור, ואז אשרו, ערכו או בקשו שינויים.",
  approved: "הסיפור אושר. פתחו את סביבת האיור כדי ליצור Visual Bible ותכניות סצנה לכל עמוד.",
  illustration_workspace:
    "מרחב האיור פתוח — עברו על כל עמוד ואז סמנו שהאיורים מוכנים.",
  illustration_ready: "כל האיורים אושרו. פרסמו כשאתם מוכנים.",
  published: "הסיפור פורסם.",
} as const;

const PIPELINE_HINTS_AR = {
  draft_brief:
    "أكملوا الموجز السريري وأرسِلوه لبدء توليد النص بالذكاء الاصطناعي.",
  generating:
    "التوليد يستغرق عادةً أقل من دقيقة. يمكنكم البقاء في تبويب الموجز أثناء التشغيل.",
  needs_revision: "تُحدَّث القصة وفق ملاحظاتكم — تحققوا قريبًا.",
  awaiting_review:
    "افتحوا تبويب القصة لقراءة النص المُولَّد وإكمال مراجعتكم السريرية.",
  in_review:
    "أكملوا مراجعة القصة ثم وافقوا أو عدّلوا أو اطلبوا تغييرات.",
  approved: "القصة معتمدة. ولّدوا أوصاف الصور عند الجاهزية.",
  illustration_workspace:
    "مساحة التوضيح مفتوحة — أكملوا كل صفحة ثم علّموا جاهزية التوضيح.",
  illustration_ready: "اعتُمدت كل التوضيحات. انشروا عند الجاهزية.",
  published: "نُشرت هذه القصة.",
} as const;

const STATUS_EN: SpecialistDeskUi["statusLabels"] = {
  draft_brief: "Brief in progress",
  generating: "Generating",
  awaiting_review: "Awaiting review",
  in_review: "In review",
  needs_revision: "Needs revision",
  approved: "Approved",
  illustration_workspace: "Illustration workspace",
  illustration_ready: "Illustration ready",
  published: "Published",
  archived: "Archived",
};

const STATUS_HE: SpecialistDeskUi["statusLabels"] = {
  draft_brief: "מוגז בתהליך",
  generating: "נוצר",
  awaiting_review: "ממתין לביקורת",
  in_review: "בביקורת",
  needs_revision: "דורש תיקון",
  approved: "אושר",
  illustration_workspace: "מרחב איור",
  illustration_ready: "איורים מוכנים",
  published: "פורסם",
  archived: "בארכיון",
};

const ILL_CTA_STEPS_EN = [
  ["01", "Visual Bible", "Character, palette, environments, avoid list"],
  ["02", "Scene plans", "Short prose per page, key emotion & detail"],
  ["03", "Generate images", "Per page, on your initiative"],
  ["04", "Review & publish", "Page-by-page approval through to publish"],
] as const satisfies SpecialistDeskUi["illCtaSteps"];

const ILL_CTA_STEPS_HE = [
  ["01", "Visual Bible", "דמות, פלטה, סביבות וכללי הימנעות"],
  ["02", "תכנון סצנה", "פרוזה קצרה לכל עמוד, רגש מרכזי ופרט מפתח"],
  ["03", "ייצור איור", "פר עמוד, ביוזמה שלכם"],
  ["04", "אישור ופרסום", "סקירה לכל עמוד עד לפרסום"],
] as const satisfies SpecialistDeskUi["illCtaSteps"];

const ILL_CTA_STEPS_AR = [
  ["01", "Visual Bible", "الشخصية، الألوان، البيئات، قائمة التجنّب"],
  ["02", "خطط المشاهد", "نثر قصير لكل صفحة مع المشاعر والتفصيل المفتاحي"],
  ["03", "توليد الصور", "صفحة بصفحة بمبادرتكم"],
  ["04", "المراجعة والنشر", "موافقة صفحة بصفحة حتى النشر"],
] as const satisfies SpecialistDeskUi["illCtaSteps"];

const STATUS_AR: SpecialistDeskUi["statusLabels"] = {
  draft_brief: "الموجز قيد الإعداد",
  generating: "قيد التوليد",
  awaiting_review: "في انتظار المراجعة",
  in_review: "قيد المراجعة",
  needs_revision: "بحاجة إلى مراجعة",
  approved: "معتمدة",
  illustration_workspace: "مساحة التوضيح",
  illustration_ready: "التوضيحات جاهزة",
  published: "منشورة",
  archived: "مؤرشفة",
};

export const SPECIALIST_DESK_EN: SpecialistDeskUi = {
  formatSavedAt: (relativePhrase) => `Saved ${relativePhrase}`,
  formatCountSummary: buildCountSummaryEn,
  formatTableFooter: buildTableFooterEn,

  deskOverline: "Specialist desk",
  deskTitlePrefix: "My",
  deskTitleEmphasis: "stories",
  deskSummaryFallback: "Your manuscripts in care.",

  statInCare: "In care",
  statAwaitsYou: "Awaits you",
  statApproved: "Approved",

  newStory: "New story",
  retry: "Retry",

  loadStoriesFailed: "Failed to load stories.",
  archiveStoryFailed: "Failed to archive story.",
  restoreStoryFailed: "Failed to restore story.",

  serverWarningBold: "Could not load stories from the server.",
  serverWarningRest: "Only locally saved drafts are shown.",
  serverWarningReasonPrefix: "Reason:",

  reviewQueueOverline: "Your review queue",
  reviewQueueTitleOne: "One story is awaiting your clinical review",
  reviewQueueTitleMany: (count) =>
    `${count} stories are awaiting your clinical review`,
  reviewQueueBodyLine: (title) =>
    `“${title}” — open the story workspace to complete your read and checklist.`,
  untitledStory: "Untitled story",
  skimQueue: "Skim queue",
  openNamedStory: (w) => `Open ${w}`,
  openStoryShort: "story",

  revisionOverline: "Regeneration in progress",
  revisionTitleOne: "One story is updating from your feedback",
  revisionTitleMany: (count) => `${count} stories are updating from your feedback`,
  revisionBodyLine: (title) =>
    `“${title}” — check back shortly, or open the workspace to watch progress.`,
  showQueue: "Show queue",

  viewArchivedLink: (count) =>
    `View ${count} archived stor${count === 1 ? "y" : "ies"} →`,

  chipAll: "All",
  chipAwaitingReview: "Awaiting review",
  chipInReview: "In review",
  chipBriefInProgress: "Brief in progress",
  chipGenerating: "Generating",
  chipNeedsRevision: "Needs revision",
  chipApproved: "Approved",
  chipIllustrationWorkspace: "Illustration workspace",
  chipPromptReview: "Image prompt review",
  chipIllustrating: "Illustrating",
  chipIllustrationReview: "Illustration review",
  chipIllustrationReady: "Illustration ready",
  chipArchived: "Archived",

  sortLastActivity: "Last activity",
  sortNewestFirst: "Newest first",
  sortOldestFirst: "Oldest first",
  sortTitleAZ: "Title (A–Z)",
  filterAriaLabel: "Filter and sort stories",
  searchPlaceholder: "Search titles, tags, population…",
  sortLabelPrefix: "Sort · ",
  clearSearchAria: "Clear search",

  colNumber: "№",
  colManuscript: "Manuscript",
  colStage: "Stage",
  colPopulationAge: "Population & age",
  colStatus: "Status",
  colLastEvent: "Last event",

  emptyFirstTimeTitle: "Start your first manuscript",
  emptyFirstTimeBody:
    "Start with a strong clinical brief so the AI can draft a safe, therapeutic story for review before use.",
  emptyFiltered: "No manuscripts match these filters",
  clearAllFilters: "Clear all filters",

  statusLabels: STATUS_EN,
  revisionBadge: "REV. 2",

  editEventCreated: "Created",
  editEventStoryEdited: "Story edited",
  editEventUpdated: "Updated",
  editEventSubmitted: "Submitted",
  editEventDraftGenerated: "Draft generated",
  editEventGenerationFailed: "Generation failed",
  editEventRegenerationRequested: "Regeneration requested",
  editEventArchived: "Archived",
  editEventRestored: "Restored",

  rowMenuArchive: "Archive",
  rowMenuRestore: "Restore",
  rowAriaStoryActions: "Story actions",

  timeJustNow: "Just now",
  formatMinutesAgo: (n) => `${n} minute${n === 1 ? "" : "s"} ago`,
  formatHoursAgo: (n) => `${n} hour${n === 1 ? "" : "s"} ago`,
  formatDaysAgo: (n) => `${n} day${n === 1 ? "" : "s"} ago`,
  timeYesterday: "Yesterday",

  pipelineSteps: ["Brief", "Generate", "Review", "Approved", "Illustration", "Publish"],
  pipelineListPublish: "Publish",
  pipelineListArchived: "Archived",
  pipelineArchivedHint:
    "This story is archived. Restore it from the menu to continue the pipeline.",
  pipelineAriaLabel: "Story pipeline progress",
  pipelineHints: PIPELINE_HINTS_EN,

  tabBrief: "Brief",
  tabStory: "Story",
  tabIllustrations: "Illustrations",
  tabHistory: "History",
  tabStoryDisabledTooltip: "Open after the story is generated",
  tabsAriaLabel: "Story workspace tabs",

  workspaceStillLoading: "Still loading…",
  workspaceSkeletonTabs: ["Brief", "Story", "Illustrations", "History"],
  workspaceStoryNotFound: "This story doesn't exist or was deleted.",
  workspaceBackToStories: "Back to stories",
  workspaceLoadStoryFailed: "Failed to load story.",
  workspaceCouldNotOpenReview: "Could not open story for review.",
  workspaceErrorBanner: "We had trouble loading this story.",
  workspaceTryAgain: "Try again",
  illustrationsTabIncompleteMetadata:
    "Could not load the illustration workspace: this story is missing illustration metadata (Visual Bible version). Refresh the page. If it keeps happening, a maintainer should set `currentVisualBibleVersion` on the Firestore story to match the latest document under `visualBibles`, or repair the story data.",

  illSourceText: "Source text",
  illIntentLabel: "What the reader should feel",
  illDetailLabel: "Key visible detail",
  illStaleBibleBanner:
    "The Visual Bible has changed since this plan was written.",
  illStaleBibleAction: "Regenerate plan",
  illRejectedHeader: "Feedback on the previous version",
  illSecAltPlan: "Different plan",
  illSecSuggestChange: "Suggest a change",
  illSecTechDetails: "Technical details",
  illStatusPlanOnly: "Plan ready",
  illStatusGenerating: "Drawing…",
  illStatusAwaiting: "Awaiting review",
  illStatusApproved: "Approved",
  illStatusRejected: "Rejected — regenerating",
  illActGenerate: "Generate illustration",
  illActDrawing: "Drawing — usually under 30s",
  illActApprove: "Approve",
  illActReject: "Reject with feedback",
  illActReopen: "Reopen for edits",
  illActRegen: "Regenerating with feedback…",
  illNoImageHead: "No image yet",
  illNoImageHint: 'Click "Generate illustration" to start',
  illDrawingPage: (n) => `Drawing page ${n}…`,
  illUnderThirty: "Usually under 30 seconds",
  illNewVersionLabel: "Generating a new version",
  illPubApprovedTitle: "All pages approved",
  illPubProgressTitle: "Approval progress",
  illPubApprovedSub: "Ready to mark the story as ready to publish.",
  illPubProgressSub: (a, t) => `${a} of ${t} pages approved.`,
  illPubReady: "Mark as ready to publish",
  illPubMore: (n) => `Approve ${n} more page${n === 1 ? "" : "s"}`,
  illGalAllApproved: "All illustrations approved",
  illGalPublished: "The story is published",
  illGalAllApprovedSub: (n) =>
    `${n} pages illustrated and approved. Preview the book and publish when you're ready.`,
  illGalPublishedSub:
    "The book is live for readers. You can still preview it here.",
  illGalPreview: "Preview book",
  illGalPublish: "Publish",
  illGalReopen: "Reopen for edits",
  illDlgTitle: "Preview for approval",
  illDlgAllApproved: "All pages approved",
  illDlgSpread: (n, t) => `Spread ${n} of ${t}`,
  illDlgExport: "Export PDF",
  illDlgPublish: "Publish the book",
  illVbCharacterAnchor: "Character anchor",
  illVbCharacterHint: "Embedded in every prompt",
  illVbStyleGuide: "Style guide",
  illVbAnchors: "Consistency anchors",
  illVbAnchorsHint: "Short phrases repeated in every prompt",
  illVbPalette: "Palette",
  illVbEnvironments: "Environments",
  illVbAvoid: "Avoid list",
  illVbEnvAtmosphere: "Atmosphere",
  illVbEnvLayout: "Layout",
  illVbEditedTag: "Hand-edited",
  illCtaHeadline: "The story is approved",
  illCtaBody: (n) =>
    `Open the illustration workspace to build a Visual Bible for the story and a scene plan for each of the ${n} pages. Edit anything by hand or regenerate as needed.`,
  illCtaButton: "Open illustration workspace",
  illCtaMeta: (n) =>
    `Generates Visual Bible + ${n} scene plans · usually under 90s`,
  illCtaSteps: ILL_CTA_STEPS_EN,
  illGenTitle: "Building the illustration workspace",
  illGenSub: "Usually under a minute. Stay or come back later.",
  illGenStage1Label: "Visual Bible",
  illGenStage2Label: "Scene plans",
  illPagesEyebrow: "Story pages",
  illPagesTitleMixed: (n) =>
    `${n} pages · plans ready, images in progress`,
  illPagesTitleApproved: (n) => `${n} pages · all approved`,
  illRegenAllPlans: "Regenerate all plans",
  illGenerateAllImages: "Generate all images",
  illPageNumber: (n) => `Page ${n} · scene plan`,

  unsavedDialogTitle: "Unsaved changes",
  unsavedDialogBody:
    "You have unsaved edits on the Story tab. Leave without saving?",
  unsavedLeave: "Leave",
  unsavedStay: "Stay",

  workspaceArchiveFailed: "Failed to archive story.",
  workspaceRestoreFailed: "Failed to restore story.",
  workspaceCreateRevisionFailed: "Failed to create revision.",

  headerBackToStories: "Stories",
  headerStoryTitleAria: "Story title",
  headerClickToEditTitle: "Click to edit title",
  headerStatusAria: (s) => `Status: ${s}`,
  headerStoryActionsAria: "Story actions",
  headerMenuArchive: "Archive",
  headerMenuRestore: "Restore",
  headerMenuNewRevision: "Open new revision",
  headerMenuNewRevisionTooltip:
    "Only available after the brief is submitted and the story is awaiting review or later",
  headerMenuCopyId: "Copy story ID",
  headerArchiveDialogTitle: "Archive this story?",
  headerArchiveDialogBody: "You can restore it later from the story workspace.",
  headerCancel: "Cancel",
  headerArchiveConfirm: "Archive",
  headerCopiedSnackbar: "Copied!",
  agesChipPrefix: "Ages",

  footCareTitle: "A note on care",
  footCareBody:
    "Every manuscript here passes through your hands before any child reads it. The AI drafts. You judge. Take the time the work deserves.",
  footWorkflowTitle: "Workflow",
  footWorkflow1: "Complete the brief, then generate a first draft.",
  footWorkflow2: "Review with the checklist before approving for use.",
  footWorkflow3: "Archive stories you no longer need — restore them anytime.",
  footTipsTitle: "Tips",
  footTipsBody:
    "Use the chips to triage by status. Search covers titles, clinical tags, population, and triggers. Sort by last activity to surface what moved recently.",
};

export const SPECIALIST_DESK_HE: SpecialistDeskUi = {
  ...SPECIALIST_DESK_EN,
  formatCountSummary: buildCountSummaryHe,
  formatTableFooter: buildTableFooterHe,

  deskOverline: "שולחן העבודה של המומחה",
  deskTitlePrefix: "",
  deskTitleEmphasis: "הסיפורים שלי",
  deskSummaryFallback: "הכתבי יד שלכם בטיפול.",

  statInCare: "בטיפול",
  statAwaitsYou: "ממתין אליכם",
  statApproved: "אושר",

  newStory: "סיפור חדש",
  retry: "נסו שוב",

  loadStoriesFailed: "לא ניתן לטעון סיפורים.",
  archiveStoryFailed: "לא ניתן להעביר לארכיון.",
  restoreStoryFailed: "לא ניתן לשחזר.",

  serverWarningBold: "לא ניתן לטעון סיפורים מהשרת.",
  serverWarningRest: "מוצגות רק טיוטות שנשמרו במכשיר.",
  serverWarningReasonPrefix: "סיבה:",

  reviewQueueOverline: "תור הביקורת שלכם",
  reviewQueueTitleOne: "סיפור אחד ממתין לביקורת הקלינית שלכם",
  reviewQueueTitleMany: (count) => `${count} סיפורים ממתינים לביקורת הקלינית שלכם`,
  reviewQueueBodyLine: (title) =>
    `„${title}" — פתחו את סביבת העבודה כדי להשלים את הקריאה והצ׳ק־ליסט.`,
  untitledStory: "סיפור ללא כותרת",
  skimQueue: "סקירת התור",
  openNamedStory: (w) => `פתחו: ${w}`,
  openStoryShort: "סיפור",

  revisionOverline: "עדכון בתהליך",
  revisionTitleOne: "סיפור אחד מתעדכן מהמשוב שלכם",
  revisionTitleMany: (count) => `${count} סיפורים מתעדכנים מהמשוב שלכם`,
  revisionBodyLine: (title) =>
    `„${title}" — בדקו שוב בעוד רגע, או פתחו את סביבת העבודה כדי לעקוב.`,
  showQueue: "הצגת התור",

  viewArchivedLink: (count) =>
    `צפייה ב-${count} כתבי יד בארכיון →`,

  chipAll: "הכל",
  chipAwaitingReview: "ממתין לביקורת",
  chipInReview: "בביקורת",
  chipBriefInProgress: "מוגז בתהליך",
  chipGenerating: "נוצר",
  chipNeedsRevision: "דורש תיקון",
  chipApproved: "אושר",
  chipIllustrationWorkspace: "מרחב איור",
  chipPromptReview: "ביקורת הנחיות תמונה",
  chipIllustrating: "באיור",
  chipIllustrationReview: "ביקורת איורים",
  chipIllustrationReady: "איורים מוכנים",
  chipArchived: "בארכיון",

  sortLastActivity: "פעילות אחרונה",
  sortNewestFirst: "החדשים ראשון",
  sortOldestFirst: "הישנים ראשון",
  sortTitleAZ: "כותרת (א–ת)",
  filterAriaLabel: "סינון ומיון סיפורים",
  searchPlaceholder: "חיפוש כותרות, תגיות, אוכלוסייה…",
  sortLabelPrefix: "מיון · ",
  clearSearchAria: "ניקוי חיפוש",

  colNumber: "№",
  colManuscript: "כתב יד",
  colStage: "שלב",
  colPopulationAge: "אוכלוסייה וגיל",
  colStatus: "סטטוס",
  colLastEvent: "אירוע אחרון",

  emptyFirstTimeTitle: "התחילו את כתב היד הראשון",
  emptyFirstTimeBody:
    "התחילו במוגז קליני חזק כדי שהבינה המלאכותית תוכל לטיוט סיפור בטוח וטיפולי לפני שימוש.",
  emptyFiltered: "אין כתבי יד שמתאימים למסננים",
  clearAllFilters: "נקו את כל המסננים",

  statusLabels: STATUS_HE,
  revisionBadge: "מהד׳ 2",

  editEventCreated: "נוצר",
  editEventStoryEdited: "הסיפור נערך",
  editEventUpdated: "עודכן",
  editEventSubmitted: "נשלח",
  editEventDraftGenerated: "טיוטה נוצרה",
  editEventGenerationFailed: "היצירה נכשלה",
  editEventRegenerationRequested: "בוצעה בקשה ליצירה מחדש",
  editEventArchived: "הועבר לארכיון",
  editEventRestored: "שוחזר",

  rowMenuArchive: "העברה לארכיון",
  rowMenuRestore: "שחזור",

  timeJustNow: "עכשיו",
  formatMinutesAgo: (n) => (n === 1 ? "לפני דקה" : `לפני ${n} דקות`),
  formatHoursAgo: (n) => (n === 1 ? "לפני שעה" : `לפני ${n} שעות`),
  formatDaysAgo: (n) => (n === 1 ? "לפני יום" : `לפני ${n} ימים`),
  timeYesterday: "אתמול",

  pipelineSteps: ["מוגז", "יצירה", "ביקורת", "אושר", "איור", "פרסום"],
  pipelineListPublish: "פרסום",
  pipelineListArchived: "בארכיון",
  pipelineArchivedHint:
    "הסיפור בארכיון. שחזרו מהתפריט כדי להמשיך בתהליך.",
  pipelineAriaLabel: "התקדמות תהליך הסיפור",
  pipelineHints: PIPELINE_HINTS_HE,

  tabBrief: "מוגז",
  tabStory: "סיפור",
  tabIllustrations: "איורים",
  tabHistory: "היסטוריה",
  tabStoryDisabledTooltip: "זמין לאחר יצירת הסיפור",
  tabsAriaLabel: "לשוניות סביבת עבודה",

  workspaceStillLoading: "עדיין טוען…",
  workspaceSkeletonTabs: ["מוגז", "סיפור", "איורים", "היסטוריה"],
  workspaceStoryNotFound: "הסיפור לא קיים או נמחק.",
  workspaceBackToStories: "חזרה לסיפורים",
  workspaceLoadStoryFailed: "לא ניתן לטעון את הסיפור.",
  workspaceCouldNotOpenReview: "לא ניתן לפתוח את הסיפור לביקורת.",
  workspaceErrorBanner: "אירעה בעיה בטעינת הסיפור.",
  workspaceTryAgain: "נסו שוב",
  illustrationsTabIncompleteMetadata:
    "לא ניתן לטעון את מרחב האיור: חסרים במסמך הסיפור נתוני איור (גרסת התנ\"ך הוויזואלי). נסו לרענן. אם זה נמשך, יש לעדכן ב-Firestore את השדה `currentVisualBibleVersion` כך שיתאים למסמך האחרון תחת `visualBibles`, או לתקן את נתוני הסיפור.",

  illSourceText: "טקסט המקור",
  illIntentLabel: "מה הקורא ירגיש",
  illDetailLabel: "פרט מפתח גלוי",
  illStaleBibleBanner: "ה־Visual Bible התעדכן מאז התכנון הזה.",
  illStaleBibleAction: "הפק תכנון מחדש",
  illRejectedHeader: "משוב על הגרסה הקודמת",
  illSecAltPlan: "תכנון אחר",
  illSecSuggestChange: "הצע שינוי",
  illSecTechDetails: "פרטים טכניים",
  illStatusPlanOnly: "תכנון מוכן",
  illStatusGenerating: "מצייר…",
  illStatusAwaiting: "ממתין לאישור",
  illStatusApproved: "אושר",
  illStatusRejected: "נדחה — מחולל מחדש",
  illActGenerate: "הפק איור",
  illActDrawing: "מצייר — בדרך כלל פחות מ-30 שניות",
  illActApprove: "אשר",
  illActReject: "דחה עם משוב",
  illActReopen: "פתח לעריכה",
  illActRegen: "מבצע תכנון מחדש עם המשוב…",
  illNoImageHead: "אין איור עדיין",
  illNoImageHint: 'לחצו "הפק איור" כדי להתחיל',
  illDrawingPage: (n) => `מצייר עמ׳ ${n}…`,
  illUnderThirty: "בדרך כלל פחות מ-30 שניות",
  illNewVersionLabel: "מחולל גרסה חדשה",
  illPubApprovedTitle: "כל העמודים אושרו",
  illPubProgressTitle: "התקדמות אישור",
  illPubApprovedSub: "אפשר לסמן את הסיפור כמוכן לפרסום.",
  illPubProgressSub: (a, t) => `${a} מתוך ${t} עמודים אושרו.`,
  illPubReady: "סמן כמוכן לפרסום",
  illPubMore: (n) => `אישור ${n} עמודים נוספים`,
  illGalAllApproved: "כל האיורים אושרו",
  illGalPublished: "הסיפור פורסם",
  illGalAllApprovedSub: (n) =>
    `${n} עמודים מצוירים ומאושרים. בחנו את התצוגה ופרסמו כשתהיו מוכנים.`,
  illGalPublishedSub:
    "הספר זמין כעת למשתמשים. אפשר לבחון את התצוגה כאן.",
  illGalPreview: "בחן את הספר",
  illGalPublish: "פרסם",
  illGalReopen: "פתח לעריכה",
  illDlgTitle: "תצוגה מקדימה לאישור",
  illDlgAllApproved: "כל העמודים אושרו",
  illDlgSpread: (n, total) => `כפולה ${n} מתוך ${total}`,
  illDlgExport: "ייצוא PDF",
  illDlgPublish: "פרסם את הספר",
  illVbCharacterAnchor: "עוגן דמות",
  illVbCharacterHint: "משובץ בכל פרומפט",
  illVbStyleGuide: "מדריך סגנון",
  illVbAnchors: "עוגני עקביות",
  illVbAnchorsHint: "משפטים קצרים שחוזרים בכל פרומפט",
  illVbPalette: "פלטה",
  illVbEnvironments: "סביבות",
  illVbAvoid: "הימנעויות",
  illVbEnvAtmosphere: "אווירה",
  illVbEnvLayout: "מרחב",
  illVbEditedTag: "נערך ידנית",
  illCtaHeadline: "הסיפור אושר",
  illCtaBody: (n) =>
    `פתחו את מרחב האיור כדי לבנות Visual Bible לסיפור וליצור תכנון סצנה לכל אחד מ-${n} העמודים. תוכלו לערוך הכל ידנית או להפיק מחדש לפי הצורך.`,
  illCtaButton: "פתח את מרחב האיור",
  illCtaMeta: (n) =>
    `ייצור Visual Bible + ${n} תכנוני סצנה · בדרך כלל פחות מ-90 שניות`,
  illCtaSteps: ILL_CTA_STEPS_HE,
  illGenTitle: "בונה את מרחב האיור",
  illGenSub: "לוקח לרוב פחות מדקה. אפשר להישאר או לחזור.",
  illGenStage1Label: "Visual Bible",
  illGenStage2Label: "תכנון סצנה",
  illPagesEyebrow: "עמודי הסיפור",
  illPagesTitleMixed: (n) =>
    `${n} עמודים · תכנון מוכן, איורים בעבודה`,
  illPagesTitleApproved: (n) => `${n} עמודים · כולם אושרו`,
  illRegenAllPlans: "הפק את כל התכנונים מחדש",
  illGenerateAllImages: "ייצר את כל האיורים",
  illPageNumber: (n) => `עמוד ${n} · תכנון סצנה`,

  unsavedDialogTitle: "שינויים שלא נשמרו",
  unsavedDialogBody:
    "יש עריכות שלא נשמרו בלשונית הסיפור. לצאת בלי לשמור?",
  unsavedLeave: "יציאה",
  unsavedStay: "להישאר",

  workspaceArchiveFailed: "לא ניתן להעביר לארכיון.",
  workspaceRestoreFailed: "לא ניתן לשחזר.",
  workspaceCreateRevisionFailed: "לא ניתן ליצור מהדורה חדשה.",

  headerBackToStories: "סיפורים",
  headerStoryTitleAria: "כותרת הסיפור",
  headerClickToEditTitle: "לחצו לעריכת הכותרת",
  headerStatusAria: (s) => `סטטוס: ${s}`,
  headerMenuArchive: "העברה לארכיון",
  headerMenuRestore: "שחזור",
  headerMenuNewRevision: "פתיחת מהדורה חדשה",
  headerMenuNewRevisionTooltip:
    "זמין רק לאחר שליחת המוגז והגעת הסיפור לשלב ממתין לביקורת או מאוחר יותר",
  headerMenuCopyId: "העתקת מזהה סיפור",
  headerArchiveDialogTitle: "להעביר לארכיון?",
  headerArchiveDialogBody: "אפשר לשחזר מאוחר יותר מסביבת העבודה.",
  headerCancel: "ביטול",
  headerArchiveConfirm: "ארכיון",
  headerCopiedSnackbar: "הועתק!",
  agesChipPrefix: "גילאים",

  footCareTitle: "הערה על אחריות",
  footCareBody:
    "כל כתב יד עובר דרככם לפני שילד קורא אותו. הבינה המלאכותית מטיוטת. אתם שופטים. קחו את הזמן שהעבודה דורשת.",
  footWorkflowTitle: "תהליך עבודה",
  footWorkflow1: "השלימו את המוגז, ואז צרו טיוטה ראשונה.",
  footWorkflow2: "בדקו עם הצ׳ק־ליסט לפני אישור לשימוש.",
  footWorkflow3: "העבירו לארכיון סיפורים שאינם נדרשים — אפשר לשחזר בכל עת.",
  footTipsTitle: "טיפים",
  footTipsBody:
    "השתמשו בשבבים לסינון לפי סטטוס. החיפוש מכסה כותרות, תגיות קליניות, אוכלוסייה וטריגרים. מיינו לפי פעילות אחרונה כדי להעלות מה זז לאחרונה.",
};

export const SPECIALIST_DESK_AR: SpecialistDeskUi = {
  ...SPECIALIST_DESK_EN,
  formatSavedAt: (relativePhrase) => `حُفظ ${relativePhrase}`,
  formatCountSummary: buildCountSummaryAr,
  formatTableFooter: buildTableFooterAr,

  deskOverline: "سطح مكتب الاختصاصي",
  deskTitlePrefix: "",
  deskTitleEmphasis: "قصصي",
  deskSummaryFallback: "مخطوطاتكم قيد العناية.",

  statInCare: "قيد العناية",
  statAwaitsYou: "بانتظاركم",
  statApproved: "معتمد",

  newStory: "قصة جديدة",
  retry: "إعادة المحاولة",

  loadStoriesFailed: "تعذّر تحميل القصص.",
  archiveStoryFailed: "تعذّر أرشفة القصة.",
  restoreStoryFailed: "تعذّر استعادة القصة.",

  serverWarningBold: "تعذّر تحميل القصص من الخادم.",
  serverWarningRest: "تُعرض مسودات محفوظة محليًا فقط.",
  serverWarningReasonPrefix: "السبب:",

  reviewQueueOverline: "قائمة مراجعتكم",
  reviewQueueTitleOne: "قصة واحدة تنتظر مراجعتكم السريرية",
  reviewQueueTitleMany: (count) =>
    `${count} قصص تنتظر مراجعتكم السريرية`,
  reviewQueueBodyLine: (title) =>
    `«${title}» — افتحوا مساحة عمل القصة لإكمال القراءة وقائمة التحقق.`,
  untitledStory: "قصة بلا عنوان",
  skimQueue: "تصفح القائمة",
  openNamedStory: (w) => `فتح ${w}`,
  openStoryShort: "قصة",

  revisionOverline: "إعادة توليد قيد التنفيذ",
  revisionTitleOne: "قصة واحدة تُحدَّث من ملاحظاتكم",
  revisionTitleMany: (count) => `${count} قصص تُحدَّث من ملاحظاتكم`,
  revisionBodyLine: (title) =>
    `«${title}» — تحققوا قريبًا، أو افتحوا مساحة العمل لمتابعة التقدّم.`,
  showQueue: "عرض القائمة",

  viewArchivedLink: (count) =>
    `عرض ${count} ${count === 1 ? "قصة مؤرشفة" : "قصص مؤرشفة"} ←`,

  chipAll: "الكل",
  chipAwaitingReview: "في انتظار المراجعة",
  chipInReview: "قيد المراجعة",
  chipBriefInProgress: "الموجز قيد الإعداد",
  chipGenerating: "قيد التوليد",
  chipNeedsRevision: "بحاجة إلى مراجعة",
  chipApproved: "معتمدة",
  chipIllustrationWorkspace: "مساحة التوضيح",
  chipPromptReview: "مراجعة أوصاف الصور",
  chipIllustrating: "قيد التوضيح",
  chipIllustrationReview: "مراجعة التوضيحات",
  chipIllustrationReady: "التوضيحات جاهزة",
  chipArchived: "مؤرشفة",

  sortLastActivity: "آخر نشاط",
  sortNewestFirst: "الأحدث أولًا",
  sortOldestFirst: "الأقدم أولًا",
  sortTitleAZ: "العنوان (أ–ي)",
  filterAriaLabel: "تصفية وفرز القصص",
  searchPlaceholder: "بحث في العناوين والوسوم والفئة العمرية…",
  sortLabelPrefix: "فرز · ",
  clearSearchAria: "مسح البحث",

  colNumber: "رقم",
  colManuscript: "المخطوطة",
  colStage: "المرحلة",
  colPopulationAge: "الفئة والعمر",
  colStatus: "الحالة",
  colLastEvent: "آخر حدث",

  emptyFirstTimeTitle: "ابدأوا أول مخطوطة",
  emptyFirstTimeBody:
    "ابدأوا بموجز سريري واضح لكي يولّد الذكاء الاصطناعي مسودة قصة آمنة وعلاجية للمراجعة قبل الاستخدام.",
  emptyFiltered: "لا مخطوطات تطابق هذه المرشحات",
  clearAllFilters: "مسح كل المرشحات",

  statusLabels: STATUS_AR,
  revisionBadge: "المراجعة ٢",

  editEventCreated: "أُنشئت",
  editEventStoryEdited: "تُعدّل القصة",
  editEventUpdated: "عُدّلت",
  editEventSubmitted: "أُرسِلت",
  editEventDraftGenerated: "أُنشئت مسودة",
  editEventGenerationFailed: "فشل التوليد",
  editEventRegenerationRequested: "طُلب إعادة التوليد",
  editEventArchived: "أُرشفت",
  editEventRestored: "استُعيدت",

  rowMenuArchive: "أرشفة",
  rowMenuRestore: "استعادة",

  timeJustNow: "الآن",
  formatMinutesAgo: (n) =>
    n === 1 ? "منذ دقيقة" : `منذ ${n} دقائق`,
  formatHoursAgo: (n) => (n === 1 ? "منذ ساعة" : `منذ ${n} ساعات`),
  formatDaysAgo: (n) => (n === 1 ? "منذ يوم" : `منذ ${n} أيام`),
  timeYesterday: "أمس",

  pipelineSteps: ["الموجز", "التوليد", "المراجعة", "الاعتماد", "التوضيح", "النشر"],
  pipelineListPublish: "نشر",
  pipelineListArchived: "مؤرشفة",
  pipelineArchivedHint:
    "هذه القصة في الأرشيف. استعيدوها من القائمة لمتابعة المسار.",
  pipelineAriaLabel: "تقدّم مسار القصة",
  pipelineHints: PIPELINE_HINTS_AR,

  tabBrief: "الموجز",
  tabStory: "القصة",
  tabIllustrations: "التوضيحات",
  tabHistory: "السجل",
  tabStoryDisabledTooltip: "يُفتح بعد توليد القصة",
  tabsAriaLabel: "تبويبات مساحة عمل القصة",

  workspaceStillLoading: "لا يزال التحميل…",
  workspaceSkeletonTabs: ["الموجز", "القصة", "التوضيحات", "السجل"],
  workspaceStoryNotFound: "هذه القصة غير موجودة أو حُذفت.",
  workspaceBackToStories: "العودة إلى القصص",
  workspaceLoadStoryFailed: "فشل تحميل القصة.",
  workspaceCouldNotOpenReview: "تعذّر فتح القصة للمراجعة.",
  workspaceErrorBanner: "واجهنا مشكلة في تحميل هذه القصة.",
  workspaceTryAgain: "إعادة المحاولة",
  illustrationsTabIncompleteMetadata:
    "تعذّر تحميل مساحة التوضيح: يفتقد مستند القصة بيانات التوضيح (إصدار المرجع البصري). حدّثوا الصفحة. إن استمرّ ذلك، يجب على المشرف ضبط الحقل `currentVisualBibleVersion` في Firestore ليطابق آخر مستند تحت `visualBibles`، أو إصلاح بيانات القصة.",

  illSourceText: "النص الأصلي",
  illIntentLabel: "ما يجب أن يشعر به القارئ",
  illDetailLabel: "تفصيل مفتاحي مرئي",
  illStaleBibleBanner: "تغيّر الـVisual Bible منذ كتابة هذه الخطة.",
  illStaleBibleAction: "أعد توليد الخطة",
  illRejectedHeader: "ملاحظات على النسخة السابقة",
  illSecAltPlan: "خطة بديلة",
  illSecSuggestChange: "اقترح تغييرًا",
  illSecTechDetails: "تفاصيل تقنية",
  illStatusPlanOnly: "الخطة جاهزة",
  illStatusGenerating: "يرسم…",
  illStatusAwaiting: "بانتظار المراجعة",
  illStatusApproved: "معتمدة",
  illStatusRejected: "مرفوضة — يُعاد التوليد",
  illActGenerate: "ولّد التوضيح",
  illActDrawing: "يرسم — عادة أقل من 30 ثانية",
  illActApprove: "اعتمد",
  illActReject: "ارفض مع ملاحظات",
  illActReopen: "افتح للتعديل",
  illActRegen: "يُعاد التخطيط مع الملاحظات…",
  illNoImageHead: "لا يوجد توضيح بعد",
  illNoImageHint: 'انقروا "ولّد التوضيح" للبدء',
  illDrawingPage: (n) => `يرسم الصفحة ${n}…`,
  illUnderThirty: "عادة أقل من 30 ثانية",
  illNewVersionLabel: "يولّد نسخة جديدة",
  illPubApprovedTitle: "جميع الصفحات معتمدة",
  illPubProgressTitle: "تقدّم الاعتماد",
  illPubApprovedSub: "يمكن تعليم القصة كجاهزة للنشر.",
  illPubProgressSub: (a, t) => `${a} من ${t} صفحة معتمدة.`,
  illPubReady: "علّم كجاهز للنشر",
  illPubMore: (n) => `اعتمدوا ${n} صفحة إضافية`,
  illGalAllApproved: "جميع التوضيحات معتمدة",
  illGalPublished: "القصة منشورة",
  illGalAllApprovedSub: (n) =>
    `${n} صفحة موضّحة ومعتمدة. تصفّحوا الكتاب وانشروا عند الاستعداد.`,
  illGalPublishedSub:
    "الكتاب متاح للقرّاء. يمكنكم معاينته هنا أيضًا.",
  illGalPreview: "عاين الكتاب",
  illGalPublish: "انشر",
  illGalReopen: "افتح للتعديل",
  illDlgTitle: "معاينة الاعتماد",
  illDlgAllApproved: "جميع الصفحات معتمدة",
  illDlgSpread: (n, total) => `الورقة ${n} من ${total}`,
  illDlgExport: "تصدير PDF",
  illDlgPublish: "انشر الكتاب",
  illVbCharacterAnchor: "مرساة الشخصية",
  illVbCharacterHint: "مضمّنة في كل وصف",
  illVbStyleGuide: "دليل الأسلوب",
  illVbAnchors: "مراسي الاتساق",
  illVbAnchorsHint: "عبارات قصيرة تتكرر في كل وصف",
  illVbPalette: "اللوحة اللونية",
  illVbEnvironments: "البيئات",
  illVbAvoid: "قائمة التجنّب",
  illVbEnvAtmosphere: "الأجواء",
  illVbEnvLayout: "التخطيط",
  illVbEditedTag: "حُرّر يدويًا",
  illCtaHeadline: "القصة معتمدة",
  illCtaBody: (n) =>
    `افتحوا مساحة التوضيح لبناء Visual Bible للقصة وخطة مشهد لكل من الصفحات الـ${n}. عدّلوا يدويًا أو أعيدوا التوليد بحسب الحاجة.`,
  illCtaButton: "افتح مساحة التوضيح",
  illCtaMeta: (n) =>
    `يُنتج Visual Bible و${n} خطة مشهد · عادة أقل من 90 ثانية`,
  illCtaSteps: ILL_CTA_STEPS_AR,
  illGenTitle: "نبني مساحة التوضيح",
  illGenSub: "عادة أقل من دقيقة. ابقَوا أو عودوا لاحقًا.",
  illGenStage1Label: "Visual Bible",
  illGenStage2Label: "خطط المشاهد",
  illPagesEyebrow: "صفحات القصة",
  illPagesTitleMixed: (n) =>
    `${n} صفحة · الخطط جاهزة، التوضيحات قيد العمل`,
  illPagesTitleApproved: (n) => `${n} صفحة · جميعها معتمدة`,
  illRegenAllPlans: "أعد توليد جميع الخطط",
  illGenerateAllImages: "ولّد جميع التوضيحات",
  illPageNumber: (n) => `الصفحة ${n} · خطة المشهد`,

  unsavedDialogTitle: "تغييرات غير محفوظة",
  unsavedDialogBody:
    "هناك تعديلات لم تُحفَظ في تبويب القصة. المغادرة دون حفظ؟",
  unsavedLeave: "مغادرة",
  unsavedStay: "البقاء",

  workspaceArchiveFailed: "تعذّر أرشفة القصة.",
  workspaceRestoreFailed: "تعذّر استعادة القصة.",
  workspaceCreateRevisionFailed: "تعذّر إنشاء مراجعة جديدة.",

  headerBackToStories: "القصص",
  headerStoryTitleAria: "عنوان القصة",
  headerClickToEditTitle: "انقروا لتعديل العنوان",
  headerStatusAria: (s) => `الحالة: ${s}`,
  headerMenuArchive: "أرشفة",
  headerMenuRestore: "استعادة",
  headerMenuNewRevision: "فتح مراجعة جديدة",
  headerMenuNewRevisionTooltip:
    "يُتاح بعد إرسال الموجز ووصول القصة إلى مرحلة انتظار المراجعة أو ما بعدها",
  headerMenuCopyId: "نسخ معرّف القصة",
  headerArchiveDialogTitle: "أرشفة هذه القصة؟",
  headerArchiveDialogBody: "يمكنكم استعادتها لاحقًا من مساحة عمل القصة.",
  headerCancel: "إلغاء",
  headerArchiveConfirm: "أرشفة",
  headerCopiedSnackbar: "تم النسخ!",
  agesChipPrefix: "أعمار",

  footCareTitle: "ملاحظة على العناية",
  footCareBody:
    "كل مخطوطة تمر بأيديكم قبل أن يقرأها أي طفل. الذكاء الاصطناعي يُعدّ المسودة. أنتم تتخذون القرار. خصّصوا للعمل الوقت الذي يستحقه.",
  footWorkflowTitle: "مسار العمل",
  footWorkflow1: "أكملوا الموجز، ثم ولّدوا مسودة أولى.",
  footWorkflow2: "راجعوا بقائمة التحقق قبل الاعتماد للاستخدام.",
  footWorkflow3: "أرشفوا القصص غير المطلوبة — ويمكن استعادتها في أي وقت.",
  footTipsTitle: "نصائح",
  footTipsBody:
    "استخدموا الشرائح للفرز حسب الحالة. البحث يشمل العناوين والوسوم السريرية والفئة والمحفّزات. فرزوا حسب آخر نشاط لإبراز ما تحرّك مؤخرًا.",
};
