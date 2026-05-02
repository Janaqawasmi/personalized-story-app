import type { SpecialistUi } from "./specialistUi.types";

export const SPECIALIST_UI_HE: SpecialistUi = {
  workspaceTitle: "סביבת עבודה למומחים",
  workspaceNavAriaLabel: "סביבת עבודה למומחים",
  specialistTopNavAriaLabel: "לוח בקרה למומחים",
  navMyStories: "הסיפורים שלי",
  navVisitSite: "לאתר",
  navBriefs: "תמציות",
  navStoryBrief: "תמצית סיפור",

  briefsPageTitle: "תמציות סיפור",
  briefsPageHeroOverline: "סביבת עבודה למומחים",
  briefsPageIntro:
    "טיוטות נשמרות רק בדפדפן זה. תמציות ששלחת נשמרות בשרת ומופיעות להלן לסקירה.",
  newStoryBrief: "תמצית סיפור חדשה",
  refreshListTooltip: "רענון רשימת התמציות שנשלחו",
  refresh: "רענן",
  loadSubmittedError: "לא ניתן לטעון את התמציות שנשלחו",
  permissionHelpBeforeCode:
    "ממשקי תמצית הסיפור דורשים את תפקיד המומחה בחשבון Firebase שלך (לא הורה/מטפל). בקש ממנהל הפרויקט להריץ מתיקיית server את הפקודה הבאה:",
  permissionHelpAfterCode:
    "לאחר מכן התנתק והתחבר מחדש כדי שאסימון הזיהוי יכלול את התפקיד החדש.",

  sectionInProgress: "בתהליך",
  inProgressHint:
    "המשך מאיפה שהפסקת. מחיקת נתוני הדפדפן תסיר את הטיוטות.",
  colStoryFocus: "מיקוד הסיפור",
  colLastSaved: "נשמר לאחרונה",
  colActions: "פעולות",
  colBriefId: "מזהה תמצית",
  colSubmitted: "נשלח",

  draftsEmptyTitle: "אין טיוטות עדיין",
  draftsEmptyBody:
    "כשתתחיל תמצית חדשה, היא תופיע כאן כדי שתוכל להמשיך לערוך.",
  startABrief: "התחל תמצית",
  notStarted: "טרם הותחל",
  resume: "המשך",
  deleteDraftTooltip: "מחק טיוטה",
  deleteDraftAria: "מחק טיוטה",

  sectionSubmitted: "נשלחו",
  submittedHint:
    "תמציות סופיות ששלחת לשרת. פתח לסקירת JSON מלא או להורדת גיבוי.",
  submittedEmptyTitle: "עדיין לא נשלח דבר",
  submittedEmptyBody:
    "השלם ושלח תמצית מהעורך. היא תופיע כאן עם חותמת הזמן מהשרת.",

  copyFullIdTooltip: "העתק מזהה מלא",
  copyBriefIdAria: "העתק מזהה תמצית",
  view: "צפייה",

  deleteDraftDialogTitle: "למחוק את הטיוטה?",
  deleteDraftDialogWithLabel: (label) =>
    `פעולה זו תסיר את התמצית בתהליך (${label}).`,
  deleteDraftDialogGeneric: "פעולה זו תסיר את התמצית בתהליך.",
  cannotUndo: "לא ניתן לבטל.",
  cancel: "ביטול",
  deleteDraftConfirm: "מחק טיוטה",

  snackbarDraftRemoved: "הטיוטה הוסרה",
  snackbarBriefIdCopied: "מזהה התמצית הועתק",
  snackbarCopyFailed: "לא ניתן להעתיק — בחר את המזהה ידנית",

  reviewAllBriefsLink: "כל התמציות",
  reviewSubmittedOverline: "תמצית שנשלחה",
  reviewPageTitle: "סקירת תמצית",
  copyJsonButton: "העתק JSON",
  copyJsonTooltip: "העתק JSON ללוח",
  payloadReadOnly: "מטען (קריאה בלבד)",
  copyTooltip: "העתק",
  copyJsonAria: "העתק JSON",
  reviewBackBottom: "חזרה לכל התמציות",
  loadBriefError: "לא ניתן לטעון את התמצית",
  reviewMissingBriefId: "חסר מזהה תמצית בכתובת.",

  draftRedirectTitle: "פותחים את התמצית",
  draftRedirectBody:
    "מעבירים אותך לטיוטה האחרונה שנשמרה, או לתמצית חדשה אם עדיין לא התחלת.",
  draftRedirectLoadingAria: "טוען",
  copyJsonSuccess: "JSON הועתק ללוח",
  copyJsonFail: "לא ניתן להעתיק — בחר את הטקסט למטה",

  reviewTabBrief: "תמצית",
  reviewTabJson: "JSON גולמי",
  reviewTabsAriaLabel: "תמצית קריאה או מטען JSON גולמי",
  reviewFieldEmpty: "—",
  reviewParseWarning:
    "חלק מהשדות השמורים לא נקראו; הסיכום למטה עשוי להיות חלקי. השתמשו ב-JSON הגולמי למטען המדויק.",
  reviewAcknowledgedTitle: "בדיקות קליניות שאושרו",
};
