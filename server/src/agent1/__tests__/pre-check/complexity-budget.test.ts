import { Timestamp } from "firebase-admin/firestore";

import { calculateComplexityBudget } from "@/agent1/pre-check/complexity-budget";
import { OBLIGATION_WEIGHTS, type StoryBrief } from "@/models/storyBrief.model";

function makeMinimalBrief(): StoryBrief {
  const now = Timestamp.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: "test-user-id",
    status: "submitted",
    version: 1,
    storyType: "fear_anxiety",
    ageAndScope: {
      ageRange: "5-7",
      peakIntensity: "moderate",
      storyLength: "standard",
    },
    clinicalFoundation: {
      population: "p".repeat(100),
      trigger: "t".repeat(100),
      therapeuticIntention: {
        feel: "That they can face new situations",
        because:
          "even when their body tells them to run, they have tools to stay",
      },
      creativeVision: "c".repeat(100),
    },
    therapeuticArchitecture: {
      primaryApproach: "graduated_exposure",
      shameDimension: "not_significant",
      typeSpecificField: {
        fieldType: "somatic_expression",
        selections: ["stomach_ache_feeling_sick"],
      },
      copingTool: "deep_breathing",
      resolutionCompleteness: "full",
      mustNeverList: [],
    },
    storyWorld: {
      personalization: false,
      protagonistGender: "girl",
      protagonistType: "child",
      protagonistAge: "same_age",
      caregiverPresence: "present_and_comforting",
      narrativeDistance: "direct",
    },
    personalizationConfig: {},
  };
}

describe("calculateComplexityBudget", () => {
  test("minimal brief → green", () => {
    const result = calculateComplexityBudget(makeMinimalBrief());
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(4.4, 10);
    expect(result).not.toHaveProperty("complexityStatusText");
    expect(result.contributions).toHaveLength(2);
  });

  test("add supporting approach → still green but cost increases", () => {
    const brief = makeMinimalBrief();
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(5.2, 10);
    expect(result.contributions).toHaveLength(3);
  });

  test("two somatic expressions", () => {
    const brief = makeMinimalBrief();
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(4.8, 10);
    expect(result.contributions).toHaveLength(3);
  });

  test("shame central adds cost", () => {
    const brief = makeMinimalBrief();
    brief.therapeuticArchitecture.shameDimension = "central";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(5.2, 10);
    expect(result.contributions).toHaveLength(3);
  });

  test("shame present adds less cost", () => {
    const brief = makeMinimalBrief();
    brief.therapeuticArchitecture.shameDimension = "present";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(4.8, 10);
    expect(result.contributions).toHaveLength(3);
  });

  test("supporting characters add cost", () => {
    const brief = makeMinimalBrief();
    brief.storyWorld.supportingCharacters = [
      { type: "peer_alongside" },
      { type: "animal_friend" },
    ];
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(6, 10);
    expect(result.contributions).toHaveLength(4);
  });

  test("caregiver leaves_and_returns adds 1.5", () => {
    const brief = makeMinimalBrief();
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(5.6, 10);
  });

  test("caregiver waiting_at_the_end adds 0.5", () => {
    const brief = makeMinimalBrief();
    brief.storyWorld.caregiverPresence = "waiting_at_the_end";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(4.8, 10);
  });

  test("narrative metaphorical adds 1.5", () => {
    const brief = makeMinimalBrief();
    brief.storyWorld.narrativeDistance = "metaphorical";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(5.6, 10);
  });

  test("narrative parallel adds 1", () => {
    const brief = makeMinimalBrief();
    brief.storyWorld.narrativeDistance = "parallel";
    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result.totalPageCost).toBeCloseTo(5.2, 10);
  });

  test("overloaded brief → yellow (3–5 standard: one supporting character so baseline totals 12)", () => {
    const brief = makeMinimalBrief();
    brief.ageAndScope = {
      ageRange: "3-5",
      peakIntensity: "moderate",
      storyLength: "standard",
    };
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    brief.therapeuticArchitecture.shameDimension = "central";
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    brief.storyWorld.supportingCharacters = [{ type: "peer_alongside" }];
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    brief.storyWorld.narrativeDistance = "metaphorical";

    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("yellow");
    expect(result.totalPageCost).toBeCloseTo(12, 10);
    expect(result.complexityStatusText).toBeDefined();
    expect(result.complexityStatusText).toContain("yellow");
  });

  test("overloaded brief → red (same load, shorter page range)", () => {
    const brief = makeMinimalBrief();
    brief.ageAndScope = {
      ageRange: "3-5",
      peakIntensity: "moderate",
      storyLength: "short",
    };
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    brief.therapeuticArchitecture.shameDimension = "central";
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    brief.storyWorld.supportingCharacters = [{ type: "peer_alongside" }];
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    brief.storyWorld.narrativeDistance = "metaphorical";

    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("red");
    expect(result.complexityStatusText).toContain("red");
  });

  test("age multiplier effect — same brief as yellow test, ages 9–12 standard → green", () => {
    const brief = makeMinimalBrief();
    brief.ageAndScope = {
      ageRange: "9-12",
      peakIntensity: "moderate",
      storyLength: "standard",
    };
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    brief.therapeuticArchitecture.shameDimension = "central";
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    brief.storyWorld.supportingCharacters = [{ type: "peer_alongside" }];
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    brief.storyWorld.narrativeDistance = "metaphorical";

    const result = calculateComplexityBudget(brief);
    expect(result.state).toBe("green");
    expect(result).not.toHaveProperty("complexityStatusText");
    expect(result.totalPageCost).toBeCloseTo(6, 10);
  });

  test("green produces no complexityStatusText", () => {
    const result = calculateComplexityBudget(makeMinimalBrief());
    expect(result.state).toBe("green");
    expect("complexityStatusText" in result).toBe(false);
  });

  test("complexityStatusText contains expected values", () => {
    const brief = makeMinimalBrief();
    brief.ageAndScope = {
      ageRange: "3-5",
      peakIntensity: "moderate",
      storyLength: "standard",
    };
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    brief.therapeuticArchitecture.shameDimension = "central";
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    brief.storyWorld.supportingCharacters = [{ type: "peer_alongside" }];
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    brief.storyWorld.narrativeDistance = "metaphorical";

    const result = calculateComplexityBudget(brief);
    const text = result.complexityStatusText!;
    expect(text).toContain("12");
    expect(text).toContain("8");
    expect(text).toMatch(/Available:\s*8[–-]12/);
    expect(text).toContain("yellow");
  });

  test("contributions array includes only applicable obligations", () => {
    const result = calculateComplexityBudget(makeMinimalBrief());
    expect(result.contributions).toHaveLength(2);
    expect(result.contributions[0]).toEqual({
      obligation: "Core arc",
      cost: OBLIGATION_WEIGHTS.coreArc,
    });
    expect(result.contributions[1]).toEqual({
      obligation: "Somatic expression",
      cost: OBLIGATION_WEIGHTS.somaticExpressionEach,
    });
  });
});
