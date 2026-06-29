// client/src/utils/storyBriefFromApi.ts
//
// Firestore stores `Story.brief` as canonical StoryBrief (ageAndScope, clinicalFoundation, …).
// The specialist UI (BriefForm, SubmittedBriefReadView) expects CompleteBrief (section1–5).
// Normalize API payloads so the brief tab shows database content correctly.

import type { CompleteBrief, StoryType } from "../types/storyBrief";
import { STORY_TYPES, SOMATIC_EXPRESSIONS, createEmptyBrief, coerceStoryLanguage } from "../types/storyBrief";
import type { Story } from "../types/story";
import { parseStoredBrief } from "./parseStoredBrief";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function coerceStoryType(s: unknown): StoryType | null {
  if (typeof s === "string" && (STORY_TYPES as readonly string[]).includes(s)) {
    return s as StoryType;
  }
  return null;
}

/**
 * Maps a server-side StoryBrief document shape into CompleteBrief (wire sections).
 */
function canonicalStoryBriefToComplete(b: Record<string, unknown>): CompleteBrief {
  const ageAndScope = b.ageAndScope as Record<string, unknown>;
  const cf = b.clinicalFoundation as Record<string, unknown>;
  const ta = b.therapeuticArchitecture as Record<string, unknown>;
  const sw = b.storyWorld as Record<string, unknown>;
  const pc = isRecord(b.personalizationConfig) ? b.personalizationConfig : {};

  const ti = isRecord(cf.therapeuticIntention) ? cf.therapeuticIntention : {};
  const tsf = isRecord(ta.typeSpecificField) ? ta.typeSpecificField : {};

  const supportingRaw = Array.isArray(sw.supportingCharacters) ? sw.supportingCharacters : [];
  const supportingTypes: string[] = [];
  const characterRoleNotes: Record<string, string> = {};
  for (const item of supportingRaw) {
    if (!isRecord(item) || typeof item.type !== "string") continue;
    supportingTypes.push(item.type);
    if (typeof item.functionalRole === "string" && item.functionalRole.trim()) {
      characterRoleNotes[item.type] = item.functionalRole;
    }
  }

  const personalizationYesNo =
    sw.personalization === false ? ("no" as const) : ("yes" as const);

  const out: CompleteBrief = {
    storyType: coerceStoryType(b.storyType),
    briefLanguage: coerceStoryLanguage(b.briefLanguage),
    outputLanguage: coerceStoryLanguage(b.outputLanguage),
    section1: {
      ...(typeof ageAndScope.ageRange === "string" ? { ageRange: ageAndScope.ageRange as CompleteBrief["section1"]["ageRange"] } : {}),
      ...(typeof ageAndScope.peakIntensity === "string"
        ? { peakIntensity: ageAndScope.peakIntensity as CompleteBrief["section1"]["peakIntensity"] }
        : {}),
      ...(typeof ageAndScope.storyLength === "string"
        ? { storyLength: ageAndScope.storyLength as CompleteBrief["section1"]["storyLength"] }
        : {}),
    },
    section2: {
      ...(typeof cf.population === "string" ? { population: cf.population } : {}),
      ...(typeof cf.trigger === "string" ? { trigger: cf.trigger } : {}),
      ...(typeof ti.feel === "string" ? { intentionFeel: ti.feel } : {}),
      ...(typeof ti.because === "string" ? { intentionBecause: ti.because } : {}),
      ...(typeof cf.creativeVision === "string" ? { creativeVision: cf.creativeVision } : {}),
      ...(typeof cf.oneTrueThing === "string" && cf.oneTrueThing.trim()
        ? { oneTrueThing: cf.oneTrueThing }
        : {}),
    },
    section3: {
      ...(typeof ta.primaryApproach === "string"
        ? { primaryApproach: ta.primaryApproach as CompleteBrief["section3"]["primaryApproach"] }
        : {}),
      ...(ta.supportingApproach === undefined || ta.supportingApproach === null
        ? { supportingApproach: null }
        : typeof ta.supportingApproach === "string"
          ? { supportingApproach: ta.supportingApproach as CompleteBrief["section3"]["supportingApproach"] }
          : {}),
      ...(typeof ta.shameDimension === "string"
        ? { shameDimension: ta.shameDimension as CompleteBrief["section3"]["shameDimension"] }
        : {}),
      ...(tsf.fieldType === "somatic_expression" && Array.isArray(tsf.selections)
        ? {
            somaticExpressions: tsf.selections.filter(
              (x): x is (typeof SOMATIC_EXPRESSIONS)[number] =>
                typeof x === "string" && (SOMATIC_EXPRESSIONS as readonly string[]).includes(x),
            ),
          }
        : {}),
      ...(typeof tsf.freeText === "string" && tsf.freeText.trim() ? { somaticOther: tsf.freeText } : {}),
      ...(typeof ta.copingTool === "string"
        ? { copingTool: ta.copingTool as CompleteBrief["section3"]["copingTool"] }
        : {}),
      ...(typeof ta.resolutionCompleteness === "string"
        ? {
            resolutionCompleteness:
              ta.resolutionCompleteness as CompleteBrief["section3"]["resolutionCompleteness"],
          }
        : {}),
      ...(Array.isArray(ta.mustNeverList)
        ? {
            mustNeverList: ta.mustNeverList.filter(
              (x): x is string => typeof x === "string" && x.trim().length > 0,
            ),
          }
        : {}),
    },
    section4: {
      personalization: personalizationYesNo,
      ...(sw.protagonistGender === null || sw.protagonistGender === undefined
        ? { protagonistGender: null }
        : typeof sw.protagonistGender === "string"
          ? {
              protagonistGender:
                sw.protagonistGender as CompleteBrief["section4"]["protagonistGender"],
            }
          : {}),
      ...(typeof sw.protagonistType === "string"
        ? { protagonistType: sw.protagonistType as CompleteBrief["section4"]["protagonistType"] }
        : {}),
      ...(sw.protagonistAge === null || sw.protagonistAge === undefined
        ? { protagonistAgeRelative: undefined }
        : typeof sw.protagonistAge === "string"
          ? {
              protagonistAgeRelative:
                sw.protagonistAge as CompleteBrief["section4"]["protagonistAgeRelative"],
            }
          : {}),
      ...(typeof sw.caregiverPresence === "string"
        ? { caregiverPresence: sw.caregiverPresence as CompleteBrief["section4"]["caregiverPresence"] }
        : {}),
      ...(typeof sw.narrativeDistance === "string"
        ? { narrativeDistance: sw.narrativeDistance as CompleteBrief["section4"]["narrativeDistance"] }
        : {}),
      ...(typeof sw.parallelChallenge === "string" && sw.parallelChallenge.trim()
        ? { parallelChallenge: sw.parallelChallenge }
        : {}),
      ...(supportingTypes.length
        ? {
            supportingCharacters:
              supportingTypes as CompleteBrief["section4"]["supportingCharacters"],
          }
        : {}),
      ...(Object.keys(characterRoleNotes).length ? { characterRoleNotes } : {}),
      ...(typeof sw.characterNotes === "string" && sw.characterNotes.trim()
        ? { characterNotes: sw.characterNotes }
        : {}),
    },
    section5: {
      ...(typeof pc.whyNot === "string" && pc.whyNot.trim() ? { whyNot: pc.whyNot } : {}),
    },
  };

  if (Array.isArray(b.acknowledgedWarnings)) {
    const aw = b.acknowledgedWarnings.filter((x): x is string => typeof x === "string");
    if (aw.length) out.acknowledgedWarnings = aw;
  }

  return out;
}

/**
 * Converts a `brief` field from GET /api/specialist/stories (canonical or wire) into CompleteBrief.
 */
export function normalizeStoryBriefFromApi(brief: unknown): CompleteBrief {
  if (!isRecord(brief)) {
    return createEmptyBrief();
  }

  if (
    isRecord(brief.ageAndScope) &&
    isRecord(brief.clinicalFoundation) &&
    isRecord(brief.therapeuticArchitecture) &&
    isRecord(brief.storyWorld)
  ) {
    return canonicalStoryBriefToComplete(brief);
  }

  const { brief: parsed } = parseStoredBrief(brief);
  return parsed ?? createEmptyBrief();
}

/** Ensures `story.brief` is a CompleteBrief for UI components. */
export function normalizeStoryFromApi(story: Story): Story {
  return {
    ...story,
    brief: normalizeStoryBriefFromApi(story.brief),
  };
}
