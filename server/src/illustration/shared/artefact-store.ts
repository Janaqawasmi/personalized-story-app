import { firestore } from "@/config/firebase";
import type {
  FinalPromptArtefact,
  ImageArtefact,
  LLMCallRecord,
  ScenePlanArtefact,
  StructuredPrompt,
  VisualBibleArtefact,
} from "@/illustration/types";
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

export async function readLatestScenePlan(
  storyId: string,
  pageNumber: number,
): Promise<ScenePlanArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS)
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.data() as ScenePlanArtefact;
}

export async function updateScenePlanStructuredPrompt(
  storyId: string,
  pageNumber: number,
  version: number,
  structuredPrompt: StructuredPrompt,
  stage2LLMCall: LLMCallRecord,
): Promise<void> {
  const docId = `${pageNumber}-${version}`;
  await storyRef(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS)
    .doc(docId)
    .update({
      structuredPrompt,
      stage2LLMCall,
    });
}

export async function writeFinalPrompt(
  storyId: string,
  artefact: FinalPromptArtefact,
): Promise<void> {
  const docId = `${artefact.pageNumber}-${artefact.version}`;
  await storyRef(storyId)
    .collection(COLLECTIONS.STORY_FINAL_PROMPTS)
    .doc(docId)
    .set({
      ...artefact,
      storyId,
    });
}

export async function readFinalPrompt(
  storyId: string,
  pageNumber: number,
  version: number,
): Promise<FinalPromptArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_FINAL_PROMPTS)
    .doc(`${pageNumber}-${version}`)
    .get();
  if (!snap.exists) return null;
  return snap.data() as FinalPromptArtefact;
}

export async function readLatestFinalPrompt(
  storyId: string,
  pageNumber: number,
): Promise<FinalPromptArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_FINAL_PROMPTS)
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.data() as FinalPromptArtefact;
}

export async function writeImage(storyId: string, artefact: ImageArtefact): Promise<void> {
  const docId = `${artefact.pageNumber}-${artefact.version}`;
  await storyRef(storyId)
    .collection(COLLECTIONS.STORY_IMAGES)
    .doc(docId)
    .set({
      ...artefact,
      storyId,
    });
}

export async function readImage(
  storyId: string,
  pageNumber: number,
  version: number,
): Promise<ImageArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_IMAGES)
    .doc(`${pageNumber}-${version}`)
    .get();
  if (!snap.exists) return null;
  return snap.data() as ImageArtefact;
}

export async function readLatestImage(
  storyId: string,
  pageNumber: number,
): Promise<ImageArtefact | null> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_IMAGES)
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.data() as ImageArtefact;
}

export async function listScenePlansForPage(
  storyId: string,
  pageNumber: number,
): Promise<ScenePlanArtefact[]> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_SCENE_PLANS)
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .get();
  return snap.docs.map((d) => d.data() as ScenePlanArtefact);
}

export async function listImagesForPage(
  storyId: string,
  pageNumber: number,
): Promise<ImageArtefact[]> {
  const snap = await storyRef(storyId)
    .collection(COLLECTIONS.STORY_IMAGES)
    .where("pageNumber", "==", pageNumber)
    .orderBy("version", "desc")
    .get();
  return snap.docs.map((d) => d.data() as ImageArtefact);
}
