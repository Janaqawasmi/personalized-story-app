import { z } from "zod";

import type { StoryBrief } from "../models/storyBrief.model";

export type { StoryBrief };

/**
 * Quality gate finding keys align with `StoryBrief` section paths (brief model tokens).
 */
export const PreCheckQualityGateFieldSchema = z.enum([
  "clinicalFoundation.creativeVision",
  "clinicalFoundation.trigger",
  "clinicalFoundation.therapeuticIntention",
]);
export type PreCheckQualityGateField = z.infer<typeof PreCheckQualityGateFieldSchema>;

/**
 * 2) PreCheckResultSchema — rule-based pre-check output.
 */
export const PreCheckResultSchema = z.object({
  quality_gate_findings: z.array(
    z.object({
      field: PreCheckQualityGateFieldSchema,
      message: z.string(),
    }),
  ),
  vague_intention_detection: z.object({
    vague_intention_detected: z.boolean(),
    matched_pattern: z.string().optional(),
  }),
  complexity_budget: z.object({
    overloaded: z.boolean(),
    total_estimated_pages: z.number().nonnegative(),
    available_pages: z.object({
      min: z.number().int().positive(),
      max: z.number().int().positive(),
    }),
    contributors: z.array(
      z.object({
        obligation: z.string(),
        estimated_pages: z.number().nonnegative(),
      }),
    ),
  }),
});
export type PreCheckResult = z.infer<typeof PreCheckResultSchema>;

/**
 * 3) StoryArchitectOutputSchema — Step 1 structured output (spec v3 §5.3).
 */
export const StoryArchitectOutputSchema = z.object({
  emotional_truth: z.string(),
  blueprint_points: z.array(z.string()).length(6),
  coping_tool_placement_note: z.string(),
  approach_instruction: z.string(),
  inferred_intention_flag: z.string().nullable(),
  compression_metadata: z.string().nullable(),
});
export type StoryArchitectOutput = z.infer<typeof StoryArchitectOutputSchema>;

/**
 * 4) AuthorOutputSchema — Step 2 output (spec v3 §6.3).
 */
export const AuthorOutputSchema = z.object({
  title: z.string(),
  story: z.string(),
});
export type AuthorOutput = z.infer<typeof AuthorOutputSchema>;

/**
 * 5) PostValidationResultSchema — post-generation validation output (spec v3 §7.3).
 */
export const PostValidationResultSchema = z
  .object({
    status: z.enum(["pass", "flagged"]),
    flags: z.array(
      z.object({
        check: z.enum(["must_never", "shame", "coping_tool", "age_appropriateness"]),
        passage: z.string(),
        reasoning: z.string(),
        severity: z.enum(["likely_violation", "borderline"]),
      }),
    ),
    alignment_note: z.string(),
  })
  .superRefine((result, ctx) => {
    if (result.status === "pass" && result.flags.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flags"],
        message: "When status is pass, flags must be empty",
      });
    }
    if (result.status === "flagged" && result.flags.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flags"],
        message: "When status is flagged, flags must contain at least one item",
      });
    }
  });
export type PostValidationResult = z.infer<typeof PostValidationResultSchema>;

/**
 * 6) Agent1ResultSchema — public output for the specialist.
 */
export const Agent1ResultSchema = z.object({
  pre_check: PreCheckResultSchema,
  story_architect: StoryArchitectOutputSchema,
  author: AuthorOutputSchema,
  post_validation: PostValidationResultSchema,
});
export type Agent1Result = z.infer<typeof Agent1ResultSchema>;
