/**
 * Backfill script: fixes `generatedImagePath` on already-existing "fixed"
 * (non-personalizable / "Buy Story") storyPreviews and personalizedStories
 * that were created before `createFixedStoryPreview` learned to fall back to
 * `previewSpreads` / `coverImage` when a template page has no `sampleImageUrl`.
 *
 * Without this backfill, test purchases made before the fix would still show
 * the generic page-number-keyed placeholder for every page (same picture
 * regardless of story) even after redeploying the fix, because the images
 * were already baked into the preview/personalizedStory documents at
 * creation time.
 *
 * Usage (from server/):
 *   npx ts-node --project scripts/tsconfig.json scripts/backfillFixedStoryImages.ts [--dry-run]
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

function initFirebase() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa = fromEnv && fromEnv.trim()
    ? JSON.parse(fromEnv)
    : JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/serviceAccountKey.json"), "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa as admin.ServiceAccount) });
  }
  return admin.firestore();
}

function resolvePageImage(
  page: { sampleImageUrl?: string },
  pageIndexInOrder: number,
  template: { previewSpreads?: { imageUrl: string }[]; coverImage?: string; coverImageUrl?: string }
): string | null {
  if (page.sampleImageUrl) return page.sampleImageUrl;
  const spreadImage = template.previewSpreads?.[pageIndexInOrder]?.imageUrl;
  if (spreadImage) return spreadImage;
  return template.coverImage || template.coverImageUrl || null;
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const db = initFirebase();
  const templateCache = new Map<string, FirebaseFirestore.DocumentData | null>();

  async function getTemplate(templateId: string) {
    if (templateCache.has(templateId)) return templateCache.get(templateId)!;
    const doc = await db.collection("story_templates").doc(templateId).get();
    const data = doc.exists ? doc.data()! : null;
    templateCache.set(templateId, data);
    return data;
  }

  console.log(dryRun ? "DRY RUN — no writes will be made.\n" : "LIVE RUN — documents will be updated.\n");

  // 1. storyPreviews with kind === "fixed"
  const previewsSnap = await db.collection("storyPreviews").where("kind", "==", "fixed").get();
  console.log(`Found ${previewsSnap.size} fixed storyPreviews.`);

  for (const doc of previewsSnap.docs) {
    const preview = doc.data();
    const template = await getTemplate(preview.templateId);
    if (!template) {
      console.log(`  [preview ${doc.id}] template ${preview.templateId} not found — skipping`);
      continue;
    }

    const templatePagesByNumber = new Map<number, { sampleImageUrl?: string }>();
    (template.pages ?? []).forEach((p: any) => templatePagesByNumber.set(p.pageNumber, p));

    const sortedPageNumbers = [...templatePagesByNumber.keys()].sort((a, b) => a - b);
    const orderIndexByPageNumber = new Map<number, number>();
    sortedPageNumbers.forEach((pn, idx) => orderIndexByPageNumber.set(pn, idx));

    let changedCount = 0;
    const newPages = (preview.pages ?? []).map((p: any) => {
      const templatePage = templatePagesByNumber.get(p.pageNumber) ?? {};
      const orderIndex = orderIndexByPageNumber.get(p.pageNumber) ?? p.pageNumber - 1;
      // Recompute unconditionally: the template may now have a better source
      // (e.g. per-page sampleImageUrl added by a later backfill) than what
      // was previously baked into this preview/story at creation time.
      const resolved = resolvePageImage(templatePage, orderIndex, template);
      if (resolved !== p.generatedImagePath) changedCount++;
      return { ...p, generatedImagePath: resolved ?? p.generatedImagePath ?? null };
    });

    if (changedCount > 0) {
      console.log(`  [preview ${doc.id}] updating ${changedCount} page(s)`);
      if (!dryRun) {
        await doc.ref.update({ pages: newPages, updatedAt: admin.firestore.Timestamp.now() });
      }
    } else {
      console.log(`  [preview ${doc.id}] no change needed`);
    }
  }

  // 2. personalizedStories with itemType === "template" (fixed purchases)
  const storiesSnap = await db.collection("personalizedStories").where("itemType", "==", "template").get();
  console.log(`\nFound ${storiesSnap.size} fixed personalizedStories.`);

  for (const doc of storiesSnap.docs) {
    const story = doc.data();
    const template = await getTemplate(story.templateId);
    if (!template) {
      console.log(`  [story ${doc.id}] template ${story.templateId} not found — skipping`);
      continue;
    }

    const templatePagesByNumber = new Map<number, { sampleImageUrl?: string }>();
    (template.pages ?? []).forEach((p: any) => templatePagesByNumber.set(p.pageNumber, p));

    const sortedPageNumbers = [...templatePagesByNumber.keys()].sort((a, b) => a - b);
    const orderIndexByPageNumber = new Map<number, number>();
    sortedPageNumbers.forEach((pn, idx) => orderIndexByPageNumber.set(pn, idx));

    let changedCount = 0;
    const newPages = (story.pages ?? []).map((p: any) => {
      const templatePage = templatePagesByNumber.get(p.pageNumber) ?? {};
      const orderIndex = orderIndexByPageNumber.get(p.pageNumber) ?? p.pageNumber - 1;
      const resolved = resolvePageImage(templatePage, orderIndex, template);
      if (resolved !== p.generatedImagePath) changedCount++;
      return { ...p, generatedImagePath: resolved ?? p.generatedImagePath ?? null };
    });

    if (changedCount > 0) {
      console.log(`  [story ${doc.id}] updating ${changedCount} page(s)`);
      if (!dryRun) {
        await doc.ref.update({ pages: newPages, updatedAt: admin.firestore.Timestamp.now() });
      }
    } else {
      console.log(`  [story ${doc.id}] no change needed`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
