/**
 * Backfill: correct `story_templates.generationConfig.language`.
 *
 * Why: `publishStory.ts` used to unconditionally hardcode this field to "he"
 * at publish time, ignoring the specialist's chosen `brief.outputLanguage`
 * entirely (fixed in the same change as this script). Every template
 * published before that fix has the wrong value baked in. This script
 * recovers the true language from each template's source `stories/{draftId}`
 * draft document (`brief.outputLanguage`) and corrects it.
 *
 * Safe by design:
 *   - Dry-run by default. Pass --apply to write.
 *   - Idempotent: only writes when the derived language actually differs
 *     from the current value.
 *   - Never guesses — a template is reported as unresolved (and left alone)
 *     if its source draft is missing or has no `brief.outputLanguage`.
 *
 * Run (dry-run): npx ts-node scripts/backfillStoryLanguage.ts
 * Run (apply):   npx ts-node scripts/backfillStoryLanguage.ts --apply
 */

import { db } from "../src/config/firebase";
import { STORIES_COLLECTION } from "../src/models/story.model";
import { coerceStoryLanguage, type StoryLanguage } from "../src/models/storyBrief.model";

const APPLY = process.argv.includes("--apply");

async function run() {
  console.log(
    `🔧 Backfilling story_templates.generationConfig.language (${APPLY ? "APPLY" : "DRY-RUN"})\n`,
  );

  const templatesSnap = await db.collection("story_templates").get();
  console.log(`   Found ${templatesSnap.size} templates\n`);

  let alreadyCorrect = 0;
  let fixed = 0;
  let unresolved = 0;

  for (const doc of templatesSnap.docs) {
    const data = doc.data();
    const currentLanguage = data.generationConfig?.language as string | undefined;
    const draftId = (data.draftId || data.briefId || data.sourceStoryId) as string | undefined;

    if (!draftId) {
      console.log(
        `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — no draftId/briefId/sourceStoryId ` +
          `to trace back to a source draft.`,
      );
      unresolved++;
      continue;
    }

    const draftSnap = await db.collection(STORIES_COLLECTION).doc(draftId).get();
    if (!draftSnap.exists) {
      console.log(
        `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — source draft ` +
          `${STORIES_COLLECTION}/${draftId} not found.`,
      );
      unresolved++;
      continue;
    }

    const outputLanguage = draftSnap.data()?.brief?.outputLanguage;
    if (!outputLanguage) {
      console.log(
        `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — ${STORIES_COLLECTION}/${draftId} ` +
          `has no brief.outputLanguage.`,
      );
      unresolved++;
      continue;
    }

    const correctLanguage: StoryLanguage = coerceStoryLanguage(outputLanguage);

    if (correctLanguage === currentLanguage) {
      alreadyCorrect++;
      continue;
    }

    console.log(
      `   ✅ ${APPLY ? "PATCHED" : "WOULD PATCH"} ${doc.id} ("${data.title}"): ` +
        `generationConfig.language "${currentLanguage}" → "${correctLanguage}" ` +
        `(from ${STORIES_COLLECTION}/${draftId})`,
    );
    if (APPLY) {
      await doc.ref.update({ "generationConfig.language": correctLanguage });
    }
    fixed++;
  }

  console.log(
    `\n📊 ${fixed} ${APPLY ? "fixed" : "to fix"}, ${alreadyCorrect} already correct, ` +
      `${unresolved} unresolved\n`,
  );
  if (!APPLY) {
    console.log("ℹ️  Re-run with --apply to write these changes.\n");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  });
