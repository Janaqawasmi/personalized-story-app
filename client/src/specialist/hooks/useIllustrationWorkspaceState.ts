import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { IllustrationJob } from "../../types/illustration";
import type { EditHistoryEntry, Story } from "../../types/story";
import { STORIES_COLLECTION } from "../../types/story";
import { normalizeStoryFromApi } from "../../utils/storyBriefFromApi";

const JOBS = "illustrationJobs";

export type WorkspaceViewModel =
  | { kind: "loading" }
  | { kind: "cta" }
  | { kind: "pending"; jobId: string }
  | { kind: "running"; jobId: string; progressHint?: string }
  | {
      kind: "ready";
      visualBibleVersion: number;
      pages: NonNullable<Story["illustrationPages"]>;
    }
  | { kind: "failed"; jobId: string; error: string };

function tailProgressHint(
  history: EditHistoryEntry[],
  pageCount: number,
): string | undefined {
  let lastVb = -1;
  for (let i = 0; i < history.length; i += 1) {
    if (history[i].event.kind === "visual_bible_generated") lastVb = i;
  }
  if (lastVb < 0) return "Generating Visual Bible…";
  let sceneCount = 0;
  for (let i = lastVb + 1; i < history.length; i += 1) {
    if (history[i].event.kind === "scene_plan_generated") sceneCount += 1;
  }
  if (pageCount > 0) {
    return `Generating Scene Plans (${Math.min(sceneCount, pageCount)} of ${pageCount})…`;
  }
  return "Generating Scene Plans…";
}

export function useIllustrationWorkspaceState(storyId: string): WorkspaceViewModel {
  const [story, setStory] = useState<Story | null>(null);
  const [jobs, setJobs] = useState<IllustrationJob[]>([]);

  useEffect(() => {
    const unsubStory = onSnapshot(doc(db, STORIES_COLLECTION, storyId), (snap) => {
      if (!snap.exists()) {
        setStory(null);
        return;
      }
      const raw = { id: storyId, ...snap.data() } as Story;
      const withDefaults: Story = {
        ...raw,
        illustrationPages: raw.illustrationPages ?? null,
        currentVisualBibleVersion: raw.currentVisualBibleVersion ?? null,
        illustrationWorkspaceOpenedAt: raw.illustrationWorkspaceOpenedAt ?? null,
      };
      setStory(normalizeStoryFromApi(withDefaults));
    });

    const q = query(
      collection(db, STORIES_COLLECTION, storyId, JOBS),
      orderBy("enqueuedAt", "desc"),
      limit(15),
    );
    const unsubJobs = onSnapshot(q, (snap) => {
      const list: IllustrationJob[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<IllustrationJob, "id">;
        list.push({ ...data, id: d.id });
      });
      setJobs(list);
    });

    return () => {
      unsubStory();
      unsubJobs();
    };
  }, [storyId]);

  return useMemo((): WorkspaceViewModel => {
    if (!story) return { kind: "loading" };

    if (story.status === "illustration_workspace") {
      const pages = story.illustrationPages ?? [];
      const vbv = story.currentVisualBibleVersion;
      if (vbv === null) return { kind: "loading" };
      return { kind: "ready", visualBibleVersion: vbv, pages };
    }

    if (story.status !== "approved") {
      return { kind: "loading" };
    }

    const pageCount = story.pages?.length ?? 0;
    const wsJobs = jobs.filter((j) => j.type === "workspace_open");
    const latest = wsJobs[0];
    if (!latest) return { kind: "cta" };

    if (latest.status === "pending") {
      return { kind: "pending", jobId: latest.id };
    }
    if (latest.status === "running") {
      return {
        kind: "running",
        jobId: latest.id,
        progressHint: tailProgressHint(story.editHistory, pageCount),
      };
    }
    if (latest.status === "failed") {
      return { kind: "failed", jobId: latest.id, error: latest.error ?? "Unknown error" };
    }

    if (latest.status === "succeeded") {
      return { kind: "loading" };
    }

    return { kind: "cta" };
  }, [story, jobs]);
}
