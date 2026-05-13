// Generate and lock a Style Bible for a given story.
//
// Calls Claude with ALL story pages so the bible has full narrative context,
// then saves to experiments/locked-style-bibles/<storyId>.json.
//
// Usage:
//   npm run -w server experiment:generate-sb -- --story <storyId>

import "./bootstrap";
import * as fs from "fs";
import * as path from "path";
import { firestore } from "@/config/firebase";
import { STORIES_COLLECTION, type Story } from "@/models/story.model";
import { callClaudeForStyleBible } from "./style-bible.generator";

const OUT_DIR = path.resolve(__dirname, "..", "locked-style-bibles");

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
      "\nUsage: npm run -w server experiment:generate-sb -- --story <storyId>\n",
    );
    process.exit(2);
  }
  const storyId = argv[storyIdx + 1]!;

  console.log(`\n[generate-sb] loading story ${storyId}…`);
  const story = await loadStory(storyId);

  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Story ${storyId} has no pages`);
  }

  console.log(`[generate-sb] calling Claude with all ${story.pages.length} pages…`);
  const bible = await callClaudeForStyleBible(story.pages, story.brief);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${storyId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bible, null, 2), "utf8");

  console.log(`\n[generate-sb] Style Bible locked to: ${outPath}`);
  console.log(`\ncharacterAnchor:\n  ${bible.characterAnchor}`);
  console.log(`\nconsistencyAnchors:\n${bible.consistencyAnchors.map((a) => `  - ${a}`).join("\n")}`);
  console.log(`\navoidList:\n${bible.avoidList.map((a) => `  - ${a}`).join("\n")}`);
  console.log(`\nenvironmentRegistry keys: ${Object.keys(bible.environmentRegistry).join(", ")}`);
  console.log(
    `\n[generate-sb] Pass to experiment:run with:\n` +
      `  --locked-sb experiments/locked-style-bibles/${storyId}.json\n`,
  );
}

main().catch((err) => {
  console.error("[generate-sb] fatal:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
