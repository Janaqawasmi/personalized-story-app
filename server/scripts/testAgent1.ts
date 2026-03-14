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
  therapeuticFocus: {
    primaryTopic: "fear_anxiety", // Valid topic
    specificSituation: "fear_of_school", // Valid situation that matches topic
  },
  childProfile: {
    ageGroup: "6_9",
    emotionalSensitivity: "medium",
  },
  therapeuticIntent: {
    emotionalGoals: ["reduce_fear", "build_trust"], // Valid goals (1-3)
    keyMessage: "You are brave and can face your fears", // < 200 chars
  },
  languageTone: {
    complexity: "simple",
    emotionalTone: "calm",
  },
  safetyConstraints: {
    exclusions: ["medical_imagery"], // Valid exclusion
  },
  storyPreferences: {
    caregiverPresence: "included",
    endingStyle: "calm_resolution",
  },
};

// Invalid brief: missing createdBy, too many goals, keyMessage too long
const invalidBrief = {
  // Missing createdBy
  therapeuticFocus: {
    primaryTopic: "fear_anxiety",
    specificSituation: "fear_of_school",
  },
  childProfile: {
    ageGroup: "3_6",
    emotionalSensitivity: "low",
  },
  therapeuticIntent: {
    emotionalGoals: [
      "normalize_emotions",
      "reduce_fear",
      "build_trust",
      "self_confidence", // Too many goals (4 > 3)
    ],
    keyMessage: "A".repeat(201), // Too long (> 200 chars)
  },
  languageTone: {
    complexity: "very_simple",
    emotionalTone: "very_gentle",
  },
  safetyConstraints: {
    exclusions: [],
  },
  storyPreferences: {
    caregiverPresence: "self_guided",
    endingStyle: "open_ended",
  },
};

// Mismatch brief: situation belongs to different topic
const mismatchBrief = {
  createdBy: "test_specialist_002",
  therapeuticFocus: {
    primaryTopic: "fear_anxiety", // Topic is fear_anxiety
    specificSituation: "doctor_visit", // But situation belongs to medical_experiences
  },
  childProfile: {
    ageGroup: "3_6",
    emotionalSensitivity: "high",
  },
  therapeuticIntent: {
    emotionalGoals: ["normalize_emotions"],
    keyMessage: "Test message",
  },
  languageTone: {
    complexity: "simple",
    emotionalTone: "calm",
  },
  safetyConstraints: {
    exclusions: [],
  },
  storyPreferences: {
    caregiverPresence: "included",
    endingStyle: "empowering",
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
