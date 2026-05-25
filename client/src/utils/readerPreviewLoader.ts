import { doc, getDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import type { PreviewReaderOverride } from "./storyPersonalization";

export type { PreviewReaderOverride };

/** Avoid repeated getDownloadURL calls on every Firestore snapshot. */
const storageDownloadUrlByPath = new Map<string, string>();

async function resolveStorageDownloadUrl(path: string): Promise<string | undefined> {
  const cached = storageDownloadUrlByPath.get(path);
  if (cached) return cached;
  try {
    const url = await getDownloadURL(ref(storage, path));
    storageDownloadUrlByPath.set(path, url);
    return url;
  } catch {
    return undefined;
  }
}

export async function loadPreviewReaderOverrides(
  previewId: string,
  ownerUid: string
): Promise<PreviewReaderOverride[]> {
  try {
    const snap = await getDoc(doc(db, "storyPreviews", previewId));
    if (!snap.exists()) return [];
    return previewOverridesFromDocData(snap.data(), ownerUid);
  } catch {
    return [];
  }
}

export async function previewOverridesFromDocData(
  data: Record<string, unknown> | undefined,
  ownerUid: string
): Promise<PreviewReaderOverride[]> {
  if (!data || data.caregiverUid !== ownerUid) return [];
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const overrides: PreviewReaderOverride[] = [];

  for (const p of pages) {
    if (!p || typeof p !== "object") continue;
    const page = p as Record<string, unknown>;
    const pageNumber = typeof page.pageNumber === "number" ? page.pageNumber : 0;
    const override: PreviewReaderOverride = { pageNumber };

    if (typeof page.personalizedText === "string" && page.personalizedText.trim()) {
      override.personalizedText = page.personalizedText.trim();
    }

    if (typeof page.generatedImagePath === "string" && page.generatedImagePath) {
      const url = await resolveStorageDownloadUrl(page.generatedImagePath);
      if (url) override.imageUrl = url;
    }
    overrides.push(override);
  }

  return overrides;
}
