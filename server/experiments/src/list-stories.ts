// Lists stories that are good candidates for the experiment test set:
// any story whose pages array is populated (i.e. status >= approved).
//
// Usage:
//   npm run -w server experiment:list

import "dotenv/config";
import { firestore } from "@/config/firebase";
import { STORIES_COLLECTION, type Story } from "@/models/story.model";

const ELIGIBLE_STATUSES = new Set([
  "approved",
  "prompt_review",
  "illustrating",
  "illustration_review",
  "illustration_ready",
  "published",
]);

interface Row {
  id: string;
  title: string;
  status: string;
  storyType: string;
  ageRange: string;
  pageCount: number;
  hasVisualBible: boolean;
  updatedAt: string;
}

async function main(): Promise<void> {
  const snap = await firestore.collection(STORIES_COLLECTION).get();
  const rows: Row[] = [];

  for (const doc of snap.docs) {
    const s = doc.data() as Story;
    if (!ELIGIBLE_STATUSES.has(s.status)) continue;
    if (!s.pages || s.pages.length === 0) continue;

    rows.push({
      id: s.id,
      title: s.title || "(untitled)",
      status: s.status,
      storyType: s.storyType,
      ageRange: s.ageRange ?? "?",
      pageCount: s.pages.length,
      hasVisualBible: s.visualBible !== null,
      updatedAt: new Date(s.updatedAt).toISOString().slice(0, 10),
    });
  }

  if (rows.length === 0) {
    console.log("\nNo eligible stories found (need status >= approved with pages populated).");
    return;
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  console.log(`\nEligible stories (${rows.length} total):\n`);
  for (const r of rows) {
    console.log(
      `  ${r.id}\n` +
        `    title:    ${r.title}\n` +
        `    status:   ${r.status}\n` +
        `    type:     ${r.storyType}    age: ${r.ageRange}    pages: ${r.pageCount}    visualBible: ${r.hasVisualBible ? "yes" : "no"}\n` +
        `    updated:  ${r.updatedAt}\n`,
    );
  }
  console.log(
    `\nTip: pick a story with status 'approved' (no prior prompts) for the cleanest baseline,\n` +
      `or any later status if you want to compare against existing illustrations.\n`,
  );
}

main().catch((err) => {
  console.error("[list-stories] failed:", err);
  process.exit(1);
});
