import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../firebase";
import type { PreviewReaderOverride } from "./storyPersonalization";

type PreviewDocPage = {
  pageNumber: number;
  personalizedText?: string;
  generatedImagePath?: string | null;
};

async function resolveGeneratedImageUrl(path: string | null | undefined): Promise<string | undefined> {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  try {
    return await getDownloadURL(ref(storage, trimmed));
  } catch (err) {
    console.warn("[reader] Could not resolve preview image:", err);
    return undefined;
  }
}

async function overridesFromPreviewPages(
  pages: PreviewDocPage[],
): Promise<PreviewReaderOverride[]> {
  const overrides: PreviewReaderOverride[] = [];
  for (const p of pages) {
    const imageUrl = await resolveGeneratedImageUrl(p.generatedImagePath);
    overrides.push({
      pageNumber: p.pageNumber,
      personalizedText: p.personalizedText,
      imageUrl,
    });
  }
  return overrides;
}

export async function previewOverridesFromDocData(
  data: { caregiverUid?: string; pages?: PreviewDocPage[] },
  ownerUid: string,
): Promise<PreviewReaderOverride[]> {
  if (data.caregiverUid !== ownerUid) return [];
  return overridesFromPreviewPages(data.pages ?? []);
}

async function loadFromFirestore(
  previewId: string,
  ownerUid: string,
): Promise<PreviewReaderOverride[]> {
  const snap = await getDoc(doc(db, "storyPreviews", previewId));
  if (!snap.exists()) {
    return [];
  }

  const data = snap.data();
  return previewOverridesFromDocData(
    { caregiverUid: data.caregiverUid as string, pages: data.pages as PreviewDocPage[] },
    ownerUid,
  );
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
    return await loadFromFirestore(previewId, ownerUid);
  } catch (err) {
    console.warn("[reader] Firestore preview load failed:", err);
    return [];
  }
}
