import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../firebase";
import type { PreviewReaderOverride } from "./storyPersonalization";

export type { PreviewReaderOverride };

/** Avoid repeated getDownloadURL calls on every Firestore snapshot. */
const storageDownloadUrlByPath = new Map<string, string>();

async function resolveStorageDownloadUrl(path: string | null | undefined): Promise<string | undefined> {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  const cached = storageDownloadUrlByPath.get(trimmed);
  if (cached) return cached;
  try {
    const url = await getDownloadURL(ref(storage, trimmed));
    storageDownloadUrlByPath.set(trimmed, url);
    return url;
  } catch (err) {
    console.warn("[reader] Could not resolve preview image:", err);
    return undefined;
  }
}

export async function previewOverridesFromDocData(
  data: Record<string, unknown> | undefined,
  ownerUid: string,
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

/**
 * Loads preview manuscript + illustration overrides via Firestore only.
 * (Matches security rules; avoids repeat caregiver-only REST calls in the reader.)
 */
export async function loadPreviewReaderOverrides(
  previewId: string,
  ownerUid: string,
): Promise<PreviewReaderOverride[]> {
  try {
    const snap = await getDoc(doc(db, "storyPreviews", previewId));
    if (!snap.exists()) return [];
    return previewOverridesFromDocData(snap.data(), ownerUid);
  } catch (err) {
    console.warn("[reader] Firestore preview load failed:", err);
    return [];
  }
}
