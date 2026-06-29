/**
 * Migration: align `story_templates.ageGroup` with the brief age ranges.
 *
 * Older publishes bucketed the brief ageRange into "0_3"/"3_6"/"6_9"/"9_12"
 * (and 3-5 + 5-7 both collapsed to "3_6"). The catalog now filters on the
 * exact brief ranges ("3-5"/"5-7"/"7-9"/"9-12"), so this backfills the field.
 *
 * Resolution order per template:
 *   1. Authoritative: source story's brief.ageAndScope.ageRange (via draftId).
 *   2. Fallback: deterministic remap of unambiguous old buckets.
 *      "3_6" is ambiguous (3-5 vs 5-7) and is left unchanged + flagged when
 *      no source brief is available.
 *
 * Safe: never deletes, only sets `ageGroup`. Idempotent. Dry-run by default.
 *
 *   npx ts-node scripts/migrateTemplateAgeRanges.ts
 *   npx ts-node scripts/migrateTemplateAgeRanges.ts --apply
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))),
  });
}
const db = admin.firestore();

const VALID_RANGES = new Set(["3-5", "5-7", "7-9", "9-12"]);

// Deterministic fallback for unambiguous legacy buckets only.
const UNAMBIGUOUS_FALLBACK: Record<string, string> = {
  "0_3": "3-5",
  "0-3": "3-5",
  "6_9": "7-9",
  "6-9": "7-9",
  "9_12": "9-12",
  "9-12": "9-12",
};

const APPLY = process.argv.includes("--apply");

async function resolveRange(data: FirebaseFirestore.DocumentData): Promise<string | null> {
  if (typeof data.ageGroup === "string" && VALID_RANGES.has(data.ageGroup)) return null; // already good

  const sourceStoryId: string | undefined = data.draftId || data.briefId;
  if (sourceStoryId) {
    const storySnap = await db.collection("stories").doc(sourceStoryId).get();
    const range = storySnap.data()?.brief?.ageAndScope?.ageRange;
    if (typeof range === "string" && VALID_RANGES.has(range)) return range;
  }
  if (typeof data.ageGroup === "string") {
    const fallback = UNAMBIGUOUS_FALLBACK[data.ageGroup];
    if (fallback) return fallback;
  }
  return null;
}

async function run() {
  console.log(`🔧 Backfilling story_templates.ageGroup (${APPLY ? "APPLY" : "DRY-RUN"})\n`);
  const snapshot = await db.collection("story_templates").get();
  console.log(`   Found ${snapshot.size} templates\n`);

  let patched = 0;
  let skipped = 0;
  let unresolved = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const range = await resolveRange(data);

    if (range === null) {
      if (typeof data.ageGroup === "string" && VALID_RANGES.has(data.ageGroup)) {
        skipped++;
      } else {
        unresolved++;
        console.log(
          `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — ageGroup="${data.ageGroup}", ` +
            `ambiguous and no source brief. Left unchanged.`,
        );
      }
      continue;
    }

    console.log(
      `   ${APPLY ? "✅ PATCHED" : "→ WOULD PATCH"} ${doc.id} ("${data.title}"): ` +
        `ageGroup "${data.ageGroup}" → "${range}"`,
    );
    if (APPLY) {
      await doc.ref.update({ ageGroup: range, updatedAt: admin.firestore.Timestamp.now() });
    }
    patched++;
  }

  console.log(
    `\n📊 ${patched} ${APPLY ? "patched" : "to patch"}, ${skipped} already-correct, ${unresolved} unresolved\n`,
  );
  if (!APPLY && patched > 0) console.log("ℹ️  Re-run with --apply to write.\n");
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
