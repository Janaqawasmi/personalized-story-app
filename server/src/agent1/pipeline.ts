import type { Agent1StoryBriefPayload } from "../models/storyBrief.schema";
import { runAuthor } from "./author";
import { runPostValidation } from "./postValidation";
import { runPreCheck } from "./preCheck";
import { runStoryArchitect } from "./storyArchitect";
import type { Agent1Result, PostValidationResult } from "./types";

const FALLBACK_POST_VALIDATION: PostValidationResult = {
  status: "pass",
  flags: [],
  alignment_note:
    "Automated validation did not complete; please review the draft clinically.",
};

/**
 * Agent 1: pre-check → Story Architect → Author → post-validation (spec v3).
 * Post-validation never blocks; on failure the story still returns with a neutral pass + note.
 */
export async function runAgent1(brief: Agent1StoryBriefPayload): Promise<Agent1Result> {
  const pre_check = runPreCheck(brief);
  const story_architect = await runStoryArchitect(brief, pre_check);
  const author = await runAuthor(brief, story_architect);
  let post_validation: PostValidationResult;
  try {
    post_validation = await runPostValidation(brief, author, story_architect);
  } catch (err) {
    console.error("Agent 1 post-validation failed:", err);
    post_validation = FALLBACK_POST_VALIDATION;
  }
  return { pre_check, story_architect, author, post_validation };
}
