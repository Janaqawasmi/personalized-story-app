/**
 * Zod runtime validation for story brief payloads (Agent 1 and API routes).
 * Mirrors `storyBrief.model.ts` token enums — single source of truth for allowed values.
 */
import { z } from "zod";

import {
  AGE_RANGES,
  CAREGIVER_PRESENCES,
  FEAR_ANXIETY_APPROACHES,
  FEAR_ANXIETY_COPING_TOOLS,
  NARRATIVE_DISTANCES,
  PEAK_INTENSITIES,
  PROTAGONIST_AGES,
  PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES,
  RESOLUTION_OPTIONS,
  SHAME_DIMENSIONS,
  STORY_LENGTHS,
  STORY_TYPES,
  SOMATIC_EXPRESSIONS,
  SUPPORTING_CHARACTER_TYPES,
} from "./storyBrief.model";

function enumFrom<const T extends readonly string[]>(arr: T): z.ZodEnum<[T[number], ...T[number][]]> {
  const [first, ...rest] = arr;
  return z.enum([first, ...rest] as [T[number], ...T[number][]]);
}

const StoryTypeSchema = enumFrom(STORY_TYPES);
const AgeRangeSchema = enumFrom(AGE_RANGES);
const PeakIntensitySchema = enumFrom(PEAK_INTENSITIES);
const StoryLengthSchema = enumFrom(STORY_LENGTHS);
const TherapeuticApproachSchema = enumFrom(FEAR_ANXIETY_APPROACHES);
const ShameDimensionSchema = enumFrom(SHAME_DIMENSIONS);
const SomaticExpressionSchema = enumFrom(SOMATIC_EXPRESSIONS);
const CopingToolSchema = enumFrom(FEAR_ANXIETY_COPING_TOOLS);
const ResolutionCompletenessSchema = enumFrom(RESOLUTION_OPTIONS);
const ProtagonistGenderSchema = enumFrom(PROTAGONIST_GENDERS);
const ProtagonistTypeSchema = enumFrom(PROTAGONIST_TYPES);
const ProtagonistAgeSchema = enumFrom(PROTAGONIST_AGES);
const CaregiverPresenceSchema = enumFrom(CAREGIVER_PRESENCES);
const NarrativeDistanceSchema = enumFrom(NARRATIVE_DISTANCES);
const SupportingCharacterTypeSchema = enumFrom(SUPPORTING_CHARACTER_TYPES);

export const TherapeuticIntentionSchema = z.object({
  feel: z.string().min(1),
  because: z.string().min(1),
});

const SomaticExpressionFieldSchema = z.object({
  fieldType: z.literal("somatic_expression"),
  selections: z.array(SomaticExpressionSchema).min(1).max(2),
  freeText: z.string().max(150).optional(),
});

const EmotionAppearanceFieldSchema = z.object({
  fieldType: z.literal("emotion_appearance"),
  text: z.string().max(300),
});

const GriefProcessFieldSchema = z.object({
  fieldType: z.literal("grief_process"),
  selection: z.string().min(1),
});

const NegativeSelfBeliefFieldSchema = z.object({
  fieldType: z.literal("negative_self_belief"),
  text: z.string().max(200),
});

const TransitionLossFieldSchema = z.object({
  fieldType: z.literal("transition_loss"),
  text: z.string().max(300),
});

export const TypeSpecificClinicalFieldSchema = z.discriminatedUnion("fieldType", [
  SomaticExpressionFieldSchema,
  EmotionAppearanceFieldSchema,
  GriefProcessFieldSchema,
  NegativeSelfBeliefFieldSchema,
  TransitionLossFieldSchema,
]);

export const AgeAndScopeSchema = z.object({
  ageRange: AgeRangeSchema,
  peakIntensity: PeakIntensitySchema,
  storyLength: StoryLengthSchema,
});

export const ClinicalFoundationSchema = z.object({
  population: z.string().max(600),
  trigger: z.string().max(400),
  therapeuticIntention: TherapeuticIntentionSchema,
  creativeVision: z.string().max(400),
  oneTrueThing: z.string().max(300).optional(),
});

export const SupportingCharacterSelectionSchema = z.object({
  type: SupportingCharacterTypeSchema,
  functionalRole: z.string().max(150).optional(),
});

export const TherapeuticArchitectureSchema = z.object({
  primaryApproach: TherapeuticApproachSchema,
  supportingApproach: TherapeuticApproachSchema.optional(),
  shameDimension: ShameDimensionSchema,
  typeSpecificField: TypeSpecificClinicalFieldSchema,
  copingTool: CopingToolSchema,
  resolutionCompleteness: ResolutionCompletenessSchema,
  mustNeverList: z.array(z.string().min(1)).min(1),
});

export const StoryWorldSchema = z.object({
  personalization: z.boolean(),
  protagonistGender: ProtagonistGenderSchema.optional(),
  protagonistType: ProtagonistTypeSchema,
  protagonistAge: ProtagonistAgeSchema.optional(),
  caregiverPresence: CaregiverPresenceSchema,
  narrativeDistance: NarrativeDistanceSchema,
  parallelChallenge: z.string().max(200).optional(),
  supportingCharacters: z.array(SupportingCharacterSelectionSchema).max(2).optional(),
  characterNotes: z.string().max(300).optional(),
});

export const PersonalizationConfigSchema = z.object({
  personalizationConstraints: z.array(z.string().min(1)).optional(),
  whyNot: z.string().optional(),
});

/**
 * Brief sections only — no Firestore metadata. Used for Agent 1 generation requests.
 */
export const Agent1StoryBriefPayloadSchema = z.object({
  storyType: StoryTypeSchema,
  ageAndScope: AgeAndScopeSchema,
  clinicalFoundation: ClinicalFoundationSchema,
  therapeuticArchitecture: TherapeuticArchitectureSchema,
  storyWorld: StoryWorldSchema,
  personalizationConfig: PersonalizationConfigSchema,
  acknowledgedWarnings: z.array(z.string()).optional(),
});

export type Agent1StoryBriefPayload = z.infer<typeof Agent1StoryBriefPayloadSchema>;

/**
 * POST /api/agent1/generate body: `{ brief: Agent1StoryBriefPayload }`
 */
export const Agent1GenerateRequestSchema = z.object({
  brief: Agent1StoryBriefPayloadSchema,
});

export type Agent1GenerateRequest = z.infer<typeof Agent1GenerateRequestSchema>;
