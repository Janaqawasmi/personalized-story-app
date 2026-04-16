import { Timestamp } from "firebase-admin/firestore";

import { runPreCheck } from "@/agent1/pre-check";
import type { StoryBrief } from "@/models/storyBrief.model";

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

/** 3–5 short, overloaded — `calculateComplexityBudget` → red (see complexity-budget tests). */
function makeOverloadedRedBrief(): StoryBrief {
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
  return brief;
}

/** 3–5 standard, overloaded — yellow state (total page cost 12 vs range 8–12). */
function makeYellowBrief(): StoryBrief {
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
  return brief;
}

describe("runPreCheck", () => {
  test("clean brief → empty warnings and all sub-checks pass", () => {
    const result = runPreCheck(makeMinimalBrief());
    expect(result.warnings).toEqual([]);
    expect(result.qualityGate.triggerThin).toBe(false);
    expect(result.qualityGate.intentionThin).toBe(false);
    expect(result.vagueIntention.isVague).toBe(false);
    expect(result.complexityBudget.state).toBe("green");
  });

  test("thin trigger → one warning (trigger_thin)", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "x".repeat(50);
    const result = runPreCheck(brief);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: "trigger_thin",
      severity: "warn",
    });
  });

  test("thin intention → one warning (intention_thin)", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = {
      feel: "a".repeat(25),
      because: "b".repeat(25),
    };
    const combined =
      brief.clinicalFoundation.therapeuticIntention.feel +
      " because " +
      brief.clinicalFoundation.therapeuticIntention.because;
    expect(combined.length).toBe(59);
    const result = runPreCheck(brief);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe("intention_thin");
  });

  test("vague intention → one warning (intention_vague, info)", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = {
      feel:
        "That they can face new situations and build confidence over time with practice",
      because: "they can be brave",
    };
    const result = runPreCheck(brief);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: "intention_vague",
      severity: "info",
    });
  });

  test("both thin intention and vague pattern → two warnings", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = {
      feel: "a".repeat(15),
      because: "they can be brave",
    };
    const result = runPreCheck(brief);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.map((w) => w.code).sort()).toEqual(
      ["intention_thin", "intention_vague"].sort(),
    );
  });

  test("complexity red + not extended + not acknowledged → complexity_red warning", () => {
    const brief = makeOverloadedRedBrief();
    const result = runPreCheck(brief);
    expect(result.complexityBudget.state).toBe("red");
    expect(result.warnings.some((w) => w.code === "complexity_red")).toBe(true);
  });

  test("complexity red + extended story length → NO complexity_red (de-dup)", () => {
    const brief = makeMinimalBrief();
    brief.ageAndScope = {
      ageRange: "3-5",
      peakIntensity: "moderate",
      storyLength: "extended",
    };
    brief.therapeuticArchitecture.supportingApproach = "normalization";
    brief.therapeuticArchitecture.shameDimension = "central";
    brief.therapeuticArchitecture.typeSpecificField = {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "heart_racing_cant_breathe"],
    };
    brief.storyWorld.supportingCharacters = [
      { type: "peer_alongside" },
      { type: "animal_friend" },
      { type: "teacher_adult_guides" },
      { type: "sibling_perspective" },
      { type: "peer_shows_possible" },
      { type: "peer_alongside" },
    ];
    brief.storyWorld.caregiverPresence = "leaves_and_returns";
    brief.storyWorld.narrativeDistance = "metaphorical";

    const result = runPreCheck(brief);
    expect(result.complexityBudget.state).toBe("red");
    expect(result.complexityBudget.availablePageRange).toEqual([12, 16]);
    expect(result.warnings.some((w) => w.code === "complexity_red")).toBe(false);
  });

  test("complexity red + complexityAcknowledgedInBrief → NO complexity_red (de-dup)", () => {
    const brief = makeOverloadedRedBrief();
    (brief as { complexityAcknowledgedInBrief?: boolean }).complexityAcknowledgedInBrief =
      true;
    const result = runPreCheck(brief);
    expect(result.complexityBudget.state).toBe("red");
    expect(result.warnings.some((w) => w.code === "complexity_red")).toBe(false);
  });

  test("complexity yellow → no complexity warning; status text still set", () => {
    const result = runPreCheck(makeYellowBrief());
    expect(result.complexityBudget.state).toBe("yellow");
    expect(result.warnings.some((w) => w.code === "complexity_red")).toBe(false);
    expect(result.complexityBudget.complexityStatusText).toBeDefined();
  });

  test("multiple issues: thin trigger + vague intention + red complexity", () => {
    const brief = makeOverloadedRedBrief();
    brief.clinicalFoundation.trigger = "x".repeat(50);
    brief.clinicalFoundation.therapeuticIntention = {
      feel:
        "That they can face new situations bravely and with courage and heart",
      because: "they can be brave",
    };
    const result = runPreCheck(brief);
    const codes = result.warnings.map((w) => w.code);
    expect(result.warnings).toHaveLength(3);
    expect(codes).toContain("trigger_thin");
    expect(codes).toContain("intention_vague");
    expect(codes).toContain("complexity_red");
  });

  test("yellow brief: complexityBudget passthrough independent of warnings list", () => {
    const result = runPreCheck(makeYellowBrief());
    expect(result.complexityBudget.state).toBe("yellow");
    expect(result.complexityBudget.complexityStatusText).toBeDefined();
    expect(typeof result.complexityBudget.complexityStatusText).toBe("string");
    expect(result.warnings.some((w) => w.code === "complexity_red")).toBe(false);
  });

  test("return value includes all four sub-results with expected shapes", () => {
    const result = runPreCheck(makeMinimalBrief());
    expect(result).toHaveProperty("qualityGate");
    expect(result).toHaveProperty("vagueIntention");
    expect(result).toHaveProperty("complexityBudget");
    expect(result).toHaveProperty("warnings");
    expect(typeof result.qualityGate).toBe("object");
    expect(typeof result.vagueIntention).toBe("object");
    expect(typeof result.complexityBudget).toBe("object");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
