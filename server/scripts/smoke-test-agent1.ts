import "dotenv/config";

import { Timestamp } from "firebase-admin/firestore";

import { generateStoryDraft, type Agent1Result } from "@/agent1";
import { firestore } from "@/config/firebase";
import type { StoryBrief } from "@/models/storyBrief.model";

const SMOKE_BRIEF: StoryBrief = {
  storyType: "fear_anxiety",
  status: "submitted",

  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "smoke-test-user",
  version: 1,

  ageAndScope: {
    ageRange: "3-5",
    peakIntensity: "moderate",
    storyLength: "standard",
  },

  clinicalFoundation: {
    population:
      "Young children who have developed a fear of using the bathroom alone. They may hold it in, refuse to go without a parent present, or cry when the bathroom door closes. The fear is often connected to being alone in a small, enclosed space where sounds echo and shadows move.",
    trigger:
      "The moment the child realizes they need to go to the bathroom and no one is immediately available to come with them. The hallway feels long, the bathroom door feels heavy, and the sound of the fan is too loud.",
    therapeuticIntention: {
      feel: "That the bathroom is a place they can be brave in, one small step at a time",
      because:
        "each time they try, even just standing at the door, they prove to themselves that the scary feelings pass and the bathroom is just a room",
    },
    creativeVision:
      "A small bear standing at the end of a hallway, one paw on the bathroom door handle, looking back at mama bear who gives a small nod. The hallway light is warm but the bathroom light flickers slightly.",
    oneTrueThing:
      "Many children with this fear will flush the toilet and immediately run out, not washing their hands, because the sound of the flush amplifies all the scary feelings at once.",
  },

  therapeuticArchitecture: {
    primaryApproach: "graduated_exposure",
    shameDimension: "not_significant",
    typeSpecificField: {
      fieldType: "somatic_expression",
      selections: ["stomach_ache_feeling_sick", "tension_clenching"],
    },
    copingTool: "counting",
    resolutionCompleteness: "partial",
    mustNeverList: [
      "Never have a character say there is nothing to be scared of",
      "Never show the fear disappearing completely after one attempt",
      "Never have an adult do the scary thing for the child",
    ],
  },

  storyWorld: {
    personalization: false,
    protagonistType: "animal",
    protagonistGender: "boy",
    protagonistAge: "same_age",
    caregiverPresence: "guides_from_the_side",
    narrativeDistance: "direct",
  },

  personalizationConfig: {
    whyNot:
      "This story uses an animal protagonist to create emotional distance appropriate for young children.",
  },
};

async function main() {
  console.log("=== Agent 1 Smoke Test ===\n");

  const collection = "dammaStoryBriefs";
  console.log("Writing smoke-test brief to Firestore...");
  const docRef = await firestore.collection(collection).add(SMOKE_BRIEF);
  const briefId = docRef.id;
  console.log(`Brief created: ${briefId}\n`);

  try {
    console.log("Running generateStoryDraft...\n");
    const startTime = Date.now();
    let result: Agent1Result;
    try {
      result = await generateStoryDraft(briefId);
    } catch (err) {
      console.error("generateStoryDraft failed:", err);
      process.exitCode = 1;
      return;
    }
    const elapsed = Date.now() - startTime;

    console.log("=== RESULT ===\n");
    console.log(`Generation ID: ${result.generationId}`);
    console.log(
      `Total latency: ${elapsed}ms (pipeline: ${result.totalLatencyMs}ms)`,
    );
    console.log(`LLM calls: ${result.llmCalls.length}`);
    console.log(`Example bank status: ${result.exampleBankStatus}`);
    console.log(
      `Word count: ${result.wordCount} (target: ${result.targetWordRange[0]}–${result.targetWordRange[1]})`,
    );
    console.log(`Word count drift: ${result.wordCountDrift}`);
    console.log(`Pre-check warnings: ${result.preCheckWarnings.length}`);
    console.log(`Post-validation: ${result.postValidationFlags.length} flags`);
    console.log(`Rerun count: ${result.rerunCount}`);

    console.log("\n--- EMOTIONAL TRUTH ---");
    console.log(result.emotionalTruth);

    console.log("\n--- BLUEPRINT ---");
    for (const bp of result.blueprint) {
      console.log(`  ${bp.index}. ${bp.text}`);
    }

    console.log("\n--- COPING TOOL PLACEMENT ---");
    console.log(result.copingToolPlacement);

    console.log("\n--- APPROACH INSTRUCTION ---");
    console.log(result.approachInstruction);

    if (result.inferredIntention) {
      console.log("\n--- INFERRED INTENTION ---");
      console.log(`Feel: ${result.inferredIntention.feel}`);
      console.log(`Because: ${result.inferredIntention.because}`);
    }

    if (result.compressionMetadata) {
      console.log("\n--- COMPRESSION METADATA ---");
      console.log(JSON.stringify(result.compressionMetadata, null, 2));
    }

    console.log("\n--- TITLE ---");
    console.log(result.title);

    console.log("\n--- STORY ---");
    console.log(result.story);

    console.log("\n--- ALIGNMENT NOTE ---");
    console.log(result.alignmentNote);

    if (result.postValidationFlags.length > 0) {
      console.log("\n--- POST-VALIDATION FLAGS ---");
      for (const flag of result.postValidationFlags) {
        console.log(`  [${flag.severity}] ${flag.checkType}: ${flag.passage}`);
        console.log(`    ${flag.reasoning}`);
      }
    }

    console.log("\n=== STRUCTURAL CHECKS ===\n");
    let passed = 0;
    let failed = 0;

    function check(name: string, condition: boolean) {
      if (condition) {
        console.log(`  ✅ ${name}`);
        passed++;
      } else {
        console.log(`  ❌ ${name}`);
        failed++;
      }
    }

    check("Emotional truth is non-empty", result.emotionalTruth.length > 0);
    check(
      "Emotional truth ends with 'feel' pattern",
      result.emotionalTruth.toLowerCase().includes("by the end, this child needs to feel"),
    );
    check("Blueprint has 6 points", result.blueprint.length === 6);
    check(
      "All blueprint points are non-empty",
      result.blueprint.every((bp) => bp.text.length > 0),
    );
    check(
      "Coping tool placement is non-empty",
      result.copingToolPlacement.length > 0,
    );
    check(
      "Approach instruction is non-empty",
      result.approachInstruction.length > 0,
    );
    check(
      "Approach instruction contains no clinical labels",
      !result.approachInstruction.toLowerCase().includes("graduated exposure") &&
        !result.approachInstruction.toLowerCase().includes("graduated_exposure"),
    );
    check("Title is non-empty", result.title.length > 0);
    check("Story is non-empty", result.story.length > 0);
    check("Story word count is positive", result.wordCount > 0);
    check("Alignment note is non-empty", result.alignmentNote.length > 0);
    check("LLM calls count is 3", result.llmCalls.length === 3);
    check(
      "LLM call steps are correct",
      result.llmCalls[0]?.step === "step1_architect" &&
        result.llmCalls[1]?.step === "step2_author" &&
        result.llmCalls[2]?.step === "step3_post_validation",
    );
    check("Generation ID is present", result.generationId.length > 0);
    check(
      "Generated-at is ISO timestamp",
      !isNaN(Date.parse(result.generatedAt)),
    );

    console.log("\n=== MANUAL REVIEW ITEMS ===\n");
    console.log("  1. Does the story avoid lecturing the child?");
    console.log(
      "  2. Is the coping tool (counting) shown in action, not named?",
    );
    console.log("  3. Does the protagonist's body experience fear physically?");
    console.log(
      "  4. Is the resolution partial (cautious hope, not full victory)?",
    );
    console.log("  5. Does the story respect the must-never list?");
    console.log("  6. Is the vocabulary appropriate for ages 3–5?");

    console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    console.log("Cleaning up smoke-test brief...");
    await firestore.collection(collection).doc(briefId).delete();
    console.log("Done.\n");

    process.exit(process.exitCode ?? 0);
  }
}

main().catch((err) => {
  console.error("Smoke test failed with error:", err);
  process.exit(1);
});
