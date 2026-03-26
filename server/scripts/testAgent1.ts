// server/scripts/testAgent1.ts
import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { loadClinicalRules } from "../src/services/clinicalRules.service";
import { validateStoryBriefInput } from "../src/agents/agent1/validateStoryBrief";
import { buildGenerationContract } from "../src/agents/agent1/buildGenerationContract";
import { db } from "../src/config/firebase";

// ----------------------------------------------------------------------------
// Initialize Firebase Admin
// ----------------------------------------------------------------------------

const serviceAccountPath = path.resolve(
  __dirname,
  "../config/serviceAccountKey.json"
);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ----------------------------------------------------------------------------
// Test Briefs
// ----------------------------------------------------------------------------

// Valid brief: uses existing referenceData keys
const validBrief = {
  createdBy: "test_specialist_001",
  storyContext: {
    primaryTopic: "school_fears",
    generalSituation: "separation",
    specificSituation: "afraid_parent_wont_return",
    targetAgeRange: { min: 3, max: 6 },
    languageComplexity: "simple",
  },
  therapeuticDesign: {
    emotionalGoals: ["reduce_fear", "build_trust"],
    keyMessage: "You are brave and can face your fears",
    therapeuticMechanism: ["normalization", "modeling"],
    copingTools: ["deep_breathing", "safe_person"],
    therapeuticBoundaries: ["Never promise the fear will disappear completely"],
  },
  emotionalDesign: {
    emotionalTone: "calm",
    topicSensitivity: "medium",
    endingStyle: "calm_resolution",
    emotionalArc: "gentle_progression",
    peakIntensity: "mild",
  },
  safetyBoundaries: {
    contentExclusions: ["medical_imagery"],
  },
  characterDesign: {
    protagonistType: "child_character",
    protagonistAgeRelation: "same_age",
    protagonistGender: "neutral",
    caregiverRole: "comfort_presence",
  },
  personalizationConfig: {
    personalizationAllowed: true,
    namePersonalization: true,
    illustrationPersonalization: false,
  },
};

// Invalid brief: missing createdBy, too many goals, keyMessage too long
const invalidBrief = {
  // Missing createdBy
  storyContext: {
    primaryTopic: "fear_anxiety",
    generalSituation: "separation",
    specificSituation: "fear_of_school",
    targetAgeRange: { min: 3, max: 6 },
    languageComplexity: "very_simple",
  },
  therapeuticDesign: {
    emotionalGoals: [
      "normalize_emotions",
      "reduce_fear",
      "build_trust",
      "self_confidence", // Too many goals (4 > 3)
    ],
    keyMessage: "A".repeat(201), // Too long (> 200 chars)
    therapeuticMechanism: ["normalization"],
    copingTools: ["deep_breathing"],
    therapeuticBoundaries: ["Never promise the fear will disappear"],
  },
  emotionalDesign: {
    emotionalTone: "very_gentle",
    topicSensitivity: "low",
    endingStyle: "open_ended",
    emotionalArc: "acknowledge_then_resolve",
    peakIntensity: "minimal",
  },
  safetyBoundaries: {
    contentExclusions: [],
  },
  characterDesign: {
    protagonistType: "animal_character",
    protagonistAgeRelation: "unspecified",
    protagonistGender: "female",
    caregiverRole: "absent",
  },
  personalizationConfig: {
    personalizationAllowed: false,
    personalizationReason: "Animal protagonist required for therapeutic mechanism",
    namePersonalization: false,
    illustrationPersonalization: false,
  },
};

// Mismatch brief: situation belongs to different topic
const mismatchBrief = {
  createdBy: "test_specialist_002",
  storyContext: {
    primaryTopic: "school_fears",
    generalSituation: "separation",
    specificSituation: "doctor_visit", // Mismatch: situation vs topic
    targetAgeRange: { min: 3, max: 6 },
    languageComplexity: "simple",
  },
  therapeuticDesign: {
    emotionalGoals: ["normalize_emotions"],
    keyMessage: "Test message",
    therapeuticMechanism: ["graduated_exposure"],
    copingTools: ["counting"],
    therapeuticBoundaries: ["Never suggest the child is being silly"],
  },
  emotionalDesign: {
    emotionalTone: "calm",
    topicSensitivity: "high",
    endingStyle: "empowering",
    emotionalArc: "discovery_journey",
    peakIntensity: "moderate",
  },
  safetyBoundaries: {
    contentExclusions: [],
  },
  characterDesign: {
    protagonistType: "child_character",
    protagonistAgeRelation: "slightly_older",
    protagonistGender: "male",
    caregiverRole: "active_guide",
  },
  personalizationConfig: {
    personalizationAllowed: true,
    namePersonalization: true,
    illustrationPersonalization: true,
    genderAdaptation: "requires_review",
    personalizationConstraints: ["Forest setting is essential to the metaphor"],
  },
};

// ----------------------------------------------------------------------------
// Test Functions
// ----------------------------------------------------------------------------

async function testClinicalRules() {
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Loading Clinical Rules");
  console.log("=".repeat(80));

  try {
    const rules = await loadClinicalRules(undefined, db);
    console.log("✅ Clinical rules loaded successfully");
    console.log(`   Version: ${rules.version}`);
    console.log(`   Age rules: ${Object.keys(rules.ageRules).length}`);
    console.log(`   Goal mappings: ${Object.keys(rules.goalMappings).length}`);
    console.log(`   Coping tools: ${Object.keys(rules.copingTools).length}`);
    console.log(`   Ending rules: ${Object.keys(rules.endingRules).length}`);
    console.log(`   Sensitivity rules: ${Object.keys(rules.sensitivityRules).length}`);
    console.log(`   Exclusions: ${Object.keys(rules.exclusions).length}`);
    return true;
  } catch (error: any) {
    console.error("❌ Failed to load clinical rules:", error.message);
    return false;
  }
}

async function testValidation(briefName: string, brief: any) {
  console.log("\n" + "-".repeat(80));
  console.log(`Testing: ${briefName}`);
  console.log("-".repeat(80));

  try {
    const result = await validateStoryBriefInput(brief, { firestore: db });

    console.log(`✅ Validation completed`);
    console.log(`   isValid: ${result.isValid}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log("\n   Error codes:");
      result.errors.forEach((err) => {
        console.log(`     - ${err.code}: ${err.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log("\n   Warning codes:");
      result.warnings.forEach((warn) => {
        console.log(`     - ${warn.code}: ${warn.message}`);
      });
    }

    return result;
  } catch (error: any) {
    console.error(`❌ Validation failed: ${error.message}`);
    return null;
  }
}

async function testContractBuilding() {
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Building Generation Contract (valid brief)");
  console.log("=".repeat(80));

  try {
    const contract = await buildGenerationContract(
      "test_valid",
      validBrief,
      { firestore: db }
    );

    console.log("✅ Contract built successfully");
    console.log(`   briefId: ${contract.briefId}`);
    console.log(`   rulesVersionUsed: ${contract.rulesVersionUsed}`);
    console.log(`   status: ${contract.status}`);
    console.log(`   errors: ${contract.errors.length}`);
    console.log(`   warnings: ${contract.warnings.length}`);

    console.log("\n   Key Fields:");
    console.log(`   - lengthBudget:`, {
      minScenes: contract.lengthBudget.minScenes,
      maxScenes: contract.lengthBudget.maxScenes,
      maxWords: contract.lengthBudget.maxWords,
    });
    console.log(`   - requiredElements (${contract.requiredElements.length}):`, 
      contract.requiredElements.slice(0, 10).join(", ") + 
      (contract.requiredElements.length > 10 ? "..." : "")
    );
    console.log(`   - allowedCopingTools (${contract.allowedCopingTools.length}):`, 
      contract.allowedCopingTools.join(", ")
    );
    console.log(`   - mustAvoid (${contract.mustAvoid.length}, showing first 15):`, 
      contract.mustAvoid.slice(0, 15).join(", ") + 
      (contract.mustAvoid.length > 15 ? "..." : "")
    );
    console.log(`   - endingContract.requiresSafeClosure: ${contract.endingContract.requiresSafeClosure}`);

    return contract;
  } catch (error: any) {
    console.error(`❌ Contract building failed: ${error.message}`);
    return null;
  }
}

async function testContractPersistence(contract: any) {
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: Verifying Contract Persistence");
  console.log("=".repeat(80));

  try {
    // Read back from Firestore
    const contractDoc = await db
      .collection("generationContracts")
      .doc("test_valid")
      .get();

    if (!contractDoc.exists) {
      console.error("❌ Contract not found in Firestore");
      return false;
    }

    const savedContract = contractDoc.data();
    console.log("✅ Contract found in Firestore");
    console.log(`   briefId: ${savedContract?.briefId}`);
    console.log(`   rulesVersionUsed: ${savedContract?.rulesVersionUsed}`);
    console.log(`   status: ${savedContract?.status}`);
    console.log(`   createdAt: ${savedContract?.createdAt ? "present" : "missing"}`);
    console.log(`   updatedAt: ${savedContract?.updatedAt ? "present" : "missing"}`);
    console.log(`   validationSummary:`, savedContract?.validationSummary);

    // Verify key fields match (excluding timestamps)
    const fieldsMatch = 
      savedContract?.briefId === contract.briefId &&
      savedContract?.rulesVersionUsed === contract.rulesVersionUsed &&
      savedContract?.status === contract.status &&
      savedContract?.requiredElements?.length === contract.requiredElements.length;

    if (fieldsMatch) {
      console.log("✅ Key fields match saved contract");
      return true;
    } else {
      console.warn("⚠️  Some fields don't match (excluding timestamps)");
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Failed to verify contract: ${error.message}`);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Main Test Runner
// ----------------------------------------------------------------------------

async function runTests() {
  console.log("\n" + "=".repeat(80));
  console.log("AGENT 1 END-TO-END TEST");
  console.log("=".repeat(80));

  // Step 1: Load clinical rules
  const rulesLoaded = await testClinicalRules();
  if (!rulesLoaded) {
    console.error("\n❌ Cannot proceed without clinical rules");
    process.exit(1);
  }

  // Step 2: Test validation
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: Testing Story Brief Validation");
  console.log("=".repeat(80));

  const validResult = await testValidation("validBrief", validBrief);
  const invalidResult = await testValidation("invalidBrief", invalidBrief);
  const mismatchResult = await testValidation("mismatchBrief", mismatchBrief);

  // Step 3: Build contract if valid brief passed
  if (validResult && validResult.isValid) {
    const contract = await testContractBuilding();
    
    if (contract) {
      // Step 4: Verify persistence
      await testContractPersistence(contract);
    }
  } else {
    console.log("\n⚠️  Skipping contract building - valid brief did not pass validation");
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Clinical rules: ${rulesLoaded ? "PASSED" : "FAILED"}`);
  console.log(`✅ Valid brief validation: ${validResult?.isValid ? "PASSED" : "FAILED"}`);
  console.log(`✅ Invalid brief validation: ${!invalidResult?.isValid ? "PASSED" : "FAILED"}`);
  console.log(`✅ Mismatch brief validation: ${!mismatchResult?.isValid ? "PASSED" : "FAILED"}`);
  
  if (validResult?.isValid) {
    const contract = await db.collection("generationContracts").doc("test_valid").get();
    console.log(`✅ Contract building: ${contract.exists ? "PASSED" : "FAILED"}`);
    console.log(`✅ Contract persistence: ${contract.exists ? "PASSED" : "FAILED"}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("Tests completed!");
  console.log("=".repeat(80) + "\n");
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
