/**
 * In-memory cache for book reader page images so flips do not re-fetch from network.
 */

const loadedUrls = new Set<string>();
const inflight = new Map<string, Promise<boolean>>();

function normalizeUrl(url: string | undefined): string | undefined {
  const t = url?.trim();
  return t || undefined;
}

export function isReaderImageCached(url: string | undefined): boolean {
  const u = normalizeUrl(url);
  return u ? loadedUrls.has(u) : false;
}

export function preloadReaderImage(url: string | undefined): Promise<boolean> {
  const u = normalizeUrl(url);
  if (!u) return Promise.resolve(false);
  if (loadedUrls.has(u)) return Promise.resolve(true);

  const pending = inflight.get(u);
  if (pending) return pending;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      loadedUrls.add(u);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = u;
  }).finally(() => {
    inflight.delete(u);
  });

  inflight.set(u, promise);
  return promise;
}

/** Fire-and-forget preload for a list of candidate URLs. */
export function preloadReaderImages(urls: Array<string | undefined>): void {
  for (const url of urls) {
    void preloadReaderImage(url);
  }
}

/**
 * Returns the first candidate URL that is already cached, or loads candidates in order.
 */
export async function resolveReaderDisplayImage(
  candidates: Array<string | undefined>
): Promise<string | undefined> {
  const list = candidates.map(normalizeUrl).filter((u): u is string => !!u);
  const seen = new Set<string>();
  const unique = list.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  for (const url of unique) {
    if (loadedUrls.has(url)) return url;
  }

  for (const url of unique) {
    const ok = await preloadReaderImage(url);
    if (ok) return url;
  }

  return undefined;
}
