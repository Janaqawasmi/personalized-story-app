import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { TOPIC_MAP } from "../constants/topicMap";

export async function fetchStories(ageGroup: string, uiTopic: string) {
  console.log("🚀 fetchStories called");
  console.log("ageGroup:", ageGroup);
  console.log("uiTopic:", uiTopic);

  const topicKeys = TOPIC_MAP[uiTopic];
  console.log("mapped topicKeys:", topicKeys);

  if (!topicKeys) {
    console.error("❌ No topic mapping found");
    return [];
  }

  const q = query(
    collection(db, "story_templates"),
    where("isActive", "==", true),
    where("targetAgeGroup", "==", ageGroup),
    where("topicKey", "in", topicKeys)
  );

  console.log("📡 Running Firestore query...");

  const snapshot = await getDocs(q);

  console.log("📦 Firestore docs count:", snapshot.docs.length);

  snapshot.docs.forEach((d) =>
    console.log("👉 doc:", d.id, d.data())
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
