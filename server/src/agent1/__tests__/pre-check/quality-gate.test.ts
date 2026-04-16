import { Timestamp } from "firebase-admin/firestore";

import type { StoryBrief } from "@/models/storyBrief.model";
import { checkQualityGate } from "@/agent1/pre-check/quality-gate";

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

describe("checkQualityGate", () => {
  test("both fields adequate — nothing flagged", () => {
    const result = checkQualityGate(makeMinimalBrief());
    expect(result.triggerThin).toBe(false);
    expect(result.intentionThin).toBe(false);
  });

  test("trigger exactly 79 chars — flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "x".repeat(79);
    expect(checkQualityGate(brief).triggerThin).toBe(true);
  });

  test("trigger exactly 80 chars — not flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "x".repeat(80);
    expect(checkQualityGate(brief).triggerThin).toBe(false);
  });

  test("trigger exactly 81 chars — not flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "x".repeat(81);
    expect(checkQualityGate(brief).triggerThin).toBe(false);
  });

  test("intention combined exactly 59 chars — flagged", () => {
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
    expect(checkQualityGate(brief).intentionThin).toBe(true);
  });

  test("intention combined exactly 60 chars — not flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = {
      feel: "a".repeat(26),
      because: "b".repeat(25),
    };
    const combined =
      brief.clinicalFoundation.therapeuticIntention.feel +
      " because " +
      brief.clinicalFoundation.therapeuticIntention.because;
    expect(combined.length).toBe(60);
    expect(checkQualityGate(brief).intentionThin).toBe(false);
  });

  test("intention combined exactly 61 chars — not flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = {
      feel: "a".repeat(26),
      because: "b".repeat(26),
    };
    const combined =
      brief.clinicalFoundation.therapeuticIntention.feel +
      " because " +
      brief.clinicalFoundation.therapeuticIntention.because;
    expect(combined.length).toBe(61);
    expect(checkQualityGate(brief).intentionThin).toBe(false);
  });

  test("both thin — both flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "s".repeat(50);
    brief.clinicalFoundation.therapeuticIntention = {
      feel: "a".repeat(15),
      because: "b".repeat(16),
    };
    const combined =
      brief.clinicalFoundation.therapeuticIntention.feel +
      " because " +
      brief.clinicalFoundation.therapeuticIntention.because;
    expect(combined.length).toBe(40);
    const result = checkQualityGate(brief);
    expect(result.triggerThin).toBe(true);
    expect(result.intentionThin).toBe(true);
  });

  test("empty trigger — flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.trigger = "";
    expect(checkQualityGate(brief).triggerThin).toBe(true);
  });

  test("empty intention fields — flagged", () => {
    const brief = makeMinimalBrief();
    brief.clinicalFoundation.therapeuticIntention = { feel: "", because: "" };
    expect(" because ".length).toBe(9);
    const result = checkQualityGate(brief);
    expect(result.intentionThin).toBe(true);
  });
});
