import { executePipeline } from "./pipeline";
import type { Agent1Result, GenerateOptions } from "./types";

export type { Agent1Result, GenerateOptions };

export async function generateStoryDraft(
  briefId: string,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  return executePipeline(briefId, options);
}
