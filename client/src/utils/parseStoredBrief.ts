// client/src/utils/parseStoredBrief.ts
//
// Best-effort parse of persisted brief JSON (unknown) into CompleteBrief shape for display.

import type { CompleteBrief } from "../types/storyBrief";
import {
  STORY_TYPES,
  AGE_RANGES,
  PEAK_INTENSITIES,
  STORY_LENGTHS,
  THERAPEUTIC_APPROACHES_FEAR_ANXIETY,
  SHAME_DIMENSIONS,
  SOMATIC_EXPRESSIONS,
  COPING_TOOLS,
  RESOLUTION_OPTIONS,
  CAREGIVER_PRESENCES,
  NARRATIVE_DISTANCES,
  PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES,
  PROTAGONIST_AGE_RELATIVES,
  SUPPORTING_CHARACTERS,
} from "../types/storyBrief";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function pickStringArray(obj: Record<string, unknown>, key: string): string[] | undefined {
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  return v.filter((item): item is string => typeof item === "string");
}

function includes<T extends string>(arr: readonly T[], v: string): v is T {
  return (arr as readonly string[]).includes(v);
}

/**
 * Parses stored brief JSON for read-only display. Does not throw.
 * Returns a partial CompleteBrief when root is an object; null only when unusable.
 */
export function parseStoredBrief(raw: unknown): {
  brief: CompleteBrief | null;
  issues: string[];
} {
  const issues: string[] = [];

  if (!isRecord(raw)) {
    issues.push("root_not_object");
    return { brief: null, issues };
  }

  const out: CompleteBrief = {
    storyType: null,
    section1: {},
    section2: {},
    section3: {},
    section4: {},
    section5: {},
  };

  const st = raw.storyType;
  if (typeof st === "string" && includes(STORY_TYPES, st)) {
    out.storyType = st;
  } else if (st != null) {
    issues.push("storyType_invalid");
  }

  const aw = raw.acknowledgedWarnings;
  if (Array.isArray(aw)) {
    const ids = aw.filter((x): x is string => typeof x === "string");
    if (ids.length) out.acknowledgedWarnings = ids;
  }

  if (isRecord(raw.section1)) {
    const s1 = raw.section1;
    const ar = s1.ageRange;
    const pi = s1.peakIntensity;
    const sl = s1.storyLength;
    if (typeof ar === "string" && includes(AGE_RANGES, ar)) out.section1.ageRange = ar;
    else if (ar != null) issues.push("section1.ageRange_invalid");
    if (typeof pi === "string" && includes(PEAK_INTENSITIES, pi)) out.section1.peakIntensity = pi;
    else if (pi != null) issues.push("section1.peakIntensity_invalid");
    if (typeof sl === "string" && includes(STORY_LENGTHS, sl)) out.section1.storyLength = sl;
    else if (sl != null) issues.push("section1.storyLength_invalid");
  } else if (raw.section1 != null) issues.push("section1_not_object");

  if (isRecord(raw.section2)) {
    const s2 = raw.section2;
    if (pickString(s2, "population") !== undefined) out.section2.population = pickString(s2, "population")!;
    if (pickString(s2, "trigger") !== undefined) out.section2.trigger = pickString(s2, "trigger")!;
    if (pickString(s2, "intentionFeel") !== undefined) out.section2.intentionFeel = pickString(s2, "intentionFeel")!;
    if (pickString(s2, "intentionBecause") !== undefined) out.section2.intentionBecause = pickString(s2, "intentionBecause")!;
    if (pickString(s2, "creativeVision") !== undefined) out.section2.creativeVision = pickString(s2, "creativeVision")!;
    if (pickString(s2, "oneTrueThing") !== undefined) out.section2.oneTrueThing = pickString(s2, "oneTrueThing")!;
  } else if (raw.section2 != null) issues.push("section2_not_object");

  if (isRecord(raw.section3)) {
    const s3 = raw.section3;
    const pa = s3.primaryApproach;
    if (typeof pa === "string" && includes(THERAPEUTIC_APPROACHES_FEAR_ANXIETY, pa)) {
      out.section3.primaryApproach = pa;
    } else if (pa != null) issues.push("section3.primaryApproach_invalid");

    const sup = s3.supportingApproach;
    if (sup === null || sup === undefined) {
      out.section3.supportingApproach = null;
    } else if (typeof sup === "string" && includes(THERAPEUTIC_APPROACHES_FEAR_ANXIETY, sup)) {
      out.section3.supportingApproach = sup;
    } else {
      issues.push("section3.supportingApproach_invalid");
      out.section3.supportingApproach = null;
    }

    const sh = s3.shameDimension;
    if (typeof sh === "string" && includes(SHAME_DIMENSIONS, sh)) out.section3.shameDimension = sh;
    else if (sh != null) issues.push("section3.shameDimension_invalid");

    const som = s3.somaticExpressions;
    if (Array.isArray(som)) {
      const ok = som.filter((x): x is typeof SOMATIC_EXPRESSIONS[number] =>
        typeof x === "string" && includes(SOMATIC_EXPRESSIONS, x),
      );
      if (ok.length) out.section3.somaticExpressions = ok;
    }
    if (pickString(s3, "somaticOther") !== undefined) out.section3.somaticOther = pickString(s3, "somaticOther")!;

    const ct = s3.copingTool;
    if (typeof ct === "string" && includes(COPING_TOOLS, ct)) out.section3.copingTool = ct;
    else if (ct != null) issues.push("section3.copingTool_invalid");

    const rc = s3.resolutionCompleteness;
    if (typeof rc === "string" && includes(RESOLUTION_OPTIONS, rc)) {
      out.section3.resolutionCompleteness = rc;
    } else if (rc != null) issues.push("section3.resolutionCompleteness_invalid");

    const mnl = pickStringArray(s3, "mustNeverList");
    if (mnl?.length) out.section3.mustNeverList = mnl;
  } else if (raw.section3 != null) issues.push("section3_not_object");

  if (isRecord(raw.section4)) {
    const s4 = raw.section4;
    const pers = s4.personalization;
    if (pers === "yes" || pers === "no") out.section4.personalization = pers;
    else if (pers != null) issues.push("section4.personalization_invalid");

    const pg = s4.protagonistGender;
    if (pg === null || pg === undefined) {
      out.section4.protagonistGender = null;
    } else if (typeof pg === "string" && includes(PROTAGONIST_GENDERS, pg)) {
      out.section4.protagonistGender = pg;
    } else {
      issues.push("section4.protagonistGender_invalid");
      out.section4.protagonistGender = null;
    }

    const pt = s4.protagonistType;
    if (typeof pt === "string" && includes(PROTAGONIST_TYPES, pt)) out.section4.protagonistType = pt;
    else if (pt != null) issues.push("section4.protagonistType_invalid");

    const par = s4.protagonistAgeRelative;
    if (typeof par === "string" && includes(PROTAGONIST_AGE_RELATIVES, par)) {
      out.section4.protagonistAgeRelative = par;
    } else if (par != null) issues.push("section4.protagonistAgeRelative_invalid");

    const cp = s4.caregiverPresence;
    if (typeof cp === "string" && includes(CAREGIVER_PRESENCES, cp)) out.section4.caregiverPresence = cp;
    else if (cp != null) issues.push("section4.caregiverPresence_invalid");

    const nd = s4.narrativeDistance;
    if (typeof nd === "string" && includes(NARRATIVE_DISTANCES, nd)) out.section4.narrativeDistance = nd;
    else if (nd != null) issues.push("section4.narrativeDistance_invalid");

    if (pickString(s4, "parallelChallenge") !== undefined) {
      out.section4.parallelChallenge = pickString(s4, "parallelChallenge")!;
    }

    const sc = s4.supportingCharacters;
    if (Array.isArray(sc)) {
      const ok = sc.filter((x): x is typeof SUPPORTING_CHARACTERS[number] =>
        typeof x === "string" && includes(SUPPORTING_CHARACTERS, x),
      );
      if (ok.length) out.section4.supportingCharacters = ok;
    }

    const crn = s4.characterRoleNotes;
    if (isRecord(crn)) {
      const notes: Partial<typeof out.section4.characterRoleNotes> = {};
      for (const k of SUPPORTING_CHARACTERS) {
        const v = crn[k];
        if (typeof v === "string") notes[k] = v;
      }
      if (Object.keys(notes).length) out.section4.characterRoleNotes = notes;
    }

    if (pickString(s4, "characterNotes") !== undefined) {
      out.section4.characterNotes = pickString(s4, "characterNotes")!;
    }
  } else if (raw.section4 != null) issues.push("section4_not_object");

  if (isRecord(raw.section5)) {
    const s5 = raw.section5;
    if (pickString(s5, "whyNot") !== undefined) out.section5.whyNot = pickString(s5, "whyNot")!;
  } else if (raw.section5 != null) issues.push("section5_not_object");

  return { brief: out, issues };
}
