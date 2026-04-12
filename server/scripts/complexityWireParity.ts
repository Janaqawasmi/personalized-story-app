/**
 * Quick parity check: client caregiver enum vs server enum in wire payload
 * should yield identical Section 16 totals.
 *
 * Run: npx ts-node scripts/complexityWireParity.ts
 */
import { calculateComplexityBudgetFromClientWire } from "../src/validation/complexityBudget";

const baseWire = {
  storyType: "fear_anxiety",
  section1: { ageRange: "3-5", storyLength: "short" },
  section3: {
    primaryApproach: "normalization",
    supportingApproach: "modeling",
    shameDimension: "not_significant",
    somaticExpressions: ["freezing", "tension"],
    copingTool: "deep_breathing",
    resolutionCompleteness: "partial",
    mustNeverList: ["a"],
  },
  section4: {
    personalization: "yes",
    protagonistType: "child",
    protagonistAgeRelative: "same_age",
    caregiverPresence: "leaves_returns",
    narrativeDistance: "direct",
    supportingCharacters: ["peer_shows_possible"],
    parallelChallenge: "",
    characterRoleNotes: {},
    characterNotes: "",
  },
  section5: {},
};

function main(): void {
  const withClientEnum = calculateComplexityBudgetFromClientWire(baseWire);
  const withServerEnum = calculateComplexityBudgetFromClientWire({
    ...baseWire,
    section4: {
      ...(baseWire.section4 as object),
      caregiverPresence: "leaves_and_returns",
    },
  });

  if (withClientEnum.totalPageCost !== withServerEnum.totalPageCost) {
    console.error("Mismatch:", withClientEnum.totalPageCost, withServerEnum.totalPageCost);
    process.exit(1);
  }
  console.log("OK: client vs server caregiver strings → same totalPageCost", withClientEnum.totalPageCost);
}

main();
