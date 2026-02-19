import admin from "firebase-admin";
import path from "path";
import fs from "fs";

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

const db = admin.firestore();

// ----------------------------------------------------------------------------
// Clinical Rules Data (v1)
// ----------------------------------------------------------------------------

const clinicalRulesV1 = {
  // Version metadata
  version: {
    version: "v1",
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notes: "Initial MVP rules",
  },

  // Age rules
  ageRules: {
    "0_3": {
      maxWords: 220,
      minScenes: 4,
      maxScenes: 6,
      maxSentenceWords: 6,
      dialoguePolicy: "minimal",
      abstractConcepts: "no",
    },
    "3_6": {
      maxWords: 450,
      minScenes: 5,
      maxScenes: 8,
      maxSentenceWords: 10,
      dialoguePolicy: "allowed",
      abstractConcepts: "limited",
    },
    "6_9": {
      maxWords: 700,
      minScenes: 6,
      maxScenes: 10,
      maxSentenceWords: 14,
      dialoguePolicy: "allowed",
      abstractConcepts: "limited",
    },
    "9_12": {
      maxWords: 950,
      minScenes: 7,
      maxScenes: 12,
      maxSentenceWords: 18,
      dialoguePolicy: "allowed",
      abstractConcepts: "yes",
    },
  },

  // Goal mappings
  goalMappings: {
    normalize_emotions: {
      requiredElements: ["emotion_labeling", "validation_phrase"],
      allowedCopingTools: ["name_the_feeling"],
      avoidPatterns: ["shaming_language"],
      requiresClosure: true,
    },
    reduce_fear: {
      requiredElements: ["emotion_labeling", "reassurance_loop", "gentle_exposure_steps"],
      allowedCopingTools: ["balloon_breathing", "safe_object", "coping_phrase"],
      avoidPatterns: ["suspense", "threat_metaphors"],
      requiresClosure: true,
    },
    build_trust: {
      requiredElements: ["predictable_routine", "caregiver_reassurance"],
      allowedCopingTools: ["coping_phrase", "safe_object"],
      avoidPatterns: ["betrayal_theme"],
      requiresClosure: true,
    },
    self_confidence: {
      requiredElements: ["small_success_moment", "positive_self_talk"],
      allowedCopingTools: ["coping_phrase"],
      avoidPatterns: ["humiliation"],
      requiresClosure: true,
    },
    emotional_regulation: {
      requiredElements: ["emotion_labeling", "coping_tool_practice"],
      allowedCopingTools: ["balloon_breathing", "counting"],
      avoidPatterns: ["punishment_tone"],
      requiresClosure: true,
    },
  },

  // Coping tools
  copingTools: {
    balloon_breathing: {
      allowedAges: ["0_3", "3_6", "6_9"],
      repetitionRequired: 3,
    },
    counting: {
      allowedAges: ["3_6", "6_9", "9_12"],
      repetitionRequired: 2,
    },
    safe_object: {
      allowedAges: ["0_3", "3_6", "6_9"],
      repetitionRequired: 2,
    },
    coping_phrase: {
      allowedAges: ["0_3", "3_6", "6_9", "9_12"],
      repetitionRequired: 2,
    },
    name_the_feeling: {
      allowedAges: ["0_3", "3_6", "6_9", "9_12"],
      repetitionRequired: 1,
    },
  },

  // Ending rules
  endingRules: {
    calm_resolution: {
      mustInclude: ["emotional_closure", "calm_state"],
      mustAvoid: ["cliffhanger"],
      requiresEmotionalStability: true,
      requiresSuccessMoment: false,
    },
    open_ended: {
      mustInclude: ["safe_present_moment"],
      mustAvoid: ["new_threat"],
      requiresEmotionalStability: true,
      requiresSuccessMoment: false,
    },
    empowering: {
      mustInclude: ["success_moment", "positive_self_talk"],
      mustAvoid: ["helplessness"],
      requiresEmotionalStability: true,
      requiresSuccessMoment: true,
    },
  },

  // Sensitivity rules
  sensitivityRules: {
    low: {
      addMustAvoid: [],
      forceSafeClosure: false,
    },
    medium: {
      addMustAvoid: ["sudden_surprise"],
      forceSafeClosure: true,
    },
    high: {
      addMustAvoid: ["suspense", "sudden_surprise", "emotional_spikes"],
      forceSafeClosure: true,
    },
  },

  // Exclusions
  exclusions: {
    medical_imagery: {
      banned: ["needles", "blood", "hospital_realism"],
    },
    authority_figures: {
      banned: ["police_threat", "punitive_authority"],
    },
  },
};

// ----------------------------------------------------------------------------
// Seed Function
// ----------------------------------------------------------------------------

async function seedClinicalRules() {
  console.log("🌱 Seeding clinical rules (v1)...");

  const batch = db.batch();

  // 1. Create settings/rules document
  const settingsRef = db.collection("settings").doc("rules");
  batch.set(settingsRef, {
    defaultVersion: "v1",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("✅ settings/rules");

  // 2. Create clinicalRules/versions/v1 document
  const versionRef = db
    .collection("clinicalRules")
    .doc("versions")
    .collection("versions")
    .doc("v1");
  batch.set(versionRef, clinicalRulesV1.version);
  console.log("✅ clinicalRules/versions/v1");

  // 3. Seed ageRules subcollection
  for (const [ageBand, rule] of Object.entries(clinicalRulesV1.ageRules)) {
    const ageRuleRef = versionRef.collection("ageRules").doc(ageBand);
    batch.set(ageRuleRef, rule);
    console.log(`✅ clinicalRules/versions/v1/ageRules/${ageBand}`);
  }

  // 4. Seed goalMappings subcollection
  for (const [goalId, mapping] of Object.entries(clinicalRulesV1.goalMappings)) {
    const goalMappingRef = versionRef.collection("goalMappings").doc(goalId);
    batch.set(goalMappingRef, mapping);
    console.log(`✅ clinicalRules/versions/v1/goalMappings/${goalId}`);
  }

  // 5. Seed copingTools subcollection
  for (const [toolId, tool] of Object.entries(clinicalRulesV1.copingTools)) {
    const copingToolRef = versionRef.collection("copingTools").doc(toolId);
    batch.set(copingToolRef, tool);
    console.log(`✅ clinicalRules/versions/v1/copingTools/${toolId}`);
  }

  // 6. Seed endingRules subcollection
  for (const [endingStyle, rule] of Object.entries(clinicalRulesV1.endingRules)) {
    const endingRuleRef = versionRef.collection("endingRules").doc(endingStyle);
    batch.set(endingRuleRef, rule);
    console.log(`✅ clinicalRules/versions/v1/endingRules/${endingStyle}`);
  }

  // 7. Seed exclusions subcollection
  for (const [exclusionId, exclusion] of Object.entries(clinicalRulesV1.exclusions)) {
    const exclusionRef = versionRef.collection("exclusions").doc(exclusionId);
    batch.set(exclusionRef, exclusion);
    console.log(`✅ clinicalRules/versions/v1/exclusions/${exclusionId}`);
  }

  // 8. Seed sensitivityRules subcollection
  for (const [level, rule] of Object.entries(clinicalRulesV1.sensitivityRules)) {
    const sensitivityRuleRef = versionRef.collection("sensitivityRules").doc(level);
    batch.set(sensitivityRuleRef, rule);
    console.log(`✅ clinicalRules/versions/v1/sensitivityRules/${level}`);
  }

  // Commit all writes
  await batch.commit();
  console.log("🎉 Clinical rules seeding completed.");
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

seedClinicalRules()
  .then(() => {
    console.log("🚀 Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
