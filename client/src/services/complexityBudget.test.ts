import type { CompleteBrief } from "../types/storyBrief";
import {
  calculateComplexityLoad,
  COMPLEXITY_LOAD_GREEN_THRESHOLD,
  COMPLEXITY_LOAD_YELLOW_THRESHOLD,
  PAGE_BUDGET_TABLE,
  AGE_RANGE_MULTIPLIERS,
} from "./complexityBudget";
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
      somaticExpressions: ["freezing"],
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
      caregiverPresence: "present_comforting",
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
    const max = PAGE_BUDGET_TABLE["3-5"].standard.max;
    expect(r.totalPageCost).toBeLessThan(COMPLEXITY_LOAD_GREEN_THRESHOLD * max);
    expect(r.state).toBe("green");
  });

  test("brief in yellow band (between 70% and 90% of budget max)", () => {
    const brief = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing", "tension"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible"],
      },
    });
    const r = calculateComplexityLoad(brief);
    const max = PAGE_BUDGET_TABLE["3-5"].standard.max;
    const low = COMPLEXITY_LOAD_GREEN_THRESHOLD * max;
    const high = COMPLEXITY_LOAD_YELLOW_THRESHOLD * max;
    expect(r.totalPageCost).toBeGreaterThanOrEqual(low);
    expect(r.totalPageCost).toBeLessThanOrEqual(high);
    expect(r.state).toBe("yellow");
  });

  test("brief above 90% of budget max is red", () => {
    const brief = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing", "tension"],
      },
      section4: {
        ...baseBrief().section4,
        supportingCharacters: ["peer_shows_possible", "peer_alongside"],
        caregiverPresence: "leaves_returns",
        narrativeDistance: "parallel",
      },
    });
    const r = calculateComplexityLoad(brief);
    const max = PAGE_BUDGET_TABLE["3-5"].standard.max;
    expect(r.totalPageCost).toBeGreaterThan(COMPLEXITY_LOAD_YELLOW_THRESHOLD * max);
    expect(r.state).toBe("red");
  });

  test("same obligations across all four age ranges scale total by multiplier", () => {
    const template = baseBrief({
      section3: {
        ...baseBrief().section3,
        supportingApproach: "modeling",
        shameDimension: "central",
        somaticExpressions: ["freezing", "tension"],
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
        somaticExpressions: ["freezing", "tension"],
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
});
