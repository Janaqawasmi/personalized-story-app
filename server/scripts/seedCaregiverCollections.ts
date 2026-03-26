/**
 * Seed script: Creates all caregiver-side collections and subcollections
 * in Firestore with sample documents so the structure is visible
 * in the Firebase Console.
 *
 * Run with: npx ts-node scripts/seedCaregiverCollections.ts
 */

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
const Timestamp = admin.firestore.Timestamp;

// ----------------------------------------------------------------------------
// Sample IDs (consistent so re-running is idempotent)
// ----------------------------------------------------------------------------

const SAMPLE_CAREGIVER_UID = "sample-caregiver-001";
const SAMPLE_TEMPLATE_ID = "sample-template-001";
const SAMPLE_TEMPLATE_ID_2 = "sample-template-002";
const SAMPLE_PREVIEW_ID_1 = "sample-preview-001";
const SAMPLE_PREVIEW_ID_2 = "sample-preview-002";
const SAMPLE_PREVIEW_ID_3 = "sample-preview-003";
const SAMPLE_PREVIEW_ID_4 = "sample-preview-004";
const SAMPLE_PREVIEW_ID_5 = "sample-preview-005";
const SAMPLE_CART_ITEM_ID = "sample-cart-001";
const SAMPLE_PURCHASE_ID = "sample-purchase-001";
const SAMPLE_PURCHASE_ID_2 = "sample-purchase-002";
const SAMPLE_STORY_ID = "sample-story-001";
const SAMPLE_STORY_ID_2 = "sample-story-002";

async function seed() {
  console.log("🌱 Seeding caregiver-side collections...\n");

  // ──────────────────────────────────────────────────────────────────
  // 1. CAREGIVERS collection
  // ──────────────────────────────────────────────────────────────────
  console.log("1️⃣  Creating caregivers collection...");
  await db.collection("caregivers").doc(SAMPLE_CAREGIVER_UID).set({
    uid: SAMPLE_CAREGIVER_UID,
    email: "sample-caregiver@example.com",
    displayName: "سارة أحمد",
    language: "ar",
    paymentCustomerId: null,
    consentTimestamp: new Date().toISOString(),
    consentVersion: "1.0",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    purchaseCount: 1,
  });
  console.log("   ✅ caregivers/{uid} created");

  // ──────────────────────────────────────────────────────────────────
  // 2. STORY_TEMPLATES collection (with new public library fields)
  // ──────────────────────────────────────────────────────────────────
  console.log("2️⃣  Creating story_templates with public library fields...");

  await db.collection("story_templates").doc(SAMPLE_TEMPLATE_ID).set({
    // Existing specialist-side fields
    draftId: "draft-001",
    briefId: "brief-001",
    title: "الدب الشجاع",
    status: "approved",
    primaryTopic: "overcoming_fear",
    specificSituation: "fear_of_the_dark",
    ageGroup: "3_6",
    generationConfig: {
      language: "ar",
      targetAgeGroup: "3-6",
      length: "short",
      tone: "warm",
      emphasis: "emotional_regulation",
    },
    approvedBy: "specialist-001",
    approvedAt: new Date().toISOString(),
    revisionCount: 2,
    isActive: true,
    pages: [
      {
        pageNumber: 1,
        textTemplate: {
          masculine: "كان {{CHILD_NAME}} يمشي في الغابة. {{PRONOUN_SUBJECT}} شعر بالخوف.",
          feminine: "كانت {{CHILD_NAME}} تمشي في الغابة. {{PRONOUN_SUBJECT}} شعرت بالخوف.",
        },
        imagePromptTemplate:
          "A warm illustration of {{CHARACTER_DESCRIPTION}} walking through a friendly forest at dusk, soft lighting, children's book style",
        emotionalTone: "gentle_anticipation",
      },
      {
        pageNumber: 2,
        textTemplate: {
          masculine: "وجد {{CHILD_NAME}} دبًا صغيرًا. قال {{PRONOUN_SUBJECT}} له: 'أنا صديقك'.",
          feminine: "وجدت {{CHILD_NAME}} دبًا صغيرًا. قالت {{PRONOUN_SUBJECT}} له: 'أنا صديقتك'.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} meeting a cute small bear in a forest clearing, warm and friendly atmosphere, children's book illustration",
        emotionalTone: "warm_connection",
      },
      {
        pageNumber: 3,
        textTemplate: {
          masculine: "مشى {{CHILD_NAME}} والدب معًا. لم يعد {{PRONOUN_SUBJECT}} خائفًا.",
          feminine: "مشت {{CHILD_NAME}} والدب معًا. لم تعد {{PRONOUN_SUBJECT}} خائفة.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} walking hand-in-hand with a friendly bear through a starlit forest, peaceful and brave, children's book style",
        emotionalTone: "confident_resolution",
      },
      {
        pageNumber: 4,
        textTemplate: {
          masculine: "عاد {{CHILD_NAME}} إلى البيت و{{PRONOUN_SUBJECT}} يبتسم. لقد تغلب على {{PRONOUN_POSSESSIVE}} خوف.",
          feminine: "عادت {{CHILD_NAME}} إلى البيت و{{PRONOUN_SUBJECT}} تبتسم. لقد تغلبت على {{PRONOUN_POSSESSIVE}} خوف.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} arriving home safely, smiling with confidence, warm house in background, children's book illustration",
        emotionalTone: "joyful_triumph",
      },
    ],

    // NEW public library fields
    slug: "the-brave-bear",
    shortDescription: {
      ar: "قصة عن طفل يتغلب على الخوف من الظلام بمساعدة صديق جديد",
      he: "סיפור על ילד שמתגבר על פחד מהחושך בעזרת חבר חדש",
    },
    // NOTE: In production these should be Firebase Storage download URLs (not base64, not stored in Firestore).
    // Suggested storage paths:
    // - story-templates/{storyId}/cover.jpg
    // - story-templates/{storyId}/preview/spread1.jpg
    // - story-templates/{storyId}/preview/spread2.jpg
    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",
    // New field used by the Story Detail Page (preferred over coverImageUrl).
    coverImage: "https://placeholder.com/bear-story-cover.jpg",
    // New: EXACTLY 2 preview spreads (image + matching text)
    previewSpreads: [
      {
        imageUrl: "https://placeholder.com/bear-story-spread1.jpg",
        text: "كان {{CHILD_NAME}} يمشي في الغابة. {{PRONOUN_SUBJECT}} شعر بالخوف.",
      },
      {
        imageUrl: "https://placeholder.com/bear-story-spread2.jpg",
        text: "وجد {{CHILD_NAME}} دبًا صغيرًا. قال {{PRONOUN_SUBJECT}} له: 'أنا صديقك'.",
      },
    ],
    displayTopic: {
      ar: "التغلب على الخوف",
      he: "התגברות על פחד",
    },
    isPublished: true,
    publishedAt: Timestamp.now(),
    purchaseCount: 12,
    pricing: {
      digital: 19.99,
      print: 29.99,
    },
    currency: "USD",
    previewPageCount: 2,
    totalPageCount: 4,
  });

  // Second template in Hebrew
  await db.collection("story_templates").doc(SAMPLE_TEMPLATE_ID_2).set({
    draftId: "draft-002",
    briefId: "brief-002",
    title: "הכוכב הקטן",
    status: "approved",
    primaryTopic: "self_confidence",
    specificSituation: "starting_kindergarten",
    ageGroup: "3_6",
    generationConfig: {
      language: "he",
      targetAgeGroup: "3-6",
      length: "short",
      tone: "encouraging",
      emphasis: "self_esteem",
    },
    approvedBy: "specialist-001",
    approvedAt: new Date().toISOString(),
    revisionCount: 1,
    isActive: true,
    pages: [
      {
        pageNumber: 1,
        textTemplate: {
          masculine: "{{CHILD_NAME}} הסתכל על השמיים. {{PRONOUN_SUBJECT}} ראה כוכב קטן.",
          feminine: "{{CHILD_NAME}} הסתכלה על השמיים. {{PRONOUN_SUBJECT}} ראתה כוכב קטן.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} looking up at a starry night sky, one star shining brightly, dreamy children's book style",
        emotionalTone: "wonder",
      },
      {
        pageNumber: 2,
        textTemplate: {
          masculine: "הכוכב אמר ל{{CHILD_NAME}}: 'אתה מיוחד, בדיוק כמוני'. {{PRONOUN_SUBJECT}} חייך.",
          feminine: "הכוכב אמר ל{{CHILD_NAME}}: 'את מיוחדת, בדיוק כמוני'. {{PRONOUN_SUBJECT}} חייכה.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} talking to a glowing friendly star, magical atmosphere, children's book illustration",
        emotionalTone: "warm_encouragement",
      },
      {
        pageNumber: 3,
        textTemplate: {
          masculine: "{{CHILD_NAME}} הרגיש אמיץ. {{PRONOUN_SUBJECT}} ידע שהכוכב תמיד איתו.",
          feminine: "{{CHILD_NAME}} הרגישה אמיצה. {{PRONOUN_SUBJECT}} ידעה שהכוכב תמיד איתה.",
        },
        imagePromptTemplate:
          "{{CHARACTER_DESCRIPTION}} standing tall and confident with a small star glowing in their pocket, warm morning light, children's book style",
        emotionalTone: "confident_resolution",
      },
    ],

    slug: "the-little-star",
    shortDescription: {
      he: "סיפור על ילד שמגלה שהוא מיוחד בדיוק כמו שהוא",
      ar: "قصة عن طفل يكتشف أنه مميز كما هو",
    },
    coverImageUrl: "https://placeholder.com/star-story-cover.jpg",
    coverImage: "https://placeholder.com/star-story-cover.jpg",
    previewSpreads: [
      {
        imageUrl: "https://placeholder.com/star-story-spread1.jpg",
        text: "{{CHILD_NAME}} הסתכל על השמיים. {{PRONOUN_SUBJECT}} ראה כוכב קטן.",
      },
      {
        imageUrl: "https://placeholder.com/star-story-spread2.jpg",
        text: "הכוכב אמר ל{{CHILD_NAME}}: 'אתה מיוחד, בדיוק כמוני'. {{PRONOUN_SUBJECT}} חייך.",
      },
    ],
    displayTopic: {
      he: "ביטחון עצמי",
      ar: "الثقة بالنفس",
    },
    isPublished: true,
    publishedAt: Timestamp.now(),
    purchaseCount: 8,
    pricing: {
      digital: 19.99,
      print: 29.99,
    },
    currency: "USD",
    previewPageCount: 2,
    totalPageCount: 3,
  });
  console.log("   ✅ story_templates created (2 templates: Arabic + Hebrew)");

  // ──────────────────────────────────────────────────────────────────
  // 3. STORY PREVIEWS collection
  // ──────────────────────────────────────────────────────────────────
  console.log("3️⃣  Creating storyPreviews collection...");

  const now = Date.now();

  // 1) sample-preview-001 (ready, completed, female, 2 pages)
  await db.collection("storyPreviews").doc(SAMPLE_PREVIEW_ID_1).set({
    previewId: SAMPLE_PREVIEW_ID_1,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    templateId: SAMPLE_TEMPLATE_ID,
    templateTitle: "الدب الشجاع",
    templateVersion: 2,
    language: "ar",
    previewPageCount: 2,

    childFirstName: "ليان",
    childGender: "female",
    childAgeGroup: "3_6",

    photoPath: `child-photos/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_1}/1700000000.jpg`,
    photoStatus: "preview_used",
    photoUploadedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    photoRetainUntil: new Date(now + 46 * 60 * 60 * 1000).toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "كانت ليان تمشي في الغابة. هي شعرت بالخوف.",
        imagePromptUsed:
          "A warm illustration of a young girl named ليان walking through a friendly forest at dusk, soft lighting, children's book style",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_1}/page-1.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(now).toISOString(),
          latencyMs: 3200,
        },
      },
      {
        pageNumber: 2,
        personalizedText: "وجدت ليان دبًا صغيرًا. قالت هي له: 'أنا صديقتك'.",
        imagePromptUsed:
          "a young girl named ليان meeting a cute small bear in a forest clearing, warm and friendly atmosphere, children's book illustration",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_1}/page-2.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(now).toISOString(),
          latencyMs: 2800,
        },
      },
    ],
    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",

    generationStatus: "completed",
    pagesCompleted: 2,
    generationStartedAt: new Date(now - 60 * 1000).toISOString(),
    generationCompletedAt: new Date(now).toISOString(),
    failureReason: null,

    status: "ready",
    expiresAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    purchaseId: null,
    personalizedStoryId: null,

    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // 2) sample-preview-002 (generating, in_progress, male, pagesCompleted 1, 1 page so far)
  await db.collection("storyPreviews").doc(SAMPLE_PREVIEW_ID_2).set({
    previewId: SAMPLE_PREVIEW_ID_2,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    templateId: SAMPLE_TEMPLATE_ID,
    templateTitle: "الدب الشجاع",
    templateVersion: 2,
    language: "ar",
    previewPageCount: 2,

    childFirstName: "آدم",
    childGender: "male",
    childAgeGroup: "6_9",

    photoPath: `child-photos/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_2}/1700000001.jpg`,
    photoStatus: "processing",
    photoUploadedAt: new Date(now - 20 * 60 * 1000).toISOString(),
    photoRetainUntil: new Date(now + 48 * 60 * 60 * 1000).toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "كان آدم يمشي في الغابة. هو شعر بالخوف.",
        imagePromptUsed:
          "A warm illustration of a young boy named آدم walking through a friendly forest at dusk, soft lighting, children's book style",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_2}/page-1.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(now - 5 * 60 * 1000).toISOString(),
          latencyMs: 3500,
        },
      },
    ],
    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",

    generationStatus: "in_progress",
    pagesCompleted: 1,
    generationStartedAt: new Date(now - 25 * 60 * 1000).toISOString(),
    generationCompletedAt: null,
    failureReason: null,

    status: "generating",
    expiresAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    purchaseId: null,
    personalizedStoryId: null,

    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // 3) sample-preview-003 (ready, completed, different templateId, different child + age, 2 pages)
  await db.collection("storyPreviews").doc(SAMPLE_PREVIEW_ID_3).set({
    previewId: SAMPLE_PREVIEW_ID_3,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    templateId: SAMPLE_TEMPLATE_ID_2,
    templateTitle: "הכוכב הקטן",
    templateVersion: 1,
    language: "he",
    previewPageCount: 2,

    childFirstName: "נועה",
    childGender: "female",
    childAgeGroup: "0_3",

    photoPath: `child-photos/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_3}/1700000002.jpg`,
    photoStatus: "preview_used",
    photoUploadedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    photoRetainUntil: new Date(now + 45 * 60 * 60 * 1000).toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "נועה הסתכלה על השמיים. היא ראתה כוכב קטן.",
        imagePromptUsed:
          "A dreamy children's book illustration of a young girl named נועה looking up at a starry night sky, one star shining brightly",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_3}/page-1.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(now).toISOString(),
          latencyMs: 3000,
        },
      },
      {
        pageNumber: 2,
        personalizedText: "הכוכב אמר לנועה: 'את מיוחדת, בדיוק כמוני'. היא חייכה.",
        imagePromptUsed:
          "A magical children's book illustration of a friendly glowing star talking to a young girl named נועה, warm encouraging atmosphere",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_3}/page-2.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(now).toISOString(),
          latencyMs: 2900,
        },
      },
    ],
    coverImageUrl: "https://placeholder.com/star-story-cover.jpg",

    generationStatus: "completed",
    pagesCompleted: 2,
    generationStartedAt: new Date(now - 90 * 1000).toISOString(),
    generationCompletedAt: new Date(now - 30 * 1000).toISOString(),
    failureReason: null,

    status: "ready",
    expiresAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    purchaseId: null,
    personalizedStoryId: null,

    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // 4) sample-preview-004 (expired, completed, photoStatus deleted, old timestamps)
  const oldNow = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago
  await db.collection("storyPreviews").doc(SAMPLE_PREVIEW_ID_4).set({
    previewId: SAMPLE_PREVIEW_ID_4,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    templateId: SAMPLE_TEMPLATE_ID,
    templateTitle: "الدب الشجاع",
    templateVersion: 2,
    language: "ar",
    previewPageCount: 2,

    childFirstName: "سلمى",
    childGender: "female",
    childAgeGroup: "9_12",

    photoPath: null,
    photoStatus: "deleted",
    photoUploadedAt: new Date(oldNow - 2 * 60 * 60 * 1000).toISOString(),
    photoRetainUntil: new Date(oldNow + 48 * 60 * 60 * 1000).toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "كانت سلمى تمشي في الغابة. هي شعرت بالخوف.",
        imagePromptUsed:
          "A warm illustration of a young girl named سلمى walking through a friendly forest at dusk, soft lighting, children's book style",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_4}/page-1.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(oldNow).toISOString(),
          latencyMs: 3100,
        },
      },
      {
        pageNumber: 2,
        personalizedText: "وجدت سلمى دبًا صغيرًا. قالت هي له: 'أنا صديقتك'.",
        imagePromptUsed:
          "a young girl named سلمى meeting a cute small bear in a forest clearing, warm and friendly atmosphere, children's book illustration",
        generatedImagePath: `preview-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_4}/page-2.webp`,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date(oldNow).toISOString(),
          latencyMs: 2700,
        },
      },
    ],
    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",

    generationStatus: "completed",
    pagesCompleted: 2,
    generationStartedAt: new Date(oldNow - 3 * 60 * 1000).toISOString(),
    generationCompletedAt: new Date(oldNow).toISOString(),
    failureReason: null,

    status: "expired",
    expiresAt: new Date(oldNow + 48 * 60 * 60 * 1000).toISOString(),
    purchaseId: null,
    personalizedStoryId: null,

    createdAt: Timestamp.fromMillis(oldNow),
    updatedAt: Timestamp.fromMillis(oldNow + 5 * 60 * 1000),
  });

  // 5) sample-preview-005 (failed, failed, failureReason, pagesCompleted 0)
  await db.collection("storyPreviews").doc(SAMPLE_PREVIEW_ID_5).set({
    previewId: SAMPLE_PREVIEW_ID_5,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    templateId: SAMPLE_TEMPLATE_ID,
    templateTitle: "الدب الشجاع",
    templateVersion: 2,
    language: "ar",
    previewPageCount: 2,

    childFirstName: "ياسر",
    childGender: "male",
    childAgeGroup: "3_6",

    photoPath: `child-photos/${SAMPLE_CAREGIVER_UID}/${SAMPLE_PREVIEW_ID_5}/1700000003.jpg`,
    photoStatus: "uploaded",
    photoUploadedAt: new Date(now - 15 * 60 * 1000).toISOString(),
    photoRetainUntil: new Date(now + 48 * 60 * 60 * 1000).toISOString(),

    pages: [],
    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",

    generationStatus: "failed",
    pagesCompleted: 0,
    generationStartedAt: new Date(now - 10 * 60 * 1000).toISOString(),
    generationCompletedAt: new Date(now - 9 * 60 * 1000).toISOString(),
    failureReason: "Image generation failed: provider timeout",

    status: "failed",
    expiresAt: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    purchaseId: null,
    personalizedStoryId: null,

    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  console.log(
    `   ✅ storyPreviews created (${[
      SAMPLE_PREVIEW_ID_1,
      SAMPLE_PREVIEW_ID_2,
      SAMPLE_PREVIEW_ID_3,
      SAMPLE_PREVIEW_ID_4,
      SAMPLE_PREVIEW_ID_5,
    ].join(", ")})`
  );

  // ──────────────────────────────────────────────────────────────────
  // 4. CART subcollection (caregivers/{uid}/cart)
  // ──────────────────────────────────────────────────────────────────
  console.log("4️⃣  Creating cart subcollection...");

  await db
    .collection(`caregivers/${SAMPLE_CAREGIVER_UID}/cart`)
    .doc(SAMPLE_CART_ITEM_ID)
    .set({
      cartItemId: SAMPLE_CART_ITEM_ID,
      caregiverUid: SAMPLE_CAREGIVER_UID,
      previewId: SAMPLE_PREVIEW_ID_1,
      templateId: SAMPLE_TEMPLATE_ID,
      templateTitle: "الدب الشجاع",
      childFirstName: "ليان",
      coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",
      priceCents: 4990,
      currency: "ILS",
      language: "ar",
      addedAt: Timestamp.now(),
    });
  console.log("   ✅ caregivers/{uid}/cart/{cartItemId} created");

  // ──────────────────────────────────────────────────────────────────
  // 5. PURCHASES subcollection (caregivers/{uid}/purchases)
  // ──────────────────────────────────────────────────────────────────
  console.log("5️⃣  Creating purchases subcollection...");

  await db
    .collection(`caregivers/${SAMPLE_CAREGIVER_UID}/purchases`)
    .doc(SAMPLE_PURCHASE_ID)
    .set({
      purchaseId: SAMPLE_PURCHASE_ID,
      caregiverUid: SAMPLE_CAREGIVER_UID,
      previewId: SAMPLE_PREVIEW_ID_1,
      templateId: SAMPLE_TEMPLATE_ID,
      personalizedStoryId: SAMPLE_STORY_ID,

      // Generic payment fields (NOT Stripe-specific)
      paymentTransactionId: "txn_sample_001",
      paymentSessionId: "sess_sample_001",
      paymentChargeId: "chg_sample_001",
      amountCents: 4990,
      currency: "ILS",

      status: "completed",
      paidAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      failedAt: null,
      failureReason: null,
      refundedAt: null,
      paymentRefundId: null,

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  console.log("   ✅ caregivers/{uid}/purchases/{purchaseId} created");

  await db
    .collection(`caregivers/${SAMPLE_CAREGIVER_UID}/purchases`)
    .doc(SAMPLE_PURCHASE_ID_2)
    .set({
      purchaseId: SAMPLE_PURCHASE_ID_2,
      caregiverUid: SAMPLE_CAREGIVER_UID,
      previewId: SAMPLE_PREVIEW_ID_3,
      templateId: SAMPLE_TEMPLATE_ID_2,
      personalizedStoryId: SAMPLE_STORY_ID_2,

      // Generic payment fields (NOT Stripe-specific)
      paymentTransactionId: "txn_sample_002",
      paymentSessionId: "sess_sample_002",
      paymentChargeId: "chg_sample_002",
      amountCents: 4990,
      currency: "ILS",

      status: "completed",
      paidAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
      failedAt: null,
      failureReason: null,
      refundedAt: null,
      paymentRefundId: null,

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  console.log("   ✅ caregivers/{uid}/purchases/{purchaseId} created (2nd purchase)");

  // ──────────────────────────────────────────────────────────────────
  // 6. PERSONALIZED STORIES collection
  // ──────────────────────────────────────────────────────────────────
  console.log("6️⃣  Creating personalizedStories collection...");

  await db.collection("personalizedStories").doc(SAMPLE_STORY_ID).set({
    storyId: SAMPLE_STORY_ID,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    purchaseId: SAMPLE_PURCHASE_ID,
    previewId: SAMPLE_PREVIEW_ID_1,

    childFirstName: "ليان",
    childGender: "female",
    childAgeGroup: "3_6",
    templateId: SAMPLE_TEMPLATE_ID,
    templateTitle: "الدب الشجاع",
    templateVersion: 2,
    language: "ar",
    dedicationName: null,

    coverImageUrl: "https://placeholder.com/bear-story-cover.jpg",

    generationStatus: "completed",
    totalPages: 4,
    pagesCompleted: 4,
    pagesFromPreview: 2,
    pagesFailedIndexes: [],
    generationStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    generationCompletedAt: new Date().toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "كانت ليان تمشي في الغابة. هي شعرت بالخوف.",
        imagePromptUsed:
          "A warm illustration of a young girl named ليان walking through a friendly forest at dusk",
        generatedImagePath: "generated-illustrations/sample-caregiver-001/sample-story-001/page-1.webp",
        fromPreview: true,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3200,
        },
      },
      {
        pageNumber: 2,
        personalizedText: "وجدت ليان دبًا صغيرًا. قالت هي له: 'أنا صديقتك'.",
        imagePromptUsed:
          "a young girl named ليان meeting a cute small bear in a forest clearing",
        generatedImagePath: "generated-illustrations/sample-caregiver-001/sample-story-001/page-2.webp",
        fromPreview: true,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 2800,
        },
      },
      {
        pageNumber: 3,
        personalizedText: "مشت ليان والدب معًا. لم تعد هي خائفة.",
        imagePromptUsed:
          "a young girl named ليان walking hand-in-hand with a friendly bear through a starlit forest",
        generatedImagePath: "generated-illustrations/sample-caregiver-001/sample-story-001/page-3.webp",
        fromPreview: false,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3500,
        },
      },
      {
        pageNumber: 4,
        personalizedText: "عادت ليان إلى البيت وهي تبتسم. لقد تغلبت على ها خوف.",
        imagePromptUsed:
          "a young girl named ليان arriving home safely, smiling with confidence",
        generatedImagePath: "generated-illustrations/sample-caregiver-001/sample-story-001/page-4.webp",
        fromPreview: false,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3100,
        },
      },
    ],

    isAccessible: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log("   ✅ personalizedStories/{storyId} created");

  await db.collection("personalizedStories").doc(SAMPLE_STORY_ID_2).set({
    storyId: SAMPLE_STORY_ID_2,
    caregiverUid: SAMPLE_CAREGIVER_UID,
    purchaseId: SAMPLE_PURCHASE_ID_2,
    previewId: SAMPLE_PREVIEW_ID_3,

    childFirstName: "נועה",
    childGender: "female",
    childAgeGroup: "0_3",
    templateId: SAMPLE_TEMPLATE_ID_2,
    templateTitle: "הכוכב הקטן",
    templateVersion: 1,
    language: "he",
    dedicationName: "אמא",

    coverImageUrl: "https://placeholder.com/star-story-cover.jpg",

    generationStatus: "completed",
    totalPages: 3,
    pagesCompleted: 3,
    pagesFromPreview: 2,
    pagesFailedIndexes: [],
    generationStartedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    generationCompletedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),

    pages: [
      {
        pageNumber: 1,
        personalizedText: "נועה הסתכלה על השמיים. היא ראתה כוכב קטן.",
        imagePromptUsed:
          "A dreamy children's book illustration of a young girl named נועה looking up at a starry night sky, one star shining brightly",
        generatedImagePath: `generated-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_STORY_ID_2}/page-1.webp`,
        fromPreview: true,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3100,
        },
      },
      {
        pageNumber: 2,
        personalizedText: "הכוכב אמר לנועה: 'את מיוחדת, בדיוק כמוני'. היא חייכה.",
        imagePromptUsed:
          "A magical children's book illustration of a friendly glowing star talking to a young girl named נועה, warm encouraging atmosphere",
        generatedImagePath: `generated-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_STORY_ID_2}/page-2.webp`,
        fromPreview: true,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3000,
        },
      },
      {
        pageNumber: 3,
        personalizedText: "נועה הרגישה אמיצה. היא ידעה שהכוכב תמיד איתה.",
        imagePromptUsed:
          "A warm children's book illustration of a young girl named נועה standing tall and confident with a small star glowing in her pocket, morning light",
        generatedImagePath: `generated-illustrations/${SAMPLE_CAREGIVER_UID}/${SAMPLE_STORY_ID_2}/page-3.webp`,
        fromPreview: false,
        aiMetadata: {
          providerId: "sample-provider",
          modelId: "sample-model-v1",
          generatedAt: new Date().toISOString(),
          latencyMs: 3400,
        },
      },
    ],

    isAccessible: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log("   ✅ personalizedStories/{storyId} created (2nd story)");

  // ──────────────────────────────────────────────────────────────────
  // Done!
  // ──────────────────────────────────────────────────────────────────
  console.log("\n🎉 All collections seeded successfully!\n");
  console.log("Collections created:");
  console.log("  📁 caregivers                          (top-level)");
  console.log("  📁 caregivers/{uid}/cart                (subcollection)");
  console.log("  📁 caregivers/{uid}/purchases           (subcollection)");
  console.log("  📁 story_templates                     (top-level, updated with new fields)");
  console.log("  📁 storyPreviews                       (top-level, with inline child data + photo lifecycle)");
  console.log("  📁 personalizedStories                 (top-level)");
  console.log("\nView in Firebase Console:");
  console.log("  https://console.firebase.google.com/project/personalized-story-app/firestore\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
