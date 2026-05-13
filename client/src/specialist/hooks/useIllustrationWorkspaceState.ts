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
import type { ImageArtefact, IllustrationJob } from "../../types/illustration";
import type { EditHistoryEntry, Story } from "../../types/story";
import { STORIES_COLLECTION } from "../../types/story";
import { normalizeStoryFromApi } from "../../utils/storyBriefFromApi";

const JOBS = "illustrationJobs";
const IMAGES = "images";

export type PageCardViewModel = {
  pageNumber: number;
  text: string;
  scenePlanVersion: number | null;
  imageVersion: number | null;
  imageUrl: string | null;
  subStatus: "plan_only" | "generating_image" | "awaiting_review" | "approved" | "needs_revision";
  lastError: string | null;
  pendingJobId: string | null;
  rejectionNote: string | null;
};

export type WorkspaceViewModel =
  | { kind: "loading" }
  | { kind: "cta" }
  | { kind: "pending"; jobId: string }
  | { kind: "running"; jobId: string; progressHint?: string }
  | {
      kind: "ready";
      visualBibleVersion: number;
      pages: PageCardViewModel[];
      allApproved: boolean;
      readOnly: boolean;
      imageGenHint?: string;
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

function latestImageByPage(images: ImageArtefact[]): Map<number, ImageArtefact> {
  const m = new Map<number, ImageArtefact>();
  for (const img of images) {
    const cur = m.get(img.pageNumber);
    if (!cur || img.version > cur.version) m.set(img.pageNumber, img);
  }
  return m;
}

function latestRejectionNoteForPage(images: ImageArtefact[], pageNumber: number): string | null {
  const candidates = images.filter(
    (i) => i.pageNumber === pageNumber && i.reviewStatus === "needs_revision",
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.version - a.version);
  const top = candidates[0];
  return top?.rejectionNote?.trim() ? top.rejectionNote : null;
}

function deriveSubStatus(
  row: NonNullable<Story["illustrationPages"]>[number],
  jobs: IllustrationJob[],
): PageCardViewModel["subStatus"] {
  const pendingJob = jobs.find((j) => j.id === row.pendingJobId);
  if (
    row.pendingJobId &&
    pendingJob &&
    pendingJob.type === "image_generation" &&
    (pendingJob.status === "pending" || pendingJob.status === "running")
  ) {
    return "generating_image";
  }
  return row.status;
}

function buildPageCards(
  illustrationPages: NonNullable<Story["illustrationPages"]>,
  jobs: IllustrationJob[],
  images: ImageArtefact[],
): PageCardViewModel[] {
  const byPage = latestImageByPage(images);
  return [...illustrationPages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((row) => {
      const latest = byPage.get(row.pageNumber);
      const imageUrl =
        latest &&
        row.currentImageVersion !== null &&
        latest.version === row.currentImageVersion &&
        (latest.reviewStatus === "awaiting_review" || latest.reviewStatus === "approved")
          ? latest.publicUrl
          : null;
      const imageVersion = row.currentImageVersion;
      const subStatus = deriveSubStatus(row, jobs);
      const rejectionNote =
        subStatus === "plan_only" || subStatus === "needs_revision"
          ? latestRejectionNoteForPage(images, row.pageNumber)
          : null;
      return {
        pageNumber: row.pageNumber,
        text: row.text,
        scenePlanVersion: row.currentScenePlanVersion,
        imageVersion,
        imageUrl,
        subStatus,
        lastError: row.lastError,
        pendingJobId: row.pendingJobId,
        rejectionNote,
      };
    });
}

export function useIllustrationWorkspaceState(storyId: string): WorkspaceViewModel {
  const [story, setStory] = useState<Story | null>(null);
  const [jobs, setJobs] = useState<IllustrationJob[]>([]);
  const [images, setImages] = useState<ImageArtefact[]>([]);

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
      limit(25),
    );
    const unsubJobs = onSnapshot(q, (snap) => {
      const list: IllustrationJob[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<IllustrationJob, "id">;
        list.push({ ...data, id: d.id });
      });
      setJobs(list);
    });

    const unsubImages = onSnapshot(
      collection(db, STORIES_COLLECTION, storyId, IMAGES),
      (snap) => {
        const list: ImageArtefact[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ImageArtefact);
        });
        setImages(list);
      },
    );

    return () => {
      unsubStory();
      unsubJobs();
      unsubImages();
    };
  }, [storyId]);

  return useMemo((): WorkspaceViewModel => {
    if (!story) return { kind: "loading" };

    if (story.status === "illustration_workspace" || story.status === "illustration_ready") {
      const pages = story.illustrationPages ?? [];
      const vbv = story.currentVisualBibleVersion;
      if (vbv === null) return { kind: "loading" };
      const readOnly = story.status === "illustration_ready";
      const cards = buildPageCards(pages, jobs, images);
      const allApproved = cards.length > 0 && cards.every((p) => p.subStatus === "approved");
      const runningImg = jobs.find(
        (j) => j.type === "image_generation" && j.status === "running",
      );
      const pendingImg = jobs.find(
        (j) => j.type === "image_generation" && j.status === "pending",
      );
      const imgJob = runningImg ?? pendingImg;
      const imageGenHint =
        imgJob && imgJob.pageNumber !== null && imgJob.pageNumber !== undefined
          ? `Generating illustration for page ${imgJob.pageNumber}…`
          : undefined;
      return {
        kind: "ready",
        visualBibleVersion: vbv,
        pages: cards,
        allApproved,
        readOnly,
        imageGenHint,
      };
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
  }, [story, jobs, images]);
}
