import { firestore } from "@/config/firebase";
import {
  readScenePlan,
  readVisualBible,
  writeScenePlan,
} from "@/illustration/shared/artefact-store";
import { appendIllustrationEvent } from "@/illustration/shared/history-events";
import { runScenePlannerForPage } from "@/illustration/stage1-scene-planner";
import { fillIllustrationV2DocDefaults } from "@/models/story.model";
import type { Story } from "@/models/story.model";
import { COLLECTIONS } from "@/shared/firestore/paths";
import { IllegalStateGenerateImageError, runStage2Through4 } from "./generateImage";

function hydrateStory(storyId: string, data: Record<string, unknown> | undefined): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

function manuscriptPagesFromStory(story: Story): { pageNumber: number; text: string }[] {
  if (!story.pages?.length) {
    throw new IllegalStateGenerateImageError("Story has no manuscript pages");
  }
  return [...story.pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({ pageNumber: p.pageNumber, text: p.text }));
}

export async function cascadeAfterReject(params: {
  storyId: string;
  pageNumber: number;
  uid: string;
  feedbackNote: string | null;
  expectedPendingJobId: string;
}): Promise<{ imageId: string; storagePath: string; publicUrl: string }> {
  const { storyId, pageNumber, uid, feedbackNote, expectedPendingJobId } = params;
  const storyRef = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
  const snap = await storyRef.get();
  if (!snap.exists) {
    throw new IllegalStateGenerateImageError("Story not found");
  }
  const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);
  if (story.status !== "illustration_workspace") {
    throw new IllegalStateGenerateImageError(
      `cascadeAfterReject requires illustration_workspace (got ${story.status})`,
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
  const visualBible = await readVisualBible(storyId, vbv);
  if (!visualBible) {
    throw new IllegalStateGenerateImageError("Visual Bible artefact missing");
  }
  const previousScenePlan = await readScenePlan(storyId, pageNumber, row.currentScenePlanVersion);
  if (!previousScenePlan) {
    throw new IllegalStateGenerateImageError("Scene plan artefact missing");
  }

  const manuscriptPages = manuscriptPagesFromStory(story);
  const newPlan = await runScenePlannerForPage({
    story,
    manuscriptPages,
    visualBible,
    pageNumber,
    previousScenePlan,
    feedbackNote,
  });
  await writeScenePlan(storyId, newPlan);

  await firestore.runTransaction(async (tx) => {
    const ref = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
    const s = await tx.get(ref);
    if (!s.exists) throw new IllegalStateGenerateImageError("Story not found");
    const st = hydrateStory(storyId, s.data() as Record<string, unknown>);
    const pages = [...(st.illustrationPages ?? [])];
    const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
    if (idx < 0) throw new IllegalStateGenerateImageError("Page missing");
    const prev = pages[idx]!;
    if (prev.pendingJobId !== expectedPendingJobId) {
      throw new IllegalStateGenerateImageError("Illustration job no longer active for this page");
    }
    pages[idx] = {
      ...prev,
      currentScenePlanVersion: newPlan.version,
      lastError: null,
    };
    tx.update(ref, { illustrationPages: pages, updatedAt: Date.now() });
  });

  const withFeedback = feedbackNote !== null && feedbackNote.trim().length > 0;
  await appendIllustrationEvent(
    storyId,
    {
      kind: "scene_plan_generated",
      pageNumber,
      version: newPlan.version,
      withFeedback,
    },
    uid,
  );

  return runStage2Through4({
    storyId,
    pageNumber,
    uid,
    scenePlan: newPlan,
    visualBible,
    visualBibleVersion: vbv,
  });
}
