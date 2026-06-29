/**
 * SAFE UNPUBLISH (soft) for specific story_templates.
 *
 * Hides templates from the public catalog + detail page by clearing the public
 * flags the catalog query and Firestore rules gate on:
 *   - isActive: false   (catalog query requires isActive==true; rules deny public read)
 *   - isPublished: false
 * It does NOT delete the template, its pages, its Storage assets, or any
 * caregiver-owned `personalizedStories` (purchased copies stay accessible).
 * Fully reversible: re-run with --republish to restore isActive/isPublished.
 *
 * Dry-run by default. Pass --apply to write.
 *
 *   npx ts-node scripts/unpublishTemplates.ts                 # preview unpublish
 *   npx ts-node scripts/unpublishTemplates.ts --apply         # unpublish
 *   npx ts-node scripts/unpublishTemplates.ts --republish --apply   # undo
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

// Resolved by the investigation run on 2026-06-29. Edit this list deliberately.
const TARGET_TEMPLATE_IDS = [
  "MuTvYzpzA6OBCjehxJba", // "A New Little One"
  "Qf0ZRMAW0dRZOD6l6noO", // "Waiting for You"
  "mg7hOTAqomGp7z4MEwnG", // "New Baby in the House"
  "sample-template-001", // "الدب الشجاع" (seed/sample)
  "sample-template-002", // "הכוכב הקטן"  (seed/sample)
];

const APPLY = process.argv.includes("--apply");
const REPUBLISH = process.argv.includes("--republish");

async function run() {
  const action = REPUBLISH ? "REPUBLISH" : "UNPUBLISH";
  console.log(`🔧 ${action} story_templates (${APPLY ? "APPLY" : "DRY-RUN"})\n`);

  let changed = 0;
  for (const id of TARGET_TEMPLATE_IDS) {
    const ref = db.collection("story_templates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ❓ ${id} — not found, skipping`);
      continue;
    }
    const d = snap.data()!;
    const target = REPUBLISH
      ? { isActive: true, isPublished: true }
      : { isActive: false, isPublished: false };

    const noop = d.isActive === target.isActive && d.isPublished === target.isPublished;
    console.log(
      `  ${noop ? "⏭️ " : APPLY ? "✅" : "→ "} ${id} "${JSON.stringify(d.title)}" ` +
        `isActive ${d.isActive}→${target.isActive}, isPublished ${d.isPublished}→${target.isPublished}` +
        (noop ? " (already in target state)" : ""),
    );
    if (noop) continue;

    if (APPLY) {
      await ref.update({ ...target, updatedAt: admin.firestore.Timestamp.now() });
    }
    changed++;
  }

  console.log(`\n📊 ${changed} ${APPLY ? "updated" : "would change"}.`);
  if (!APPLY && changed > 0) console.log("ℹ️  Re-run with --apply to write.\n");
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
