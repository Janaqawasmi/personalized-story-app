import { admin, firestore } from "@/config/firebase";
import type { EditHistoryEvent } from "@/models/story.model";
import { COLLECTIONS } from "@/shared/firestore/paths";

export async function appendIllustrationEvent(
  storyId: string,
  event: EditHistoryEvent,
  byUid: string,
): Promise<void> {
  const now = Date.now();
  const entry = {
    id: crypto.randomUUID(),
    at: now,
    byUid,
    event,
  };
  await firestore
    .collection(COLLECTIONS.STORIES)
    .doc(storyId)
    .update({
      editHistory: admin.firestore.FieldValue.arrayUnion(entry),
      updatedAt: now,
    });
}

export async function appendIllustrationEvents(
  storyId: string,
  events: { event: EditHistoryEvent; byUid: string }[],
): Promise<void> {
  if (events.length === 0) return;
  const now = Date.now();
  const entries = events.map(({ event, byUid }) => ({
    id: crypto.randomUUID(),
    at: now,
    byUid,
    event,
  }));
  await firestore
    .collection(COLLECTIONS.STORIES)
    .doc(storyId)
    .update({
      editHistory: admin.firestore.FieldValue.arrayUnion(...entries),
      updatedAt: now,
    });
}
