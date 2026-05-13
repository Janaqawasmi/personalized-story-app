import { firestore } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";

export async function nextVisualBibleVersion(storyId: string): Promise<number> {
  const coll = firestore
    .collection(COLLECTIONS.STORIES)
    .doc(storyId)
    .collection(COLLECTIONS.STORY_VISUAL_BIBLES);
  const snap = await coll.orderBy("version", "desc").limit(1).get();
  if (snap.empty) return 1;
  const doc = snap.docs[0];
  if (!doc) return 1;
  return Number(doc.data()["version"] ?? 0) + 1;
}

export async function nextScenePlanVersion(
  storyId: string,
  pageNumber: number,
): Promise<number> {
  const coll = firestore
    .collection(COLLECTIONS.STORIES)
    .doc(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS);
  const snap = await coll
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return 1;
  const doc = snap.docs[0];
  if (!doc) return 1;
  return Number(doc.data()["version"] ?? 0) + 1;
}
