/**
 * Ops tool: resume personalized story generations that got stuck in
 * generationStatus "in_progress" — e.g. because the server process was
 * killed/restarted while runFullStoryGeneration was still running. There is
 * no watchdog for this today, so any interrupted job stays stuck forever
 * until manually resumed via this script (or retryStuckGeneration is wired
 * into an admin endpoint).
 *
 * Usage (from server/):
 *   npx ts-node -r tsconfig-paths/register scripts/resumeStuckStories.ts <storyId> [storyId...]
 *
 * With no args, finds and resumes every personalizedStory currently stuck in
 * "pending" or "in_progress".
 */

import "dotenv/config";
import { db } from "../src/config/firebase";
import { registerImageProviderForStory, retryStuckGeneration } from "../src/services/fullStoryGeneration.service";
import { SeedreamProvider } from "../src/providers/seedream.provider";

async function findStuckStoryIds(): Promise<string[]> {
  const snap = await db
    .collection("personalizedStories")
    .where("generationStatus", "in", ["pending", "in_progress"])
    .get();
  return snap.docs.map((d) => d.id);
}

async function run() {
  if (!process.env.ARK_API_KEY) {
    throw new Error("ARK_API_KEY not set — cannot generate images.");
  }
  registerImageProviderForStory(new SeedreamProvider());

  const argIds = process.argv.slice(2);
  const storyIds = argIds.length > 0 ? argIds : await findStuckStoryIds();

  if (storyIds.length === 0) {
    console.log("No stuck stories found.");
    process.exit(0);
  }

  console.log(`Resuming ${storyIds.length} stor${storyIds.length === 1 ? "y" : "ies"}: ${storyIds.join(", ")}`);

  for (const storyId of storyIds) {
    console.log(`\nResuming ${storyId}...`);
    try {
      await retryStuckGeneration(storyId);
      console.log(`  -> done`);
    } catch (err) {
      console.error(`  -> failed:`, err);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
