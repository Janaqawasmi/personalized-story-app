import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// ----------------------------------------------------------------------------
// Initialize Firebase Admin
// ----------------------------------------------------------------------------

const serviceAccountPath = path.resolve(
  __dirname,
  "../config/serviceAccountKey.json"
);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

interface SeedResult {
  created: string[];
  skipped: string[];
}

/**
 * Seeds a batch of documents under referenceData/{collectionName}/items/{docId}.
 * Uses get() to check existence first, then set({ merge: true }) for new docs.
 * Existing documents are skipped to preserve manual edits.
 */
async function seedCollection(
  batch: admin.firestore.WriteBatch,
  collectionName: string,
  documents: Record<string, Record<string, unknown>>,
): Promise<SeedResult> {
  const result: SeedResult = { created: [], skipped: [] };
  const collectionRef = db
    .collection("referenceData")
    .doc(collectionName)
    .collection("items");

  const docIds = Object.keys(documents);
  const snapshots = await Promise.all(
    docIds.map((id) => collectionRef.doc(id).get()),
  );

  for (const [i, docId] of docIds.entries()) {
    const snap = snapshots[i];
    const data = documents[docId];

    // With `noUncheckedIndexedAccess`, array indexing and record lookups are typed as possibly undefined.
    // These guards keep the code safe and satisfy TypeScript.
    if (!snap) {
      throw new Error(
        `seedCollection(${collectionName}): missing snapshot for docId "${docId}" at index ${i}`,
      );
    }
    if (!data) {
      throw new Error(
        `seedCollection(${collectionName}): missing data for docId "${docId}"`,
      );
    }

    if (snap.exists) {
      result.skipped.push(docId);
      continue;
    }

    batch.set(collectionRef.doc(docId), data, { merge: true });
    result.created.push(docId);
  }

  return result;
}

interface MergeResult {
  updated: string[];
  skippedMissing: string[];
}

/**
 * Merges specific fields into EXISTING documents without overwriting other data.
 * Documents that don't exist are skipped (they'll be created by seedCollection).
 * Fields already present on the document are overwritten with the new value.
 */
async function mergeFieldsIntoExisting(
  batch: admin.firestore.WriteBatch,
  collectionName: string,
  fieldsPerDoc: Record<string, Record<string, unknown>>,
): Promise<MergeResult> {
  const result: MergeResult = { updated: [], skippedMissing: [] };
  const collectionRef = db
    .collection("referenceData")
    .doc(collectionName)
    .collection("items");

  const docIds = Object.keys(fieldsPerDoc);
  const snapshots = await Promise.all(
    docIds.map((id) => collectionRef.doc(id).get()),
  );

  for (const [i, docId] of docIds.entries()) {
    const snap = snapshots[i];
    const fields = fieldsPerDoc[docId];

    if (!snap) {
      throw new Error(
        `mergeFieldsIntoExisting(${collectionName}): missing snapshot for docId "${docId}" at index ${i}`,
      );
    }
    if (!fields) {
      throw new Error(
        `mergeFieldsIntoExisting(${collectionName}): missing fields for docId "${docId}"`,
      );
    }

    if (!snap.exists) {
      result.skippedMissing.push(docId);
      continue;
    }

    batch.set(collectionRef.doc(docId), fields, { merge: true });
    result.updated.push(docId);
  }

  return result;
}

function logMergeResult(collectionName: string, result: MergeResult): void {
  for (const id of result.updated) {
    console.log(`  🔀 [MERGED] ${collectionName}/items/${id}`);
  }
  for (const id of result.skippedMissing) {
    console.log(`  ⏩ [NOT FOUND] ${collectionName}/items/${id}`);
  }
}

function logResult(collectionName: string, result: SeedResult): void {
  for (const id of result.created) {
    console.log(`  ✅ [CREATED] ${collectionName}/items/${id}`);
  }
  for (const id of result.skipped) {
    console.log(`  ⏭️  [SKIPPED] ${collectionName}/items/${id} (already exists)`);
  }
}

// ----------------------------------------------------------------------------
// 1. Topics — keep existing, add new documents
// ----------------------------------------------------------------------------

const newTopics: Record<string, Record<string, unknown>> = {
  school_fears: {
    label_en: "School-related fears",
    label_ar: "مخاوف متعلقة بالمدرسة",
    label_he: "פחדים הקשורים לבית הספר",
    order: 1,
    active: true,
  },
  family_changes: {
    label_en: "Family changes & transitions",
    label_ar: "التغييرات والتحولات الأسرية",
    label_he: "שינויים ומעברים במשפחה",
    order: 2,
    active: false,
  },
  social_emotional: {
    label_en: "Social & emotional skills",
    label_ar: "المهارات الاجتماعية والعاطفية",
    label_he: "מיומנויות חברתיות ורגשיות",
    order: 3,
    active: false,
  },
  common_fears: {
    label_en: "Common fears & anxieties",
    label_ar: "المخاوف والقلق الشائعة",
    label_he: "פחדים וחרדות נפוצים",
    order: 4,
    active: false,
  },
};

// ----------------------------------------------------------------------------
// 2. General Situations (NEW collection)
// ----------------------------------------------------------------------------

const generalSituations: Record<string, Record<string, unknown>> = {
  separation: {
    topicKey: "school_fears",
    label_en: "Separation from caregiver",
    label_ar: "الانفصال عن مقدم الرعاية",
    label_he: "פרידה ממטפל",
    order: 1,
    active: true,
  },
  social_fears: {
    topicKey: "school_fears",
    label_en: "Social fears & peer anxiety",
    label_ar: "المخاوف الاجتماعية وقلق الأقران",
    label_he: "פחדים חברתיים וחרדת עמיתים",
    order: 2,
    active: true,
  },
  unfamiliar_environment: {
    topicKey: "school_fears",
    label_en: "Unfamiliar environment anxiety",
    label_ar: "قلق البيئة غير المألوفة",
    label_he: "חרדת סביבה לא מוכרת",
    order: 3,
    active: true,
  },
  performance: {
    topicKey: "school_fears",
    label_en: "Performance & competence fears",
    label_ar: "مخاوف الأداء والكفاءة",
    label_he: "פחדי ביצוע ויכולת",
    order: 4,
    active: true,
  },
  authority: {
    topicKey: "school_fears",
    label_en: "Fear of authority figures",
    label_ar: "الخوف من شخصيات السلطة",
    label_he: "פחד מדמויות סמכות",
    order: 5,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 3. Specific Situations (NEW collection)
// ----------------------------------------------------------------------------

const specificSituations: Record<string, Record<string, unknown>> = {
  // ── Separation ──
  afraid_parent_wont_return: {
    topicKey: "school_fears",
    generalSituationKey: "separation",
    label_en: "Afraid parent won't come back",
    label_ar: "خوف من عدم عودة الأهل",
    label_he: "פחד שההורה לא יחזור",
    description_en: "Child fears abandonment; believes parent may not return after drop-off",
    description_ar: "الطفل يخاف من الهجر ويعتقد أن الوالد قد لا يعود",
    suggestedAgeMin: 3,
    suggestedAgeMax: 5,
    order: 1,
    active: true,
  },
  crying_clinging_at_dropoff: {
    topicKey: "school_fears",
    generalSituationKey: "separation",
    label_en: "Crying or clinging at drop-off",
    label_ar: "البكاء أو التمسك عند الوداع",
    label_he: "בכי או היצמדות בפרידה",
    description_en: "Child shows acute distress at the physical moment of separation",
    description_ar: "الطفل يظهر ضيقًا شديدًا في لحظة الانفصال الجسدي",
    suggestedAgeMin: 3,
    suggestedAgeMax: 6,
    order: 2,
    active: true,
  },
  missing_home: {
    topicKey: "school_fears",
    generalSituationKey: "separation",
    label_en: "Missing home or familiar environment",
    label_ar: "الحنين للبيت أو البيئة المألوفة",
    label_he: "געגוע לבית או לסביבה המוכרת",
    description_en: "Child feels displacement and longs for the safety of home",
    description_ar: "الطفل يشعر بالاغتراب ويتوق لأمان البيت",
    suggestedAgeMin: 3,
    suggestedAgeMax: 5,
    order: 3,
    active: true,
  },
  worrying_about_parent_safety: {
    topicKey: "school_fears",
    generalSituationKey: "separation",
    label_en: "Worrying about caregiver's safety",
    label_ar: "القلق على سلامة مقدم الرعاية",
    label_he: "דאגה לשלום ההורה",
    description_en: "Child worries something bad will happen to parent while apart",
    description_ar: "الطفل يقلق من أن شيئًا سيئًا سيحدث للوالد أثناء الانفصال",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 4,
    active: true,
  },

  // ── Social Fears ──
  afraid_no_friends: {
    topicKey: "school_fears",
    generalSituationKey: "social_fears",
    label_en: "Afraid of not finding friends",
    label_ar: "الخوف من عدم إيجاد أصدقاء",
    label_he: "פחד לא למצוא חברים",
    description_en: "Child fears social isolation and not being accepted by peers",
    description_ar: "الطفل يخاف من العزلة الاجتماعية وعدم القبول من الأقران",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 1,
    active: true,
  },
  teased_or_rejected: {
    topicKey: "school_fears",
    generalSituationKey: "social_fears",
    label_en: "Afraid of being teased or rejected",
    label_ar: "الخوف من السخرية أو الرفض",
    label_he: "פחד מהתגרות או דחייה",
    description_en: "Child fears negative judgment or exclusion by other children",
    description_ar: "الطفل يخاف من الحكم السلبي أو الاستبعاد من قبل الأطفال الآخرين",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 2,
    active: true,
  },
  feeling_different: {
    topicKey: "school_fears",
    generalSituationKey: "social_fears",
    label_en: "Feeling different from other children",
    label_ar: "الشعور بالاختلاف عن الأطفال الآخرين",
    label_he: "תחושת שונות מילדים אחרים",
    description_en: "Child feels they do not fit in due to appearance, language, culture, or behavior",
    description_ar: "الطفل يشعر أنه لا ينتمي بسبب المظهر أو اللغة أو الثقافة أو السلوك",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 3,
    active: true,
  },
  too_shy_to_speak: {
    topicKey: "school_fears",
    generalSituationKey: "social_fears",
    label_en: "Shy or unable to speak up in group",
    label_ar: "الخجل أو عدم القدرة على التحدث في مجموعة",
    label_he: "ביישנות או חוסר יכולת לדבר בקבוצה",
    description_en: "Child withdraws in group settings, unable to express needs or join activities",
    description_ar: "الطفل ينسحب في البيئات الجماعية ولا يستطيع التعبير عن احتياجاته",
    suggestedAgeMin: 3,
    suggestedAgeMax: 6,
    order: 4,
    active: true,
  },

  // ── Unfamiliar Environment ──
  getting_lost_in_school: {
    topicKey: "school_fears",
    generalSituationKey: "unfamiliar_environment",
    label_en: "Afraid of getting lost in school",
    label_ar: "الخوف من الضياع في المدرسة",
    label_he: "פחד ללכת לאיבוד בבית הספר",
    description_en: "Child fears not knowing where to go, losing their way in the building",
    description_ar: "الطفل يخاف من عدم معرفة أين يذهب والضياع في المبنى",
    suggestedAgeMin: 3,
    suggestedAgeMax: 5,
    order: 1,
    active: true,
  },
  overwhelmed_by_noise: {
    topicKey: "school_fears",
    generalSituationKey: "unfamiliar_environment",
    label_en: "Overwhelmed by noise or crowds",
    label_ar: "الشعور بالإرهاق من الضوضاء أو الازدحام",
    label_he: "הצפה מרעש או קהל",
    description_en: "Child experiences sensory overwhelm in the busy school environment",
    description_ar: "الطفל يعاني من إرهاق حسي في بيئة المدرسة المزدحمة",
    suggestedAgeMin: 3,
    suggestedAgeMax: 6,
    order: 2,
    active: true,
  },
  afraid_of_bathroom: {
    topicKey: "school_fears",
    generalSituationKey: "unfamiliar_environment",
    label_en: "Afraid of using school bathroom alone",
    label_ar: "الخوف من استخدام حمام المدرسة وحده",
    label_he: "פחד להשתמש בשירותים בבית הספר לבד",
    description_en: "Child fears the unfamiliar or potentially scary bathroom environment",
    description_ar: "الطفل يخاف من بيئة الحمام غير المألوفة أو المخيفة",
    suggestedAgeMin: 3,
    suggestedAgeMax: 5,
    order: 3,
    active: true,
  },
  confused_by_routines: {
    topicKey: "school_fears",
    generalSituationKey: "unfamiliar_environment",
    label_en: "Confused or anxious about new routines",
    label_ar: "الارتباك أو القلق من الروتين الجديد",
    label_he: "בלבול או חרדה מהשגרה החדשה",
    description_en: "Child does not understand school schedule, rules, or expectations",
    description_ar: "الطفل لا يفهم جدول المدرسة أو القواعد أو التوقعات",
    suggestedAgeMin: 3,
    suggestedAgeMax: 5,
    order: 4,
    active: true,
  },

  // ── Performance ──
  not_understanding_teacher: {
    topicKey: "school_fears",
    generalSituationKey: "performance",
    label_en: "Afraid of not understanding the teacher",
    label_ar: "الخوف من عدم فهم المعلم",
    label_he: "פחד לא להבין את המורה",
    description_en: "Child fears being unable to follow instructions or comprehend what is taught",
    description_ar: "الطفل يخاف من عدم القدرة على اتباع التعليمات أو فهم ما يُدرّس",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 1,
    active: true,
  },
  mistakes_in_front_of_others: {
    topicKey: "school_fears",
    generalSituationKey: "performance",
    label_en: "Afraid of making mistakes in front of others",
    label_ar: "الخوف من الخطأ أمام الآخرين",
    label_he: "פחד לטעות מול אחרים",
    description_en: "Child fears public failure or embarrassment when trying new tasks",
    description_ar: "الطفل يخاف من الفشل العلني أو الإحراج عند تجربة مهام جديدة",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 2,
    active: true,
  },
  not_good_enough_vs_peers: {
    topicKey: "school_fears",
    generalSituationKey: "performance",
    label_en: "Feeling not good enough compared to peers",
    label_ar: "الشعور بعدم الكفاءة مقارنة بالأقران",
    label_he: "תחושת חוסר יכולת בהשוואה לעמיתים",
    description_en: "Child compares themselves unfavorably to classmates",
    description_ar: "الطفل يقارن نفسه بشكل سلبي مع زملائه",
    suggestedAgeMin: 5,
    suggestedAgeMax: 6,
    order: 3,
    active: true,
  },

  // ── Authority ──
  teacher_strict_angry: {
    topicKey: "school_fears",
    generalSituationKey: "authority",
    label_en: "Afraid of the teacher being strict or angry",
    label_ar: "الخوف من صرامة أو غضب المعلم",
    label_he: "פחד שהמורה יהיה קפדן או כועס",
    description_en: "Child fears being disciplined, yelled at, or treated harshly",
    description_ar: "الطفل يخاف من التأديب أو الصراخ أو المعاملة القاسية",
    suggestedAgeMin: 3,
    suggestedAgeMax: 6,
    order: 1,
    active: true,
  },
  being_punished_singled_out: {
    topicKey: "school_fears",
    generalSituationKey: "authority",
    label_en: "Afraid of being punished or singled out",
    label_ar: "الخوف من العقاب أو التمييز",
    label_he: "פחד מעונש או בידוד",
    description_en: "Child fears being publicly corrected or receiving consequences",
    description_ar: "الطفل يخاف من التصحيح العلني أو تلقي العواقب",
    suggestedAgeMin: 4,
    suggestedAgeMax: 6,
    order: 2,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 4. Content Exclusions (NEW collection alongside old "exclusions")
// ----------------------------------------------------------------------------

const contentExclusions: Record<string, Record<string, unknown>> = {
  violence: {
    label_en: "Violence",
    label_ar: "العنف",
    label_he: "אלימות",
    order: 1,
    active: true,
  },
  death: {
    label_en: "Death",
    label_ar: "الموت",
    label_he: "מוות",
    order: 2,
    active: true,
  },
  abandonment: {
    label_en: "Abandonment",
    label_ar: "الهجر",
    label_he: "נטישה",
    order: 3,
    active: true,
  },
  divorce: {
    label_en: "Divorce",
    label_ar: "الطلاق",
    label_he: "גירושין",
    order: 4,
    active: true,
  },
  illness: {
    label_en: "Illness",
    label_ar: "المرض",
    label_he: "מחלה",
    order: 5,
    active: true,
  },
  monsters: {
    label_en: "Monsters",
    label_ar: "الوحوش",
    label_he: "מפלצות",
    order: 6,
    active: true,
  },
  punishment: {
    label_en: "Punishment",
    label_ar: "العقاب",
    label_he: "עונש",
    order: 7,
    active: true,
  },
  explicit_fear_triggers: {
    label_en: "Explicit fear triggers",
    label_ar: "محفزات الخوف الصريحة",
    label_he: "טריגרים מפורשים לפחד",
    order: 8,
    active: true,
  },
  religious_content: {
    label_en: "Religious content",
    label_ar: "محتوى ديني",
    label_he: "תוכן דתי",
    order: 9,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 5. Therapeutic Mechanisms (NEW collection)
// ----------------------------------------------------------------------------

const therapeuticMechanisms: Record<string, Record<string, unknown>> = {
  normalization: {
    label_en: "Normalization",
    label_ar: "التطبيع",
    label_he: "נורמליזציה",
    description_en: "Helping the child see their experience as common and valid",
    order: 1,
    active: true,
    recommendedCopingTools: ["safe_person", "positive_self_talk", "asking_for_help"],
  },
  cognitive_reframing: {
    label_en: "Cognitive reframing",
    label_ar: "إعادة الصياغة المعرفية",
    label_he: "ריפריימינג קוגניטיבי",
    description_en: "Helping the child think about the situation differently",
    order: 2,
    active: true,
    recommendedCopingTools: ["positive_self_talk", "visualization", "routine_awareness"],
  },
  graduated_exposure: {
    label_en: "Graduated exposure",
    label_ar: "التعرض التدريجي",
    label_he: "חשיפה הדרגתית",
    description_en: "Gradually increasing comfort with the feared situation",
    order: 3,
    active: true,
    recommendedCopingTools: ["deep_breathing", "grounding_senses", "counting", "safe_person"],
  },
  modeling: {
    label_en: "Modeling",
    label_ar: "النمذجة",
    label_he: "מידול",
    description_en: "Character demonstrates how to handle the situation",
    order: 4,
    active: true,
    recommendedCopingTools: ["asking_for_help", "positive_self_talk", "safe_person"],
  },
  psychoeducation: {
    label_en: "Psychoeducation",
    label_ar: "التثقيف النفسي",
    label_he: "פסיכואדוקציה",
    description_en: "Teaching the child about their emotions and reactions",
    order: 5,
    active: true,
    recommendedCopingTools: ["routine_awareness", "visualization", "positive_self_talk"],
  },
  self_regulation: {
    label_en: "Self-regulation",
    label_ar: "التنظيم الذاتي",
    label_he: "ויסות עצמי",
    description_en: "Building skills to manage emotional responses",
    order: 6,
    active: true,
    recommendedCopingTools: ["deep_breathing", "counting", "grounding_senses", "visualization"],
  },
  reassurance_and_predictability: {
    label_en: "Reassurance & predictability",
    label_ar: "الطمأنة والقدرة على التنبؤ",
    label_he: "הרגעה וצפיות",
    description_en: "Creating sense of safety through predictable patterns",
    order: 7,
    active: true,
    recommendedCopingTools: ["safe_person", "transition_object", "routine_awareness"],
  },
};

// ----------------------------------------------------------------------------
// 6. Coping Tools (NEW collection)
// ----------------------------------------------------------------------------

const copingTools: Record<string, Record<string, unknown>> = {
  deep_breathing: {
    label_en: "Deep breathing",
    label_ar: "التنفس العميق",
    label_he: "נשימות עמוקות",
    group: "body_based",
    order: 1,
    active: true,
  },
  counting: {
    label_en: "Counting",
    label_ar: "العد",
    label_he: "ספירה",
    group: "body_based",
    order: 2,
    active: true,
  },
  safe_person: {
    label_en: "Safe person",
    label_ar: "الشخص الآمن",
    label_he: "אדם בטוח",
    group: "relational",
    order: 3,
    active: true,
  },
  transition_object: {
    label_en: "Transition object",
    label_ar: "الشيء الانتقالي",
    label_he: "אובייקט מעבר",
    group: "relational",
    order: 4,
    active: true,
  },
  positive_self_talk: {
    label_en: "Positive self-talk",
    label_ar: "الحديث الذاتي الإيجابي",
    label_he: "דיבור עצמי חיובי",
    group: "cognitive",
    order: 5,
    active: true,
  },
  asking_for_help: {
    label_en: "Asking for help",
    label_ar: "طلب المساعدة",
    label_he: "בקשת עזרה",
    group: "relational",
    order: 6,
    active: true,
  },
  routine_awareness: {
    label_en: "Routine awareness",
    label_ar: "الوعي بالروتين",
    label_he: "מודعות לשגרה",
    group: "cognitive",
    order: 7,
    active: true,
  },
  grounding_senses: {
    label_en: "Grounding through senses",
    label_ar: "التأריض من خلال الحواس",
    label_he: "עיגון דרך החושים",
    group: "body_based",
    order: 8,
    active: true,
  },
  visualization: {
    label_en: "Visualization",
    label_ar: "التخيל",
    label_he: "דמיון מודרך",
    group: "cognitive",
    order: 9,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 6b. Coping Tool Groups (NEW collection — group labels for UI)
// ----------------------------------------------------------------------------

const copingToolGroups: Record<string, Record<string, unknown>> = {
  body_based: {
    label_en: "Body-based techniques",
    label_ar: "تقنيات جسدية",
    label_he: "טכניקות גופניות",
    order: 1,
    active: true,
  },
  cognitive: {
    label_en: "Cognitive techniques",
    label_ar: "تقنيات معرفية",
    label_he: "טכניקות קוגניטיביות",
    order: 2,
    active: true,
  },
  relational: {
    label_en: "Relational techniques",
    label_ar: "تقنيات علائقية",
    label_he: "טכניקות יחסיות",
    order: 3,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 7. Emotional Arcs (NEW collection)
// ----------------------------------------------------------------------------

const emotionalArcs: Record<string, Record<string, unknown>> = {
  gentle_progression: {
    label_en: "Gentle progression",
    label_ar: "التقدم اللطيف",
    label_he: "התקדמות עדינה",
    description_en: "Calm start → gradual challenge → gentle resolution",
    order: 1,
    active: true,
  },
  acknowledge_then_resolve: {
    label_en: "Acknowledge then resolve",
    label_ar: "الاعتراف ثم الحل",
    label_he: "הכרה ואז פתרון",
    description_en: "Validates the difficulty first, then moves toward coping",
    order: 2,
    active: true,
  },
  discovery_journey: {
    label_en: "Discovery journey",
    label_ar: "رحلة الاكتشاف",
    label_he: "מסע גילוי",
    description_en: "Curiosity-led, protagonist discovers they can handle it",
    order: 3,
    active: true,
  },
  supported_transition: {
    label_en: "Supported transition",
    label_ar: "الانتقال المدعوم",
    label_he: "מעבר נתמך",
    description_en: "Protagonist receives help and gradually becomes more independent",
    order: 4,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 8. Enum-backed option sets (validateStoryBrief + specialist form)
//    Paths: referenceData/{category}/items/{docId} with active: true
// ----------------------------------------------------------------------------

const languageComplexities: Record<string, Record<string, unknown>> = {
  very_simple: {
    label_en: "Very simple",
    label_ar: "بسيط جداً",
    label_he: "פשוט מאוד",
    order: 1,
    active: true,
  },
  simple: {
    label_en: "Simple",
    label_ar: "بسيط",
    label_he: "פשוט",
    order: 2,
    active: true,
  },
  moderate: {
    label_en: "Moderate",
    label_ar: "متوسط",
    label_he: "בינוני",
    order: 3,
    active: true,
  },
};

const emotionalTones: Record<string, Record<string, unknown>> = {
  very_gentle: {
    label_en: "Very gentle",
    label_ar: "لطيف جداً",
    label_he: "עדין מאוד",
    order: 1,
    active: true,
  },
  calm: {
    label_en: "Calm",
    label_ar: "هادئ",
    label_he: "רגוע",
    order: 2,
    active: true,
  },
  encouraging: {
    label_en: "Encouraging",
    label_ar: "مشجع",
    label_he: "מעודד",
    order: 3,
    active: true,
  },
};

const topicSensitivities: Record<string, Record<string, unknown>> = {
  low: {
    label_en: "Low",
    label_ar: "منخفض",
    label_he: "נמוך",
    order: 1,
    active: true,
  },
  medium: {
    label_en: "Medium",
    label_ar: "متوسط",
    label_he: "בינוני",
    order: 2,
    active: true,
  },
  high: {
    label_en: "High",
    label_ar: "عالٍ",
    label_he: "גבוה",
    order: 3,
    active: true,
  },
};

const endingStyles: Record<string, Record<string, unknown>> = {
  calm_resolution: {
    label_en: "Calm resolution",
    label_ar: "حل هادئ",
    label_he: "פתרון רגוע",
    order: 1,
    active: true,
  },
  open_ended: {
    label_en: "Open-ended",
    label_ar: "نهاية مفتوحة",
    label_he: "סוף פתוח",
    order: 2,
    active: true,
  },
  empowering: {
    label_en: "Empowering",
    label_ar: "تمكيني",
    label_he: "מעצים",
    order: 3,
    active: true,
  },
};

const peakIntensities: Record<string, Record<string, unknown>> = {
  minimal: {
    label_en: "Minimal",
    label_ar: "حد أدنى",
    label_he: "מינימלי",
    order: 1,
    active: true,
  },
  mild: {
    label_en: "Mild",
    label_ar: "خفيف",
    label_he: "קל",
    order: 2,
    active: true,
  },
  moderate: {
    label_en: "Moderate",
    label_ar: "متوسط",
    label_he: "בינוני",
    order: 3,
    active: true,
  },
};

const protagonistTypes: Record<string, Record<string, unknown>> = {
  child_character: {
    label_en: "Child character",
    label_ar: "شخصية طفل",
    label_he: "דמות ילד",
    order: 1,
    active: true,
  },
  animal_character: {
    label_en: "Animal character",
    label_ar: "شخصية حيوان",
    label_he: "דמות חיה",
    order: 2,
    active: true,
  },
  fantasy_character: {
    label_en: "Fantasy character",
    label_ar: "شخصية خيالية",
    label_he: "דמות פנטזיה",
    order: 3,
    active: true,
  },
};

const protagonistAgeRelations: Record<string, Record<string, unknown>> = {
  same_age: {
    label_en: "Same age as listener",
    label_ar: "نفس عمر المستمع",
    label_he: "בגיל המאזין",
    order: 1,
    active: true,
  },
  slightly_older: {
    label_en: "Slightly older",
    label_ar: "أكبر قليلاً",
    label_he: "מעט מבוגר יותר",
    order: 2,
    active: true,
  },
  unspecified: {
    label_en: "Unspecified",
    label_ar: "غير محدد",
    label_he: "לא מוגדר",
    order: 3,
    active: true,
  },
};

const protagonistGenders: Record<string, Record<string, unknown>> = {
  male: {
    label_en: "Male",
    label_ar: "ذكر",
    label_he: "זכר",
    order: 1,
    active: true,
  },
  female: {
    label_en: "Female",
    label_ar: "أنثى",
    label_he: "נקבה",
    order: 2,
    active: true,
  },
  neutral: {
    label_en: "Neutral",
    label_ar: "محايد",
    label_he: "נייטרלי",
    order: 3,
    active: true,
  },
};

const caregiverRoles: Record<string, Record<string, unknown>> = {
  comfort_presence: {
    label_en: "Comfort presence",
    label_ar: "وجود مريح",
    label_he: "נוכחות מרגיעה",
    order: 1,
    active: true,
  },
  active_guide: {
    label_en: "Active guide",
    label_ar: "دليل نشط",
    label_he: "מדריך פעיל",
    order: 2,
    active: true,
  },
  mentioned_not_present: {
    label_en: "Mentioned, not present",
    label_ar: "مذكور، غير حاضر",
    label_he: "מוזכר, לא נוכח",
    order: 3,
    active: true,
  },
  absent: {
    label_en: "Absent",
    label_ar: "غائب",
    label_he: "נעדר",
    order: 4,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// 9. Emotional Goals — add missing items to existing collection
// ----------------------------------------------------------------------------

const newEmotionalGoals: Record<string, Record<string, unknown>> = {
  reduce_fear: {
    label_en: "Reduce fear",
    label_ar: "تقليل الخوف",
    label_he: "הפחתת פחד",
    order: 1,
    active: true,
  },
  build_confidence: {
    label_en: "Build confidence",
    label_ar: "بناء الثقة",
    label_he: "בניית ביטחון",
    order: 2,
    active: true,
  },
  normalize_emotion: {
    label_en: "Normalize the emotion",
    label_ar: "تطبيع المشاعر",
    label_he: "נורמליזציה של הרגש",
    order: 3,
    active: true,
  },
  develop_coping: {
    label_en: "Develop coping skills",
    label_ar: "تطوير مهارات التأقلم",
    label_he: "פיתוח מיומנויות התמודדות",
    order: 4,
    active: true,
  },
  increase_understanding: {
    label_en: "Increase understanding",
    label_ar: "زيادة الفهم",
    label_he: "הגברת הבנה",
    order: 5,
    active: true,
  },
  strengthen_self_worth: {
    label_en: "Strengthen self-worth",
    label_ar: "تعزيز تقدير الذات",
    label_he: "חיזוק ערך עצמי",
    order: 6,
    active: true,
  },
  build_trust: {
    label_en: "Build trust",
    label_ar: "بناء الثقة",
    label_he: "בניית אמון",
    order: 7,
    active: true,
  },
};

// ----------------------------------------------------------------------------
// Main Seed Function
// ----------------------------------------------------------------------------

async function seedReferenceDataV2() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DAMMAH Reference Data v2.0 — Seed Script");
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  const totalCreated: string[] = [];
  const totalSkipped: string[] = [];

  // Firestore batches are limited to 500 operations.
  // All writes fit in a single batch.
  const batch = db.batch();

  // ── 1. Topics ──
  console.log("📂 [1/8] topics (add new docs, skip existing)");
  const topicResult = await seedCollection(batch, "topics", newTopics);
  logResult("topics", topicResult);
  totalCreated.push(...topicResult.created.map((id) => `topics/${id}`));
  totalSkipped.push(...topicResult.skipped.map((id) => `topics/${id}`));
  console.log();

  // ── 2. General Situations (new collection) ──
  console.log("📂 [2/8] generalSituations (new collection)");
  const gSitResult = await seedCollection(batch, "generalSituations", generalSituations);
  logResult("generalSituations", gSitResult);
  totalCreated.push(...gSitResult.created.map((id) => `generalSituations/${id}`));
  totalSkipped.push(...gSitResult.skipped.map((id) => `generalSituations/${id}`));
  console.log();

  // ── 3. Specific Situations (new collection) ──
  console.log("📂 [3/8] specificSituations (new collection)");
  const sSitResult = await seedCollection(batch, "specificSituations", specificSituations);
  logResult("specificSituations", sSitResult);
  totalCreated.push(...sSitResult.created.map((id) => `specificSituations/${id}`));
  totalSkipped.push(...sSitResult.skipped.map((id) => `specificSituations/${id}`));
  console.log();

  // ── 4. Content Exclusions (new collection, old "exclusions" kept) ──
  console.log("📂 [4/8] contentExclusions (new collection; old 'exclusions' untouched)");
  const ceResult = await seedCollection(batch, "contentExclusions", contentExclusions);
  logResult("contentExclusions", ceResult);
  totalCreated.push(...ceResult.created.map((id) => `contentExclusions/${id}`));
  totalSkipped.push(...ceResult.skipped.map((id) => `contentExclusions/${id}`));
  console.log();

  // ── 5. Therapeutic Mechanisms (new collection) ──
  console.log("📂 [5/8] therapeuticMechanisms (new collection)");
  const tmResult = await seedCollection(batch, "therapeuticMechanisms", therapeuticMechanisms);
  logResult("therapeuticMechanisms", tmResult);
  totalCreated.push(...tmResult.created.map((id) => `therapeuticMechanisms/${id}`));
  totalSkipped.push(...tmResult.skipped.map((id) => `therapeuticMechanisms/${id}`));
  console.log();

  // ── 6. Coping Tools (new collection) ──
  console.log("📂 [6/8] copingTools (new collection)");
  const ctResult = await seedCollection(batch, "copingTools", copingTools);
  logResult("copingTools", ctResult);
  totalCreated.push(...ctResult.created.map((id) => `copingTools/${id}`));
  totalSkipped.push(...ctResult.skipped.map((id) => `copingTools/${id}`));
  console.log();

  // ── 6b. Coping Tool Groups (new collection — group labels for UI) ──
  console.log("📂 copingToolGroups (new collection)");
  const ctgResult = await seedCollection(batch, "copingToolGroups", copingToolGroups);
  logResult("copingToolGroups", ctgResult);
  totalCreated.push(...ctgResult.created.map((id) => `copingToolGroups/${id}`));
  totalSkipped.push(...ctgResult.skipped.map((id) => `copingToolGroups/${id}`));
  console.log();

  // ── 6c. Merge "group" field into existing coping tool docs ──
  console.log("🔀 Merging 'group' field into existing copingTools documents...");
  const copingToolGroupFields: Record<string, Record<string, unknown>> = {};
  for (const [toolId, toolData] of Object.entries(copingTools)) {
    if (toolData["group"]) {
      copingToolGroupFields[toolId] = { group: toolData["group"] };
    }
  }
  const ctMerge = await mergeFieldsIntoExisting(batch, "copingTools", copingToolGroupFields);
  logMergeResult("copingTools", ctMerge);
  console.log();

  // ── 6d. Merge "recommendedCopingTools" into existing mechanism docs ──
  console.log("🔀 Merging 'recommendedCopingTools' into existing therapeuticMechanisms documents...");
  const mechanismRecommendFields: Record<string, Record<string, unknown>> = {};
  for (const [mechId, mechData] of Object.entries(therapeuticMechanisms)) {
    if (mechData["recommendedCopingTools"]) {
      mechanismRecommendFields[mechId] = { recommendedCopingTools: mechData["recommendedCopingTools"] };
    }
  }
  const tmMerge = await mergeFieldsIntoExisting(batch, "therapeuticMechanisms", mechanismRecommendFields);
  logMergeResult("therapeuticMechanisms", tmMerge);
  console.log();

  // ── 6e. Enum option sets (validateStoryBrief checks these paths) ──
  const enumSeeds: { name: string; docs: Record<string, Record<string, unknown>> }[] = [
    { name: "languageComplexities", docs: languageComplexities },
    { name: "emotionalTones", docs: emotionalTones },
    { name: "topicSensitivities", docs: topicSensitivities },
    { name: "endingStyles", docs: endingStyles },
    { name: "peakIntensities", docs: peakIntensities },
    { name: "protagonistTypes", docs: protagonistTypes },
    { name: "protagonistAgeRelations", docs: protagonistAgeRelations },
    { name: "protagonistGenders", docs: protagonistGenders },
    { name: "caregiverRoles", docs: caregiverRoles },
  ];
  for (const { name, docs } of enumSeeds) {
    console.log(`📂 ${name} (enum options)`);
    const r = await seedCollection(batch, name, docs);
    logResult(name, r);
    totalCreated.push(...r.created.map((id) => `${name}/${id}`));
    totalSkipped.push(...r.skipped.map((id) => `${name}/${id}`));
    console.log();
  }

  // ── 7. Emotional Arcs (new collection) ──
  console.log("📂 [7/8] emotionalArcs (new collection)");
  const eaResult = await seedCollection(batch, "emotionalArcs", emotionalArcs);
  logResult("emotionalArcs", eaResult);
  totalCreated.push(...eaResult.created.map((id) => `emotionalArcs/${id}`));
  totalSkipped.push(...eaResult.skipped.map((id) => `emotionalArcs/${id}`));
  console.log();

  // ── 8. Emotional Goals (add missing to existing collection) ──
  console.log("📂 [8/8] emotionalGoals (add missing docs, skip existing)");
  const egResult = await seedCollection(batch, "emotionalGoals", newEmotionalGoals);
  logResult("emotionalGoals", egResult);
  totalCreated.push(...egResult.created.map((id) => `emotionalGoals/${id}`));
  totalSkipped.push(...egResult.skipped.map((id) => `emotionalGoals/${id}`));
  console.log();

  // ── Metadata document ──
  console.log("📂 Writing referenceData/metadata...");
  const metadataRef = db.collection("referenceData").doc("metadata");
  batch.set(
    metadataRef,
    {
      schemaVersion: "2.0",
      lastSeeded: admin.firestore.FieldValue.serverTimestamp(),
      collections: [
        "topics",
        "generalSituations",
        "specificSituations",
        "emotionalGoals",
        "contentExclusions",
        "therapeuticMechanisms",
        "copingTools",
        "copingToolGroups",
        "languageComplexities",
        "emotionalTones",
        "topicSensitivities",
        "endingStyles",
        "peakIntensities",
        "protagonistTypes",
        "protagonistAgeRelations",
        "protagonistGenders",
        "caregiverRoles",
        "emotionalArcs",
      ],
    },
    { merge: true },
  );
  console.log("  ✅ referenceData/metadata → schemaVersion: 2.0");
  console.log();

  // ── Commit ──
  console.log("💾 Committing batch write...");
  await batch.commit();
  console.log("💾 Batch committed successfully.");
  console.log();

  // ── Summary ──
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Created: ${totalCreated.length} documents`);
  console.log(`  Skipped: ${totalSkipped.length} documents (already existed)`);
  console.log(`  Total:   ${totalCreated.length + totalSkipped.length} documents processed`);
  console.log("═══════════════════════════════════════════════════════════");

  if (totalCreated.length > 0) {
    console.log();
    console.log("  Created documents:");
    for (const path of totalCreated) {
      console.log(`    + referenceData/${path}`);
    }
  }

  if (totalSkipped.length > 0) {
    console.log();
    console.log("  Skipped documents:");
    for (const path of totalSkipped) {
      console.log(`    ~ referenceData/${path}`);
    }
  }

  console.log();
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

seedReferenceDataV2()
  .then(() => {
    console.log("🎉 Reference Data v2.0 seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
