/**
 * Migration: backfill catalog taxonomy keys on existing `story_templates`.
 *
 * Older publishes set `primaryTopic` to the therapeutic *approach*
 * (e.g. "graduated_exposure") instead of the clinical *domain*
 * (brief.storyType, e.g. "fear_anxiety"). The public catalog filters category
 * browse on the domain, so those templates never appeared under their
 * category. This script rewrites `primaryTopic`/`topicKey` to the domain by
 * reading the source story's `brief.storyType` (via `draftId`).
 *
 * Safe by design:
 *   - Never deletes data; only sets `primaryTopic` + `topicKey`.
 *   - Idempotent: skips docs already tagged with a valid domain key.
 *   - Dry-run by default. Pass `--apply` to write.
 *
 * Run (dry-run):   npx ts-node scripts/migratePublishedTaxonomy.ts
 * Run (apply):     npx ts-node scripts/migratePublishedTaxonomy.ts --apply
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Clinical domains = brief storyType keys = referenceData/topics ids (overlap).
const VALID_DOMAINS = new Set([
  "fear_anxiety",
  "big_emotions",
  "loss_grief",
  "identity_self_worth",
  "life_transitions",
]);

const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");

async function resolveDomain(template: FirebaseFirestore.DocumentData): Promise<string | null> {
  // Already a valid domain key → nothing to do.
  if (typeof template.primaryTopic === "string" && VALID_DOMAINS.has(template.primaryTopic)) {
    return null;
  }
  const sourceStoryId: string | undefined = template.draftId || template.briefId;
  if (sourceStoryId) {
    const storySnap = await db.collection("stories").doc(sourceStoryId).get();
    const storyType = storySnap.data()?.brief?.storyType;
    if (typeof storyType === "string" && VALID_DOMAINS.has(storyType)) {
      return storyType;
    }
  }
  return null;
}

async function run() {
  console.log(`🔧 Backfilling story_templates taxonomy (${APPLY ? "APPLY" : "DRY-RUN"})\n`);
  const snapshot = await db.collection("story_templates").get();
  console.log(`   Found ${snapshot.size} templates\n`);

  let patched = 0;
  let skipped = 0;
  let unresolved = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const domain = await resolveDomain(data);

    if (domain === null) {
      if (typeof data.primaryTopic === "string" && VALID_DOMAINS.has(data.primaryTopic)) {
        skipped++;
      } else {
        unresolved++;
        console.log(
          `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — primaryTopic="${data.primaryTopic}", ` +
            `no source story domain found. Left unchanged.`,
        );
      }
      continue;
    }

    console.log(
      `   ✅ ${APPLY ? "PATCHED" : "WOULD PATCH"} ${doc.id} ("${data.title}"): ` +
        `primaryTopic "${data.primaryTopic}" → "${domain}", topicKey → "${domain}"`,
    );
    if (APPLY) {
      await doc.ref.update({
        primaryTopic: domain,
        topicKey: domain,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
    patched++;
  }

  console.log(
    `\n📊 ${patched} ${APPLY ? "patched" : "to patch"}, ${skipped} already-correct, ${unresolved} unresolved\n`,
  );
  if (!APPLY && patched > 0) {
    console.log("ℹ️  Re-run with --apply to write these changes.\n");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
