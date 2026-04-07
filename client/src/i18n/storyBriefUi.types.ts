import type {
  AgeRange,
  CaregiverPresence,
  CopingTool,
  NarrativeDistance,
  PeakIntensity,
  ProtagonistAgeRelative,
  ProtagonistGender,
  ProtagonistType,
  ResolutionCompleteness,
  ShameDimension,
  SomaticExpression,
  StoryLength,
  StoryType,
  SupportingCharacter,
  TherapeuticApproach,
} from "../types/storyBrief";
import type { BriefFeedbackVerdictId } from "../types/storyBriefFeedback";

export interface IntentionExampleUi {
  feel: string;
  because: string;
  note?: string;
}

export interface PopulationThinkingScaffoldUi {
  summaryTitle: string;
  subQuestions: string[];
}

export interface CopingToolCategoryUi {
  label: string;
  tools: CopingTool[];
}

export interface SubmitGateCopy {
  title: string;
  message: string;
  clinicalNote: string;
}

export interface FeedbackVerdictUi {
  label: string;
  description: string;
}

export interface StoryBriefUi {
  STORY_TYPE_LABELS: Record<StoryType, string>;
  STORY_TYPE_DESCRIPTIONS: Record<StoryType, string>;
  AGE_RANGE_LABELS: Record<AgeRange, string>;
  PEAK_INTENSITY_LABELS: Record<PeakIntensity, string>;
  PEAK_INTENSITY_DEFINITIONS: Record<PeakIntensity, string>;
  STORY_LENGTH_LABELS: Record<StoryLength, string>;
  STORY_LENGTH_PREVIEWS: Record<AgeRange, Record<StoryLength, string>>;
  WARN_SIGNIFICANT_YOUNG_AGE: string;
  POPULATION_THINKING_SCAFFOLDS: Partial<Record<StoryType, PopulationThinkingScaffoldUi>>;
  TRIGGER_LABELS: Partial<Record<StoryType, string>>;
  TRIGGER_NUDGE: string;
  INTENTION_NUDGE: string;
  INTENTION_GOOD_EXAMPLES: Partial<Record<StoryType, IntentionExampleUi[]>>;
  INTENTION_BAD_EXAMPLES: Partial<Record<StoryType, IntentionExampleUi[]>>;
  THERAPEUTIC_APPROACH_LABELS: Record<TherapeuticApproach, string>;
  THERAPEUTIC_APPROACH_DEFINITIONS: Record<TherapeuticApproach, string>;
  SHAME_DIMENSION_LABELS: Record<ShameDimension, string>;
  SHAME_DIMENSION_DESCRIPTIONS: Record<ShameDimension, string>;
  SOMATIC_EXPRESSION_LABELS: Record<SomaticExpression, string>;
  COPING_TOOL_LABELS: Record<CopingTool, string>;
  COPING_TOOL_CATEGORIES_FEAR_ANXIETY: CopingToolCategoryUi[];
  RESOLUTION_LABELS: Record<ResolutionCompleteness, string>;
  RESOLUTION_DESCRIPTIONS: Record<ResolutionCompleteness, string>;
  MUST_NEVER_DEFAULTS: Record<StoryType, string[]>;
  PERSONALIZATION_OPTION_DESCRIPTIONS: Record<"yes" | "no", string>;
  PROTAGONIST_GENDER_LABELS: Record<ProtagonistGender, string>;
  PROTAGONIST_GENDER_NOTE: Record<ProtagonistGender, string | null>;
  PROTAGONIST_TYPE_LABELS: Record<ProtagonistType, string>;
  PROTAGONIST_TYPE_AGE_GUIDANCE: Partial<Record<AgeRange, string>>;
  PROTAGONIST_AGE_RELATIVE_LABELS: Record<ProtagonistAgeRelative, string>;
  CAREGIVER_PRESENCE_LABELS: Record<CaregiverPresence, string>;
  CAREGIVER_PRESENCE_DESCRIPTIONS: Partial<Record<CaregiverPresence, string>>;
  NARRATIVE_DISTANCE_LABELS: Record<NarrativeDistance, string>;
  NARRATIVE_DISTANCE_DEFINITIONS: Record<NarrativeDistance, string>;
  SUPPORTING_CHARACTER_LABELS: Record<SupportingCharacter, string>;
  PERSONALIZATION_CONSTRAINTS_DEFAULTS: Partial<Record<StoryType, string[]>>;

  preBriefOverline: string;
  preBriefTitle: string;
  preBriefSubtitle: string;
  draftSavedBannerTitle: string;
  draftSavedBriefWord: string;
  draftSavedSavedPrefix: string;
  resume: string;
  startOver: string;
  comingSoon: string;
  beginBrief: string;
  savedPrefix: string;
  draftSavedSnackbar: string;
  submitErrorGeneric: string;

  sectionOf: (section: number) => string;
  sectionLabels: Record<number, { full: string; short: string }>;
  progressNavAriaLabel: string;
  progressStepAria: (args: {
    num: number;
    fullName: string;
    clickable: boolean;
    isCurrent: boolean;
    lockedFuture: boolean;
  }) => string;
  sectionMobileLine: (current: number) => string;

  s1Overline: string;
  s1Title: string;
  s1Intro: string;
  s1Field11: string;
  s1Field12: string;
  s1Field12Helper: string;
  s1IntensityWarningTitle: string;
  s1IntensityWarningFooter: string;
  s1Field13: string;
  s1Field13Helper: string;
  s1PreviewPlaceholder: string;
  s1MissingAge: string;
  s1MissingPeak: string;
  ariaAgeRange: (label: string) => string;

  s2Overline: string;
  s2Title: string;
  s2Intro: string;
  s2Field21: string;
  s2Field21Helper: string;
  s2Field21Placeholder: string;
  s2Field22Helper: string;
  s2Field22Placeholder: string;
  s2Field23: string;
  s2Field23Helper: string;
  s2IntentionFeelPrefix: string;
  s2IntentionBecausePrefix: string;
  s2IntentionFeelPlaceholder: string;
  s2IntentionBecausePlaceholder: string;
  s2IntentionAriaFeel: string;
  s2IntentionAriaBecause: string;
  s2StrongExamples: string;
  s2AvoidThis: string;
  s2Field24: string;
  s2Field24Helper: string;
  s2Field24Placeholder: string;
  s2Field25: string;
  s2Field25Helper: string;
  s2Field25Placeholder: string;
  s2MissingPopulation: string;
  s2MissingIntention: string;
  s2MissingCreative: string;
  fallbackTriggerLabel: string;

  s3Overline: string;
  s3Title: string;
  s3Intro: string;
  s3Field31: string;
  s3Field31Helper: string;
  s3Field32: string;
  s3Field32Helper: string;
  s3NoSupporting: string;
  s3AriaNoSupporting: string;
  s3ApproachConflictInline: string;
  s3Field33: string;
  s3Field33Helper: string;
  s3Field34: string;
  s3Field34Helper: string;
  s3SomaticOtherLabel: string;
  s3SomaticOtherPlaceholder: string;
  s3Field35: string;
  s3Field35Helper: string;
  s3AbstractAgeNote: string;
  s3Field36: string;
  s3Field36Helper: string;
  s3DefaultSuffix: string;
  s3Field37: string;
  s3Field37Helper: string;
  s3MustNeverPlaceholder: string;
  s3MustNeverEmptyWarning: string;
  s3AddConstraint: string;
  s3MissingPrimary: string;
  s3MissingShame: string;
  s3MissingSomatic: string;
  s3MissingCoping: string;
  s3MissingResolution: string;
  s3MissingMustNever: string;
  s3ResolutionPartialNote: string;

  s4Overline: string;
  s4Title: string;
  s4Intro: string;
  s4Field40: string;
  s4Field40Helper: string;
  s4PersonalizationYes: string;
  s4PersonalizationNo: string;
  s4AriaPersonalizationYes: string;
  s4AriaPersonalizationNo: string;
  s4Field41: string;
  s4Field41Helper: string;
  s4Field42: string;
  s4LockedChildTitle: string;
  s4LockedChildSubtitle: string;
  s4LockedChip: string;
  s4Field42Helper: string;
  s4Field43: string;
  s4Field43Helper: string;
  s4Field44: string;
  s4Field44Helper: string;
  s4Field45: string;
  s4Field45Helper: string;
  s4ParallelTitle: string;
  s4ParallelHelper: string;
  s4ParallelPlaceholder: string;
  s4DirectPersonalizationWarning: string;
  s4Field46: string;
  s4Field46Helper: (max: number) => string;
  s4RolePlaceholder: string;
  s4RoleAria: (charLabel: string) => string;
  s4Field47: string;
  s4Field47Helper: string;
  s4Field47Placeholder: string;
  s4MissingGender: string;
  s4MissingType: string;
  s4MissingCaregiver: string;
  s4MissingNarrative: string;

  s5Overline: string;
  s5Title: string;
  s5IntroOn: string;
  s5IntroOff: string;
  s5Field51: string;
  s5Field51Helper: string;
  s5ConstraintPlaceholder: string;
  s5ConstraintsInfo: string;
  s5Field52: string;
  s5Field52Helper: string;
  s5Field52Placeholder: string;
  s5AlmostDoneTitle: string;
  s5AlmostDoneBody: string;
  s5MissingWhyNot: string;
  submitBrief: string;
  submitting: string;

  optionalSuffix: string;
  requiredMark: string;
  charactersCount: (used: number, max: number) => string;
  back: string;
  saveContinue: string;
  validationAlmostThere: string;
  validationToContinue: string;
  validationHint: string;
  validationFieldsLeftOne: string;
  validationFieldsLeftMany: (n: number) => string;
  validationAriaLabel: string;
  validationGoTo: (label: string) => string;
  validationRequiredStatus: string;

  gateHardBlockTitle: string;
  gateHardBlockBody: string;
  gateHardBlockButton: string;
  gateHardWarningTitle: string;
  gateHardWarningBody: string;
  gateHardWarningCheckbox: string;
  gateProceed: string;
  submitGateCopy: Record<
    | "relational_tool_no_responder"
    | "significant_intensity_young_age"
    | "graduated_exposure_comforting_caregiver"
    | "conflicting_approach_pair",
    SubmitGateCopy
  >;

  successTitle: string;
  successSubtitle: string;
  successBriefId: string;
  successJsonTitle: string;
  successDownload: string;
  successCopy: string;
  successCopied: string;
  successCopyFailed: string;
  successCreateAnother: string;

  feedbackTitle: string;
  feedbackBriefChip: (id: string) => string;
  feedbackFieldPrefix: string;
  feedbackAssessment: string;
  feedbackClear: string;
  feedbackNoteRecommended: string;
  feedbackNoteOptional: string;
  feedbackNotePlaceholderDetail: string;
  feedbackNotePlaceholderOptional: string;
  feedbackSave: string;
  feedbackPrevious: (n: number) => string;
  feedbackNoEntries: string;
  feedbackUnknownTime: string;
  feedbackLoadError: string;
  feedbackSaveError: string;
  feedbackSaved: string;
  feedbackFields: Record<string, { label: string; section: string }>;
  feedbackVerdicts: Record<BriefFeedbackVerdictId, FeedbackVerdictUi>;
}
