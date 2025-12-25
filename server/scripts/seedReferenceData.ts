import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// ----------------------------------------------------------------------------
// Initialize Firebase Admin
// ----------------------------------------------------------------------------

const serviceAccountPath = path.resolve(
  __dirname,
  "../config/serviceAccountKey.json" // adjust if needed
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
// Reference Data
// ----------------------------------------------------------------------------

const referenceData = {
  topics: {
    fear_anxiety: {
      label_en: "Fear & Anxiety",
      label_ar: "الخوف والقلق",
      label_he: "פחד וחרדה",
      order: 1,
      active: true,
    },
    medical_experiences: {
      label_en: "Medical Experiences",
      label_ar: "التجارب الطبية",
      label_he: "חוויות רפואיות",
      order: 2,
      active: true,
    },
    social_challenges: {
      label_en: "Social Challenges",
      label_ar: "التحديات الاجتماعية",
      label_he: "אתגרים חברתיים",
      order: 3,
      active: true,
    },
    family_changes: {
      label_en: "Family Changes",
      label_ar: "تغيرات عائلية",
      label_he: "שינויים במשפחה",
      order: 4,
      active: true,
    },
  },

  situations: {
    fear_of_school: {
      topicKey: "fear_anxiety",
      label_en: "Fear of School",
      label_ar: "الخوف من المدرسة",
      label_he: "פחד מבית ספר",
      active: true,
    },
    separation_anxiety: {
      topicKey: "fear_anxiety",
      label_en: "Separation Anxiety",
      label_ar: "قلق الانفصال",
      label_he: "חרדת פרידה",
      active: true,
    },
    doctor_visit: {
      topicKey: "medical_experiences",
      label_en: "Doctor Visit",
      label_ar: "زيارة الطبيب",
      label_he: "ביקור אצל רופא",
      active: true,
    },
    new_sibling: {
      topicKey: "family_changes",
      label_en: "New Sibling",
      label_ar: "مولود جديد",
      label_he: "אח או אחות חדשים",
      active: true,
    },
  },

  emotionalGoals: {
    normalize_emotions: {
      label_en: "Normalize emotions",
      label_ar: "تطبيع المشاعر",
      label_he: "נרמול רגשות",
      active: true,
    },
    reduce_fear: {
      label_en: "Reduce fear",
      label_ar: "تقليل الخوف",
      label_he: "הפחתת פחד",
      active: true,
    },
    build_trust: {
      label_en: "Build trust",
      label_ar: "بناء الثقة",
      label_he: "בניית אמון",
      active: true,
    },
    self_confidence: {
      label_en: "Build self-confidence",
      label_ar: "تعزيز الثقة بالنفس",
      label_he: "חיזוק הביטחון העצמי",
      active: true,
    },
    emotional_regulation: {
      label_en: "Emotional regulation",
      label_ar: "تنظيم المشاعر",
      label_he: "ויסות רגשי",
      active: true,
    },
  },

  exclusions: {
    medical_imagery: {
      label_en: "Avoid medical imagery",
      label_ar: "تجنب الصور الطبية",
      label_he: "הימנעות מדימויים רפואיים",
      active: true,
    },
    authority_figures: {
      label_en: "Avoid authority figures",
      label_ar: "تجنب شخصيات السلطة",
      label_he: "הימנעות מדמויות סמכות",
      active: true,
    },
  },
};

// ----------------------------------------------------------------------------
// Seed Function
// ----------------------------------------------------------------------------

async function seedReferenceData() {
  console.log("🌱 Seeding referenceData...");

  for (const [collectionName, documents] of Object.entries(referenceData)) {
    const collectionRef = db
      .collection("referenceData")
      .doc(collectionName)
      .collection("items");

    for (const [docId, data] of Object.entries(documents)) {
      await collectionRef.doc(docId).set(data, { merge: true });
      console.log(`✅ ${collectionName}/${docId}`);
    }
  }

  console.log("🎉 referenceData seeding completed.");
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

seedReferenceData()
  .then(() => {
    console.log("🚀 Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
