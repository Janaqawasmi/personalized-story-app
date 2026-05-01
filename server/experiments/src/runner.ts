// Orchestrator: load story from Firestore (read-only), dispatch the variant,
// persist outputs to disk. NEVER writes back to Firestore.

import "./bootstrap";
import * as fs from "fs";
import * as path from "path";
import { firestore } from "@/config/firebase";
import { STORIES_COLLECTION, type Story } from "@/models/story.model";
import type { VisualBible } from "@/models/story.model";
import { ensureDir, writeMetadata, writeReport } from "./helpers";
import type { RunContext } from "./types";
import { getVariant } from "./variants";

export interface RunOptions {
  variantId: string;
  storyId: string;
  pageNumbers: number[];
  /** Folder name under experiments/results/. */
  outName: string;
  /**
   * Absolute path to a locked Visual Bible JSON file.
   * When provided, all variants skip VB generation and use this instead,
   * ensuring only one variable differs between runs.
   */
  lockedVbPath?: string;
}

async function loadStoryReadOnly(storyId: string): Promise<Story> {
  const snap = await firestore
    .collection(STORIES_COLLECTION)
    .doc(storyId)
    .get();
  if (!snap.exists) {
    throw new Error(`Story not found: ${storyId}`);
  }
  return snap.data() as Story;
}

export async function runExperiment(opts: RunOptions): Promise<void> {
  const variant = getVariant(opts.variantId);
  const story = await loadStoryReadOnly(opts.storyId);

  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Story ${opts.storyId} has no pages — cannot run experiment.`);
  }

  const outDir = path.resolve(__dirname, "..", "results", opts.outName);
  ensureDir(outDir);

  let lockedVisualBible: VisualBible | undefined;
  if (opts.lockedVbPath) {
    const raw = fs.readFileSync(opts.lockedVbPath, "utf8");
    lockedVisualBible = JSON.parse(raw) as VisualBible;
    console.log(`[runner] loaded locked Visual Bible from ${opts.lockedVbPath}`);
  }

  const ctx: RunContext = {
    story,
    targetPageNumbers: opts.pageNumbers,
    outDir,
    log: (msg) => console.log(msg),
    ...(lockedVisualBible ? { lockedVisualBible } : {}),
  };

  console.log(
    `\n[runner] variant=${variant.id}  story=${story.id}  pages=[${opts.pageNumbers.join(",")}]  out=${opts.outName}\n`,
  );

  const result = await variant.run(ctx);

  writeMetadata(outDir, result);
  writeReport(outDir, result, opts.outName);

  const successes = result.pages.filter((p) => !p.error).length;
  const failures = result.pages.length - successes;
  console.log(
    `\n[runner] done in ${(result.totalLatencyMs / 1000).toFixed(1)}s — ${successes} ok, ${failures} failed.`,
  );
  console.log(`[runner] outputs: ${outDir}`);
}
