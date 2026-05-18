import type { ScenePlanArtefact, VisualBibleArtefact } from "@/illustration/types";
import type { DocumentReference } from "firebase-admin/firestore";
import { firestore } from "@/config/firebase";
import { fillIllustrationV2DocDefaults } from "@/models/story.model";
import type { Story } from "@/models/story.model";
import {
  readScenePlan,
  readVisualBible,
  updateScenePlanStructuredPrompt,
  writeFinalPrompt,
  writeImage,
} from "@/illustration/shared/artefact-store";
import { appendIllustrationEvent } from "@/illustration/shared/history-events";
import { nextFinalPromptVersion, nextImageVersion } from "@/illustration/shared/version-allocator";
import { assembleFinalPrompt } from "@/illustration/stage3-final-prompt";
import { runImageGeneration } from "@/illustration/stage4-image-generation";
import { runPromptEngineer } from "@/illustration/stage2-prompt-engineer";
import { assertJobNotCancelled } from "@/illustration/worker/cancellation";
import { COLLECTIONS } from "@/shared/firestore/paths";

export class IllegalStateGenerateImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalStateGenerateImageError";
  }
}

function hydrateStory(storyId: string, data: Record<string, unknown> | undefined): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

export async function markImageGenerationFailedOnStory(params: {
  storyId: string;
  pageNumber: number;
  jobId: string;
  message: string;
}): Promise<void> {
  const { storyId, pageNumber, jobId, message } = params;
  await firestore.runTransaction(async (tx) => {
    const ref = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);
    const pages = [...(story.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) return;
    const row = pages[idx]!;
    if (row.pendingJobId !== jobId) return;
    pages[idx] = {
      ...row,
      pendingJobId: null,
      status: "plan_only",
      lastError: message,
    };
    tx.update(ref, { illustrationPages: pages, updatedAt: Date.now() });
  });
}

export async function runStage2Through4(params: {
  storyId: string;
  pageNumber: number;
  uid: string;
  scenePlan: ScenePlanArtefact;
  visualBible: VisualBibleArtefact;
  visualBibleVersion: number;
  jobRef?: DocumentReference;
}): Promise<{ imageId: string; storagePath: string; publicUrl: string }> {
  const { storyId, pageNumber, uid, visualBible, visualBibleVersion, jobRef } = params;
  let scenePlan = params.scenePlan;

  if (jobRef) await assertJobNotCancelled(jobRef);

  if (!scenePlan.structuredPrompt) {
    const { structuredPrompt, stage2LLMCall } = await runPromptEngineer({
      scenePlan,
      visualBible,
    });
    await updateScenePlanStructuredPrompt(
      storyId,
      pageNumber,
      scenePlan.version,
      structuredPrompt,
      stage2LLMCall,
    );
    scenePlan = { ...scenePlan, structuredPrompt, stage2LLMCall };
  }

  if (jobRef) await assertJobNotCancelled(jobRef);

  const fpVersion = await nextFinalPromptVersion(storyId, pageNumber);
  const finalPrompt = assembleFinalPrompt({
    scenePlan,
    visualBible,
    version: fpVersion,
    parentScenePlanVersion: scenePlan.version,
    parentVisualBibleVersion: visualBibleVersion,
  });
  console.log(
    `[illustration/stage3] story=${storyId} page=${pageNumber} finalPrompt=v${fpVersion} assembly=${finalPrompt.promptOrder[0] ?? "?"} chars=${finalPrompt.charCount}`,
  );
  await writeFinalPrompt(storyId, finalPrompt);

  if (jobRef) await assertJobNotCancelled(jobRef);

  const imageVersion = await nextImageVersion(storyId, pageNumber);
  const imageArtefact = await runImageGeneration({
    storyId,
    finalPrompt,
    imageVersion,
  });
  await writeImage(storyId, imageArtefact);

  await firestore.runTransaction(async (tx) => {
    const ref = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
    const s = await tx.get(ref);
    if (!s.exists) throw new IllegalStateGenerateImageError("Story not found");
    const st = hydrateStory(storyId, s.data() as Record<string, unknown>);
    const pages = [...(st.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) throw new IllegalStateGenerateImageError("Page missing");
    const prev = pages[idx]!;
    pages[idx] = {
      ...prev,
      currentImageVersion: imageArtefact.version,
      status: "awaiting_review",
      pendingJobId: null,
      lastError: null,
    };
    tx.update(ref, { illustrationPages: pages, updatedAt: Date.now() });
  });

  await appendIllustrationEvent(
    storyId,
    { kind: "image_generated", pageNumber, version: imageArtefact.version },
    uid,
  );

  return {
    imageId: imageArtefact.id,
    storagePath: imageArtefact.storagePath,
    publicUrl: imageArtefact.publicUrl,
  };
}

export async function generateImage(params: {
  storyId: string;
  pageNumber: number;
  uid: string;
  jobRef?: DocumentReference;
}): Promise<{ imageId: string; storagePath: string; publicUrl: string }> {
  const { storyId, pageNumber, uid, jobRef } = params;
  const storyRef = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
  const snap = await storyRef.get();
  if (!snap.exists) {
    throw new IllegalStateGenerateImageError("Story not found");
  }
  const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);
  if (story.status !== "illustration_workspace") {
    throw new IllegalStateGenerateImageError(
      `generateImage requires illustration_workspace (got ${story.status})`,
    );
  }
  const row = story.illustrationPages?.find((p) => p.pageNumber === pageNumber);
  if (!row || row.currentScenePlanVersion === null) {
    throw new IllegalStateGenerateImageError("Missing illustration page or scene plan version");
  }

  const vbv = story.currentVisualBibleVersion;
  if (vbv === null) {
    throw new IllegalStateGenerateImageError("Missing Visual Bible version");
  }

  const scenePlan = await readScenePlan(storyId, pageNumber, row.currentScenePlanVersion);
  if (!scenePlan) {
    throw new IllegalStateGenerateImageError("Scene plan artefact missing");
  }

  const visualBible = await readVisualBible(storyId, vbv);
  if (!visualBible) {
    throw new IllegalStateGenerateImageError("Visual Bible artefact missing");
  }

  return runStage2Through4({
    storyId,
    pageNumber,
    uid,
    scenePlan,
    visualBible,
    visualBibleVersion: vbv,
    ...(jobRef ? { jobRef } : {}),
  });
}
