/**
 * Migration script: Patches all existing story_templates that are missing
 * the `isPublished` field (which causes "Story not found" in the frontend).
 *
 * Also adds missing new fields:
 * - isPublished, slug, shortDescription, coverImageUrl, displayTopic
 * - publishedAt, purchaseCount, pricing, previewPageCount, totalPageCount
 * - visualConfig (default placeholder)
 * - textVariants, sceneInstruction, locationKey on pages
 * - characterProfile + characterProfileStatus on children
 *
 * Run with: npx ts-node scripts/migrateTemplates.ts
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin
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

async function migrateTemplates() {
  console.log("🔧 Migrating story_templates...\n");

  const snapshot = await db.collection("story_templates").get();
  console.log(`   Found ${snapshot.size} templates total\n`);

  let patched = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, any> = {};
    const missingFields: string[] = [];

    // 1. Fix isPublished
    // Also fix templates where isPublished was incorrectly set to false
    // for approved+active templates (order-of-operations bug from first migration run)
    const isPublishedMissing = data.isPublished === undefined || data.isPublished === null;
    const isPublishedWrong = data.isPublished === false && data.status === "approved" && (data.isActive === true || data.isActive === undefined);
    if (isPublishedMissing || isPublishedWrong) {
      // Determine isActive first (may need to be patched too)
      const effectiveIsActive = data.isActive !== undefined ? data.isActive : (data.status === "approved");
      const shouldPublish = data.status === "approved" && effectiveIsActive === true;
      updates.isPublished = shouldPublish;
      missingFields.push(`isPublished → ${shouldPublish}`);
    }

    // 2. Fix isActive
    if (data.isActive === undefined || data.isActive === null) {
      updates.isActive = data.status === "approved";
      missingFields.push(`isActive → ${data.status === "approved"}`);
    }

    // 3. Fix slug
    if (!data.slug) {
      const title = (data.title || "untitled").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0590-\u05FF\u0600-\u06FF-]/g, "");
      updates.slug = `${title}-${doc.id.substring(0, 6)}`;
      missingFields.push("slug");
    }

    // 4. Fix shortDescription
    if (!data.shortDescription) {
      updates.shortDescription = { ar: "", he: "" };
      missingFields.push("shortDescription");
    }

    // 5. Fix coverImageUrl
    if (data.coverImageUrl === undefined) {
      updates.coverImageUrl = "";
      missingFields.push("coverImageUrl");
    }

    // 6. Fix displayTopic
    if (!data.displayTopic) {
      updates.displayTopic = {
        ar: data.primaryTopic || "",
        he: data.primaryTopic || "",
      };
      missingFields.push("displayTopic");
    }

    // 7. Fix publishedAt
    if (data.publishedAt === undefined) {
      updates.publishedAt = data.approvedAt || new Date().toISOString();
      missingFields.push("publishedAt");
    }

    // 8. Fix purchaseCount
    if (data.purchaseCount === undefined) {
      updates.purchaseCount = 0;
      missingFields.push("purchaseCount");
    }

    // 9. Fix pricing model (future-ready nested object)
    const rawPricing = data.pricing;
    const toNumber = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (
        value &&
        typeof value === "object" &&
        typeof (value as { current?: unknown }).current === "number" &&
        Number.isFinite((value as { current?: number }).current)
      ) {
        return (value as { current: number }).current;
      }
      return undefined;
    };
    const existingDigital = toNumber(rawPricing?.digital);
    const existingPrint = toNumber(rawPricing?.print);
    const fallbackDigital = typeof data.price === "number" ? data.price : 19.99;
    const fallbackPrint = typeof data.price === "number" ? data.price : 29.99;
    const needsPricingObject = !rawPricing || existingDigital === undefined || existingPrint === undefined;
    if (needsPricingObject) {
      updates.pricing = {
        digital: existingDigital ?? fallbackDigital,
        print: existingPrint ?? fallbackPrint,
      };
      missingFields.push("pricing");
    }

    // 10. Fix previewPageCount / totalPageCount
    const pageCount = Array.isArray(data.pages) ? data.pages.length : 0;
    if (data.previewPageCount === undefined) {
      updates.previewPageCount = Math.min(2, pageCount);
      missingFields.push("previewPageCount");
    }
    if (data.totalPageCount === undefined) {
      updates.totalPageCount = pageCount;
      missingFields.push("totalPageCount");
    }

    // 11. Fix visualConfig
    if (!data.visualConfig) {
      updates.visualConfig = {
        styleAnchor: "Soft watercolor illustration, children's book style, warm muted colors, rounded forms, gentle lighting",
        worldAnchors: { default: "" },
        supportingCharacters: {},
      };
      missingFields.push("visualConfig");
    }

    // 12. Fix pages: add textVariants, sceneInstruction, locationKey if missing
    if (Array.isArray(data.pages)) {
      let pagesNeedUpdate = false;
      const updatedPages = data.pages.map((page: any) => {
        const updated = { ...page };

        if (!page.textVariants) {
          // Derive from textTemplate if available
          const text = typeof page.textTemplate === "string"
            ? page.textTemplate
            : (page.textTemplate?.masculine || page.textTemplate?.feminine || "");
          updated.textVariants = {
            male: typeof page.textTemplate === "object" ? (page.textTemplate?.masculine || text) : text,
            female: typeof page.textTemplate === "object" ? (page.textTemplate?.feminine || text) : text,
          };
          pagesNeedUpdate = true;
        }

        if (!page.sceneInstruction) {
          updated.sceneInstruction = {
            male: page.imagePromptTemplate || "",
            female: page.imagePromptTemplate || "",
          };
          pagesNeedUpdate = true;
        }

        if (!page.locationKey) {
          updated.locationKey = "default";
          pagesNeedUpdate = true;
        }

        return updated;
      });

      if (pagesNeedUpdate) {
        updates.pages = updatedPages;
        missingFields.push("pages (textVariants/sceneInstruction/locationKey)");
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.Timestamp.now();
      await doc.ref.update(updates);
      console.log(`   ✅ PATCHED ${doc.id} (${data.title || "untitled"})`);
      console.log(`      Added: ${missingFields.join(", ")}`);
      patched++;
    } else {
      console.log(`   ⏭️  SKIPPED ${doc.id} (${data.title || "untitled"}) — all fields present`);
      skipped++;
    }
  }

  console.log(`\n📊 Results: ${patched} patched, ${skipped} skipped\n`);

  // ──────────────────────────────────────────────────────────────────
  // Also migrate children: add characterProfile fields if missing
  // ──────────────────────────────────────────────────────────────────
  console.log("🔧 Migrating children documents...\n");

  const caregiversSnapshot = await db.collection("caregivers").get();
  let childrenPatched = 0;

  for (const caregiverDoc of caregiversSnapshot.docs) {
    const childrenSnapshot = await db
      .collection(`caregivers/${caregiverDoc.id}/children`)
      .get();

    for (const childDoc of childrenSnapshot.docs) {
      const childData = childDoc.data();
      const childUpdates: Record<string, any> = {};

      if (childData.characterProfile === undefined) {
        childUpdates.characterProfile = null;
      }
      if (childData.characterProfileStatus === undefined) {
        childUpdates.characterProfileStatus = "pending";
      }

      if (Object.keys(childUpdates).length > 0) {
        childUpdates.updatedAt = admin.firestore.Timestamp.now();
        await childDoc.ref.update(childUpdates);
        console.log(`   ✅ PATCHED child ${childDoc.id} (${childData.firstName}) under caregiver ${caregiverDoc.id}`);
        childrenPatched++;
      }
    }
  }

  console.log(`\n📊 Children: ${childrenPatched} patched\n`);

  // ──────────────────────────────────────────────────────────────────
  // Migrate storyPreviews: add characterProfileSnapshot if missing
  // ──────────────────────────────────────────────────────────────────
  console.log("🔧 Migrating storyPreviews documents...\n");

  const previewsSnapshot = await db.collection("storyPreviews").get();
  let previewsPatched = 0;

  for (const previewDoc of previewsSnapshot.docs) {
    const previewData = previewDoc.data();
    if (previewData.characterProfileSnapshot === undefined) {
      await previewDoc.ref.update({
        characterProfileSnapshot: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      console.log(`   ✅ PATCHED preview ${previewDoc.id}`);
      previewsPatched++;
    }
  }

  console.log(`\n📊 Previews: ${previewsPatched} patched\n`);

  // ──────────────────────────────────────────────────────────────────
  // Migrate personalizedStories: add characterProfileSnapshot if missing
  // ──────────────────────────────────────────────────────────────────
  console.log("🔧 Migrating personalizedStories documents...\n");

  const storiesSnapshot = await db.collection("personalizedStories").get();
  let storiesPatched = 0;

  for (const storyDoc of storiesSnapshot.docs) {
    const storyData = storyDoc.data();
    if (storyData.characterProfileSnapshot === undefined) {
      await storyDoc.ref.update({
        characterProfileSnapshot: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      console.log(`   ✅ PATCHED story ${storyDoc.id}`);
      storiesPatched++;
    }
  }

  console.log(`\n📊 Stories: ${storiesPatched} patched\n`);

  // ──────────────────────────────────────────────────────────────────
  // Verification
  // ──────────────────────────────────────────────────────────────────
  console.log("🔍 Verifying migration...\n");

  const verifySnapshot = await db
    .collection("story_templates")
    .where("isPublished", "==", true)
    .where("isActive", "==", true)
    .get();

  console.log(`   Templates with isPublished=true AND isActive=true: ${verifySnapshot.size}`);

  for (const doc of verifySnapshot.docs) {
    const data = doc.data();
    console.log(`   📖 ${doc.id}: "${data.title}" — slug: ${data.slug}, visualConfig: ${data.visualConfig ? "✅" : "❌"}, pages[0].textVariants: ${data.pages?.[0]?.textVariants ? "✅" : "❌"}`);
  }

  console.log("\n🎉 Migration complete!\n");
}

migrateTemplates().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
