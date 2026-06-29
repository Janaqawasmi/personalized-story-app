// Arabic UI copy for the Story Brief (Modern Standard Arabic, clinical tone).

import * as SB from "../types/storyBrief";
import type { StoryBriefUi } from "./storyBriefUi.types";

export const STORY_BRIEF_UI_AR: StoryBriefUi = {
  STORY_TYPE_LABELS: {
    fear_anxiety: "الخوف والقلق",
    big_emotions: "مشاعر كبيرة",
    loss_grief: "الفقد والحزن",
    identity_self_worth: "الهوية وتقدير الذات",
    life_transitions: "انتقالات الحياة",
  },
  STORY_TYPE_DESCRIPTIONS: {
    fear_anxiety: "قصص عن مخاوف محددة، قلق، واستجابات قلقية للمواقف",
    big_emotions: "قصص عن مشاعر قوية — غضب، إحباط، حزن، ضغط عاطفي",
    loss_grief: "قصص عن فقدان شخص أو شيء مهم",
    identity_self_worth: "قصص عن كيف يرى الطفل نفسه ويشعر تجاه نفسه",
    life_transitions: "قصص عن تغييرات كبيرة — مولود جديد، انتقال، بداية المدرسة، انفصال",
  },
  AGE_RANGE_LABELS: SB.AGE_RANGE_LABELS,
  PEAK_INTENSITY_LABELS: {
    very_gentle: "خفيف جدًا",
    moderate: "متوسط",
    significant: "شديد",
  },
  PEAK_INTENSITY_DEFINITIONS: {
    very_gentle:
      "يشعر البطل بعدم الارتياح أو عدم اليقين، ويكون الشعور بالانزعاج قصيرًا.",
    moderate: "يمر البطل بضيق حقيقي ولكن ضمن مسار قصصي متوازن ومحدود.",
    significant:
      "يكون البطل في حالة ضغط أو انفعال قوي ومؤثر قبل الوصول إلى الحل النهائي.",
  },
  STORY_LENGTH_LABELS: {
    short: "قصير",
    standard: "متوسط",
    extended: "موسّع",
  },
  STORY_LENGTH_PREVIEWS: {
    "3-5": {
      short: "قصة قصيرة نحو 6–8 صفحات، قراءة جهراً من 3 إلى 5 دقائق",
      standard: "قصة بطول النوم نحو 8–12 صفحة، قراءة جهراً من 5 إلى 7 دقائق",
      extended: "قصة أطول نحو 12–16 صفحة، قراءة جهراً من 8 إلى 10 دقائق",
    },
    "5-7": {
      short: "قصة قصيرة نحو 8–10 صفحات، قراءة جهراً من 4 إلى 6 دقائق",
      standard: "قصة بطول النوم نحو 10–14 صفحة، قراءة جهراً من 6 إلى 9 دقائق",
      extended: "قصة أطول نحو 14–18 صفحة، قراءة جهراً من 9 إلى 12 دقيقة",
    },
    "7-9": {
      short: "فصل قصير نحو 10–12 صفحة، قراءة جهراً من 6 إلى 8 دقائق",
      standard: "فصل اعتيادي نحو 12–16 صفحة، قراءة جهراً من 8 إلى 12 دقيقة",
      extended: "فصل أطول نحو 16–22 صفحة، قراءة جهراً من 12 إلى 16 دقيقة",
    },
    "9-12": {
      short: "قصة قصيرة نحو 12–15 صفحة، قراءة جهراً من 8 إلى 12 دقيقة",
      standard: "قصة اعتيادية نحو 15–20 صفحة، قراءة جهراً من 12 إلى 18 دقيقة",
      extended: "قصة أطول نحو 20–28 صفحة، قراءة جهراً من 18 إلى 25 دقيقة",
    },
  },
  WARN_SIGNIFICANT_YOUNG_AGE:
    "شدة عاطفية كبيرة قد تكون ثقيلة على الأطفال من 3 إلى 5 أعوام. هل أنتم متأكدون أن هذا ملائم لهذه الفئة العمرية؟",
  POPULATION_THINKING_SCAFFOLDS: {
    fear_anxiety: {
      summaryTitle: "إطار تفكير — ما الذي يستحق الاعتبار",
      subQuestions: [
        "مما يخافون أن يحدث؟",
        "ماذا يفعلون لتجنب ذلك؟",
        "ما الذي يُفهم خطأ عن هذا الخوف من قبل البالغين؟",
      ],
    },
  },
  TRIGGER_LABELS: {
    fear_anxiety: "الموقف المُحفِّز",
  },
  TRIGGER_NUDGE: "يمكنكم إضافة ما يراه الطفل أو يسمعه أو يشعر به في هذه اللحظة.",
  INTENTION_NUDGE:
    "قد يحتاج هذا الوصف إلى مزيد من التحديد. حاولوا توضيح الأثر الذي تريدون أن تتركه القصة لدى الطفل.",
  INTENTION_GOOD_EXAMPLES: {
    fear_anxiety: [
      {
        feel: "أشجع بهدوء",
        because: "اكتشفوا أن طلب المساعدة شيء يفعله الشجعاء",
      },
      {
        feel: "مطمئنون بالأمان",
        because: "اختبروا أن من يحبهم يعودون دائمًا حتى حين لا يشعرون بذلك",
      },
    ],
  },
  INTENTION_BAD_EXAMPLES: {
    fear_anxiety: [
      {
        feel: "أفضل",
        because: "لا داعي للخوف",
        note: "يلغي الخوف",
      },
      {
        feel: "آمنون",
        because: "القلق استجابة عصبية طبيعية",
        note: "سريري أكثر مما يناسب قصة الأطفال",
      },
    ],
  },
  THERAPEUTIC_APPROACH_LABELS: {
    normalization: "تطبيع",
    cognitive_reframing: "إعادة تأطير معرفية",
    graduated_exposure: "تعرّض تدريجي",
    modeling: "نمذجة",
    reassurance_predictability: "طمأنة وتوقّع",
    self_regulation: "تنظيم ذاتي",
    psychoeducation: "تثقيف نفسي (ملائم للعمر)",
  },
  THERAPEUTIC_APPROACH_DEFINITIONS: {
    normalization:
      "القصة تُظهر للطفل أن خوفه شائع ومشترك — ليس وحيدًا ولا «معطوبًا».",
    cognitive_reframing:
      "القصة تساعد الطفل على رؤية الوضع من زاوية جديدة — تغيير طريقة تفكيره فيما يخيفه.",
    graduated_exposure:
      "القصة ترافق الطفل بتعرّض تدريجي للموقف المخيف — خطوة بخطوة، بشجاعة أكثر قليلًا.",
    modeling:
      "القصة تعرض شخصية أخرى تتعامل بنجاح مع الخوف نفسه — نموذج للاقتداء.",
    reassurance_predictability:
      "القصة تخلق أمانًا عبر روتين وتوقّع وحضور موثوق لأشخاص يعتمد عليهم الطفل.",
    self_regulation:
      "القصة تركز على قدرة الطفل على ضبط استجابته — يبني قدرة داخلية.",
    psychoeducation:
      "القصة تساعد الطفل على فهم ما يحدث في الجسد أو النفس — تسمية التجربة داخل السرد، لا كدرس.",
  },
  SHAME_DIMENSION_LABELS: {
    not_significant: "ليس عاملاً مهماً في هذه القصة",
    present: "موجود — تعامل بحساسية",
    central: "محوري في التجربة",
  },
  SHAME_DIMENSION_DESCRIPTIONS: {
    not_significant: "لا يجب على الوكيل معالجة الخجل.",
    present:
      "يتجنب الوكيل كل ما يوحي بالذنب دون أن يقوّض الآلية العلاجية الأساسية.",
    central:
      "يُعطي الوكيل الأولوية للتطبيع وثلاث قواعد صارمة: إظهار أن الطفل ليس وحيدًا؛ ممنوع التلميح إلى أن الطفل «كان يجب أن يعرف»؛ على الأقل شخصية واحدة تستجيب بقبول لا بتصحيح.",
  },
  SOMATIC_EXPRESSION_LABELS: {
    freezing_going_still: "جمود / توقف",
    crying_clinging: "بكاء / التصاق",
    stomach_ache_feeling_sick: "ألم بطن / دوار أو غثيان",
    heart_racing_cant_breathe: "خفقان / صعوبة في التنفس",
    restless_fidgety: "قلق حركي / لا يستقر على مقعده",
    going_quiet_shutting_down: "صمت / انسحاب",
    tension_clenching: "توتر / قبضة (فك، قبضات، أكتاف)",
    sweating_feeling_hot: "تعرّق / إحساس بالحر",
  },
  COPING_TOOL_LABELS: {
    deep_breathing: "تنفس عميق",
    counting: "عدّ",
    grounding_through_senses: "التأريض عبر الحواس",
    positive_self_talk: "حديث ذاتي إيجابي",
    visualization: "تخيّل مرئي",
    routine_awareness: "وعي بالروتين",
    safe_person: "شخص آمن",
    comfort_object_or_memory: "شيء أو ذكرى مهدئة",
    asking_for_help: "طلب المساعدة",
  },
  COPING_TOOL_CATEGORIES_FEAR_ANXIETY: [
    { label: "الجسد", tools: ["deep_breathing", "counting", "grounding_through_senses"] },
    { label: "النفس", tools: ["positive_self_talk", "visualization", "routine_awareness"] },
    { label: "العلاقة", tools: ["safe_person", "comfort_object_or_memory", "asking_for_help"] },
  ],
  RESOLUTION_LABELS: {
    full: "حل كامل",
    partial: "حل جزئي",
    open: "مفتوح",
  },
  RESOLUTION_DESCRIPTIONS: {
    full: "يتغلب البطل على الصعوبة.",
    partial: "يخطو البطل خطوة شجاعة لكن الشعور لم يختف بعد.",
    open: "البطل أكثر استعدادًا لكن الرحلة مستمرة.",
  },
  MUST_NEVER_DEFAULTS: {
    ...SB.MUST_NEVER_DEFAULTS,
    fear_anxiety: [
      "لا يُلمَح أبدًا إلى أن خوف الطفل سخيف أو غير معقول أو شيء يستحيى منه",
      "لا يُحل الخوف بأن يصلح شخص آخر الموقف عن الطفل (ما لم يُختَر أداة «طلب المساعدة»)",
      "لا يُعرَض الموقف المخيف كخطر حقيقي ولا يُؤكَّد أسوأ سيناريو يخشاه الطفل",
    ],
  },
  PERSONALIZATION_OPTION_DESCRIPTIONS: {
    yes: "يضيف الوالدان الاسم والنوع وصورة الطفل. البطل هو طفلهما. أقوى تعاطف.",
    no: "تصممون البطل بالكامل. الطفل يقرأ عن شخص آخر. مسافة واقية.",
  },
  PROTAGONIST_GENDER_LABELS: {
    boy: "صبي",
    girl: "فتاة",
    kept_open: "يُترك مفتوحًا",
  },
  PROTAGONIST_GENDER_NOTE: {
    boy: null,
    girl: null,
    kept_open:
      "يستخدم الوكيل اسم حيوان بسيط أو شخصية خيالية غير محددة النوع. دون ضمير «هم» لمن دون 7 أعوام.",
  },
  PROTAGONIST_TYPE_LABELS: {
    child: "طفل",
    animal: "حيوان",
    fantasy: "خيال",
  },
  PROTAGONIST_TYPE_AGE_GUIDANCE: {
    "3-5": "يُفضّل الحيوانات في هذا العمر — تعطي مسافة واقية.",
    "5-7": "الحيوانات والأطفال كلاهما مناسب في هذا العمر.",
    "7-9": "أطفال كأبطال يعزّز التعاطف لدى القراء الأكبر.",
    "9-12": "أطفال كأبطال يعزّز التعاطف لدى القراء الأكبر.",
  },
  PROTAGONIST_AGE_RELATIVE_LABELS: {
    same_age: "نفس العمر",
    slightly_older: "أكبر قليلًا",
  },
  CAREGIVER_PRESENCE_LABELS: {
    present_and_comforting: "حاضر ومُطمئن",
    guides_from_the_side: "يوجه من الجانب",
    leaves_and_returns: "يغادر ويعود",
    waiting_at_the_end: "ينتظر في النهاية",
    not_present: "غير حاضر",
  },
  CAREGIVER_PRESENCE_DESCRIPTIONS: {
    leaves_and_returns:
      "المُعتني يغادر أثناء القصة ثم يعود. القصة تشمل فراقًا وعودة.",
  },
  NARRATIVE_DISTANCE_LABELS: {
    direct: "مباشر",
    parallel: "موازٍ",
    metaphorical: "استعاري",
  },
  NARRATIVE_DISTANCE_DEFINITIONS: {
    direct: "القصة تعكس الواقع عن قرب. نفس السياق والتحدي، عالم مألوف.",
    parallel:
      "موقف مشابه بتفاصيل ألطف أو منزاحة. بيئة مختلفة، نواة عاطفية مشابهة.",
    metaphorical:
      "الموقف يُمثَّل رمزيًا. التحدي يُجْمَل في سرد خيالي أو رمزي.",
  },
  SUPPORTING_CHARACTER_LABELS: {
    peer_shows_possible: "رفيق يُظهر أن الأمر ممكن",
    peer_alongside: "رفيق يمرّ بهذا معًا",
    teacher_adult_guides: "معلّم أو بالغ يوجّه",
    animal_friend: "رفيق حيوان",
    sibling_perspective: "أخ أو أخت يقدّمان زاوية",
  },
  LANGUAGE_LABELS: { en: "الإنجليزية", he: "العبرية", ar: "العربية" },

  preBriefOverline: "قبل الموجز",
  preBriefTitle: "اختاروا العدسة التي ينظر من خلالها السرد",
  preBriefSubtitle:
    "نوع القصة يحدد الحقول الظاهرة والخيارات المتاحة والافتراضات السريرية المحمّلة. إنها عدسة علاجية لا تشخيص.",
  draftSavedBannerTitle: "هناك مسودة محفوظة",
  draftSavedBriefWord: "موجز",
  draftSavedSavedPrefix: "حُفظت",
  resume: "متابعة",
  startOver: "البدء من جديد",
  comingSoon: "قريبًا",
  beginBrief: "بدء الموجز ←",
  savedPrefix: "حُفظت",
  draftSavedSnackbar: "تم حفظ المسودة",
  submitErrorGeneric: "حدث خطأ أثناء الإرسال. حاولوا مرة أخرى.",

  complexityMeterTitle: "مستوى تعقيد القصة",
  complexityMeterAria: (expanded) =>
    expanded
      ? "مستوى تعقيد القصة — التفاصيل ظاهرة"
      : "مستوى تعقيد القصة — انقروا أو مرّوا لعرض التفاصيل",
  complexityTotalApprox: (pages) => {
    const t = pages % 1 === 0 ? String(pages) : pages.toFixed(1);
    return `إجمالي التعقيد التقريبي: ${t} صفحات`;
  },
  complexityBudgetSummary: (min, max, lengthLabel, ageLabel) =>
    `${min}–${max} صفحة (${lengthLabel}، أعمار ${ageLabel})`,
  complexityBreakdownLine: (label, pages) => {
    const t = pages % 1 === 0 ? String(pages) : pages.toFixed(1);
    return `${label} — ~${t} صفحة`;
  },
  complexityLengthBumpMessage: (nextLengthLabel) =>
    `قد يحتاج التصميم إلى مساحة أكبر. التبديل إلى ${nextLengthLabel}؟`,
  complexityLengthBumpCta: (nextLengthLabel) => `التبديل إلى ${nextLengthLabel}`,
  complexityLengthBumpMaxed: "تم بالفعل اختيار أطول مدة لهذا النطاق العمري.",

  preSubmitComplexityTitle: "طول القصة وعبء التصميم",
  preSubmitComplexityBody: (approxPages, lengthLabel, budgetMin, budgetMax) => {
    const t = approxPages % 1 === 0 ? String(approxPages) : approxPages.toFixed(1);
    return (
      `التصميم يحتاج نحو ${t} صفحة لتضمين كل العناصر جيدًا. ` +
      `اختُير ${lengthLabel} (${budgetMin}–${budgetMax} صفحة). ` +
      `يمكن إطالة القصة أو تخفيف التعقيد — مثل إزالة شخصية ثانوية أو تغيير الجهة الداعمة أو ضبط مستوى الخجل.`
    );
  },
  preSubmitComplexityBreakdownHeading: "ما الذي يزيد تعقيد القصة",
  preSubmitComplexitySubmitAnyway: "إرسال على أي حال",
  preSubmitComplexityGoBack: "عودة للتعديل",

  sectionOf: (section) => `القسم ${section} من 5`,
  sectionLabels: {
    1: { full: "العمر ونطاق القصة", short: "النطاق" },
    2: { full: "الأساس السريري", short: "الأساس" },
    3: { full: "البنية العلاجية", short: "البنية" },
    4: { full: "عالم القصة", short: "العالم" },
    5: { full: "التخصيص", short: "تخصيص" },
  },
  progressNavAriaLabel: "تقدّم أقسام الموجز",
  progressStepAria: ({ num, fullName, clickable, isCurrent, lockedFuture }) => {
    if (clickable) return `الانتقال إلى القسم ${num}: ${fullName}`;
    if (isCurrent) return `القسم الحالي ${num}: ${fullName}`;
    if (lockedFuture) return `القسم ${num}: ${fullName}. مقفل حتى يمكن فتح هذه الخطوة.`;
    return `القسم ${num}: ${fullName}`;
  },
  sectionMobileLine: (current, ofTotal = 5) => `القسم ${current} من ${ofTotal}`,

  s1Overline: "القسم 1 من 5",
  s1Title: "العمر ونطاق القصة",
  s1Intro:
    "يحدد نطاق العمر تعقيد اللغة وملاءمة أدوات التأقلم والمعايير البنيوية. حددوا النطاق قبل المحتوى السريري.",
  s1Field11: "فئة العمر المستهدفة",
  s1Field12: "ذروة الشدة العاطفية",
  s1Field12Helper:
    "تحدد مدى مقدار الضيق أو التوتر الذي يشعر به البطل قبل الوصول إلى الحل النهائي.",
  s1IntensityWarningTitle: "شدة كبيرة مع أعمار 3–5",
  s1IntensityWarningFooter: "يمكنكم المتابعة، لكن سيُطلب تأكيد قبل إرسال الموجز.",
  s1Field13: "طول القصة",
  s1Field13Helper: "يؤثر على ميزانية الصفحات. الافتراضي: متوسط.",
  s1PreviewPlaceholder: "اختاروا فئة عمر أعلاه لعرض تفاصيل القصة.",
  s1BriefLanguageLabel: "لغة الموجز",
  s1BriefLanguageHelper: "اللغة التي تكتبون بها هذا الموجز. لا تؤثر على القصة المُولّدة.",
  s1OutputLanguageLabel: "لغة القصة المُولّدة",
  s1OutputLanguageHelper: "اللغة التي ستُكتب بها القصة المُولّدة. مستقلة عن لغة الموجز.",
  s1MissingAge: "فئة العمر المستهدفة",
  s1MissingPeak: "ذروة الشدة العاطفية",
  ariaAgeRange: (label) => `فئة العمر ${label}`,

  s2Overline: "القسم 2 من 5",
  s2Title: "الأساس السريري",
  s2Intro:
    "التفكير السريري الذي يشكّل القصة: من هم الأطفال، ما الذي يثير الصعوبة، وماذا يفترض أن تتركهم القصة.",
  s2Field21: "العاطفة الجماعية للفئة",
  s2Field21Helper:
    "ما تجربة أطفال هذه القصة؟ ماذا يشعرون، مما يتجنبون، ما الحاجة التي لا يستطيعون طلبها؟",
  s2Field21Placeholder: "صِفوا العالم الداخلي لأطفال هذه القصة لهم…",
  s2Field22Helper: "أي لحظة أو موقف يحدّث القلق الذي تعالجه القصة؟",
  s2Field22Placeholder: "صِفوا لحظة الإشعال بأكبر قدر ممكن من التحديد…",
  s2Field23: "النية العلاجية",
  s2Field23Helper: "أكملوا الجزأين. النصف الثاني هو لب رسالة القصة.",
  s2IntentionFeelPrefix: "حين يغلق الطفل الكتاب، يفترض أن يشعر بـ",
  s2IntentionBecausePrefix: "لأن",
  s2IntentionFeelPlaceholder: "شجاع بهدوء…",
  s2IntentionBecausePlaceholder: "اكتشف أن…",
  s2IntentionAriaFeel: "يُفترض أن يشعروا",
  s2IntentionAriaBecause: "لأن",
  s2StrongExamples: "أمثلة قوية",
  s2AvoidThis: "تجنّبوا هذا",
  s2IntentionExampleFeelCue: "يشعرون",
  s2IntentionExampleBecauseCue: "لأن",
  s2IntentionExampleQuoteOpen: "«…",
  s2IntentionExampleQuoteClose: "»",
  s2Field24: "رؤية إبداعية سريرية",
  s2Field24Helper:
    "صِفوا صورة واحدة أو لحظة أو تفصيلًا محددًا في قلب القصة. لا مزاجًا — مشهدًا. يجب أن تدعم الجهة العلاجية لا أن تحل محلها. ماذا يحدث، من هناك، ما الذي يلاحظه الطفل؟",
  s2Field24Placeholder: "مثلًا: الطفل يجد بابًا صغيرًا متوهجًا في نهاية ممر…",
  s2Field25: "تفصيل حقيقي واحد",
  s2Field25Helper:
    "فكّروا بطفل عملتم معه وكانت قصة كهذه لتفيده. دون أي معلومات تعريفية، اذكروا تفصيلًا جسديًا أو عاطفيًا واحدًا تتذكرونه: إيماءة، عادة، عبارة متكررة، أو نظرة.",
  s2Field25Placeholder: "اتركوه فارغًا للتخطي، أو صِفوا تفصيلًا حقيقيًا صغيرًا…",
  s2MissingPopulation: "العاطفة الجماعية للفئة",
  s2MissingIntention: "النية العلاجية",
  s2MissingCreative: "الرؤية الإبداعية السريرية",
  fallbackTriggerLabel: "الموقف المُحفِّز",

  s3Overline: "القسم 3 من 5",
  s3Title: "البنية العلاجية",
  s3Intro:
    "الآلية السريرية: كيف تعمل القصة علاجيًا. هذه القرارات تشكّل قوس السرد وتقنية الوكيل.",
  s3Field31: "النهج العلاجي الأساسي",
  s3Field31Helper: "يحدد العمود الفقري العلاجي — كيف ينتقل البطل من الصعوبة إلى الحل.",
  s3Field32: "نهج داعم",
  s3Field32Helper: "يُغني القصة دون قيادة القوس. النهج الأساسي يُختار أعلاه.",
  s3NoSupporting: "دون نهج داعم",
  s3AriaNoSupporting: "دون نهج داعم",
  s3ApproachConflictInline: "قد تسحب هذه النُهج في اتجاهات مختلفة. هل ذلك مقصود؟",
  s3Field33: "بعد الخجل",
  s3Field33Helper: "يحدد كيف يتعامل الوكيل مع الذنب أو الوصم في القصة.",
  s3Field34: "كيف يظهر القلق في الجسد؟",
  s3Field34Helper: "اختاروا حتى اثنتين. يستخدم الوكيل ذلك ليعكس التجربة الجسدية للطفل.",
  s3SomaticOtherLabel: "شيء آخر يفعله الجسد؟ (اختياري)",
  s3SomaticOtherPlaceholder: "صِفوا استجابات جسدية أخرى غير المدرجة أعلاه…",
  s3Field35: "أداة التأقلم",
  s3Field35Helper:
    "أداة واحدة فقط. يُظهر الوكيل البطل يستخدمها في أصعب لحظة — بالفعل لا بالاسم.",
  s3AbstractAgeNote:
    "للأصغر سنًا، يعرض الوكيل ذلك كحركة جسدية بسيطة أو نمطًا متكررًا — لا حديث ذاتي لفظيًا.",
  s3Field36: "درجة اكتمال الحل",
  s3Field36Helper: "تحدد المشهد الختامي. الافتراض للخوف والقلق: حل جزئي.",
  s3DefaultSuffix: "(افتراضي)",
  s3Field37: "ما الذي لا يجوز للقصة فعله أبدًا",
  s3Field37Helper:
    "قيود سريرية ومحتوى — يعامل الوكيل كل بند كقاعدة صارمة. مُحمَّل مسبقًا حسب نوع القصة؛ احتفظوا أو احذفوا أو أضيفوا.",
  s3MustNeverPlaceholder: "أضيفوا قيدًا لا يجوز للوكيل خرقه…",
  s3MustNeverEmptyWarning: "يجب أن يكون لكل قيد نص قبل المتابعة.",
  s3AddConstraint: "+ إضافة قيد",
  s3MissingPrimary: "النهج العلاجي الأساسي",
  s3MissingShame: "بعد الخجل",
  s3MissingSomatic: "كيف يظهر القلق في الجسد؟",
  s3MissingCoping: "أداة التأقلم",
  s3MissingResolution: "درجة اكتمال الحل",
  s3MissingMustNever: "ما الذي لا يجوز للقصة فعله أبدًا",
  s3ResolutionPartialNote: "الافتراض للخوف والقلق: حل جزئي.",

  s4Overline: "القسم 4 من 5",
  s4Title: "عالم القصة",
  s4Intro:
    "التصميم السردي: من يسكن القصة، وكم هي قريبة من واقع الطفل، ومن يدعم البطل.",
  s4Field40: "التخصيص",
  s4Field40Helper: "يحدد ما إذا كان البطل هو الطفل نفسه أو شخصية منفصلة.",
  s4PersonalizationYes: "نعم — مخصّص",
  s4PersonalizationNo: "لا — بطل ثابت",
  s4AriaPersonalizationYes: "نعم — تخصيص",
  s4AriaPersonalizationNo: "لا — بطل ثابت",
  s4Field41: "جنس البطل",
  s4Field41Helper: "اختاروا جنس البطل الذي تصممونه.",
  s4Field42: "نوع البطل",
  s4LockedChildTitle: "شخصية طفل",
  s4LockedChildSubtitle: "مقفل — عند تفعيل التخصيص يكون البطل هو الطفل.",
  s4LockedChip: "مقفل",
  s4Field42Helper: "اختاروا كيف تُعرَض الشخصية للقارئ.",
  s4Field43: "عمر البطل بالنسبة للقارئ",
  s4Field43Helper: "يؤثر على التعاطف والتطلّع. الافتراضي: نفس العمر.",
  s4Field44: "حضور المُعتني",
  s4Field44Helper: "يحدد مدى توفر المُعتني في لحظة الصعوبة في القصة.",
  s4Field45: "المسافة السردية",
  s4Field45Helper: "مدى انعكاس القصة للواقع الفعلي للطفل.",
  s4ParallelTitle: "ما التحدي الموازي في العالم الموازي؟",
  s4ParallelHelper:
    "اختياري، لكن يُنصح به بشدة. من دونه، يبني الوكيل المطابقة الموازية بنفسه.",
  s4ParallelPlaceholder:
    "مكتبة سحرية لا يجد فيها الشخصية الغرفة التي فيها كتابه المفضّل…",
  s4DirectPersonalizationWarning:
    "القصة تعرض عن قرب تجربة الطفل الحقيقية مع الاسم والهوية. تأكدوا أن الشدة العاطفية ملائمة.",
  s4Field46: "شخصيات ثانوية",
  s4Field46Helper: (max) =>
    `اختاروا حتى ${max}. لكل شخصية مُختارة تُفتح إمكانية تلميح للحظة المحورية في القصة.`,
  s4RolePlaceholder: "ماذا تفعل الشخصية في اللحظة المحورية؟ (اختياري)",
  s4RoleAria: (charLabel) => `ملاحظة لشخصية ${charLabel}`,
  s4Field47: "ملاحظات الشخصيات",
  s4Field47Helper:
    "أضيفوا تفاصيل عن الشخصيات — شخصية، مظهر، عادات، طريقة الكلام. الشخصيات والحضور الذي اخترتموه أعلاه لا يتغيران بسبب النص هنا.",
  s4Field47Placeholder:
    "مثلًا: المُعتني يزمّر دائمًا حين يضطرب. للبطل عادة مضغ الكم…",
  s4MissingGender: "جنس البطل",
  s4MissingType: "نوع البطل",
  s4MissingCaregiver: "حضور المُعتني",
  s4MissingNarrative: "المسافة السردية",

  s5Overline: "القسم 5 من 5",
  s5Title: "إعدادات التخصيص",
  s5IntroOn: "القصة مخصّصة. يمكن للوالدين تخصيصها باسم الطفل وصورته.",
  s5IntroOff: "اشرحوا لماذا تعمل القصة أفضل ببطل ثابت. تُعرض الملاحظة للوالدين.",
  s5Field52: "لماذا تعمل القصة أفضل ببطل ثابت؟",
  s5Field52Helper: "تُعرض الملاحظة للوالدين عند تصفح القصة. صراحة وخصوصية سريرية.",
  s5Field52Placeholder:
    "مثلًا: البنية العاطفية للقصة تعتمد على عمر البطل وخلفيته ولا يمكن تخصيصها دون كسر البنية العلاجية…",
  s5AlmostDoneTitle: "تقريبًا انتهيتم",
  s5AlmostDoneBody:
    "بعد الإرسال، يُنشئ الوكيل مسودة أولى وفق كل ما حددتموه في الموجز. يمكنكم المراجعة والتعليق والموافقة قبل النشر.",
  s5MissingWhyNot: "لماذا تعمل القصة أفضل ببطل ثابت؟",
  submitBrief: "إرسال الموجز ←",
  submitting: "جاري الإرسال…",

  optionalSuffix: "(اختياري)",
  requiredMark: "*",
  charactersCount: (used, max) => `${used} / ${max} حرفًا`,
  back: "رجوع ←",
  saveContinue: "حفظ ومتابعة ←",
  validationAlmostThere: "تقريبًا اكتمل",
  validationToContinue: "للمتابعة، أكملوا:",
  validationHint: "اختاروا حقلًا أدناه للتمرير إليه والبدء بالملء.",
  validationFieldsLeftOne: "حقل واحد متبقٍ",
  validationFieldsLeftMany: (n) => `${n} حقول متبقية`,
  validationAriaLabel: "حقول مطلوبة لم تُستكمل بعد",
  validationGoTo: (label) => `الانتقال إلى ${label}`,
  validationRequiredStatus: "حقول مطلوبة لم تُستكمل بعد",

  gateHardBlockTitle: "لا يمكن الإرسال بعد",
  gateHardBlockBody:
    "هناك مشكلة في البنية السريرية يجب تصحيحها قبل الإرسال. حدّثوا الحقول ثم حاولوا مجددًا.",
  gateHardBlockButton: "رجوع ومراجعة",
  gateHardWarningTitle: "فحص السلامة السريرية",
  gateHardWarningBody:
    "الموجز يطابق مجموعة تتطلب قرارًا سريريًا صريحًا قبل الإرسال للتوليد. راجعوا كل ملاحظة ثم أكدوا إن كنتم ما زلتم تريدون الإرسال.",
  gateHardWarningCheckbox: "أفهم وأرغب في المتابعة",
  gateProceed: "متابعة",
  confirmSubmitTitle: "إرسال هذا الموجز؟",
  confirmSubmitBody:
    "سيُرسَل الموجز إلى الخادم لإنشاء القصة. يمكنكم بعدها مراجعة JSON المُرسَل، لكن لن تتمكنوا من مواصلة تحرير هذه المسودة.",
  confirmSubmitCancel: "إلغاء",
  confirmSubmitConfirm: "نعم، إرسال",
  submitGateCopy: {
    relational_tool_no_responder: {
      title: "مطلوب شخص يمكن اللجوء إليه",
      message:
        "أداة التأقلم تتطلب شخصًا يمكن للبطل أن يلجأ إليه. أضيفوا مُعتنيًا حاضرًا أو شخصية ثانوية تستجيب.",
      clinicalNote:
        "أدوات التأقلم العلائقية تفترض شخصية مستجيبة. من دون ذلك قد يتعارض السرد مع الآلية أو يترك الطفل بلا نموذج للأمان.",
    },
    significant_intensity_young_age: {
      title: "شدة عالية للأطفال الصغار",
      message:
        "شدة عاطفية كبيرة قد تكون ثقيلة على الأطفال من 3 إلى 5 أعوام. هل أنتم متأكدون أن ذلك ملائم؟",
      clinicalNote:
        "للأصغر قدرة أقل على الضبط عندما يبقى السرد مديدًا في إثارة عالية. إن واصلتم، تأكدوا من الإيقاع والتنظيم المشترك وحل يحمي القارئ.",
    },
    graduated_exposure_comforting_caregiver: {
      title: "تعرّض تدريجي مع مُعتني مُطمئن",
      message:
        "مُعتني يُطمئن باستمرار قد يقلّل الأثر العلاجي للتعرّض التدريجي. هل ذلك مقصود؟",
      clinicalNote:
        "التعرّض التدريجي يعتمد على جرعات تحمّل من الإزعاج. الطمأنة الدائمة قد تقصّر النهج ما لم تبنوا الديناميك بقصد للحالة.",
    },
    conflicting_approach_pair: {
      title: "نهجان علاجيان قد يتعارضان",
      message: "قد تسحب النُهج في اتجاهات مختلفة. هل ذلك مقصود؟",
      clinicalNote:
        "خلط الآليات قد يلبّس القوس العاطفي. واصلوا فقط إن طبّقتم ذلك عمدًا وتعرفون كيف تُعطى الأولوية في المسودة.",
    },
  },

  successTitle: "تم إرسال الموجز بنجاح",
  successSubtitle:
    "حُفِظ الموجز على الخادم. احتفظوا بمعرّف الموجز للمتابعة. يمكنكم أيضًا تنزيل أو نسخ JSON كنسخة احتياطية محلية.",
  successBriefId: "معرّف الموجز",
  successJsonTitle: "JSON للموجز (نسخة احتياطية)",
  successDownload: "تنزيل JSON",
  successCopy: "نسخ إلى الحافظة",
  successCopied: "تم النسخ",
  successCopyFailed: "فشل النسخ — حدّدوا النص يدويًا",
  successCreateAnother: "إنشاء موجز آخر",

  feedbackTitle: "ملاحظات الاختصاصي",
  feedbackBriefChip: (id) => `موجز ${id}`,
  feedbackFieldPrefix: "حقل",
  feedbackAssessment: "تقييم",
  feedbackClear: "مسح التقييم",
  feedbackNoteRecommended: "ملاحظة (مُستحسنة)",
  feedbackNoteOptional: "ملاحظة (اختيارية)",
  feedbackNotePlaceholderDetail: "ما الذي يجب تغييره أو توضيحه؟",
  feedbackNotePlaceholderOptional: "أضيفوا تفاصيل إن ساعدت المؤلف…",
  feedbackSave: "حفظ الملاحظات",
  feedbackPrevious: (n) => `ملاحظات سابقة${n > 0 ? ` (${n})` : ""}`,
  feedbackNoEntries: "لا توجد إدخالات بعد.",
  feedbackUnknownTime: "وقت غير معروف",
  feedbackLoadError: "تعذّر تحميل الملاحظات السابقة",
  feedbackSaveError: "فشل الحفظ",
  feedbackSaved: "تم حفظ الملاحظات.",
  feedbackNotYetSavableHint:
    "تُحفَظ الملاحظات على الخادم فقط بعد إرسال الموجز. أرسِلوا الموجز أولًا ثم يمكن حفظ ملاحظات الحقول هنا (أو فتح المحرّر بمعرّف موجز مُرسَل).",
  feedbackFields: {
    storyType: { label: "نوع القصة (قبل الموجز)", section: "قبل الموجز" },
    "1.1": { label: "فئة العمر المستهدفة", section: "القسم 1 — العمر ونطاق القصة" },
    "1.2": { label: "ذروة الشدة العاطفية", section: "القسم 1 — العمر ونطاق القصة" },
    "1.3": { label: "طول القصة", section: "القسم 1 — العمر ونطاق القصة" },
    "2.1": { label: "العاطفة الجماعية للفئة", section: "القسم 2 — الأساس السريري" },
    "2.2": { label: "الموقف المُحفِّز", section: "القسم 2 — الأساس السريري" },
    "2.3": { label: "النية العلاجية", section: "القسم 2 — الأساس السريري" },
    "2.4": { label: "الرؤية الإبداعية السريرية", section: "القسم 2 — الأساس السريري" },
    "2.5": { label: "تفصيل حقيقي واحد", section: "القسم 2 — الأساس السريري" },
    "3.1": { label: "النهج العلاجي الأساسي", section: "القسم 3 — البنية العلاجية" },
    "3.2": { label: "النهج الداعم", section: "القسم 3 — البنية العلاجية" },
    "3.3": { label: "بعد الخجل", section: "القسم 3 — البنية العلاجية" },
    "3.4": { label: "تعبير جسدي", section: "القسم 3 — البنية العلاجية" },
    "3.5": { label: "أداة التأقلم", section: "القسم 3 — البنية العلاجية" },
    "3.6": { label: "درجة اكتمال الحل", section: "القسم 3 — البنية العلاجية" },
    "3.7": { label: "قائمة «ممنوع أبدًا»", section: "القسم 3 — البنية العلاجية" },
    "4.0": { label: "قرار التخصيص", section: "القسم 4 — عالم القصة" },
    "4.1": { label: "جنس البطل", section: "القسم 4 — عالم القصة" },
    "4.2": { label: "نوع البطل", section: "القسم 4 — عالم القصة" },
    "4.3": { label: "عمر البطل بالنسبة للقارئ", section: "القسم 4 — عالم القصة" },
    "4.4": { label: "حضور المُعتني", section: "القسم 4 — عالم القصة" },
    "4.5": { label: "المسافة السردية (والتحدي الموازي إن وُجد)", section: "القسم 4 — عالم القصة" },
    "4.6": { label: "شخصيات ثانوية", section: "القسم 4 — عالم القصة" },
    "4.7": { label: "ملاحظات الشخصيات", section: "القسم 4 — عالم القصة" },
    "5.2": { label: "لماذا عدم التخصيص", section: "القسم 5 — إعدادات التخصيص" },
  },
  feedbackVerdicts: {
    good: {
      label: "جيد",
      description: "الحقل واضح وسريري للموجز.",
    },
    needs_modification: {
      label: "يحتاج تعديلًا",
      description: "يجب تغيير شيء هنا قبل جاهزية الموجز.",
    },
    unclear: {
      label: "غير واضح",
      description: "النية أو الصياغة تحتاج توضيحًا للمؤلف أو للاستخدام لاحقًا.",
    },
    remove_or_rethink: {
      label: "إزالة أو إعادة النظر",
      description: "المحتوى أو الاختيار لا يجب أن يبقى كما كُتب.",
    },
    keep_as_is: {
      label: "الإبقاء كما هو",
      description: "الإبقاء صراحةً دون تحرير جوهري.",
    },
  },
};
