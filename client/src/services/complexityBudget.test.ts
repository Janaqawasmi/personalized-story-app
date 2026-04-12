import type { CompleteBrief } from "../types/storyBrief";
import { calculateComplexityLoad, PAGE_BUDGET_TABLE, AGE_RANGE_MULTIPLIERS } from "./complexityBudget";
import { createEmptyBrief } from "../types/storyBrief";

function baseBrief(over: Partial<CompleteBrief> = {}): CompleteBrief {
  return {
    storyType: "fear_anxiety",
    section1: {
      ageRange: "3-5",
      storyLength: "standard",
      peakIntensity: "moderate",
    },
    section2: {},
    section3: {
      primaryApproach: "normalization",
      supportingApproach: null,
      shameDimension: "not_significant",
      somaticExpressions: ["freezing_going_still"],
      somaticOther: "",
      copingTool: "deep_breathing",
      resolutionCompleteness: "partial",
      mustNeverList: ["a"],
    },
    section4: {
      personalization: "yes",
      protagonistGender: null,
      protagonistType: "child",
      protagonistAgeRelative: "same_age",
      caregiverPresence: "present_and_comforting",
      narrativeDistance: "direct",
      parallelChallenge: "",
      supportingCharacters: [],
      characterRoleNotes: {},
      characterNotes: "",
    },
    section5: {},
    ...over,
  };
}

describe("calculateComplexityLoad", () => {
  test("empty brief defaults age/length and only includes core arc", () => {
    const brief = createEmptyBrief();
    const r = calculateComplexityLoad(brief);
    expect(r.budget).toEqual(PAGE_BUDGET_TABLE["3-5"].standard);
    expect(r.ageRangeMultiplier).toBe(1.0);
    expect(r.breakdown.map((b) => b.id)).toEqual(["core_arc"]);
    expect(r.totalPageCost).toBe(5);
    expect(r.state).toBe("green");
  });

  test("brief clearly within budget is green", () => {
    const brief = baseBrief();
    const r = calculateComplexityLoad(brief);
    // Core 5 + 1 somatic 0.5 = 5.5 raw → 5.5 scaled @ 3–5
    expect(r.totalPageCost).toBe(5.5);
    const min = PAGE_BUDGET_TABLE["3-5"].standard.min;
    expect(r.totalPageCost).toBeLessThanOrEqual(min);
    expect(r.state).toBe("green");
  });

  test("brief in yellow band (§16 overload: past min, within max)", () => {
    const brief = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing_going_still", "tension_clenching"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible"],
      },
    });
    const r = calculateComplexityLoad(brief);
    const { min, max } = PAGE_BUDGET_TABLE["3-5"].standard;
    expect(r.totalPageCost).toBeGreaterThan(min);
    expect(r.totalPageCost).toBeLessThanOrEqual(max);
    expect(r.state).toBe("yellow");
  });

  test("brief past page band max is red", () => {
    const brief = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing_going_still", "tension_clenching"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible", "peer_alongside"],
        caregiverPresence: "leaves_and_returns",
        narrativeDistance: "parallel",
      },
    });
    const r = calculateComplexityLoad(brief);
    const max = PAGE_BUDGET_TABLE["3-5"].standard.max;
    expect(r.totalPageCost).toBeGreaterThan(max);
    expect(r.state).toBe("red");
  });

  test("boundary: total equal to budget.max is yellow; one increment above is red", () => {
    // For age 3–5, short max = 8. Build exactly 8 and then 8.5.
    // Obligations: core 5 + 2 chars (2) + supporting approach (1) = 8.0
    const atMax = baseBrief({
      section1: { ...baseBrief().section1, storyLength: "short" },
      section3: { ...baseBrief().section3, supportingApproach: "modeling", somaticExpressions: [] },
      section4: { ...baseBrief().section4, supportingCharacters: ["peer_shows_possible", "peer_alongside"] },
    });
    const rAtMax = calculateComplexityLoad(atMax);
    expect(rAtMax.budget).toEqual(PAGE_BUDGET_TABLE["3-5"].short);
    expect(rAtMax.totalPageCost).toBe(8);
    expect(rAtMax.state).toBe("yellow");

    // Add one 0.5 obligation to go above max by one increment.
    const aboveMax = baseBrief({
      section1: { ...baseBrief().section1, storyLength: "short" },
      section3: { ...baseBrief().section3, supportingApproach: "modeling", somaticExpressions: ["freezing_going_still"] },
      section4: { ...baseBrief().section4, supportingCharacters: ["peer_shows_possible", "peer_alongside"] },
    });
    const rAboveMax = calculateComplexityLoad(aboveMax);
    expect(rAboveMax.totalPageCost).toBe(8.5);
    expect(rAboveMax.state).toBe("red");
  });

  test("same obligations across all four age ranges scale total by multiplier", () => {
    const template = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing_going_still", "tension_clenching"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible", "peer_alongside"],
      },
    });

    const ages = ["3-5", "5-7", "7-9", "9-12"] as const;
    const rawBase =
      5 +
      2 * 0.5 +
      1 +
      1 +
      2 * 1;

    ages.forEach((ageRange) => {
      const brief = {
        ...template,
        section1: { ...template.section1!, ageRange },
      };
      const r = calculateComplexityLoad(brief);
      const m = AGE_RANGE_MULTIPLIERS[ageRange];
      expect(r.ageRangeMultiplier).toBe(m);
      expect(r.totalPageCost).toBe(Math.round(rawBase * m * 2) / 2);
    });
  });

  test("breakdown uses grouped labels for somatic and supporting characters", () => {
    const brief = baseBrief({
      section3: {
        ...baseBrief().section3,
        somaticExpressions: ["freezing_going_still", "tension_clenching"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible", "teacher_adult_guides"],
      },
    });
    const r = calculateComplexityLoad(brief);
    const somatic = r.breakdown.find((b) => b.id === "somatic_expressions");
    const chars = r.breakdown.find((b) => b.id === "supporting_characters");
    expect(somatic?.displayLabel).toBe("2 somatic expressions");
    expect(chars?.displayLabel).toBe("2 supporting characters");
    expect(somatic?.rawCost).toBe(1);
    expect(chars?.rawCost).toBe(2);
  });

  test("totalPageCost equals sum of already-rounded breakdown line items (3 multi-obligation cases)", () => {
    const cases: CompleteBrief[] = [
      // Case A: 5+ obligations
      baseBrief({
        section3: {
          ...baseBrief().section3,
          supportingApproach: "modeling",
          shameDimension: "central",
          somaticExpressions: ["freezing_going_still", "tension_clenching"],
        },
        section4: {
          ...baseBrief().section4,
          supportingCharacters: ["peer_shows_possible", "teacher_adult_guides"],
          narrativeDistance: "parallel",
        },
      }),
      // Case B: 6+ obligations (caregiver overhead + 2 chars)
      baseBrief({
        section3: {
          ...baseBrief().section3,
          supportingApproach: "modeling",
          shameDimension: "present",
          somaticExpressions: ["freezing_going_still", "tension_clenching"],
        },
        section4: {
          ...baseBrief().section4,
          supportingCharacters: ["peer_shows_possible", "peer_alongside"],
          caregiverPresence: "leaves_and_returns",
          narrativeDistance: "metaphorical",
        },
      }),
      // Case C: 4+ obligations (no supporting approach, but shame + narrative + chars)
      baseBrief({
        section3: {
          ...baseBrief().section3,
          supportingApproach: null,
          shameDimension: "central",
          somaticExpressions: ["freezing_going_still", "tension_clenching"],
        },
        section4: {
          ...baseBrief().section4,
          supportingCharacters: ["peer_shows_possible"],
          caregiverPresence: "waiting_at_the_end",
          narrativeDistance: "parallel",
        },
      }),
    ];

    cases.forEach((brief) => {
      const r = calculateComplexityLoad(brief);
      // The UI displays per-line `scaledCost`; total must match their sum exactly.
      const sum = r.breakdown.reduce((s, row) => s + row.scaledCost, 0);
      expect(r.totalPageCost).toBe(sum);
      expect(r.breakdown.length).toBeGreaterThanOrEqual(4);
    });
  });
});
