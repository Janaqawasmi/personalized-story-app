import { db } from "../config/firebase";
import { StoryBrief } from "../models/storyBrief.model";

type BriefLike = {
  topicKey?: string;
  targetAgeGroup?: string;
  topicTags?: string[];
  therapeuticMessages?: string[];
  briefId?: string;
};

/**
 * Maps StoryBrief to BriefLike format for RAG service compatibility
 */
function mapStoryBriefToBriefLike(brief: StoryBrief): BriefLike {
  // Map age group from "3_4" format to expected format if needed
  // For now, we'll use the ageGroup as-is, but you may need to convert it
  const ageGroupMapping: Record<string, string> = {
    "3_4": "3-4",
    "5_6": "5-6", 
    "7_8": "7-8",
    "9_10": "9-10"
  };
  
  const targetAgeGroup = ageGroupMapping[brief.childProfile.ageGroup] || brief.childProfile.ageGroup;
  
  return {
    topicKey: brief.therapeuticFocus.primaryTopic,
    targetAgeGroup: targetAgeGroup,
    topicTags: brief.therapeuticIntent.emotionalGoals,
    therapeuticMessages: brief.therapeuticIntent.keyMessage ? [brief.therapeuticIntent.keyMessage] : [],
    ...(brief.id && { briefId: brief.id })
  };
}

async function safeGetDoc(collection: string, docId: string) {
  try {
    const snap = await db.collection(collection).doc(docId).get();
    return snap.exists ? snap.data() : null;
  } catch (e) {
    console.warn(`Error reading ${collection}/${docId}`, e);
    return null;
  }
}

function compact(items?: string[], max = 8) {
  if (!items?.length) return "";
  return items.slice(0, max).map((x) => `- ${x}`).join("\n");
}

export async function retrieveKnowledgeForStory(brief: BriefLike | StoryBrief) {
  // If it's a StoryBrief, convert it to BriefLike format
  if ('therapeuticFocus' in brief && 'childProfile' in brief) {
    brief = mapStoryBriefToBriefLike(brief as StoryBrief);
  }
  let { topicKey, targetAgeGroup } = brief;

  if ((!topicKey || !targetAgeGroup) && brief.briefId) {
    const snap = await db
      .collection("specialist_story_briefs")
      .doc(brief.briefId)
      .get();
    if (snap.exists) {
      const data = snap.data()!;
      topicKey = topicKey || data.topicKey;
      targetAgeGroup = targetAgeGroup || data.targetAgeGroup;
    }
  }

  if (!topicKey || !targetAgeGroup) {
    return `
==== PLATFORM RULES ====
Child protagonist must be human.
Use metaphor → journey → resolution.
No guilt, no shame, no moralizing.
`.trim();
  }

  // ─────────────────────────────
  // A) Platform & Safety
  // ─────────────────────────────
  const stylePolicy = await safeGetDoc(
    "rag_style_policies",
    "character_policy_no_animal_child_v1"
  );
  const writingRules = await safeGetDoc(
    "rag_writing_rules",
    "therapeutic_writing_rules"
  );
  const dontDo = await safeGetDoc(
    "rag_dont_do_list",
    "global_therapeutic_avoid_list"
  );
  const ethics = await safeGetDoc(
    "rag_ethics",
    "healing_vs_manipulative_gate_v1"
  );

  // ─────────────────────────────
  // B) Core Therapeutic Framework
  // ─────────────────────────────
  const principles = await safeGetDoc(
    "rag_therapeutic_principles",
    "general_therapeutic_storytelling"
  );
  const framework = await safeGetDoc(
    "rag_narrative_framework",
    "classic_therapeutic_framework"
  );
  const intent = await safeGetDoc(
    "rag_story_intent",
    "therapeutic_story_intent"
  );
  const journey = await safeGetDoc(
    "rag_story_journey",
    "tension_principles_v1"
  );
  const ageRules = await safeGetDoc(
    "rag_age_complexity_rules",
    "journey_complexity_by_age_v1"
  );

  // ─────────────────────────────
  // C) Metaphor & Devices
  // ─────────────────────────────
  const metaphorRules = await safeGetDoc(
    "rag_metaphor_rules",
    "metaphor_writing_rules"
  );
  const metaphorSafety = await safeGetDoc(
    "rag_metaphor_safety",
    "metaphor_caution_rules_v1"
  );
  const obstacleHelper = await safeGetDoc(
    "rag_obstacle_helper_integration",
    "journey_obstacle_helper_mapping_v1"
  );
  const refrain = await safeGetDoc(
    "rag_story_devices",
    "soothing_refrain_lullaby_v1"
  );

  // ─────────────────────────────
  // D) Topic-Specific Patterns
  // ─────────────────────────────
  const desiredTags = new Set([
    topicKey,
    ...(brief.topicTags || []),
    ...(brief.therapeuticMessages || []).map((x) =>
      x.toLowerCase().replace(/\s+/g, "_")
    ),
  ]);

  let patterns: any[] = [];
  const snap = await db
    .collection("rag_theme_patterns")
    .where("targetAges", "array-contains", targetAgeGroup)
    .get();

  patterns = snap.docs
    .map((d) => d.data())
    .map((p) => ({
      p,
      score: (p.topicTags || []).filter((t: string) =>
        desiredTags.has(t)
      ).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.p);

  // ─────────────────────────────
  // Final Context
  // ─────────────────────────────
  return `
==== PLATFORM CONSTRAINTS ====
Child must be human.
${compact(stylePolicy?.policy?.notes)}

==== THERAPEUTIC PRINCIPLES ====
${compact(principles?.principles)}

==== NARRATIVE FRAMEWORK ====
${framework?.framework
  ?.map((s: any) => `- ${s.stage}: ${s.description}`)
  .join("\n")}

==== STORY INTENT ====
${compact(intent?.intent)}

==== WRITING RULES ====
${compact(writingRules?.rules)}

==== DO NOT ====
${compact(dontDo?.avoid)}

==== METAPHOR RULES ====
${compact(metaphorRules?.rules)}

==== METAPHOR SAFETY ====
${compact(metaphorSafety?.rules)}

==== JOURNEY PRINCIPLES ====
${compact(journey?.principles)}

==== OBSTACLE / HELPER LOGIC ====
${compact(obstacleHelper?.guidance)}

==== REFRAIN RULES ====
${compact(refrain?.rules)}

==== TOPIC PATTERNS ====
${patterns.length ? JSON.stringify(patterns, null, 2) : "Use general framework only."}
`.trim();
}
