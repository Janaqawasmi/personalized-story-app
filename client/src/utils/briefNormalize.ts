// client/src/utils/briefNormalize.ts
import type { StoryBriefInput } from "../api/api";

const lowerTrim = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase() : v;

const trimOnly = (v: unknown) =>
  typeof v === "string" ? v.trim() : v;

export function normalizeStoryBriefInput(input: StoryBriefInput): StoryBriefInput {
  return {
    ...input,

    storyContext: {
      primaryTopic: lowerTrim(input.storyContext.primaryTopic) as string,
      generalSituation: lowerTrim(input.storyContext.generalSituation) as string,
      specificSituation: lowerTrim(input.storyContext.specificSituation) as string,
      targetAgeRange: {
        min: input.storyContext.targetAgeRange.min,
        max: input.storyContext.targetAgeRange.max,
      },
      languageComplexity: input.storyContext.languageComplexity,
    },

    therapeuticDesign: {
      emotionalGoals: (input.therapeuticDesign.emotionalGoals ?? []).map((g) =>
        lowerTrim(g) as string
      ),
      keyMessage: input.therapeuticDesign.keyMessage
        ? (trimOnly(input.therapeuticDesign.keyMessage) as string)
        : undefined,
      therapeuticMechanism: (input.therapeuticDesign.therapeuticMechanism ?? []).map((m) =>
        lowerTrim(m) as string
      ),
      copingTools: (input.therapeuticDesign.copingTools ?? []).map((t) =>
        lowerTrim(t) as string
      ),
      therapeuticBoundaries: (input.therapeuticDesign.therapeuticBoundaries ?? []).map((b) =>
        trimOnly(b) as string
      ),
    },

    emotionalDesign: {
      emotionalTone: input.emotionalDesign.emotionalTone,
      topicSensitivity: input.emotionalDesign.topicSensitivity,
      endingStyle: input.emotionalDesign.endingStyle,
      emotionalArc: input.emotionalDesign.emotionalArc,
      peakIntensity: input.emotionalDesign.peakIntensity,
    },

    characterDesign: (() => {
      const cd: StoryBriefInput["characterDesign"] = {
        protagonistType: input.characterDesign.protagonistType,
        protagonistAgeRelation: input.characterDesign.protagonistAgeRelation,
        protagonistGender: input.characterDesign.protagonistGender,
        caregiverRole: input.characterDesign.caregiverRole,
      };
      if (input.characterDesign.supportCharacters && input.characterDesign.supportCharacters.length > 0) {
        cd.supportCharacters = input.characterDesign.supportCharacters;
      }
      if (input.characterDesign.characterNotes && input.characterDesign.characterNotes.trim()) {
        cd.characterNotes = input.characterDesign.characterNotes.trim();
      }
      return cd;
    })(),

    safetyBoundaries: (() => {
      const sb: StoryBriefInput["safetyBoundaries"] = {
        contentExclusions: (input.safetyBoundaries.contentExclusions ?? []).map((e) =>
          lowerTrim(e) as string
        ),
      };
      if (input.safetyBoundaries.clinicalCautions && input.safetyBoundaries.clinicalCautions.length > 0) {
        sb.clinicalCautions = input.safetyBoundaries.clinicalCautions.map((c) =>
          trimOnly(c) as string
        );
      }
      return sb;
    })(),

    personalizationConfig: (() => {
      const pc: StoryBriefInput["personalizationConfig"] = {
        personalizationAllowed: input.personalizationConfig.personalizationAllowed,
        namePersonalization: input.personalizationConfig.namePersonalization,
        illustrationPersonalization: input.personalizationConfig.illustrationPersonalization,
      };
      if (input.personalizationConfig.personalizationReason && input.personalizationConfig.personalizationReason.trim()) {
        pc.personalizationReason = input.personalizationConfig.personalizationReason.trim();
      }
      if (input.personalizationConfig.personalizationConstraints && input.personalizationConfig.personalizationConstraints.length > 0) {
        pc.personalizationConstraints = input.personalizationConfig.personalizationConstraints
          .map((c) => trimOnly(c) as string)
          .filter(Boolean);
      }
      if (input.personalizationConfig.genderAdaptation) {
        pc.genderAdaptation = input.personalizationConfig.genderAdaptation;
      }
      return pc;
    })(),
  };
}
