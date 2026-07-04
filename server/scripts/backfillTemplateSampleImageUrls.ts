/**
 * Backfill `story_templates.pages[].sampleImageUrl` for templates published
 * before that field existed on every page.
 *
 * Root cause: `publishStory.ts` writes `sampleImageUrl: img.publicUrl` for
 * every page from `stories/{storyId}/images/{pageNumber}-{version}` where
 * `version === illustrationPages[pageNumber].currentImageVersion` (the
 * specialist-approved version). Several templates were published before this
 * field was added to the pipeline/schema — their `pages[]` never got an image
 * field at all, even though the approved illustrations exist untouched in
 * `stories/{storyId}/images/`. This script re-derives `sampleImageUrl` for
 * exactly those pages, using the SAME "approved currentImageVersion" lookup
 * `publishStory.ts` uses, so the linked image is provably the one the
 * specialist actually approved for that page — never a guess, never another
 * page's or another story's image.
 *
 * `sourceStoryId` is not set on these older template docs either, so the
 * source `stories/{storyId}` is located by parsing the storage folder name
 * out of `coverImage` / `coverImageUrl` (both are written from the same
 * `specialist-illustrations/{storyId}/...` artefact at publish time).
 *
 * Usage (from server/):
 *   npx ts-node --project scripts/tsconfig.json scripts/backfillTemplateSampleImageUrls.ts [--dry-run]
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

function inferStoryFolder(url: string | undefined): string | null {
  if (!url) return null;
  const plain = url.match(/specialist-illustrations\/([^/?]+)\//);
  if (plain && plain[1]) return decodeURIComponent(plain[1]);
  const encoded = url.match(/specialist-illustrations%2F([^%]+)%2F/);
  if (encoded && encoded[1]) return decodeURIComponent(encoded[1]);
  return null;
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const db = initFirebase();

  console.log(dryRun ? "DRY RUN — no writes will be made.\n" : "LIVE RUN — documents will be updated.\n");

  const templatesSnap = await db.collection("story_templates").get();
  console.log(`Scanning ${templatesSnap.size} story_templates...\n`);

  for (const doc of templatesSnap.docs) {
    const template = doc.data();
    const pages: Record<string, unknown>[] = Array.isArray(template.pages) ? template.pages : [];
    const missingPages = pages.filter((p) => !p.sampleImageUrl);
    if (missingPages.length === 0) continue;

    const storyId: string | undefined =
      template.sourceStoryId ||
      inferStoryFolder(template.coverImage) ||
      inferStoryFolder(template.coverImageUrl) ||
      undefined;

    console.log(`Template ${doc.id} (${template.title}): ${missingPages.length}/${pages.length} pages missing sampleImageUrl. Source story: ${storyId ?? "UNKNOWN"}`);

    if (!storyId) {
      console.log("  -> cannot infer source story, skipping.");
      continue;
    }

    const storyDoc = await db.collection("stories").doc(storyId).get();
    if (!storyDoc.exists) {
      console.log(`  -> source story ${storyId} not found, skipping.`);
      continue;
    }
    const story = storyDoc.data()!;
    const illustrationPages: Record<string, unknown>[] = Array.isArray(story.illustrationPages)
      ? story.illustrationPages
      : [];
    const illByPageNumber = new Map<number, Record<string, unknown>>();
    illustrationPages.forEach((row) => illByPageNumber.set(row.pageNumber as number, row));

    let updatedCount = 0;
    const newPages = await Promise.all(
      pages.map(async (page) => {
        if (page.sampleImageUrl) return page;

        const pageNumber = page.pageNumber as number;
        const row = illByPageNumber.get(pageNumber);
        const version = row?.currentImageVersion as number | null | undefined;
        if (!row || version == null) {
          console.log(`  -> page ${pageNumber}: no approved image version on source story, leaving as-is.`);
          return page;
        }

        const imgDoc = await storyDoc.ref.collection("images").doc(`${pageNumber}-${version}`).get();
        if (!imgDoc.exists) {
          console.log(`  -> page ${pageNumber}: image artefact ${pageNumber}-${version} not found, leaving as-is.`);
          return page;
        }
        const img = imgDoc.data()!;
        if (img.reviewStatus !== "approved" || !img.publicUrl) {
          console.log(`  -> page ${pageNumber}: artefact ${pageNumber}-${version} not approved or missing publicUrl, leaving as-is.`);
          return page;
        }

        updatedCount++;
        return { ...page, sampleImageUrl: img.publicUrl };
      })
    );

    if (updatedCount > 0) {
      console.log(`  -> resolved sampleImageUrl for ${updatedCount} page(s).`);
      if (!dryRun) {
        await doc.ref.update({ pages: newPages });
      }
    } else {
      console.log("  -> nothing resolvable.");
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
