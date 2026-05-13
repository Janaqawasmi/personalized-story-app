/**
 * BytePlus ModelArk Seedream `images/generations` accepts `size` as "WxH" pixels.
 * Supported presets (aspect → resolution):
 *
 * - 1:1   → 2048×2048
 * - 3:4   → 1728×2304
 * - 4:3   → 2304×1728
 * - 16:9  → 2848×1600
 * - 9:16  → 1600×2848
 * - 3:2   → 2496×1664
 * - 2:3   → 1664×2496
 * - 21:9  → 3136×1344
 */

export const SEEDREAM_SUPPORTED_PIXEL_SIZES = [
  "2048x2048",
  "1728x2304",
  "2304x1728",
  "2848x1600",
  "1600x2848",
  "2496x1664",
  "1664x2496",
  "3136x1344",
] as const;

export type SeedreamPixelSizeString = (typeof SEEDREAM_SUPPORTED_PIXEL_SIZES)[number];

const SUPPORTED_SET = new Set<string>(SEEDREAM_SUPPORTED_PIXEL_SIZES);

/** Portrait 3:4 — typical single-page children's book illustration. */
export const CHILDRENS_BOOK_PAGE_ILLUSTRATION = { width: 1728, height: 2304 } as const;

export function buildSeedreamSizeParam(params: {
  outputWidth?: number;
  outputHeight?: number;
}): string {
  const w = params.outputWidth;
  const h = params.outputHeight;
  if (typeof w !== "number" || typeof h !== "number" || !Number.isFinite(w) || !Number.isFinite(h)) {
    return `${CHILDRENS_BOOK_PAGE_ILLUSTRATION.width}x${CHILDRENS_BOOK_PAGE_ILLUSTRATION.height}`;
  }
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) {
    return `${CHILDRENS_BOOK_PAGE_ILLUSTRATION.width}x${CHILDRENS_BOOK_PAGE_ILLUSTRATION.height}`;
  }
  const key = `${rw}x${rh}`;
  if (SUPPORTED_SET.has(key)) {
    return key;
  }
  console.warn(
    `SeedreamProvider: size "${key}" is not a supported WxH preset; using ${CHILDRENS_BOOK_PAGE_ILLUSTRATION.width}x${CHILDRENS_BOOK_PAGE_ILLUSTRATION.height}.`,
  );
  return `${CHILDRENS_BOOK_PAGE_ILLUSTRATION.width}x${CHILDRENS_BOOK_PAGE_ILLUSTRATION.height}`;
}
