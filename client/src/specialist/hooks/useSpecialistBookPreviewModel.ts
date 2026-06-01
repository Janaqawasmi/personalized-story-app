import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  buildSpecialistBookPreviewModel,
  type BookPreviewImagePolicy,
} from "../../components/book/storyToReaderModel";
import type { BookReaderModel } from "../../components/book/BookReaderModel";
import type { ImageArtefact } from "../../types/illustration";
import type { Story } from "../../types/story";
import { STORIES_COLLECTION } from "../../types/story";

const ILLUSTRATION_STATUSES = new Set<Story["status"]>([
  "illustration_workspace",
  "illustration_ready",
  "published",
]);

function imagePolicyForStory(story: Story): BookPreviewImagePolicy {
  return ILLUSTRATION_STATUSES.has(story.status) ? "latest" : "none";
}

/** Live book preview model for workspace header and shared specialist UI. */
export function useSpecialistBookPreviewModel(story: Story | null): BookReaderModel | null {
  const [images, setImages] = useState<ImageArtefact[]>([]);
  const subscribeImages = !!story?.id && ILLUSTRATION_STATUSES.has(story.status);

  useEffect(() => {
    if (!subscribeImages || !story?.id) {
      setImages([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, STORIES_COLLECTION, story.id, "images"),
      (snap) => {
        const list: ImageArtefact[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ImageArtefact);
        });
        setImages(list);
      },
      () => {
        setImages([]);
      },
    );
    return unsub;
  }, [story?.id, subscribeImages]);

  return useMemo(() => {
    if (!story) return null;
    return buildSpecialistBookPreviewModel(story, images, {
      imagePolicy: imagePolicyForStory(story),
    });
  }, [story, images]);
}
