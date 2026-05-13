import { firestore } from "@/config/firebase";
import type { ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";
import { COLLECTIONS } from "@/shared/firestore/paths";

function storyRef(storyId: string) {
  return firestore.collection(COLLECTIONS.STORIES).doc(storyId);
}

/** Document id = version string for direct lookup via `currentVisualBibleVersion`. */
export async function writeVisualBible(
  storyId: string,
  artefact: VisualBibleArtefact,
): Promise<void> {
  const docId = String(artefact.version);
  await storyRef(storyId)
    .collection(COLLECTIONS.STORY_VISUAL_BIBLES)
    .doc(docId)
    .set({
      ...artefact,
      storyId,
    });
}

/** Document id encodes page + version for direct lookup from `IllustrationPage`. */
export async function writeScenePlan(
  storyId: string,
  artefact: ScenePlanArtefact,
): Promise<void> {
  const docId = `${artefact.pageNumber}-${artefact.version}`;
  await storyRef(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS)
    .doc(docId)
    .set({
      ...artefact,
      storyId,
    });
}

export async function readVisualBible(
  storyId: string,
  version: number,
): Promise<VisualBibleArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_VISUAL_BIBLES)
    .doc(String(version))
    .get();
  if (!snap.exists) return null;
  return snap.data() as VisualBibleArtefact;
}

export async function readLatestVisualBible(
  storyId: string,
): Promise<VisualBibleArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_VISUAL_BIBLES)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.data() as VisualBibleArtefact;
}

export async function readScenePlan(
  storyId: string,
  pageNumber: number,
  version: number,
): Promise<ScenePlanArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS)
    .doc(`${pageNumber}-${version}`)
    .get();
  if (!snap.exists) return null;
  return snap.data() as ScenePlanArtefact;
}
