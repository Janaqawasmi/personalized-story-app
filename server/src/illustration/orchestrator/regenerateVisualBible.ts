import { firestore } from "@/config/firebase";
import { readVisualBible, writeVisualBible } from "@/illustration/shared/artefact-store";
import { appendIllustrationEvent } from "@/illustration/shared/history-events";
import { runVisualDirector } from "@/illustration/stage1-visual-director";
import { assertJobNotCancelled } from "@/illustration/worker/cancellation";
import { fillIllustrationV2DocDefaults, STORIES_COLLECTION, type Story } from "@/models/story.model";
import type { DocumentReference } from "firebase-admin/firestore";
import { IllegalStateGenerateImageError } from "./generateImage";

function composeManuscript(pages: NonNullable<Story["pages"]>): string {
  return [...pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");
}

function hydrateStory(storyId: string, data: Record<string, unknown> | undefined): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

export async function regenerateVisualBible(params: {
  storyId: string;
  uid: string;
  jobRef?: DocumentReference;
}): Promise<{ vbId: string; version: number }> {
  const { storyId, uid, jobRef } = params;
  const storyRef = firestore.collection(STORIES_COLLECTION).doc(storyId);
  const snap = await storyRef.get();
  if (!snap.exists) {
    throw new IllegalStateGenerateImageError("Story not found");
  }
  const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);
  if (story.status !== "illustration_workspace") {
    throw new IllegalStateGenerateImageError(
      `regenerateVisualBible requires illustration_workspace (got ${story.status})`,
    );
  }
  if (!story.pages?.length) {
    throw new IllegalStateGenerateImageError("Story has no manuscript pages");
  }
  const prevV = story.currentVisualBibleVersion;
  if (prevV === null) {
    throw new IllegalStateGenerateImageError("Missing Visual Bible version");
  }
  const existing = await readVisualBible(storyId, prevV);
  if (!existing) {
    throw new IllegalStateGenerateImageError("Visual Bible artefact missing");
  }

  const manuscriptText = composeManuscript(story.pages);
  const vbRaw = await runVisualDirector({ story, manuscriptText });
  if (jobRef) await assertJobNotCancelled(jobRef);
  const vb = { ...vbRaw, parentVersion: prevV };

  await writeVisualBible(storyId, vb);
  const now = Date.now();
  await storyRef.update({
    currentVisualBibleVersion: vb.version,
    updatedAt: now,
  });
  await appendIllustrationEvent(
    storyId,
    { kind: "visual_bible_regenerated", version: vb.version },
    uid,
  );

  return { vbId: vb.id, version: vb.version };
}
