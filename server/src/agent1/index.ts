import { executePipeline, executePipelineWithBrief } from "./pipeline";
import type { StoryBrief } from "@/models/storyBrief.model";
import type { Agent1Result, GenerateOptions } from "./types";

export type { Agent1Result, GenerateOptions };

export { executePipelineWithBrief } from "./pipeline";

export {
  BriefNotReadyError,
  UnsupportedStoryTypeError,
  TypeMismatchError,
  Step1IncoherentError,
} from "./types";

export async function generateStoryDraft(
  briefId: string,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  return executePipeline(briefId, options);
}

export async function generateStoryDraftFromBrief(
  brief: StoryBrief,
  options?: GenerateOptions,
): Promise<Agent1Result> {
  return executePipelineWithBrief(brief, options);
}
