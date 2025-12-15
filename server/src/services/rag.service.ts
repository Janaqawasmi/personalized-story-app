import { db } from "../config/firebase";


export async function retrieveKnowledgeForStory(brief: any) {
  const { topicKey, targetAgeGroup } = brief;

  // 1. therapeutic guidelines
  const guidelinesSnap = await db
    .collection("therapeutic_guidelines")
    .where("topicKey", "==", topicKey)
    .where("ageGroup", "==", targetAgeGroup)
    .get();

  const guidelines = guidelinesSnap.empty
    ? ""
    : guidelinesSnap.docs[0]?.data().content ?? "";

  // 2. age/language rules
  const ageRulesSnap = await db
    .collection("age_language_rules")
    .where("ageGroup", "==", targetAgeGroup)
    .get();

  const ageRules = ageRulesSnap.empty
    ? ""
    : ageRulesSnap.docs[0]?.data().content ?? "";

  // 3. story structure template
  const structureSnap = await db
    .collection("story_structures")
    .where("topicKey", "==", topicKey)
    .get();

  const structure = structureSnap.empty
    ? "Use standard therapeutic story structure."
    : structureSnap.docs[0]?.data().content ?? "Use standard therapeutic story structure.";

  // 4. don't-do list
  const dontDoSnap = await db
    .collection("dont_do_lists")
    .where("topicKey", "==", topicKey)
    .get();

  const dontDo = dontDoSnap.empty
    ? ""
    : dontDoSnap.docs[0]?.data().content ?? "";

  // Combine everything into one context
  const finalContext = `
==== THERAPEUTIC GUIDELINES ====
${guidelines}

==== AGE LANGUAGE RULES ====
${ageRules}

==== STORY STRUCTURE ====
${structure}

==== WORDS/PHRASES TO AVOID ====
${dontDo}
`;

  return finalContext;
}
