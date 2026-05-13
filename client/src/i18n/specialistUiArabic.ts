// Arabic UI for specialist brief list, review, and shared nav (MSA).

import type { SpecialistUi } from "./specialistUi.types";

export const SPECIALIST_UI_AR: SpecialistUi = {
  workspaceTitle: "مساحة عمل الاختصاصي",
  workspaceNavAriaLabel: "مساحة عمل الاختصاصي",
  specialistTopNavAriaLabel: "لوحة الاختصاصي",
  navMyStories: "قصصي",
  navVisitSite: "زيارة الموقع",
  navBriefs: "الموجزات",
  navStoryBrief: "موجز القصة",

  briefsPageTitle: "موجزات القصص",
  briefsPageHeroOverline: "مساحة عمل الاختصاصي",
  briefsPageIntro:
    "تُحفَظ المسودات في هذا المتصفح فقط. الموجزات المُرسَلة تُخزَّن على الخادم وتُعرَض أدناه للمراجعة.",
  newStoryBrief: "موجز قصة جديد",
  refreshListTooltip: "إعادة تحميل القائمة المُرسَلة",
  refresh: "تحديث",
  loadSubmittedError: "تعذّر تحميل الموجزات المُرسَلة",
  permissionHelpBeforeCode:
    "تتطلّب واجهات موجز القصة دور «اختصاصي» على حساب Firebase (وليس وليّ الأمر). اطلب من مسؤول المشروع تشغيل الأمر من مجلد الخادم:",
  permissionHelpAfterCode:
    "ثم سجّلوا الخروج والدخول مجددًا حتى يتضمّن رمز الهويّة الدور الجديد.",

  sectionInProgress: "قيد العمل",
  inProgressHint:
    "تابعوا من حيث توقّفتم. مسح بيانات المتصفح يزيل هذه المسودات.",
  colStoryFocus: "محور القصة",
  colLastSaved: "آخر حفظ",
  colActions: "إجراءات",
  colBriefId: "معرّف الموجز",
  colSubmitted: "تاريخ الإرسال",

  draftsEmptyTitle: "لا توجد مسودات بعد",
  draftsEmptyBody:
    "عندما تبدأون موجزًا جديدًا سيظهر هنا لتتابعوا التحرير.",
  startABrief: "بدء موجز",
  notStarted: "لم يبدأ",
  resume: "متابعة",
  deleteDraftTooltip: "حذف المسودة",
  deleteDraftAria: "حذف المسودة",

  sectionSubmitted: "مُرسَل",
  submittedHint:
    "الموجزات النهائية التي أرسلتموها إلى الخادم. افتحوا لمراجعة JSON الكامل أو تنزيل نسخة احتياطية.",
  submittedEmptyTitle: "لم يُرسَل شيء بعد",
  submittedEmptyBody:
    "أكملوا الموجز وأرسِلوه من المحرّر. سيظهر هنا مع وقت الخادم.",

  copyFullIdTooltip: "نسخ المعرّف كاملًا",
  copyBriefIdAria: "نسخ معرّف الموجز",
  view: "عرض",

  deleteDraftDialogTitle: "حذف هذه المسودة؟",
  deleteDraftDialogWithLabel: (label) =>
    `سيؤدي ذلك إلى إزالة موجزكم قيد العمل (${label}).`,
  deleteDraftDialogGeneric: "سيؤدي ذلك إلى إزالة موجزكم قيد العمل.",
  cannotUndo: "لا يمكن التراجع.",
  cancel: "إلغاء",
  deleteDraftConfirm: "حذف المسودة",

  snackbarDraftRemoved: "تمت إزالة المسودة",
  snackbarBriefIdCopied: "تم نسخ معرّف الموجز",
  snackbarCopyFailed: "تعذّر النسخ — انسخوا المعرّف يدويًا",

  reviewAllBriefsLink: "كل الموجزات",
  reviewSubmittedOverline: "موجز مُرسَل",
  reviewPageTitle: "مراجعة الموجز",
  copyJsonButton: "نسخ JSON",
  copyJsonTooltip: "نسخ JSON إلى الحافظة",
  payloadReadOnly: "الحمولة (قراءة فقط)",
  copyTooltip: "نسخ",
  copyJsonAria: "نسخ JSON",
  reviewBackBottom: "← العودة إلى كل الموجزات",
  loadBriefError: "فشل تحميل الموجز",
  reviewMissingBriefId: "معرّف الموجز مفقود في الرابط.",

  draftRedirectTitle: "جاري فتح الموجز",
  draftRedirectBody:
    "ننقلكم إلى آخر مسودة محفوظة، أو موجز جديد إن لم تبدأوا بعد.",
  draftRedirectLoadingAria: "جاري التحميل",
  copyJsonSuccess: "تم نسخ JSON إلى الحافظة",
  copyJsonFail: "تعذّر النسخ — حدّدوا النص أدناه",

  reviewTabBrief: "الموجز",
  reviewTabJson: "JSON خام",
  reviewTabsAriaLabel: "ملخص الموجز أو حمولة JSON",
  reviewFieldEmpty: "—",
  reviewParseWarning:
    "تعذّر قراءة بعض الحقول المخزنة؛ قد يكون الملخص أدناه ناقصًا. استخدموا JSON الخام للحمولة الدقيقة.",
  reviewAcknowledgedTitle: "فحوصات سريرية تم الإقرار بها",
};
