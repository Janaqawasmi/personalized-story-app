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
    "This story is approved. The illustration workspace will be available shortly.",
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
  approved: "הסיפור אושר. סביבת האיורים תיפתח בקרוב.",
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
  illustration_ready: "איורים מוכנים",
  published: "פורסם",
  archived: "בארכיון",
};

const STATUS_AR: SpecialistDeskUi["statusLabels"] = {
  draft_brief: "الموجز قيد الإعداد",
  generating: "قيد التوليد",
  awaiting_review: "في انتظار المراجعة",
  in_review: "قيد المراجعة",
  needs_revision: "بحاجة إلى مراجعة",
  approved: "معتمدة",
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
