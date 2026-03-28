import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";

function logFirestoreError(prefix: string, err: unknown) {
  const e = err as any;
  console.error(prefix, {
    name: e?.name,
    code: e?.code,
    message: e?.message,
    stack: e?.stack,
    raw: err,
  });
}

export type FavoriteStory = {
  storyId: string;
  title?: string | null;
  coverImage?: string | null;
  category?: string | null;
  topic?: string | null;
  ageGroup?: string | null;
  addedAt?: unknown;
};

function favoriteDocRef(uid: string, storyId: string) {
  return doc(db, "caregivers", uid, "favorites", storyId);
}

export async function getIsFavorite(uid: string, storyId: string): Promise<boolean> {
  const ref = favoriteDocRef(uid, storyId);
  console.log("[favorites.getIsFavorite] read:", { uid, storyId, path: ref.path });
  try {
    const snap = await getDoc(ref);
    console.log("[favorites.getIsFavorite] exists:", snap.exists());
    return snap.exists();
  } catch (err) {
    logFirestoreError("[favorites.getIsFavorite] FAILED", err);
    throw err;
  }
}

export async function toggleFavorite(
  uid: string,
  favorite: Omit<FavoriteStory, "addedAt">
): Promise<{ isFavorite: boolean }> {
  if (!uid) throw new Error("toggleFavorite: uid is required");
  if (!favorite?.storyId) throw new Error("toggleFavorite: favorite.storyId is required");

  const ref = favoriteDocRef(uid, favorite.storyId);
  console.log("[favorites.toggleFavorite] start:", {
    uid,
    storyId: favorite.storyId,
    title: favorite.title,
    path: ref.path,
  });

  let existing;
  try {
    existing = await getDoc(ref);
    console.log("[favorites.toggleFavorite] existing?", { exists: existing.exists() });
  } catch (err) {
    logFirestoreError("[favorites.toggleFavorite] getDoc FAILED", err);
    throw err;
  }

  if (existing.exists()) {
    try {
      console.log("[favorites.toggleFavorite] deleting:", { path: ref.path });
      await deleteDoc(ref);
      console.log("[favorites.toggleFavorite] delete success:", { path: ref.path });
      return { isFavorite: false };
    } catch (err) {
      logFirestoreError("[favorites.toggleFavorite] deleteDoc FAILED", err);
      throw err;
    }
  }

  try {
    console.log("[favorites.toggleFavorite] creating:", { path: ref.path });
    await setDoc(
      ref,
      {
        ...favorite,
        addedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("[favorites.toggleFavorite] setDoc success:", { path: ref.path });
    return { isFavorite: true };
  } catch (err) {
    logFirestoreError("[favorites.toggleFavorite] setDoc FAILED", err);
    throw err;
  }
}

export async function listFavorites(uid: string): Promise<FavoriteStory[]> {
  const q = query(
    collection(db, "caregivers", uid, "favorites"),
    orderBy("addedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DocumentData as FavoriteStory);
}

