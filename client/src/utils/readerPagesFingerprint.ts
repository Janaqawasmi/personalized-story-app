import type { ReaderPageBuilt } from "./storyPersonalization";

type FingerprintPage = {
  pageNumber: number;
  textTemplate: string;
  imageUrl?: string;
  imageFallbackUrl?: string;
};

export function readerPagesFingerprint(pages: FingerprintPage[] | ReaderPageBuilt[]): string {
  return pages
    .map(
      (p) =>
        `${p.pageNumber}\u001f${p.textTemplate}\u001f${p.imageUrl ?? ""}\u001f${p.imageFallbackUrl ?? ""}`
    )
    .join("\u001e");
}

export function collectReaderImageUrls(
  pages: Array<{ pageNumber: number; imageUrl?: string; imageFallbackUrl?: string }>
): string[] {
  const urls: string[] = [];
  for (const p of pages) {
    if (p.imageUrl?.trim()) urls.push(p.imageUrl.trim());
    if (p.imageFallbackUrl?.trim()) urls.push(p.imageFallbackUrl.trim());
    urls.push(`/story-images/placeholders/${p.pageNumber}.jpg`);
  }
  return urls;
}
