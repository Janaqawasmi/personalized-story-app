// client/src/utils/briefNormalize.ts
import type { StoryBriefInput } from "../api/api";

const lowerTrim = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase() : v;

const trimOnly = (v: unknown) =>
  typeof v === "string" ? v.trim() : v;

export function normalizeStoryBriefInput(input: StoryBriefInput): StoryBriefInput {
  return {
    ...input,

    createdBy: trimOnly(input.createdBy) as string,

    therapeuticFocus: {
      primaryTopic: lowerTrim(input.therapeuticFocus.primaryTopic) as string,
      specificSituation: lowerTrim(input.therapeuticFocus.specificSituation) as string,
    },

    childProfile: {
      ageGroup: input.childProfile.ageGroup, // enums - keep
      emotionalSensitivity: input.childProfile.emotionalSensitivity, // enums - keep
    },

    therapeuticIntent: {
      emotionalGoals: (input.therapeuticIntent.emotionalGoals ?? []).map((g) =>
        lowerTrim(g) as string
      ),
      // keyMessage is only trimmed (NOT lowercased)
      keyMessage: input.therapeuticIntent.keyMessage
        ? (trimOnly(input.therapeuticIntent.keyMessage) as string)
        : undefined,
    },

    languageTone: {
      complexity: input.languageTone.complexity,
      emotionalTone: input.languageTone.emotionalTone,
    },

    safetyConstraints: {
      exclusions: (input.safetyConstraints.exclusions ?? []).map((e) =>
        lowerTrim(e) as string
      ),
    },

    storyPreferences: {
      caregiverPresence: input.storyPreferences.caregiverPresence,
      endingStyle: input.storyPreferences.endingStyle,
    },
  };
}
