// Prints the page text of a single story so we can pick visually rich pages
// for the experiment test set.
//
// Usage:
//   npm run -w server experiment:pages -- <storyId>

import "./bootstrap";
import { firestore } from "@/config/firebase";
import { STORIES_COLLECTION, type Story } from "@/models/story.model";

async function main(): Promise<void> {
  const storyId = process.argv[2];
  if (!storyId) {
    console.error("Usage: npm run experiment:pages -- <storyId>");
    process.exit(2);
  }

  const snap = await firestore.collection(STORIES_COLLECTION).doc(storyId).get();
  if (!snap.exists) {
    console.error(`Story not found: ${storyId}`);
    process.exit(1);
  }

  const story = snap.data() as Story;
  if (!story.pages || story.pages.length === 0) {
    console.error(`Story ${storyId} has no pages`);
    process.exit(1);
  }

  console.log(`\n${story.title}  —  status: ${story.status}  —  ${story.pages.length} pages\n`);
  console.log("=".repeat(72));
  for (const p of story.pages) {
    console.log(`\nPage ${p.pageNumber}:`);
    console.log(p.text);
    console.log("-".repeat(72));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
