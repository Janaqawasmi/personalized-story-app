// Generate and lock a Visual Bible for a given story.
//
// Calls Claude with ALL story pages so the VB has full narrative context,
// then saves the result to experiments/locked-visual-bibles/<storyId>.json.
//
// Usage:
//   npm run -w server experiment:generate-vb -- --story <storyId>

import "./bootstrap";
import * as fs from "fs";
import * as path from "path";
import { firestore } from "@/config/firebase";
import { STORIES_COLLECTION, type Story } from "@/models/story.model";
import { callClaudeForVisualBible } from "@/specialist/image-prompt-generator";

const OUT_DIR = path.resolve(__dirname, "..", "locked-visual-bibles");

async function loadStory(storyId: string): Promise<Story> {
  const snap = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  if (!snap.exists) throw new Error(`Story not found: ${storyId}`);
  return snap.data() as Story;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  const storyIdx = argv.indexOf("--story");
  if (storyIdx === -1 || !argv[storyIdx + 1]) {
    console.error(
      "\nUsage: npm run -w server experiment:generate-vb -- --story <storyId>\n",
    );
    process.exit(2);
  }
  const storyId = argv[storyIdx + 1]!;

  console.log(`\n[generate-vb] loading story ${storyId}…`);
  const story = await loadStory(storyId);

  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Story ${storyId} has no pages`);
  }

  console.log(`[generate-vb] calling Claude with all ${story.pages.length} pages…`);
  const visualBible = await callClaudeForVisualBible(story.pages, story.brief);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${storyId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(visualBible, null, 2), "utf8");

  console.log(`\n[generate-vb] Visual Bible locked to: ${outPath}`);
  console.log(`\n${JSON.stringify(visualBible, null, 2)}\n`);
  console.log(
    `[generate-vb] Pass to experiment:run with:\n` +
      `  --locked-vb experiments/locked-visual-bibles/${storyId}.json\n`,
  );
}

main().catch((err) => {
  console.error("[generate-vb] fatal:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
