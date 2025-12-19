import { db } from "../config/firebase";


export async function retrieveKnowledgeForStory(briefOrDraft: any) {
  let topicKey = briefOrDraft?.topicKey;
  let targetAgeGroup = briefOrDraft?.targetAgeGroup;

  // If we have a draft with briefId, fetch the brief to get topicKey and targetAgeGroup
  if (!topicKey && briefOrDraft?.briefId) {
    const briefSnap = await db.collection("admin_story_briefs").doc(briefOrDraft.briefId).get();
    if (briefSnap.exists) {
      const briefData = briefSnap.data();
      topicKey = briefData?.topicKey;
      targetAgeGroup = briefData?.targetAgeGroup;
    }
  }

  // If still no values, return empty context
  if (!topicKey || !targetAgeGroup) {
    console.warn("Missing topicKey or targetAgeGroup, returning minimal context");
    return `
==== THERAPEUTIC GUIDELINES ====
Use general therapeutic principles for children's stories.

==== AGE LANGUAGE RULES ====
Use age-appropriate language and concepts.

==== STORY STRUCTURE ====
Use standard therapeutic story structure.

==== WORDS/PHRASES TO AVOID ====
Avoid triggering language, violence, or inappropriate content.
`;
  }

  // 1. therapeutic guidelines
  let guidelines = "";
  try {
    const guidelinesSnap = await db
      .collection("therapeutic_guidelines")
      .where("topicKey", "==", topicKey)
      .where("ageGroup", "==", targetAgeGroup)
      .get();

    guidelines = guidelinesSnap.empty
      ? ""
      : guidelinesSnap.docs[0]?.data().content ?? "";
  } catch (error) {
    console.warn("Error fetching therapeutic guidelines:", error);
  }

  // 2. age/language rules
  let ageRules = "";
  try {
    const ageRulesSnap = await db
      .collection("age_language_rules")
      .where("ageGroup", "==", targetAgeGroup)
      .get();

    ageRules = ageRulesSnap.empty
      ? ""
      : ageRulesSnap.docs[0]?.data().content ?? "";
  } catch (error) {
    console.warn("Error fetching age rules:", error);
  }

  // 3. story structure template
  let structure = "Use standard therapeutic story structure.";
  try {
    const structureSnap = await db
      .collection("story_structures")
      .where("topicKey", "==", topicKey)
      .get();

    structure = structureSnap.empty
      ? "Use standard therapeutic story structure."
      : structureSnap.docs[0]?.data().content ?? "Use standard therapeutic story structure.";
  } catch (error) {
    console.warn("Error fetching story structure:", error);
  }

  // 4. don't-do list
  let dontDo = "";
  try {
    const dontDoSnap = await db
      .collection("dont_do_lists")
      .where("topicKey", "==", topicKey)
      .get();

    dontDo = dontDoSnap.empty
      ? ""
      : dontDoSnap.docs[0]?.data().content ?? "";
  } catch (error) {
    console.warn("Error fetching dont-do list:", error);
  }

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
