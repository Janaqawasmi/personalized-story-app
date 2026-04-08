// Hebrew UI copy for the Story Brief (and Arabic RTL — same strings via useStoryBriefUi).

import * as SB from "../types/storyBrief";
import type { StoryBriefUi } from "./storyBriefUi.types";

export const STORY_BRIEF_UI_HE: StoryBriefUi = {
  STORY_TYPE_LABELS: {
    fear_anxiety: "פחד וחרדה",
    big_emotions: "רגשות גדולים",
    loss_grief: "אובדן ואבל",
    identity_self_worth: "זהות וערך עצמי",
    life_transitions: "מעברים בחיים",
  },
  STORY_TYPE_DESCRIPTIONS: {
    fear_anxiety: "סיפורים על פחדים ספציפיים, דאגות, תגובות חרדתיות למצבים",
    big_emotions: "סיפורים על רגשות עוצמתיים — כעס, תסכול, עצב, עומס רגשי",
    loss_grief: "סיפורים על איבוד של אדם או דבר חשוב",
    identity_self_worth: "סיפורים על איך הילד רואה את עצמו ומרגיש כלפי עצמו",
    life_transitions: "סיפורים על שינויים משמעותיים — אח חדש, מעבר דירה, תחילת בית ספר, גירושין",
  },
  AGE_RANGE_LABELS: SB.AGE_RANGE_LABELS,
  PEAK_INTENSITY_LABELS: {
    very_gentle: "עדין מאוד",
    moderate: "בינוני",
    significant: "משמעותי",
  },
  PEAK_INTENSITY_DEFINITIONS: {
    very_gentle: "לגיבור הסיפור יש אי־נוחות או אי־ודאות; אי־הנוחות קצרה",
    moderate: "לגיבור הסיפור יש מצוקה אמיתית אך במסגרת קשת מכילה",
    significant: "לגיבור הסיפור יש תחושת הצפה לפני הפתרון",
  },
  STORY_LENGTH_LABELS: {
    short: "קצר",
    standard: "רגיל",
    extended: "מורחב",
  },
  STORY_LENGTH_PREVIEWS: {
    "3-5": {
      short: "סיפור קצר של כ־6–8 עמודים, קריאה בקול במשך 3–5 דקות",
      standard: "סיפור באורך שינה של כ־8–12 עמודים, קריאה בקול במשך 5–7 דקות",
      extended: "סיפור ארוך יותר של כ־12–16 עמודים, קריאה בקול במשך 8–10 דקות",
    },
    "5-7": {
      short: "סיפור קצר של כ־8–10 עמודים, קריאה בקול במשך 4–6 דקות",
      standard: "סיפור באורך שינה של כ־10–14 עמודים, קריאה בקול במשך 6–9 דקות",
      extended: "סיפור ארוך יותר של כ־14–18 עמודים, קריאה בקול במשך 9–12 דקות",
    },
    "7-9": {
      short: "פרק קצר של כ־10–12 עמודים, קריאה בקול במשך 6–8 דקות",
      standard: "פרק רגיל של כ־12–16 עמודים, קריאה בקול במשך 8–12 דקות",
      extended: "פרק ארוך יותר של כ־16–22 עמודים, קריאה בקול במשך 12–16 דקות",
    },
    "9-12": {
      short: "סיפור קצר של כ־12–15 עמודים, קריאה בקול במשך 8–12 דקות",
      standard: "סיפור רגיל של כ־15–20 עמודים, קריאה בקול במשך 12–18 דקות",
      extended: "סיפור ארוך יותר של כ־20–28 עמודים, קריאה בקול במשך 18–25 דקות",
    },
  },
  WARN_SIGNIFICANT_YOUNG_AGE:
    "עוצמה רגשית משמעותית עלולה להיות מציקה לילדים בגילאי 3–5. האם אתם בטוחים שזה מתאים לקבוצת הגיל הזו?",
  POPULATION_THINKING_SCAFFOLDS: {
    fear_anxiety: {
      summaryTitle: "מתווה חשיבה — מה כדאי לשקול",
      subQuestions: [
        "ממה הם מפחדים שיקרה?",
        "מה הם עושים כדי להימנע מזה?",
        "מה מבוגרים מבינים לא נכון לגבי הפחד הזה?",
      ],
    },
  },
  TRIGGER_LABELS: {
    fear_anxiety: "הטריגר הספציפי",
  },
  TRIGGER_NUDGE: "אפשר להוסיף מה הילד רואה, שומע או מרגיש ברגע הזה?",
  INTENTION_NUDGE: "אולי זה קצר מדי לסוכן. אפשר להפוך את החצי השני לספציפי יותר?",
  INTENTION_GOOD_EXAMPLES: {
    fear_anxiety: [
      {
        feel: "אמיצים בשקט",
        because: "גילו שלבקש עזרה זה משהו שאנשים אמיצים עושים",
      },
      {
        feel: "מוחזקים בבטחה",
        because: "חוויתי שהאנשים שאוהבים אותם תמיד חוזרים, גם כשלא מרגישים ככה",
      },
    ],
  },
  INTENTION_BAD_EXAMPLES: {
    fear_anxiety: [
      {
        feel: "טוב יותר",
        because: "אין ממה לפחד",
        note: "מבטל את הפחד",
      },
      {
        feel: "בטוחים",
        because: "חרדה היא תגובה נוירולוגית תקינה",
        note: "קליני מדי לסיפור ילדים",
      },
    ],
  },
  THERAPEUTIC_APPROACH_LABELS: {
    normalization: "נורמליזציה",
    cognitive_reframing: "שינוי מסגור קוגניטיבי",
    graduated_exposure: "חשיפה הדרגתית",
    modeling: "מידול",
    reassurance_predictability: "הרגעה וצפיות",
    self_regulation: "ויסות עצמי",
    psychoeducation: "פסיכו־חינוך (מתאים לגיל)",
  },
  THERAPEUTIC_APPROACH_DEFINITIONS: {
    normalization:
      "הסיפור מראה לילד שהפחד שלו נפוץ ומשותף — הוא לא לבד ולא 'שבור'.",
    cognitive_reframing:
      "הסיפור עוזר לילד לראות את המצב מזווית חדשה — לשנות את איך שהוא חושב על מה שמפחיד אותו.",
    graduated_exposure:
      "הסיפור מלווה את הילד בגישה הדרגתית למצב המפחיד — צעד אחר צעד, קצת יותר אמיץ.",
    modeling:
      "הסיפור מציג דמות אחרת שמתמודדת בהצלחה עם אותו פחד — מודל לחיקוי.",
    reassurance_predictability:
      "הסיפור יוצר בטיחות דרך שגרה, צפיות ונוכחות אמינה של אנשים מהימנים.",
    self_regulation:
      "הסיפור מתמקד ביכולת של הילד לנהל את התגובה שלו — בונה יכולת פנימית.",
    psychoeducation:
      "הסיפור עוזר לילד להבין מה קורה בגוף או בנפש — מתן שם לחוויה בתוך הנרטיב, לא כשיעור.",
  },
  SHAME_DIMENSION_LABELS: {
    not_significant: "לא גורם משמעותי בסיפור הזה",
    present: "נוכח — לטפל ברגישות",
    central: "מרכזי בחוויה",
  },
  SHAME_DIMENSION_DESCRIPTIONS: {
    not_significant: "הסוכן לא צריך לטפל בבושה.",
    present:
      "הסוכן נמנע מכל מה שמרמז על אשמה אך לא דורס את המנגנון הטיפולי העיקרי.",
    central:
      "הסוכן נותן עדיפות לנורמליזציה ולשלושה כללים קשיחים: להראות שהילד לא לבד; אסור לרמוז שהילד 'היה צריך לדעת'; לפחות דמות אחת מגיבה בקבלה, לא בתיקון.",
  },
  SOMATIC_EXPRESSION_LABELS: {
    freezing: "הקפאה / עצירה",
    crying_clinging: "בכי / היצמדות",
    stomach_ache: "כאב בטן / תחושת סחרחורת",
    heart_racing: "דופק מהיר / קשה לנשום",
    restless: "חוסר מנוחה / רגל רגועה / לא יכול לשבת",
    going_quiet: "מושתק / נסגר",
    tension: "מתח / אחיזה (לסת, אגרופים, כתפיים)",
    sweating: "הזעה / תחושת חום",
  },
  COPING_TOOL_LABELS: {
    deep_breathing: "נשימות עמוקות",
    counting: "ספירה",
    grounding_senses: "הארקה דרך החושים",
    positive_self_talk: "דיבור עצמי חיובי",
    visualization: "דימוון",
    routine_awareness: "מודעות לשגרה",
    safe_person: "דמות בטוחה",
    comfort_object: "חפץ או זיכרון מרגיע",
    asking_for_help: "לבקש עזרה",
  },
  COPING_TOOL_CATEGORIES_FEAR_ANXIETY: [
    { label: "גוף", tools: ["deep_breathing", "counting", "grounding_senses"] },
    { label: "נפש", tools: ["positive_self_talk", "visualization", "routine_awareness"] },
    { label: "קשר", tools: ["safe_person", "comfort_object", "asking_for_help"] },
  ],
  RESOLUTION_LABELS: {
    full: "פתרון מלא",
    partial: "פתרון חלקי",
    open: "פתוח",
  },
  RESOLUTION_DESCRIPTIONS: {
    full: "הגיבור מתגבר על הקושי.",
    partial: "הגיבור עושה צעד אמיץ אבל התחושה עדיין לא נעלמה.",
    open: "הגיבור מצויד יותר אבל המסע ממשיך.",
  },
  MUST_NEVER_DEFAULTS: {
    ...SB.MUST_NEVER_DEFAULTS,
    fear_anxiety: [
      "לעולם לא לרמוז שהפחד של הילד מגוחך, לא רציונלי או משהו להתבייש בו",
      "לעולם לא לפתור את הפחד בכך שמישהו אחר 'מתקן' את המצב בשביל הילד (אלא אם נבחר הכלי 'לבקש עזרה')",
      "לעולם לא להציג את המצב המפחיד כסכנה אמיתית או לאשר את תרחיש הקצה הגרוע ביותר של הילד",
    ],
  },
  PERSONALIZATION_OPTION_DESCRIPTIONS: {
    yes: "הורים מוסיפים שם, מגדר ותמונה של ילדם. הגיבור הוא הילד שלהם. הזדהות חזקה ביותר.",
    no: "אתם מעצבים את הגיבור במלואו. הילד קורא על מישהו אחר. מרחק מגן.",
  },
  PROTAGONIST_GENDER_LABELS: {
    boy: "בן",
    girl: "בת",
    kept_open: "נשאר פתוח",
  },
  PROTAGONIST_GENDER_NOTE: {
    boy: null,
    girl: null,
    kept_open:
      "הסוכן משתמש בשם חיה נקי או דמות פנטזיה לא ממוגדרת. ללא כינויי 'הם' לגילאי מתחת ל־7.",
  },
  PROTAGONIST_TYPE_LABELS: {
    child: "דמות ילד",
    animal: "דמות חיה",
    fantasy: "דמות פנטזיה",
  },
  PROTAGONIST_TYPE_AGE_GUIDANCE: {
    "3-5": "מומלץ דמויות חיות בגיל הזה — נותנות מרחק מגן.",
    "5-7": "גם חיות וגם ילדים עובדים היטב בגיל הזה.",
    "7-9": "דמויות ילדים מאפשרות הזדהות חזקה יותר לקוראים מבוגרים יותר.",
    "9-12": "דמויות ילדים מאפשרות הזדהות חזקה יותר לקוראים מבוגרים יותר.",
  },
  PROTAGONIST_AGE_RELATIVE_LABELS: {
    same_age: "אותו גיל",
    slightly_older: "מעט יותר מבוגר",
  },
  CAREGIVER_PRESENCE_LABELS: {
    present_comforting: "נוכח ומנחם",
    guides_side: "מנחה מהצד",
    leaves_returns: "יוצא וחוזר",
    waiting_end: "ממתין בסוף",
    not_present: "לא נוכח",
  },
  CAREGIVER_PRESENCE_DESCRIPTIONS: {
    leaves_returns:
      "המטפל יוצא במהלך הסיפור וחוזר. הסיפור כולל גם פרידה וגם חיבור מחדש.",
  },
  NARRATIVE_DISTANCE_LABELS: {
    direct: "ישיר",
    parallel: "מקביל",
    metaphorical: "מטאפורי",
  },
  NARRATIVE_DISTANCE_DEFINITIONS: {
    direct: "הסיפור משקף את המצב האמיתי מקרוב. אותו הקשר, אותו אתגר, עולם מוכר.",
    parallel:
      "מצב דומה עם פרטים רכים או מוסטים. סביבה אחרת, ליבה רגשית דומה.",
    metaphorical:
      "המצב מיוצג סמלית. האתגר מופשט לתרחיש פנטזיה או סימבולי.",
  },
  SUPPORTING_CHARACTER_LABELS: {
    peer_shows_possible: "חבר שמראה שאפשר",
    peer_alongside: "חבר שעובר את זה ביחד",
    teacher_adult_guides: "מורה או מבוגר שמנחה",
    animal_friend: "חבר חיה שמלווה",
    sibling_perspective: "אח או אחות שמציעים פרספקטיבה",
  },
  PERSONALIZATION_CONSTRAINTS_DEFAULTS: {
    fear_anxiety: [
      "אסור לשנות או להסיר את כלי ההתמודדות",
      "אסור לשנות את תפקיד המטפל",
    ],
  },

  preBriefOverline: "לפני הבריף",
  preBriefTitle: "בחרו את העדשה שבה הסיפור מסתכל",
  preBriefSubtitle:
    "סוג הסיפור קובע אילו שדות מופיעים, אילו אפשרויות זמינות ואילו ברירות מחדל קליניות נטענות. זו עדשה טיפולית, לא אבחנה.",
  draftSavedBannerTitle: "יש טיוטה שמורה",
  draftSavedBriefWord: "בריף",
  draftSavedSavedPrefix: "נשמר",
  resume: "המשך",
  startOver: "התחל מחדש",
  comingSoon: "בקרוב",
  beginBrief: "התחלת הבריף ←",
  savedPrefix: "נשמר",
  draftSavedSnackbar: "הטיוטה נשמרה",
  submitErrorGeneric: "משהו השתבש בשליחה. נסו שוב.",

  sectionOf: (section) => `סעיף ${section} מתוך 5`,
  sectionLabels: {
    1: { full: "גיל והיקף הסיפור", short: "היקף" },
    2: { full: "יסודות קליניים", short: "יסודות" },
    3: { full: "ארכיטקטורה טיפולית", short: "ארכיטקטורה" },
    4: { full: "עולם הסיפור", short: "עולם" },
    5: { full: "התאמה אישית", short: "התאמה" },
  },
  progressNavAriaLabel: "התקדמות בין סעיפי הבריף",
  progressStepAria: ({ num, fullName, clickable, isCurrent, lockedFuture }) => {
    if (clickable) return `מעבר לסעיף ${num}: ${fullName}`;
    if (isCurrent) return `סעיף נוכחי ${num}: ${fullName}`;
    if (lockedFuture) return `סעיף ${num}: ${fullName}. נעול עד שאפשר לפתוח את הצעד.`;
    return `סעיף ${num}: ${fullName}`;
  },
  sectionMobileLine: (current, ofTotal = 5) => `סעיף ${current} מתוך ${ofTotal}`,

  s1Overline: "סעיף 1 מתוך 5",
  s1Title: "גיל והיקף הסיפור",
  s1Intro:
    "טווח הגיל קובע מורכבות שפה, התאמת כלי התמודדות ופרמטרים מבניים. הגדירו את ההיקף לפני תוכן קליני.",
  s1Field11: "טווח גיל יעד",
  s1Field12: "עוצמת עוצמה רגשית בשיא",
  s1Field12Helper: "קובעת את מידת המצוקה של הגיבור לפני הפתרון.",
  s1IntensityWarningTitle: "עוצמה משמעותית עם גילאי 3–5",
  s1IntensityWarningFooter: "אפשר להמשיך, אך תידרש אישור לפני שליחת הבריף.",
  s1Field13: "אורך הסיפור",
  s1Field13Helper: "משפיע על תקציב העמודים. ברירת המחדל: רגיל.",
  s1PreviewPlaceholder: "בחרו טווח גיל למעלה כדי לראות פרטי סיפור.",
  s1MissingAge: "טווח גיל יעד",
  s1MissingPeak: "עוצמת עוצמה רגשית בשיא",
  ariaAgeRange: (label) => `טווח גיל ${label}`,

  s2Overline: "סעיף 2 מתוך 5",
  s2Title: "יסודות קליניים",
  s2Intro:
    "החשיבה הקלינית שמעצבת את הסיפור: מי הילדים, מה מטריג את הקושי, ומה הסיפור אמור להשאיר אותם.",
  s2Field21: "העולם הרגשי של האוכלוסייה",
  s2Field21Helper:
    "מהי חוויית הרגש של הילדים שהסיפור מיועד להם? מה הם מרגישים, מה הם נמנעים ממנו, מה הם צריכים ולא יכולים לבקש?",
  s2Field21Placeholder: "תארו את העולם הפנימי של ילדים שזה הסיפור בשבילם…",
  s2Field22Helper: "איזה רגע או מצב מדויק מפעיל את החרדה שהסיפור מטפל בה?",
  s2Field22Placeholder: "תארו את רגע ההצתה כמה שיותר ספציפית…",
  s2Field23: "כוונה טיפולית",
  s2Field23Helper: "מלאו את שני החלקים. החצי השני הוא ליבת המסר של הסיפור.",
  s2IntentionFeelPrefix: "כשהילד סוגר את הספר, הוא אמור להרגיש",
  s2IntentionBecausePrefix: "כי",
  s2IntentionFeelPlaceholder: "אמיצים בשקט…",
  s2IntentionBecausePlaceholder: "גילו ש…",
  s2IntentionAriaFeel: "הם אמורים להרגיש",
  s2IntentionAriaBecause: "כי",
  s2StrongExamples: "דוגמאות חזקות",
  s2AvoidThis: "להימנע מזה",
  s2Field24: "חזון יצירתי קליני",
  s2Field24Helper:
    "תארו תמונה אחת, רגע או פרט ספציפי בלב הסיפור. לא מצב רוח — סצנה. התמונה צריכה לתמוך בגישה הטיפולית, לא להחליף אותה. מה קורה, מי שם, מה הילד שם לב?",
  s2Field24Placeholder: "למשל: הילד מוצא דלת זוהרת קטנה בסוף מסדרון…",
  s2Field25: "דבר אחד אמיתי",
  s2Field25Helper:
    "חשבו על ילד שעבדתם איתו שסיפור כזה היה עוזר לו. בלי לזהות — פרט גופני או רגשי אחד שאתם זוכרים: מחווה, הרגל, משפט, מבט.",
  s2Field25Placeholder: "השאירו ריק לדלג, או תארו פרט אמיתי קטן…",
  s2MissingPopulation: "העולם הרגשי של האוכלוסייה",
  s2MissingIntention: "כוונה טיפולית",
  s2MissingCreative: "חזון יצירתי קליני",
  fallbackTriggerLabel: "הטריגר הספציפי",

  s3Overline: "סעיף 3 מתוך 5",
  s3Title: "ארכיטקטורה טיפולית",
  s3Intro:
    "המנגנון הקליני: איך הסיפור עובד טיפולית. ההחלטות האלה מעצבות את הקשת והטכניקה הנרטיבית של הסוכן.",
  s3Field31: "גישה טיפולית ראשית",
  s3Field31Helper: "קובעת את עמוד השדרה הטיפולית — איך הגיבור עובר מקושי לפתרון.",
  s3Field32: "גישה תומכת",
  s3Field32Helper: "מעשירה את הסיפור בלי להנהיג את הקשת. הגישה הראשית נבחרת למעלה.",
  s3NoSupporting: "ללא גישה תומכת",
  s3AriaNoSupporting: "ללא גישה תומכת",
  s3ApproachConflictInline: "הגישות האלה עלולות למשוך בכיוונים שונים. האם זה בכוונה?",
  s3Field33: "ממד הבושה",
  s3Field33Helper: "קובע איך הסוכן מטפל באשמה או בגימום בסיפור.",
  s3Field34: "איך החרדה מופיעה בגוף?",
  s3Field34Helper: "בחרו עד 2. הסוכן משתמש בזה כדי לשקף את החוויה הגופנית של הילד.",
  s3SomaticOtherLabel: "משהו נוסף שהגוף עושה? (אופציונלי)",
  s3SomaticOtherPlaceholder: "תארו תגובות גופניות אחרות שלא מופיעות למעלה…",
  s3Field35: "כלי ההתמודדות",
  s3Field35Helper:
    "כלי אחד בלבד. הסוכן מציג את הגיבור משתמש בו ברגע הקשה ביותר — בהדגמה, לא בשם.",
  s3AbstractAgeNote:
    "לילדים צעירים יותר, הסוכן יציג זאת כפעולה גופנית פשוטה או דפוס חוזר — לא דיבור עצמי מילולי.",
  s3Field36: "מידת השלמת הפתרון",
  s3Field36Helper: "קובעת את הסצנה הסופית. ברירת המחדל לפחד וחרדה: פתרון חלקי.",
  s3DefaultSuffix: "(ברירת מחדל)",
  s3Field37: "מה הסיפור אסור לעשות לעולם",
  s3Field37Helper:
    "אילוצים קליניים ותוכן — הסוכן מתייחס לכל פריט ככלל קשיח. מוכן מראש לפי סוג הסיפור; שמרו, הסירו או הוסיפו.",
  s3MustNeverPlaceholder: "הוסיפו אילוץ שהסוכן אסור להפר…",
  s3MustNeverEmptyWarning: "לכל אילוץ חייב להיות תוכן לפני שאפשר להמשיך.",
  s3AddConstraint: "+ הוספת אילוץ",
  s3MissingPrimary: "גישה טיפולית ראשית",
  s3MissingShame: "ממד הבושה",
  s3MissingSomatic: "איך החרדה מופיעה בגוף?",
  s3MissingCoping: "כלי ההתמודדות",
  s3MissingResolution: "מידת השלמת הפתרון",
  s3MissingMustNever: "מה הסיפור אסור לעשות לעולם",
  s3ResolutionPartialNote: "ברירת המחדל לפחד וחרדה: פתרון חלקי.",

  s4Overline: "סעיף 4 מתוך 5",
  s4Title: "עולם הסיפור",
  s4Intro:
    "העיצוב הנרטיבי: מי חי בסיפור, כמה הוא קרוב למציאות הילד, ומי תומך בגיבור.",
  s4Field40: "התאמה אישית",
  s4Field40Helper: "קובע אם הגיבור הוא הילד עצמו או דמות נפרדת.",
  s4PersonalizationYes: "כן — מותאם אישית",
  s4PersonalizationNo: "לא — גיבור קבוע",
  s4AriaPersonalizationYes: "כן — התאמה אישית",
  s4AriaPersonalizationNo: "לא — גיבור קבוע",
  s4Field41: "מגדר הגיבור",
  s4Field41Helper: "בחרו מגדר לגיבור שאתם מעצבים.",
  s4Field42: "סוג הגיבור",
  s4LockedChildTitle: "דמות ילד",
  s4LockedChildSubtitle: "נעול — כשהתאמה אישית פעילה הגיבור הוא הילד.",
  s4LockedChip: "נעול",
  s4Field42Helper: "בחרו איך מציגים את הגיבור לקורא.",
  s4Field43: "גיל הגיבור ביחס לקורא",
  s4Field43Helper: "משפיע על הזדהות ושאיפה. ברירת מחדל: אותו גיל.",
  s4Field44: "נוכחות המטפל",
  s4Field44Helper: "קובעת כמה המטפל זמין ברגע הקשה של הסיפור.",
  s4Field45: "מרחק נרטיבי",
  s4Field45Helper: "כמה הסיפור משקף את המצב האמיתי של הילד.",
  s4ParallelTitle: "מה האתגר המקביל בעולם המקביל?",
  s4ParallelHelper:
    "אופציונלי, אך מומלץ מאוד. בלי זה, הסוכן יבנה את המיפוי המקביל בעצמו.",
  s4ParallelPlaceholder:
    "ספרייה קסומה שבה הדמות לא מוצאת את החדר שבו הספר האהוב…",
  s4DirectPersonalizationWarning:
    "הסיפור מראה מקרוב את חוויית הילד האמיתית, עם שם וזהות. ודאו שהעוצמה הרגשית מתאימה.",
  s4Field46: "דמויות משנה",
  s4Field46Helper: (max) =>
    `בחרו עד ${max}. לכל דמות נבחרת נפתחת אופציה לרמז לרגע המפתח של הסיפור.`,
  s4RolePlaceholder: "מה הדמות עושה ברגע המפתח של הסיפור? (אופציונלי)",
  s4RoleAria: (charLabel) => `הערה לדמות ${charLabel}`,
  s4Field47: "הערות דמויות",
  s4Field47Helper:
    "הוסיפו פרטים על הדמויות — אישיות, מראה, הרגלים, איך דוברים. הדמויות והנוכחות שבחרתם למעלה לא ישתנו בגלל הטקסט כאן.",
  s4Field47Placeholder:
    "למשל: המטפל תמיד מזמזם כשהוא לחוץ. לגיבור יש הרגל ללעוס שרוול…",
  s4MissingGender: "מגדר הגיבור",
  s4MissingType: "סוג הגיבור",
  s4MissingCaregiver: "נוכחות המטפל",
  s4MissingNarrative: "מרחק נרטיבי",

  s5Overline: "סעיף 5 מתוך 5",
  s5Title: "הגדרות התאמה אישית",
  s5IntroOn: "הגדירו מה מותר להורים לשנות כשהם מותאמים את הסיפור לילד שלהם.",
  s5IntroOff: "הסבירו למה הסיפור עובד טוב יותר עם גיבור קבוע. ההערה מוצגת להורים.",
  s5Field51: "אילוצי התאמה אישית",
  s5Field51Helper: "מה אסור לשנות כשהורה מותאם את הסיפור? מוכן מראש — שמרו, הסירו או הוסיפו.",
  s5ConstraintPlaceholder: "הוסיפו אילוץ שהורים לא יכולים לעבור עליו…",
  s5ConstraintsInfo: "האילוצים נאכפים בהתאמה — התאמה שמפרה אילוץ נחסמת.",
  s5Field52: "למה הסיפור עושה עבודה טובה יותר עם גיבור קבוע?",
  s5Field52Helper: "ההערה מוצגת להורים בעיון בסיפור. ישירות וספציפיות קלינית.",
  s5Field52Placeholder:
    "למשל: המבנה הרגשי של הסיפור תלוי בגיל וברקע של הגיבור ולא ניתן להתאמה בלי לשבור את המבנה הטיפולי…",
  s5AlmostDoneTitle: "כמעט סיימתם",
  s5AlmostDoneBody:
    "לאחר השליחה, הסוכן ייצור טיוטה ראשונה לפי כל מה שהגדרתם בבריף. תוכלו לבדוק, להערות ולאשר לפני פרסום.",
  s5MissingWhyNot: "למה הסיפור עושה עבודה טובה יותר עם גיבור קבוע?",
  submitBrief: "שליחת הבריף ←",
  submitting: "שולח…",

  optionalSuffix: "(אופציונלי)",
  requiredMark: "*",
  charactersCount: (used, max) => `${used} / ${max} תווים`,
  back: "חזרה ←",
  saveContinue: "שמירה והמשך ←",
  validationAlmostThere: "כמעט שם",
  validationToContinue: "כדי להמשיך, השלימו:",
  validationHint: "בחרו שדה למטה כדי לגלול אליו ולהתחיל למלא.",
  validationFieldsLeftOne: "נשאר שדה אחד",
  validationFieldsLeftMany: (n) => `${n} שדות נותרו`,
  validationAriaLabel: "שדות חובה שעדיין לא הושלמו",
  validationGoTo: (label) => `מעבר ל${label}`,
  validationRequiredStatus: "שדות חובה שעדיין לא הושלמו",

  gateHardBlockTitle: "אי אפשר לשלוח עדיין",
  gateHardBlockBody:
    "יש בעיה במבנה הקליני שיש לתקן לפני שליחה. עדכנו את השדות הרלוונטיים ונסו שוב.",
  gateHardBlockButton: "חזרה וסקירה",
  gateHardWarningTitle: "בדיקת בטיחות קלינית",
  gateHardWarningBody:
    "הבריף תואם שילוב שלדורש החלטה קלינית מפורשת לפני שליחה ליצירה. עברו על כל הערה, ואז אשרו אם אתם רוצים עדיין לשלוח.",
  gateHardWarningCheckbox: "הבנתי ואני רוצה להמשיך",
  gateProceed: "המשך",
  confirmSubmitTitle: "לשלוח את הבריף?",
  confirmSubmitBody:
    "הפעולה תשלח את הבריף לשרת ליצירת סיפור. תוכלו עדיין לסקור את ה-JSON שנשלח לאחר מכן, אבל לא תוכלו להמשיך לערוך את הטיוטה הזו.",
  confirmSubmitCancel: "ביטול",
  confirmSubmitConfirm: "כן, שליחה",
  submitGateCopy: {
    relational_tool_no_responder: {
      title: "נדרשת דמות שאפשר לפנות אליה",
      message:
        "כלי ההתמודדות דורש מישהו שאליו הגיבור יכול לפנות. הוסיפו מטפל נוכח או דמות משנה שמגיבה.",
      clinicalNote:
        "כלי התמודדות יחסיים מניחים דמות מגיבה. בלי עוגן כזה, הנרטיב עלול לסתור את המנגנון או להשאיר את הילד בלי מודל לבטיחות.",
    },
    significant_intensity_young_age: {
      title: "עוצמה גבוהה לילדים צעירים",
      message:
        "עוצמה רגשית משמעותית עלולה להיות מציקה לילדים בגילאי 3–5. האם אתם בטוחים שזה מתאים?",
      clinicalNote:
        "לילדים צעירים יש פחות יכולת ויסות כשהסיפור נשאר זמן ארוך בהתרגשות גבוהה. אם ממשיכים, ודאו קצב, קו־רגול ופתרון שמגנים על הקורא.",
    },
    graduated_exposure_comforting_caregiver: {
      title: "חשיפה הדרגתית עם מטפל מנחם",
      message:
        "מטפל מנחם באופן עקבי עלול להפחית את האפקט הטיפולי של חשיפה הדרגתית. האם זה בכוונה?",
      clinicalNote:
        "חשיפה הדרגתית נשענת על מנות נסבלות של אי־נוחות. הרגעה מתמדת עלולה לקצר את הגישה אלא אם בניתם את הדינמיקה בכוונה למקרה.",
    },
    conflicting_approach_pair: {
      title: "גישות טיפוליות שעלולות להתנגש",
      message: "הגישות עלולות למשוך בכיוונים שונים. האם זה בכוונה?",
      clinicalNote:
        "שילוב מנגנונים עלול לבלבל את הקשת הרגשית. המשיכו רק אם שכבתם בכוונה ויודעים איך לתעדף בטיוטה.",
    },
  },

  successTitle: "הבריף נשלח בהצלחה",
  successSubtitle:
    "הבריף נשמר בשרת. שמרו את מזהה הבריף למעקב. אפשר גם להוריד או להעתיק JSON כגיבוי מקומי.",
  successBriefId: "מזהה בריף",
  successJsonTitle: "JSON של הבריף (גיבוי)",
  successDownload: "הורדת JSON",
  successCopy: "העתקה ללוח",
  successCopied: "הועתק",
  successCopyFailed: "ההעתקה נכשלה — בחרו את הטקסט ידנית",
  successCreateAnother: "יצירת בריף נוסף",

  feedbackTitle: "משוב מומחה",
  feedbackBriefChip: (id) => `בריף ${id}`,
  feedbackFieldPrefix: "שדה",
  feedbackAssessment: "הערכה",
  feedbackClear: "ניקוי הערכה",
  feedbackNoteRecommended: "הערה (מומלץ)",
  feedbackNoteOptional: "הערה (אופציונלי)",
  feedbackNotePlaceholderDetail: "מה לשנות או להבהיר?",
  feedbackNotePlaceholderOptional: "הוסיפו פרטים אם זה עוזר למחבר…",
  feedbackSave: "שמירת משוב",
  feedbackPrevious: (n) => `משוב קודם${n > 0 ? ` (${n})` : ""}`,
  feedbackNoEntries: "אין רשומות עדיין.",
  feedbackUnknownTime: "זמן לא ידוע",
  feedbackLoadError: "לא ניתן לטעון משוב קודם",
  feedbackSaveError: "השמירה נכשלה",
  feedbackSaved: "המשוב נשמר.",
  feedbackFields: {
    storyType: { label: "סוג סיפור (לפני הבריף)", section: "לפני הבריף" },
    "1.1": { label: "טווח גיל יעד", section: "סעיף 1 — גיל והיקף הסיפור" },
    "1.2": { label: "עוצמת עוצמה רגשית בשיא", section: "סעיף 1 — גיל והיקף הסיפור" },
    "1.3": { label: "אורך הסיפור", section: "סעיף 1 — גיל והיקף הסיפור" },
    "2.1": { label: "העולם הרגשי של האוכלוסייה", section: "סעיף 2 — יסודות קליניים" },
    "2.2": { label: "הטריגר הספציפי", section: "סעיף 2 — יסודות קליניים" },
    "2.3": { label: "כוונה טיפולית", section: "סעיף 2 — יסודות קליניים" },
    "2.4": { label: "חזון יצירתי קליני", section: "סעיף 2 — יסודות קליניים" },
    "2.5": { label: "דבר אחד אמיתי", section: "סעיף 2 — יסודות קליניים" },
    "3.1": { label: "גישה טיפולית ראשית", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.2": { label: "גישה תומכת", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.3": { label: "ממד הבושה", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.4": { label: "ביטוי סומטי", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.5": { label: "כלי התמודדות", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.6": { label: "מידת שלמות הפתרון", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "3.7": { label: "רשימת 'אסור לעולם'", section: "סעיף 3 — ארכיטקטורה טיפולית" },
    "4.0": { label: "החלטת התאמה אישית", section: "סעיף 4 — עולם הסיפור" },
    "4.1": { label: "מגדר הגיבור", section: "סעיף 4 — עולם הסיפור" },
    "4.2": { label: "סוג הגיבור", section: "סעיף 4 — עולם הסיפור" },
    "4.3": { label: "גיל הגיבור ביחס לקורא", section: "סעיף 4 — עולם הסיפור" },
    "4.4": { label: "נוכחות המטפל", section: "סעיף 4 — עולם הסיפור" },
    "4.5": { label: "מרחק נרטיבי (ואתגר מקביל אם רלוונטי)", section: "סעיף 4 — עולם הסיפור" },
    "4.6": { label: "דמויות משנה", section: "סעיף 4 — עולם הסיפור" },
    "4.7": { label: "הערות דמויות", section: "סעיף 4 — עולם הסיפור" },
    "5.1": { label: "אילוצי התאמה אישית", section: "סעיף 5 — הגדרות התאמה אישית" },
    "5.2": { label: "למה לא להתאים אישית", section: "סעיף 5 — הגדרות התאמה אישית" },
  },
  feedbackVerdicts: {
    good: {
      label: "טוב",
      description: "השדה ברור וקליני לבריף.",
    },
    needs_modification: {
      label: "דורש שינוי",
      description: "משהו כאן צריך להשתנות לפני שהבריף מוכן.",
    },
    unclear: {
      label: "לא ברור",
      description: "הכוונה או הניסוח צריכים הבהרה למחבר או לשימוש בהמשך.",
    },
    remove_or_rethink: {
      label: "להסיר או לחשוב מחדש",
      description: "התוכן או הבחירה לא צריכים להישאר כפי שכתובו.",
    },
    keep_as_is: {
      label: "להשאיר כמו שזה",
      description: "להשאיר במפורש בלי עריכה מהותית.",
    },
  },
};
