import { z } from "zod";

/**
 * Brief enums (vocabulary)
 * These are the single source of truth for allowed values in structured fields.
 */
export const StoryTypeEnum = z.enum([
  "Fear & Anxiety",
  "Big Emotions",
  "Loss & Grief",
  "Identity & Self-Worth",
  "Life Transitions",
]);
export type StoryType = z.infer<typeof StoryTypeEnum>;

export const AgeRangeEnum = z.enum(["3–5", "5–7", "7–9", "9–12"]);
export type AgeRange = z.infer<typeof AgeRangeEnum>;

export const PeakIntensityEnum = z.enum(["Very gentle", "Moderate", "Significant"]);
export type PeakIntensity = z.infer<typeof PeakIntensityEnum>;

export const StoryLengthEnum = z.enum(["Short", "Standard", "Extended"]);
export type StoryLength = z.infer<typeof StoryLengthEnum>;

export const ResolutionCompletenessEnum = z.enum(["Full", "Partial", "Open"]);
export type ResolutionCompleteness = z.infer<typeof ResolutionCompletenessEnum>;

export const ShameDimensionEnum = z.enum([
  "Not significant",
  "Present — handle with care",
  "Central to the experience",
]);
export type ShameDimension = z.infer<typeof ShameDimensionEnum>;

export const PrimaryApproachEnum = z.enum([
  "Normalization",
  "Cognitive reframing",
  "Graduated exposure",
  "Modeling",
  "Reassurance & predictability",
  "Self-regulation",
  "Psychoeducation (age-appropriate)",
]);
export type PrimaryApproach = z.infer<typeof PrimaryApproachEnum>;

export const SupportingApproachEnum = PrimaryApproachEnum;
export type SupportingApproach = z.infer<typeof SupportingApproachEnum>;

export const SomaticExpressionEnum = z.enum([
  "Freezing / going still",
  "Crying / clinging",
  "Stomach ache / feeling sick",
  "Heart racing / can't breathe",
  "Restless / fidgety / can't sit still",
  "Going quiet / shutting down",
  "Tension / clenching (jaw, fists, shoulders)",
  "Sweating / feeling hot",
]);
export type SomaticExpression = z.infer<typeof SomaticExpressionEnum>;

export const CopingToolEnum = z.enum([
  "Deep breathing",
  "Counting",
  "Grounding through senses",
  "Positive self-talk",
  "Visualization",
  "Routine awareness",
  "Safe person",
  "Comfort object or memory",
  "Asking for help",
]);
export type CopingTool = z.infer<typeof CopingToolEnum>;

export const ProtagonistTypeEnum = z.enum(["Child character", "Animal character", "Fantasy character"]);
export type ProtagonistType = z.infer<typeof ProtagonistTypeEnum>;

export const ProtagonistGenderEnum = z.enum(["Boy", "Girl", "Kept open"]);
export type ProtagonistGender = z.infer<typeof ProtagonistGenderEnum>;

export const AgeRelationEnum = z.enum(["Same age", "Slightly older"]);
export type AgeRelation = z.infer<typeof AgeRelationEnum>;

export const CaregiverPresenceEnum = z.enum([
  "Present and comforting",
  "Guides from the side",
  "Leaves and returns",
  "Waiting at the end",
  "Not present",
]);
export type CaregiverPresence = z.infer<typeof CaregiverPresenceEnum>;

export const NarrativeDistanceEnum = z.enum(["Direct", "Parallel", "Metaphorical"]);
export type NarrativeDistance = z.infer<typeof NarrativeDistanceEnum>;

export const SupportingCharacterLabelEnum = z.enum([
  "A peer who shows it's possible",
  "A peer who goes through it alongside",
  "A teacher or adult who guides",
  "An animal friend who accompanies",
  "A sibling who offers perspective",
]);
export type SupportingCharacterLabel = z.infer<typeof SupportingCharacterLabelEnum>;

const NonEmptyTrimmedString = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: "Must be a non-empty string" });

/**
 * 1) StoryBriefSchema — full brief input (pilot is Fear & Anxiety, but schema
 * mirrors the brief spec's story type selector to prepare for extension).
 */
export const StoryBriefSchema = z
  .object({
    story_type: StoryTypeEnum,

    // Section 1 — Age & Story Scope
    age_range: AgeRangeEnum,
    peak_emotional_intensity: PeakIntensityEnum,
    story_length: StoryLengthEnum,

    // Section 2 — Clinical Foundation
    emotional_world_of_population: z.string().max(600),
    specific_trigger: z.string().max(400),
    therapeutic_intention: z.object({
      feel: NonEmptyTrimmedString,
      because: NonEmptyTrimmedString,
    }),
    clinical_creative_vision: z.string().max(400),
    one_true_thing: z.string().max(300).optional(),

    // Section 3 — Therapeutic Architecture
    primary_therapeutic_approach: PrimaryApproachEnum,
    supporting_approach: SupportingApproachEnum.optional(),
    shame_dimension: ShameDimensionEnum,

    // TODO: When non-pilot story types are designed by the clinical team,
    // convert this to a discriminated union keyed by story_type. Currently
    // only the Fear & Anxiety shape is defined. See brief spec section 17.
    field_3_4: z.object({
      somatic_selections: z.array(SomaticExpressionEnum).min(1).max(2),
      somatic_free_text: z.string().max(150).optional(),
    }),

    coping_tool: CopingToolEnum,
    resolution_completeness: ResolutionCompletenessEnum,
    must_never_list: z.array(NonEmptyTrimmedString).min(1),

    // Section 4 — Story World
    personalization_on: z.boolean(),
    protagonist_gender: ProtagonistGenderEnum.optional(),
    protagonist_type: ProtagonistTypeEnum,
    protagonist_age_relative_to_reader: AgeRelationEnum.optional(),
    caregiver_presence: CaregiverPresenceEnum,
    narrative_distance: NarrativeDistanceEnum,
    parallel_equivalent_challenge: z.string().max(200).optional(),
    supporting_characters: z
      .array(
        z.object({
          label: SupportingCharacterLabelEnum,
          functional_role: z.string().max(150).optional(),
        }),
      )
      .max(2)
      .optional(),
    character_notes: z.string().max(300).optional(),

    // Section 5 — Personalization Configuration
    personalization_constraints: z.array(NonEmptyTrimmedString).optional(),
    why_not_personalized: z.string().optional(),
  })
  .superRefine((brief, ctx) => {
    // Personalization strict mode invariants
    if (brief.personalization_on) {
      if (brief.protagonist_gender !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["protagonist_gender"],
          message: "Must not be provided when personalization_on is true",
        });
      }
      if (brief.protagonist_age_relative_to_reader !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["protagonist_age_relative_to_reader"],
          message: "Must not be provided when personalization_on is true",
        });
      }
      if (brief.why_not_personalized !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["why_not_personalized"],
          message: "Must not be provided when personalization_on is true",
        });
      }

      if (brief.protagonist_type !== "Child character") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["protagonist_type"],
          message: 'When personalization_on is true, protagonist_type must be "Child character"',
        });
      }
    } else {
      if (brief.protagonist_gender === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["protagonist_gender"],
          message: "Required when personalization_on is false",
        });
      }
      if (brief.protagonist_age_relative_to_reader === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["protagonist_age_relative_to_reader"],
          message: "Required when personalization_on is false",
        });
      }
      if (brief.why_not_personalized === undefined || brief.why_not_personalized.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["why_not_personalized"],
          message: "Required when personalization_on is false",
        });
      }
      if (brief.personalization_constraints !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["personalization_constraints"],
          message: "Must not be provided when personalization_on is false",
        });
      }
    }

    // Narrative distance sub-field logic
    if (brief.narrative_distance !== "Parallel" && brief.parallel_equivalent_challenge !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parallel_equivalent_challenge"],
        message: 'Must not be provided unless narrative_distance is "Parallel"',
      });
    }
  });

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

/**
 * 2) PreCheckResultSchema — rule-based pre-check output.
 */
export const PreCheckResultSchema = z.object({
  quality_gate_findings: z.array(
    z.object({
      field: z.enum(["clinical_creative_vision", "specific_trigger", "therapeutic_intention"]),
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
  story_architect: StoryArchitectOutputSchema,
  author: AuthorOutputSchema,
  post_validation: PostValidationResultSchema,
});
export type Agent1Result = z.infer<typeof Agent1ResultSchema>;
