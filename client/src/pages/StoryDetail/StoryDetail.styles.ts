// Design tokens — Story Detail v2 (radii, shadows, decorative cover gradient)
import { COLORS } from "../../theme";

/** RGBA from COLORS.* only (no stray hex in components). */
export function colorWithAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Decorative only — not a UI semantic token. */
export const COVER_PLACEHOLDER_GRADIENT =
  "linear-gradient(135deg, #1a1040 0%, #2d1b69 30%, #0f2847 70%, #0a1628 100%)";

export const SDGradients = {
  coverBg: COVER_PLACEHOLDER_GRADIENT,
};

export const SDRadii = {
  chip: "24px",
  card: "16px",
  cover: "20px",
  cta: "14px",
  trustBadge: "12px",
  faqItem: "14px",
  featIcon: "8px",
  spreadCard: "20px",
  previewBanner: "20px",
  bridgeCta: "16px",
  spreadNav: "10px",
  viewBtn: "10px",
};

export const SDShadows = {
  cover: `0 20px 60px ${colorWithAlpha(COLORS.primary, 0.25)}`,
  trustBadge: `0 4px 16px ${colorWithAlpha(COLORS.textPrimary, 0.08)}`,
  ctaHover: `0 8px 32px ${colorWithAlpha(COLORS.primary, 0.35)}`,
  spreadHover: `0 12px 40px ${colorWithAlpha(COLORS.textPrimary, 0.08)}`,
  catalogCard: `0 16px 40px ${colorWithAlpha(COLORS.primary, 0.12)}`,
};
