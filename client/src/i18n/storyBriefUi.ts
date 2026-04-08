// Story Brief UI strings — English (from types/storyBrief) + Hebrew (storyBriefUiHebrew).
// Arabic uses Hebrew brief copy (RTL), matching app-wide ar → he fallback.

import { useMemo } from "react";
import * as SB from "../types/storyBrief";
import type { SubmitGateItem } from "../validation/briefSubmitGate";
import { useLanguage } from "./context/useLanguage";
import { STORY_BRIEF_UI_HE } from "./storyBriefUiHebrew";
import type { CopingToolCategoryUi, PopulationThinkingScaffoldUi, StoryBriefUi } from "./storyBriefUi.types";

export type {
  CopingToolCategoryUi,
  FeedbackVerdictUi,
  IntentionExampleUi,
  PopulationThinkingScaffoldUi,
  StoryBriefUi,
  SubmitGateCopy,
} from "./storyBriefUi.types";

// ---------------------------------------------------------------------------
// English (canonical — mirrors storyBrief.ts)
// ---------------------------------------------------------------------------

export function buildEnglishStoryBriefUi(): StoryBriefUi {
  const categories: CopingToolCategoryUi[] = SB.COPING_TOOL_CATEGORIES_FEAR_ANXIETY.map(
    (c) => ({ label: c.label, tools: [...c.tools] }),
  );

  return {
    STORY_TYPE_LABELS: SB.STORY_TYPE_LABELS,
    STORY_TYPE_DESCRIPTIONS: SB.STORY_TYPE_DESCRIPTIONS,
    AGE_RANGE_LABELS: SB.AGE_RANGE_LABELS,
    PEAK_INTENSITY_LABELS: SB.PEAK_INTENSITY_LABELS,
    PEAK_INTENSITY_DEFINITIONS: SB.PEAK_INTENSITY_DEFINITIONS,
    STORY_LENGTH_LABELS: SB.STORY_LENGTH_LABELS,
    STORY_LENGTH_PREVIEWS: SB.STORY_LENGTH_PREVIEWS,
    WARN_SIGNIFICANT_YOUNG_AGE: SB.WARN_SIGNIFICANT_YOUNG_AGE,
    POPULATION_THINKING_SCAFFOLDS: SB.POPULATION_THINKING_SCAFFOLDS as Partial<
      Record<SB.StoryType, PopulationThinkingScaffoldUi>
    >,
    TRIGGER_LABELS: SB.TRIGGER_LABELS,
    TRIGGER_NUDGE: SB.TRIGGER_NUDGE,
    INTENTION_NUDGE: SB.INTENTION_NUDGE,
    INTENTION_GOOD_EXAMPLES: SB.INTENTION_GOOD_EXAMPLES,
    INTENTION_BAD_EXAMPLES: SB.INTENTION_BAD_EXAMPLES,
    THERAPEUTIC_APPROACH_LABELS: SB.THERAPEUTIC_APPROACH_LABELS,
    THERAPEUTIC_APPROACH_DEFINITIONS: SB.THERAPEUTIC_APPROACH_DEFINITIONS,
    SHAME_DIMENSION_LABELS: SB.SHAME_DIMENSION_LABELS,
    SHAME_DIMENSION_DESCRIPTIONS: SB.SHAME_DIMENSION_DESCRIPTIONS,
    SOMATIC_EXPRESSION_LABELS: SB.SOMATIC_EXPRESSION_LABELS,
    COPING_TOOL_LABELS: SB.COPING_TOOL_LABELS,
    COPING_TOOL_CATEGORIES_FEAR_ANXIETY: categories,
    RESOLUTION_LABELS: SB.RESOLUTION_LABELS,
    RESOLUTION_DESCRIPTIONS: SB.RESOLUTION_DESCRIPTIONS,
    MUST_NEVER_DEFAULTS: SB.MUST_NEVER_DEFAULTS,
    PERSONALIZATION_OPTION_DESCRIPTIONS: SB.PERSONALIZATION_OPTION_DESCRIPTIONS,
    PROTAGONIST_GENDER_LABELS: SB.PROTAGONIST_GENDER_LABELS,
    PROTAGONIST_GENDER_NOTE: SB.PROTAGONIST_GENDER_NOTE,
    PROTAGONIST_TYPE_LABELS: SB.PROTAGONIST_TYPE_LABELS,
    PROTAGONIST_TYPE_AGE_GUIDANCE: SB.PROTAGONIST_TYPE_AGE_GUIDANCE,
    PROTAGONIST_AGE_RELATIVE_LABELS: SB.PROTAGONIST_AGE_RELATIVE_LABELS,
    CAREGIVER_PRESENCE_LABELS: SB.CAREGIVER_PRESENCE_LABELS,
    CAREGIVER_PRESENCE_DESCRIPTIONS: SB.CAREGIVER_PRESENCE_DESCRIPTIONS,
    NARRATIVE_DISTANCE_LABELS: SB.NARRATIVE_DISTANCE_LABELS,
    NARRATIVE_DISTANCE_DEFINITIONS: SB.NARRATIVE_DISTANCE_DEFINITIONS,
    SUPPORTING_CHARACTER_LABELS: SB.SUPPORTING_CHARACTER_LABELS,
    PERSONALIZATION_CONSTRAINTS_DEFAULTS: SB.PERSONALIZATION_CONSTRAINTS_DEFAULTS,

    preBriefOverline: "Pre-brief",
    preBriefTitle: "Choose the lens this story looks through",
    preBriefSubtitle:
      "The story type determines which fields appear, which options are available, and which clinical defaults are loaded. It is a therapeutic lens, not a diagnosis.",
    draftSavedBannerTitle: "You have a saved draft",
    draftSavedBriefWord: "brief",
    draftSavedSavedPrefix: "saved",
    resume: "Resume",
    startOver: "Start over",
    comingSoon: "Coming soon",
    beginBrief: "Begin brief →",
    savedPrefix: "Saved",
    draftSavedSnackbar: "Draft saved",
    submitErrorGeneric: "Something went wrong while submitting. Please try again.",

    sectionOf: (section) => `Section ${section} of 5`,
    sectionLabels: {
      1: { full: "Age & Story Scope", short: "Scope" },
      2: { full: "Clinical Foundation", short: "Foundation" },
      3: { full: "Therapeutic Architecture", short: "Architecture" },
      4: { full: "Story World", short: "Story World" },
      5: { full: "Personalization", short: "Personalize" },
    },
    progressNavAriaLabel: "Brief sections progress",
    progressStepAria: ({ num, fullName, clickable, isCurrent, lockedFuture }) => {
      if (clickable) return `Go to section ${num}: ${fullName}`;
      if (isCurrent) return `Current section ${num}: ${fullName}`;
      if (lockedFuture) return `Section ${num}: ${fullName}. Locked until you can open this step.`;
      return `Section ${num}: ${fullName}`;
    },
    sectionMobileLine: (current, ofTotal = 5) => `Section ${current} of ${ofTotal}`,

    s1Overline: "Section 1 of 5",
    s1Title: "Age & Story Scope",
    s1Intro:
      "Age range governs language complexity, coping tool appropriateness, and structural parameters. Set the scope before designing the clinical content.",
    s1Field11: "Target age range",
    s1Field12: "Peak emotional intensity",
    s1Field12Helper: "Sets how distressed the protagonist becomes before the resolution.",
    s1IntensityWarningTitle: "Significant intensity with ages 3–5",
    s1IntensityWarningFooter:
      "You can continue, but you will need to acknowledge this before submitting the brief.",
    s1Field13: "Story length",
    s1Field13Helper: "Affects the available page budget. Default is Standard.",
    s1PreviewPlaceholder: "Select an age range above to see story details.",
    s1MissingAge: "Target age range",
    s1MissingPeak: "Peak emotional intensity",
    ariaAgeRange: (label) => `Age range ${label}`,

    s2Overline: "Section 2 of 5",
    s2Title: "Clinical Foundation",
    s2Intro:
      "The clinical thinking that shapes this story: who these children are, what triggers the difficulty, and what the story should leave them with.",
    s2Field21: "Emotional world of the population",
    s2Field21Helper:
      "What is the emotional experience of the children this story is for? What are they feeling, what are they avoiding, what do they need that they can't ask for?",
    s2Field21Placeholder: "Describe the inner world of children who need this story…",
    s2Field22Helper: "What precise moment or situation triggers the anxiety this story addresses?",
    s2Field22Placeholder: "Describe the inciting moment as specifically as possible…",
    s2Field23: "Therapeutic intention",
    s2Field23Helper: "Complete both halves. The second half is the story's core message.",
    s2IntentionFeelPrefix: "When a child closes this book, they should feel",
    s2IntentionBecausePrefix: "because",
    s2IntentionFeelPlaceholder: "quietly brave…",
    s2IntentionBecausePlaceholder: "they have discovered that…",
    s2IntentionAriaFeel: "they should feel",
    s2IntentionAriaBecause: "because",
    s2StrongExamples: "Strong examples",
    s2AvoidThis: "Avoid this",
    s2Field24: "Clinical creative vision",
    s2Field24Helper:
      "Describe one specific image, moment, or detail you see at the heart of this story. Not a mood — a scene. This image should support your therapeutic approach, not replace it. What is happening, who is there, what does the child notice?",
    s2Field24Placeholder: "e.g. The child finds a small glowing door at the end of a hallway…",
    s2Field25: "One true thing",
    s2Field25Helper:
      "Picture a child you have worked with who this story would have helped. Without identifying them — one physical or emotional detail you remember: a gesture, a habit, a sentence, a look on their face.",
    s2Field25Placeholder: "Leave blank to skip, or describe one small true detail…",
    s2MissingPopulation: "Emotional world of the population",
    s2MissingIntention: "Therapeutic intention",
    s2MissingCreative: "Clinical creative vision",
    fallbackTriggerLabel: "The specific trigger",

    s3Overline: "Section 3 of 5",
    s3Title: "Therapeutic Architecture",
    s3Intro:
      "The clinical mechanism: how the story will work therapeutically. These decisions shape the story's arc and the agent's narrative technique.",
    s3Field31: "Primary therapeutic approach",
    s3Field31Helper:
      "Determines the story's therapeutic spine — how the protagonist moves from difficulty to resolution.",
    s3Field32: "Supporting approach",
    s3Field32Helper:
      "Flavors the story without driving the arc. The primary approach selected above is excluded from this list.",
    s3NoSupporting: "No supporting approach",
    s3AriaNoSupporting: "No supporting approach",
    s3ApproachConflictInline:
      "These approaches can pull in different directions. Is this intentional?",
    s3Field33: "Shame dimension",
    s3Field33Helper: "Governs how the agent handles self-blame or stigma in the story.",
    s3Field34: "How does the anxiety show up in the body?",
    s3Field34Helper:
      "Select up to 2. The agent uses these to mirror the child's physical experience in the story.",
    s3SomaticOtherLabel: "Anything else the body does? (optional)",
    s3SomaticOtherPlaceholder: "Describe any other physical responses not listed above…",
    s3Field35: "The coping tool",
    s3Field35Helper:
      "One tool only. The agent shows the protagonist using it at the story's most difficult moment — demonstrated in action, never named.",
    s3AbstractAgeNote:
      "For younger children, the agent will show this as a simple physical action or repeated pattern — not verbal self-talk.",
    s3Field36: "Resolution completeness",
    s3Field36Helper: "Governs the final scene. Default for Fear & Anxiety is Partial resolution.",
    s3DefaultSuffix: "(default)",
    s3Field37: "What this story must never do",
    s3Field37Helper:
      "Clinical and content constraints together — the agent treats every item as a hard rule. Pre-filled with defaults for this story type; keep, remove, or add.",
    s3MustNeverPlaceholder: "Add a constraint the agent must never violate…",
    s3MustNeverEmptyWarning: "Each constraint must have content before you can continue.",
    s3AddConstraint: "+ Add constraint",
    s3MissingPrimary: "Primary therapeutic approach",
    s3MissingShame: "Shame dimension",
    s3MissingSomatic: "How does the anxiety show up in the body?",
    s3MissingCoping: "The coping tool",
    s3MissingResolution: "Resolution completeness",
    s3MissingMustNever: "What this story must never do",
    s3ResolutionPartialNote: "Default for Fear & Anxiety is Partial resolution.",

    s4Overline: "Section 4 of 5",
    s4Title: "Story World",
    s4Intro:
      "The narrative design: who inhabits this story, how close it sits to the child's reality, and who supports the protagonist.",
    s4Field40: "Personalization",
    s4Field40Helper: "Determines whether the protagonist is the child themselves or a separate character.",
    s4PersonalizationYes: "Yes — personalized",
    s4PersonalizationNo: "No — fixed protagonist",
    s4AriaPersonalizationYes: "Yes — personalize",
    s4AriaPersonalizationNo: "No — fixed protagonist",
    s4Field41: "Protagonist gender",
    s4Field41Helper: "Select the gender for the protagonist you are designing.",
    s4Field42: "Protagonist type",
    s4LockedChildTitle: "Child character",
    s4LockedChildSubtitle: "Locked — the protagonist is the child when personalization is on.",
    s4LockedChip: "Locked",
    s4Field42Helper: "Choose how the protagonist is presented to the child reader.",
    s4Field43: "Protagonist age relative to reader",
    s4Field43Helper: "Affects identification and aspiration. Default is same age.",
    s4Field44: "Caregiver's presence",
    s4Field44Helper: "Governs how much the caregiver is available during the story's difficult moment.",
    s4Field45: "Narrative distance",
    s4Field45Helper: "How closely the story mirrors the child's real situation.",
    s4ParallelTitle: "What is the equivalent challenge in the parallel world?",
    s4ParallelHelper:
      "Optional, but strongly encouraged. Without this, the agent will create the parallel mapping on its own.",
    s4ParallelPlaceholder:
      "A magical library where the character can't find the room where their favorite book is kept…",
    s4DirectPersonalizationWarning:
      "The story will closely mirror the child's real experience, using their name and identity. Ensure the emotional intensity is appropriate.",
    s4Field46: "Supporting characters",
    s4Field46Helper: (max) =>
      `Select up to ${max}. Each selected character unlocks an optional prompt for the story's key moment.`,
    s4RolePlaceholder: "What does this character do at the story's key moment? (optional)",
    s4RoleAria: (charLabel) => `Role note for ${charLabel}`,
    s4Field47: "Character notes",
    s4Field47Helper:
      "Add detail about your characters — personality, appearance, habits, how they speak. The character roles and presence you selected above will not be changed by what you write here.",
    s4Field47Placeholder:
      "e.g. The caregiver always hums when they're nervous. The protagonist has a habit of chewing their sleeve…",
    s4MissingGender: "Protagonist gender",
    s4MissingType: "Protagonist type",
    s4MissingCaregiver: "Caregiver's presence",
    s4MissingNarrative: "Narrative distance",

    s5Overline: "Section 5 of 5",
    s5Title: "Personalization Configuration",
    s5IntroOn: "Define what parents are allowed to change when they personalize this story for their child.",
    s5IntroOff:
      "Explain why this story works better with a fixed protagonist. This note is shown to parents.",
    s5Field51: "Personalization constraints",
    s5Field51Helper:
      "What must never be changed when a parent personalizes this story? Pre-filled with defaults — keep, remove, or add.",
    s5ConstraintPlaceholder: "Add a constraint parents must not override…",
    s5ConstraintsInfo:
      "These constraints are enforced during personalization — any parent customization that would violate a constraint is blocked.",
    s5Field52: "Why is this story better with a fixed protagonist?",
    s5Field52Helper:
      "This note is shown to parents when they browse this story. Be direct and specific about the clinical reason.",
    s5Field52Placeholder:
      "e.g. The protagonist's age and background are essential to the story's emotional arc and cannot be personalized without disrupting the therapeutic structure…",
    s5AlmostDoneTitle: "You're almost done",
    s5AlmostDoneBody:
      "After submission, the agent will generate a first draft of the story using all the decisions you've made in this brief. You'll be able to review, annotate, and approve the draft before it's published.",
    s5MissingWhyNot: "Why is this story better with a fixed protagonist?",
    submitBrief: "Submit brief →",
    submitting: "Submitting…",

    optionalSuffix: "(optional)",
    requiredMark: "*",
    charactersCount: (used, max) => `${used} / ${max} characters`,
    back: "← Back",
    saveContinue: "Save & continue →",
    validationAlmostThere: "Almost there",
    validationToContinue: "To continue, complete:",
    validationHint: "Select a field below to scroll to it and start filling it in.",
    validationFieldsLeftOne: "1 field left",
    validationFieldsLeftMany: (n) => `${n} fields left`,
    validationAriaLabel: "Required fields still to complete",
    validationGoTo: (label) => `Go to ${label}`,
    validationRequiredStatus: "Required fields still to complete",

    gateHardBlockTitle: "Cannot submit yet",
    gateHardBlockBody:
      "This brief has a clinical-structure issue that must be fixed before submission. Update the fields below, then try again.",
    gateHardBlockButton: "Go back & review",
    gateHardWarningTitle: "Clinical safety check",
    gateHardWarningBody:
      "Your brief matches one or more combinations that need an explicit clinical decision before we send it for generation. Review each note, then confirm if you still want to submit.",
    gateHardWarningCheckbox: "I understand and want to proceed",
    gateProceed: "Proceed",
    confirmSubmitTitle: "Submit this brief?",
    confirmSubmitBody:
      "This will send the brief to the server for story generation. You can still review the submitted JSON afterwards, but you will not be able to edit this draft.",
    confirmSubmitCancel: "Cancel",
    confirmSubmitConfirm: "Yes, submit",
    submitGateCopy: {
      relational_tool_no_responder: {
        title: "Someone to turn to is required",
        message:
          "The coping tool requires someone the protagonist can turn to. Please add a present caregiver or a supporting character who can respond.",
        clinicalNote:
          "Relational coping tools assume a responsive figure in the story. Without that anchor, the narrative can contradict the therapeutic mechanism or leave the child without a modeled path to safety.",
      },
      significant_intensity_young_age: {
        title: "High intensity for young children",
        message:
          "Significant emotional intensity may be distressing for children ages 3–5. Are you sure this is appropriate for this age group?",
        clinicalNote:
          "Younger children have less capacity to regulate when stories stay in high arousal for long stretches. If you proceed, ensure pacing, co-regulation, and resolution still protect the reader.",
      },
      graduated_exposure_comforting_caregiver: {
        title: "Graduated exposure with a comforting caregiver",
        message:
          "A consistently comforting caregiver may reduce the therapeutic effect of graduated exposure. Is this intentional?",
        clinicalNote:
          "Graduated exposure relies on manageable doses of discomfort. Constant soothing can short-circuit the approach unless you have structured that dynamic intentionally for this case.",
      },
      conflicting_approach_pair: {
        title: "Potentially conflicting therapeutic approaches",
        message: "These approaches can pull in different directions. Is this intentional?",
        clinicalNote:
          "Mixed mechanisms can confuse the story’s emotional arc. Proceed only if you are deliberately layering approaches and know how the draft should prioritize them.",
      },
    },

    successTitle: "Brief submitted successfully",
    successSubtitle:
      "Your brief is saved on the server. Keep the brief ID below for tracking. You can also download or copy the JSON as a local backup.",
    successBriefId: "Brief ID",
    successJsonTitle: "Brief JSON (backup)",
    successDownload: "Download JSON",
    successCopy: "Copy to clipboard",
    successCopied: "Copied",
    successCopyFailed: "Copy failed — select the text manually",
    successCreateAnother: "Create another brief",

    feedbackTitle: "Specialist feedback",
    feedbackBriefChip: (id) => `Brief ${id}`,
    feedbackFieldPrefix: "Field",
    feedbackAssessment: "Assessment",
    feedbackClear: "Clear assessment",
    feedbackNoteRecommended: "Note (recommended)",
    feedbackNoteOptional: "Note (optional)",
    feedbackNotePlaceholderDetail: "What should change or be clarified?",
    feedbackNotePlaceholderOptional: "Add detail if it helps the author…",
    feedbackSave: "Save feedback",
    feedbackPrevious: (n) => `Previous feedback${n > 0 ? ` (${n})` : ""}`,
    feedbackNoEntries: "No entries yet.",
    feedbackUnknownTime: "Unknown time",
    feedbackLoadError: "Could not load prior feedback",
    feedbackSaveError: "Save failed",
    feedbackSaved: "Feedback saved.",
    feedbackNotYetSavableHint:
      "Feedback is stored on the server only after you submit this brief. Submit the brief first, then you can save field notes here (or open this editor with a submitted brief id).",
    feedbackFields: {
      storyType: { label: "Story type (pre-brief)", section: "Pre-brief" },
      "1.1": { label: "Target age range", section: "Section 1 — Age & Story Scope" },
      "1.2": { label: "Peak emotional intensity", section: "Section 1 — Age & Story Scope" },
      "1.3": { label: "Story length", section: "Section 1 — Age & Story Scope" },
      "2.1": { label: "Emotional world of the population", section: "Section 2 — Clinical Foundation" },
      "2.2": { label: "The specific trigger", section: "Section 2 — Clinical Foundation" },
      "2.3": { label: "Therapeutic intention", section: "Section 2 — Clinical Foundation" },
      "2.4": { label: "Clinical creative vision", section: "Section 2 — Clinical Foundation" },
      "2.5": { label: "One true thing", section: "Section 2 — Clinical Foundation" },
      "3.1": { label: "Primary therapeutic approach", section: "Section 3 — Therapeutic Architecture" },
      "3.2": { label: "Supporting approach", section: "Section 3 — Therapeutic Architecture" },
      "3.3": { label: "Shame dimension", section: "Section 3 — Therapeutic Architecture" },
      "3.4": { label: "Somatic expression", section: "Section 3 — Therapeutic Architecture" },
      "3.5": { label: "Coping tool", section: "Section 3 — Therapeutic Architecture" },
      "3.6": { label: "Resolution completeness", section: "Section 3 — Therapeutic Architecture" },
      "3.7": { label: "Must-never list", section: "Section 3 — Therapeutic Architecture" },
      "4.0": { label: "Personalization decision", section: "Section 4 — Story World" },
      "4.1": { label: "Protagonist gender", section: "Section 4 — Story World" },
      "4.2": { label: "Protagonist type", section: "Section 4 — Story World" },
      "4.3": { label: "Protagonist age relative to reader", section: "Section 4 — Story World" },
      "4.4": { label: "Caregiver presence", section: "Section 4 — Story World" },
      "4.5": { label: "Narrative distance (and parallel challenge if applicable)", section: "Section 4 — Story World" },
      "4.6": { label: "Supporting characters", section: "Section 4 — Story World" },
      "4.7": { label: "Character notes", section: "Section 4 — Story World" },
      "5.1": { label: "Personalization constraints", section: "Section 5 — Personalization Configuration" },
      "5.2": { label: "Why not personalize", section: "Section 5 — Personalization Configuration" },
    },
    feedbackVerdicts: {
      good: {
        label: "Good",
        description: "This field is clinically sound and clear for the brief.",
      },
      needs_modification: {
        label: "Needs modification",
        description: "Something here should change before the brief is ready.",
      },
      unclear: {
        label: "Not clear",
        description: "The intent or wording needs clarification for the author or downstream use.",
      },
      remove_or_rethink: {
        label: "Remove or rethink",
        description: "This content or choice should not stay as written; reconsider or replace it.",
      },
      keep_as_is: {
        label: "Keep as-is",
        description: "Explicitly leave this choice or text unchanged (no substantive edit).",
      },
    },
  };
}

const STORY_BRIEF_UI_EN = buildEnglishStoryBriefUi();

export function useStoryBriefUi(): StoryBriefUi {
  const { language } = useLanguage();
  return useMemo(
    () => (language === "en" ? STORY_BRIEF_UI_EN : STORY_BRIEF_UI_HE),
    [language],
  );
}

/** Locale for formatting dates in the brief chrome (saved draft / history). */
export function useBriefDateLocale(): string {
  const { language } = useLanguage();
  return language === "en" ? "en-US" : "he-IL";
}

export function formatBriefSavedAt(timestamp: number, locale: string): string {
  const d = new Date(timestamp);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (locale.startsWith("he")) {
    if (isToday) return `היום ב-${time}`;
    return `${d.toLocaleDateString(locale, { day: "numeric", month: "short" })} ב-${time}`;
  }
  if (isToday) return `Today at ${time}`;
  return `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })} at ${time}`;
}

export function translateSubmitGateItem(item: SubmitGateItem, ui: StoryBriefUi): SubmitGateItem {
  const id = item.id as keyof typeof ui.submitGateCopy;
  const copy = ui.submitGateCopy[id];
  if (!copy) return item;
  return {
    ...item,
    title: copy.title,
    message: copy.message,
    clinicalNote: copy.clinicalNote,
  };
}

export function translateSubmitGateItems(items: SubmitGateItem[], ui: StoryBriefUi): SubmitGateItem[] {
  return items.map((i) => translateSubmitGateItem(i, ui));
}
