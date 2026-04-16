import {
  AGE_RANGES,
  AGE_WEIGHT_MULTIPLIERS,
  CAREGIVER_PRESENCES,
  CHAR_LIMITS,
  COPING_TOOL_CATEGORIES,
  CROSS_FIELD_VALIDATIONS,
  FEAR_ANXIETY_APPROACHES,
  FEAR_ANXIETY_COPING_TOOLS,
  FIELD_REGISTRY,
  MAX_SELECTIONS,
  NARRATIVE_DISTANCES,
  OBLIGATION_WEIGHTS,
  PEAK_INTENSITIES,
  PROTAGONIST_AGES,
  PROTAGONIST_GENDERS,
  PROTAGONIST_TYPES,
  RESOLUTION_OPTIONS,
  SHAME_DIMENSIONS,
  SOMATIC_EXPRESSIONS,
  STORY_LENGTHS,
  STORY_TYPES,
  STORY_TYPE_ROUTING,
  STRUCTURAL_PARAMS,
  SUPPORTING_CHARACTER_TYPES,
} from "@/models/storyBrief.model";

import type {
  AgeRange,
  CaregiverPresence,
  CopingTool,
  CrossFieldValidation,
  FearAnxietyApproach,
  NarrativeDistance,
  PeakIntensity,
  ProtagonistAge,
  ProtagonistGender,
  ProtagonistType,
  ResolutionCompleteness,
  ShameDimension,
  SomaticExpression,
  SomaticExpressionField,
  StoryBrief,
  StoryLength,
  StoryType,
  SupportingCharacterSelection,
  SupportingCharacterType,
  TherapeuticApproach,
  TherapeuticIntention,
  TypeSpecificClinicalField,
} from "@/models/storyBrief.model";

function _typesCompileGuard(_: {
  StoryBrief: StoryBrief;
  StoryType: StoryType;
  AgeRange: AgeRange;
  PeakIntensity: PeakIntensity;
  StoryLength: StoryLength;
  TherapeuticApproach: TherapeuticApproach;
  FearAnxietyApproach: FearAnxietyApproach;
  ShameDimension: ShameDimension;
  SomaticExpression: SomaticExpression;
  SomaticExpressionField: SomaticExpressionField;
  CopingTool: CopingTool;
  ResolutionCompleteness: ResolutionCompleteness;
  ProtagonistGender: ProtagonistGender;
  ProtagonistType: ProtagonistType;
  ProtagonistAge: ProtagonistAge;
  CaregiverPresence: CaregiverPresence;
  NarrativeDistance: NarrativeDistance;
  SupportingCharacterType: SupportingCharacterType;
  SupportingCharacterSelection: SupportingCharacterSelection;
  TherapeuticIntention: TherapeuticIntention;
  TypeSpecificClinicalField: TypeSpecificClinicalField;
  CrossFieldValidation: CrossFieldValidation;
}): void {
  void _;
}

function assertEnumArray(name: string, value: unknown, expectedFirst: string): asserts value is string[] {
  expect(value).toBeDefined();
  expect(Array.isArray(value)).toBe(true);

  const arr = value as unknown[];
  expect(arr.length).toBeGreaterThan(0);
  expect(arr[0]).toBe(expectedFirst);
  for (const entry of arr) {
    expect(typeof entry).toBe("string");
  }
}

describe("model exports: enum arrays", () => {
  test('STORY_TYPES exports tokens (first: "fear_anxiety")', () => {
    assertEnumArray("STORY_TYPES", STORY_TYPES, "fear_anxiety");
  });

  test('AGE_RANGES exports 4 hyphenated age tokens (first: "3-5")', () => {
    assertEnumArray("AGE_RANGES", AGE_RANGES, "3-5");
    expect(AGE_RANGES.length).toBe(4);
  });

  test('PEAK_INTENSITIES exports 3 intensity tokens (first: "very_gentle")', () => {
    assertEnumArray("PEAK_INTENSITIES", PEAK_INTENSITIES, "very_gentle");
    expect(PEAK_INTENSITIES.length).toBe(3);
  });

  test('STORY_LENGTHS exports 3 story-length tokens (first: "short")', () => {
    assertEnumArray("STORY_LENGTHS", STORY_LENGTHS, "short");
    expect(STORY_LENGTHS.length).toBe(3);
  });

  test('FEAR_ANXIETY_APPROACHES exports 7 approach tokens (first: "normalization")', () => {
    assertEnumArray("FEAR_ANXIETY_APPROACHES", FEAR_ANXIETY_APPROACHES, "normalization");
    expect(FEAR_ANXIETY_APPROACHES.length).toBe(7);
  });

  test('SHAME_DIMENSIONS exports 3 shame tokens (first: "not_significant")', () => {
    assertEnumArray("SHAME_DIMENSIONS", SHAME_DIMENSIONS, "not_significant");
    expect(SHAME_DIMENSIONS.length).toBe(3);
  });

  test('SOMATIC_EXPRESSIONS exports 8 somatic tokens (first: "freezing_going_still")', () => {
    assertEnumArray("SOMATIC_EXPRESSIONS", SOMATIC_EXPRESSIONS, "freezing_going_still");
    expect(SOMATIC_EXPRESSIONS.length).toBe(8);
  });

  test('FEAR_ANXIETY_COPING_TOOLS exports 9 coping tool tokens (first: "deep_breathing")', () => {
    assertEnumArray("FEAR_ANXIETY_COPING_TOOLS", FEAR_ANXIETY_COPING_TOOLS, "deep_breathing");
    expect(FEAR_ANXIETY_COPING_TOOLS.length).toBe(9);
  });

  test('COPING_TOOL_CATEGORIES exports coping-tool categories (first: "body")', () => {
    assertEnumArray("COPING_TOOL_CATEGORIES", COPING_TOOL_CATEGORIES, "body");
  });

  test('RESOLUTION_OPTIONS exports 3 resolution tokens (first: "full")', () => {
    assertEnumArray("RESOLUTION_OPTIONS", RESOLUTION_OPTIONS, "full");
    expect(RESOLUTION_OPTIONS.length).toBe(3);
  });

  test('PROTAGONIST_GENDERS exports 3 gender tokens (first: "boy")', () => {
    assertEnumArray("PROTAGONIST_GENDERS", PROTAGONIST_GENDERS, "boy");
    expect(PROTAGONIST_GENDERS.length).toBe(3);
  });

  test('PROTAGONIST_TYPES exports 3 protagonist-type tokens (first: "child")', () => {
    assertEnumArray("PROTAGONIST_TYPES", PROTAGONIST_TYPES, "child");
    expect(PROTAGONIST_TYPES.length).toBe(3);
  });

  test('PROTAGONIST_AGES exports 2 protagonist-age tokens (first: "same_age")', () => {
    assertEnumArray("PROTAGONIST_AGES", PROTAGONIST_AGES, "same_age");
    expect(PROTAGONIST_AGES.length).toBe(2);
  });

  test('CAREGIVER_PRESENCES exports 5 caregiver tokens (first: "present_and_comforting")', () => {
    assertEnumArray("CAREGIVER_PRESENCES", CAREGIVER_PRESENCES, "present_and_comforting");
    expect(CAREGIVER_PRESENCES.length).toBe(5);
  });

  test('NARRATIVE_DISTANCES exports 3 narrative-distance tokens (first: "direct")', () => {
    assertEnumArray("NARRATIVE_DISTANCES", NARRATIVE_DISTANCES, "direct");
    expect(NARRATIVE_DISTANCES.length).toBe(3);
  });

  test('SUPPORTING_CHARACTER_TYPES exports 5 supporting-character tokens (first: "peer_shows_possible")', () => {
    assertEnumArray("SUPPORTING_CHARACTER_TYPES", SUPPORTING_CHARACTER_TYPES, "peer_shows_possible");
    expect(SUPPORTING_CHARACTER_TYPES.length).toBe(5);
  });
});

describe("model exports: STRUCTURAL_PARAMS", () => {
  test("STRUCTURAL_PARAMS contains all 4 age-range keys", () => {
    expect(STRUCTURAL_PARAMS).toBeDefined();
    expect(typeof STRUCTURAL_PARAMS).toBe("object");
    expect(STRUCTURAL_PARAMS).not.toBeNull();

    expect((STRUCTURAL_PARAMS as any)["3-5"]).toBeDefined();
    expect((STRUCTURAL_PARAMS as any)["5-7"]).toBeDefined();
    expect((STRUCTURAL_PARAMS as any)["7-9"]).toBeDefined();
    expect((STRUCTURAL_PARAMS as any)["9-12"]).toBeDefined();
  });

  test('STRUCTURAL_PARAMS["3-5"] contains short/standard/extended keys', () => {
    const byLength = (STRUCTURAL_PARAMS as any)["3-5"];
    expect(byLength).toBeDefined();
    expect(byLength.short).toBeDefined();
    expect(byLength.standard).toBeDefined();
    expect(byLength.extended).toBeDefined();
  });

  test('STRUCTURAL_PARAMS["5-7"] contains short/standard/extended keys', () => {
    const byLength = (STRUCTURAL_PARAMS as any)["5-7"];
    expect(byLength).toBeDefined();
    expect(byLength.short).toBeDefined();
    expect(byLength.standard).toBeDefined();
    expect(byLength.extended).toBeDefined();
  });

  test('STRUCTURAL_PARAMS["7-9"] contains short/standard/extended keys', () => {
    const byLength = (STRUCTURAL_PARAMS as any)["7-9"];
    expect(byLength).toBeDefined();
    expect(byLength.short).toBeDefined();
    expect(byLength.standard).toBeDefined();
    expect(byLength.extended).toBeDefined();
  });

  test('STRUCTURAL_PARAMS["9-12"] contains short/standard/extended keys', () => {
    const byLength = (STRUCTURAL_PARAMS as any)["9-12"];
    expect(byLength).toBeDefined();
    expect(byLength.short).toBeDefined();
    expect(byLength.standard).toBeDefined();
    expect(byLength.extended).toBeDefined();
  });

  test('STRUCTURAL_PARAMS["3-5"]["standard"] has tuple fields pages/sentencesPerPage/wordsPerSentence/totalWords', () => {
    const params = (STRUCTURAL_PARAMS as any)["3-5"]?.standard;
    expect(params).toBeDefined();

    expect(params).toHaveProperty("pages");
    expect(params).toHaveProperty("sentencesPerPage");
    expect(params).toHaveProperty("wordsPerSentence");
    expect(params).toHaveProperty("totalWords");

    for (const key of ["pages", "sentencesPerPage", "wordsPerSentence", "totalWords"] as const) {
      expect(Array.isArray(params[key])).toBe(true);
      expect(params[key].length).toBe(2);
    }
  });
});

describe("model exports: complexity budget constants", () => {
  test("OBLIGATION_WEIGHTS exists and contains finite numeric values", () => {
    expect(OBLIGATION_WEIGHTS).toBeDefined();
    expect(typeof OBLIGATION_WEIGHTS).toBe("object");
    expect(OBLIGATION_WEIGHTS).not.toBeNull();

    const keys = Object.keys(OBLIGATION_WEIGHTS as any);
    expect(keys.length).toBeGreaterThan(0);

    for (const k of keys) {
      const v = (OBLIGATION_WEIGHTS as any)[k];
      expect(Number.isFinite(v)).toBe(true);
    }

    expect((OBLIGATION_WEIGHTS as any).coreArc).toBeDefined();
    expect((OBLIGATION_WEIGHTS as any).somaticExpressionEach).toBeDefined();
  });

  test("AGE_WEIGHT_MULTIPLIERS exists, has all 4 age keys, and all values are finite > 0", () => {
    expect(AGE_WEIGHT_MULTIPLIERS).toBeDefined();
    expect(typeof AGE_WEIGHT_MULTIPLIERS).toBe("object");
    expect(AGE_WEIGHT_MULTIPLIERS).not.toBeNull();

    for (const age of ["3-5", "5-7", "7-9", "9-12"] as const) {
      const v = (AGE_WEIGHT_MULTIPLIERS as any)[age];
      expect(v).toBeDefined();
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe("model exports: CROSS_FIELD_VALIDATIONS", () => {
  test("CROSS_FIELD_VALIDATIONS is an array with >= 9 entries and required fields", () => {
    expect(CROSS_FIELD_VALIDATIONS).toBeDefined();
    expect(Array.isArray(CROSS_FIELD_VALIDATIONS)).toBe(true);
    expect(CROSS_FIELD_VALIDATIONS.length).toBeGreaterThanOrEqual(9);

    for (const entry of CROSS_FIELD_VALIDATIONS as any[]) {
      expect(entry).toBeDefined();
      expect(typeof entry).toBe("object");
      expect(entry).not.toBeNull();

      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);

      expect(typeof entry.severity).toBe("string");
      expect(entry.severity.length).toBeGreaterThan(0);

      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  test("CROSS_FIELD_VALIDATIONS includes the 9 known IDs and each has a legal severity", () => {
    const requiredIds = [
      "relational_tool_no_responder",
      "significant_intensity_young_age",
      "graduated_exposure_comforting_caregiver",
      "conflicting_approach_pair",
      "self_regulation_comforting_caregiver",
      "shame_central_no_normalization",
      "separation_anxiety_no_caregiver",
      "abstract_tool_young_age",
      "cognitive_reframing_young_age",
    ] as const;

    const legalSeverities = new Set(["hard_block", "hard_warning", "soft_warning"]);

    const byId = new Map<string, any>();
    for (const entry of CROSS_FIELD_VALIDATIONS as any[]) {
      byId.set(entry.id, entry);
    }

    for (const id of requiredIds) {
      expect(byId.has(id)).toBe(true);
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(legalSeverities.has(entry.severity)).toBe(true);
    }
  });
});

describe("model exports: STORY_TYPE_ROUTING", () => {
  test("STORY_TYPE_ROUTING exists and includes fear_anxiety routing entry", () => {
    expect(STORY_TYPE_ROUTING).toBeDefined();
    expect(typeof STORY_TYPE_ROUTING).toBe("object");
    expect(STORY_TYPE_ROUTING).not.toBeNull();

    expect((STORY_TYPE_ROUTING as any).fear_anxiety).toBeDefined();
    expect(typeof (STORY_TYPE_ROUTING as any).fear_anxiety).toBe("object");
  });

  test("STORY_TYPE_ROUTING.fear_anxiety has required fields with expected shapes", () => {
    const routing = (STORY_TYPE_ROUTING as any).fear_anxiety;

    expect(Array.isArray(routing.approaches)).toBe(true);
    expect(routing.approaches.length).toBeGreaterThan(0);
    for (const entry of routing.approaches) {
      expect(typeof entry).toBe("string");
    }

    expect(typeof routing.typeSpecificFieldType).toBe("string");
    expect(routing.typeSpecificFieldType.length).toBeGreaterThan(0);

    expect(Array.isArray(routing.copingTools)).toBe(true);
    expect(routing.copingTools.length).toBeGreaterThan(0);
    for (const entry of routing.copingTools) {
      expect(typeof entry).toBe("string");
    }

    expect(typeof routing.resolutionDefault).toBe("string");
    expect(routing.resolutionDefault.length).toBeGreaterThan(0);

    expect(typeof routing.personalizationDefault).toBe("boolean");

    // Note: Agent 1 generation code must never read `mustNeverDefaults`. Per v3.2 §6.2
    // Section H, the operative must-never list is `brief.therapeuticArchitecture.mustNeverList`.
    // `mustNeverDefaults` is for brief UI pre-fill only. This test verifies the field exists on
    // the routing config; it does not endorse reading it from generation code.
    expect(Array.isArray(routing.mustNeverDefaults)).toBe(true);
    for (const entry of routing.mustNeverDefaults) {
      expect(typeof entry).toBe("string");
    }
  });
});

describe("model exports: FIELD_REGISTRY", () => {
  test("FIELD_REGISTRY exists and is truthy", () => {
    expect(FIELD_REGISTRY).toBeDefined();
    expect(FIELD_REGISTRY).toBeTruthy();
  });
});

describe("model exports: CHAR_LIMITS and MAX_SELECTIONS", () => {
  test("CHAR_LIMITS exists and contains finite numeric values > 0", () => {
    expect(CHAR_LIMITS).toBeDefined();
    expect(typeof CHAR_LIMITS).toBe("object");
    expect(CHAR_LIMITS).not.toBeNull();

    const keys = Object.keys(CHAR_LIMITS as any);
    expect(keys.length).toBeGreaterThan(0);

    for (const k of keys) {
      const v = (CHAR_LIMITS as any)[k];
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  test("MAX_SELECTIONS exists and contains finite integer values > 0", () => {
    expect(MAX_SELECTIONS).toBeDefined();
    expect(typeof MAX_SELECTIONS).toBe("object");
    expect(MAX_SELECTIONS).not.toBeNull();

    const keys = Object.keys(MAX_SELECTIONS as any);
    expect(keys.length).toBeGreaterThan(0);

    for (const k of keys) {
      const v = (MAX_SELECTIONS as any)[k];
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

