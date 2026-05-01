// Experiment harness contracts.
//
// A Variant is one configuration of the image-generation pipeline (which
// prompt model, which image model, which reference strategy, etc.). The
// runner loads a real story from Firestore, hands it to the variant, and
// the variant returns RunResult — which the runner serialises to disk.

import type { PageIllustration, Story, VisualBible } from "@/models/story.model";

export interface RunContext {
  story: Story;
  /** Pages (by pageNumber) the user wants illustrated for this run. */
  targetPageNumbers: number[];
  /** Absolute path of the experiment's output directory. */
  outDir: string;
  log: (msg: string) => void;
  /**
   * When set, variants must skip Visual Bible generation and use this instead.
   * Enforces one-variable isolation across experiments.
   */
  lockedVisualBible?: VisualBible;
}

export interface PageRunResult {
  pageNumber: number;
  pageText: string;
  /** The Claude/GPT-generated scene prompt (before style/character wrap). */
  imagePrompt: string;
  /** The exact text sent to the image provider. */
  finalPromptToImageModel: string;
  /** Filename of the saved image, relative to outDir. */
  imageFilename: string;
  /** Reference image used (URL or relative filename), if any. */
  referenceImage?: string;
  latencyMs: number;
  error?: string;
}

export interface RunResult {
  variantId: string;
  variantDescription: string;
  storyId: string;
  promptModel: string;
  imageModel: string;
  referenceStrategy: "none" | "page1" | "rolling" | "avatar" | "other";
  seed?: number;
  visualBible?: VisualBible;
  pages: PageRunResult[];
  totalLatencyMs: number;
  notes?: string;
}

export interface ExperimentVariant {
  id: string;
  description: string;
  run(ctx: RunContext): Promise<RunResult>;
}

/** Convenience: the subset of pages the variant should generate. */
export function selectTargetPages(
  story: Story,
  targetPageNumbers: number[],
): PageIllustration[] {
  if (!story.pages || story.pages.length === 0) {
    throw new Error(`Story ${story.id} has no pages`);
  }
  const byNumber = new Map(story.pages.map((p) => [p.pageNumber, p]));
  const missing = targetPageNumbers.filter((n) => !byNumber.has(n));
  if (missing.length > 0) {
    throw new Error(
      `Story ${story.id} is missing pages: ${missing.join(", ")}. ` +
        `Available: ${[...byNumber.keys()].join(", ")}`,
    );
  }
  return targetPageNumbers.map((n) => byNumber.get(n)!);
}
