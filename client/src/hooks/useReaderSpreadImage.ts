import { useEffect, useMemo, useState } from "react";
import {
  isReaderImageCached,
  preloadReaderImages,
  resolveReaderDisplayImage,
} from "../utils/readerImageCache";

type SpreadImagePage = {
  pageNumber: number;
  imageUrl?: string;
  imageFallbackUrl?: string;
};

export function useReaderSpreadImage(
  page: SpreadImagePage,
  placeholderUrl: string
): string | undefined {
  const candidates = useMemo(() => {
    const urls = [page.imageUrl, page.imageFallbackUrl, placeholderUrl];
    const seen = new Set<string>();
    return urls.filter((u): u is string => {
      const t = u?.trim();
      if (!t || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }, [page.pageNumber, page.imageUrl, page.imageFallbackUrl, placeholderUrl]);

  const [displayUrl, setDisplayUrl] = useState<string | undefined>(() =>
    candidates.find((u) => isReaderImageCached(u))
  );

  useEffect(() => {
    preloadReaderImages(candidates);

    const cached = candidates.find((u) => isReaderImageCached(u));
    if (cached) {
      setDisplayUrl(cached);
      return;
    }

    let cancelled = false;
    void resolveReaderDisplayImage(candidates).then((url) => {
      if (!cancelled) setDisplayUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [page.pageNumber, candidates]);

  return displayUrl;
}
