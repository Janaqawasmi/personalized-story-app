import { db } from "../src/config/firebase";
import { COLLECTIONS } from "../src/shared/firestore/paths";

/**
 * Legacy specialist stories may lack `currentVisualBibleVersion` on the parent
 * document while v2 artefacts already exist under `visualBibles` / `scenePlans`.
 * This backfills that field so REST payloads and the Illustrations tab stay aligned.
 *
 * Run from `server/` (with Firebase credentials as for other scripts):
 *   npx ts-node -r tsconfig-paths/register scripts/backfillStoryVisualBibleVersion.ts <storyId>
 *
 * Or: npm run backfill:story-visual-bible-version -- <storyId>
 */
async function main(): Promise<void> {
  const storyId = (process.argv[2] ?? process.env.STORY_ID ?? "").trim();
  if (!storyId) {
    console.error(
      "Missing story id. Usage:\n" +
        "  cd server && npx ts-node -r tsconfig-paths/register scripts/backfillStoryVisualBibleVersion.ts <storyId>\n" +
        "  npm run backfill:story-visual-bible-version -- <storyId>\n" +
        "or set STORY_ID.",
    );
    process.exit(1);
  }

  const ref = db.collection(COLLECTIONS.STORIES).doc(storyId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No document at stories/${storyId}`);
    process.exit(1);
  }

  const data = snap.data() as Record<string, unknown>;
  const existing = data.currentVisualBibleVersion;
  if (typeof existing === "number") {
    console.log(`currentVisualBibleVersion already set (${existing}). Nothing to do.`);
    process.exit(0);
  }

  let resolved: number | null = null;

  const vbSnap = await ref.collection(COLLECTIONS.STORY_VISUAL_BIBLES).get();
  for (const d of vbSnap.docs) {
    const v = d.data().version;
    if (typeof v === "number" && (resolved === null || v > resolved)) {
      resolved = v;
    }
  }

  if (resolved === null) {
    const spSnap = await ref.collection(COLLECTIONS.STORY_SCENE_PLANS).get();
    for (const d of spSnap.docs) {
      const v = d.data().visualBibleVersion;
      if (typeof v === "number" && (resolved === null || v > resolved)) {
        resolved = v;
      }
    }
  }

  if (resolved === null) {
    console.error(
      `Could not infer Visual Bible version: no visualBible "version" or scenePlan "visualBibleVersion" under stories/${storyId}.`,
    );
    process.exit(1);
  }

  const now = Date.now();
  await ref.update({
    currentVisualBibleVersion: resolved,
    updatedAt: now,
  });

  console.log(`Updated stories/${storyId}: currentVisualBibleVersion = ${resolved}`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
