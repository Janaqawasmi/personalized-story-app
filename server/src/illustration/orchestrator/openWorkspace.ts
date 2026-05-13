import { firestore } from "@/config/firebase";
import type { IllustrationPage } from "@/illustration/types";
import {
  readLatestVisualBible,
  readScenePlan,
  readVisualBible,
  writeScenePlan,
  writeVisualBible,
} from "@/illustration/shared/artefact-store";
import { appendIllustrationEvent, appendIllustrationEvents } from "@/illustration/shared/history-events";
import { runScenePlanner } from "@/illustration/stage1-scene-planner";
import { runVisualDirector } from "@/illustration/stage1-visual-director";
import type { Story } from "@/models/story.model";
import { fillIllustrationV2DocDefaults } from "@/models/story.model";
import { COLLECTIONS } from "@/shared/firestore/paths";

export class IllegalStateOpenWorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalStateOpenWorkspaceError";
  }
}

export interface OpenWorkspaceResult {
  vbId: string;
  scenePlanIds: string[];
  skipped: boolean;
}

function composeManuscript(pages: NonNullable<Story["pages"]>): string {
  return [...pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");
}

function hydrateStory(
  storyId: string,
  data: Record<string, unknown> | undefined,
): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

export async function openWorkspace(params: {
  storyId: string;
  uid: string;
}): Promise<OpenWorkspaceResult> {
  const { storyId, uid } = params;
  const storyRef = firestore.collection(COLLECTIONS.STORIES).doc(storyId);
  const snap = await storyRef.get();
  if (!snap.exists) {
    throw new IllegalStateOpenWorkspaceError("Story not found");
  }
  const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);

  if (story.status === "illustration_workspace" || story.status === "illustration_ready") {
    const vbv = story.currentVisualBibleVersion;
    if (vbv === null) {
      throw new IllegalStateOpenWorkspaceError(
        "Story in workspace state but missing Visual Bible version",
      );
    }
    const vb = await readVisualBible(storyId, vbv);
    if (!vb) {
      throw new IllegalStateOpenWorkspaceError("Visual Bible artefact missing");
    }
    const scenePlanIds: string[] = [];
    const pages = story.illustrationPages ?? [];
    for (const row of pages) {
      const v = row.currentScenePlanVersion;
      if (v === null) continue;
      const sp = await readScenePlan(storyId, row.pageNumber, v);
      if (sp) scenePlanIds.push(sp.id);
    }
    return { vbId: vb.id, scenePlanIds, skipped: true };
  }

  if (story.status !== "approved") {
    throw new IllegalStateOpenWorkspaceError(
      `openWorkspace requires status approved (got ${story.status})`,
    );
  }

  if (!story.pages?.length) {
    throw new IllegalStateOpenWorkspaceError("Story has no manuscript pages");
  }

  const manuscriptText = composeManuscript(story.pages);
  const manuscriptPages = [...story.pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({ pageNumber: p.pageNumber, text: p.text }));

  let vb = await readLatestVisualBible(storyId);
  if (!vb) {
    vb = await runVisualDirector({ story, manuscriptText });
    await writeVisualBible(storyId, vb);
    await appendIllustrationEvent(
      storyId,
      { kind: "visual_bible_generated", version: vb.version, source: "llm" },
      uid,
    );
  }

  const scenePlans = await runScenePlanner({
    story,
    manuscriptPages,
    visualBible: vb,
  });

  for (const sp of scenePlans) {
    await writeScenePlan(storyId, sp);
    await appendIllustrationEvent(
      storyId,
      {
        kind: "scene_plan_generated",
        pageNumber: sp.pageNumber,
        version: sp.version,
        withFeedback: false,
      },
      uid,
    );
  }

  const illustrationPages: IllustrationPage[] = manuscriptPages.map((p) => {
    const sp = scenePlans.find((s) => s.pageNumber === p.pageNumber);
    return {
      pageNumber: p.pageNumber,
      text: p.text,
      currentScenePlanVersion: sp?.version ?? null,
      currentImageVersion: null,
      status: "plan_only",
      pendingJobId: null,
      lastError: null,
    };
  });

  const now = Date.now();
  await appendIllustrationEvents(storyId, [
    {
      byUid: uid,
      event: {
        kind: "status_changed",
        from: "approved",
        to: "illustration_workspace",
      },
    },
    { byUid: uid, event: { kind: "illustration_workspace_opened" } },
  ]);

  await storyRef.update({
    status: "illustration_workspace",
    currentVisualBibleVersion: vb.version,
    illustrationPages,
    illustrationWorkspaceOpenedAt: now,
    updatedAt: now,
  });

  return {
    vbId: vb.id,
    scenePlanIds: scenePlans.map((s) => s.id),
    skipped: false,
  };
}
