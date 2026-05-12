/**
 * Shared layout tokens for story catalog grids.
 * Import these instead of duplicating storyGridSx in every page.
 */
import type { SxProps, Theme } from "@mui/material";

/** Standard 4-column responsive grid used on AllBooks / topic / category / age results. */
export const storyCatalogGridSx: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(4, 1fr)",
  },
  gap: 2.5,
};

/** Search + favorites: max 3 columns, wider gap. */
export const storyCatalogGridLooseSx: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "1fr 1fr",
    md: "repeat(3, 1fr)",
  },
  gap: 4,
};

/** Shared page header title style (Playfair, used on AllBooks / Results pages). */
export const catalogPageHeaderTitleSx: SxProps<Theme> = {
  fontFamily: "'Playfair Display', serif",
  fontSize: { xs: "24px", md: "28px" },
  fontWeight: 600,
  color: "#1a1a1a",
  mb: 0.5,
};

/** Small story-count badge (pink pill). */
export const catalogCountBadgeSx: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "20px",
  backgroundColor: "#f5ece9",
  color: "#824D5C",
  fontSize: "12px",
  fontWeight: 600,
};

/** Breadcrumb row used on category / topic / age results pages. */
export const catalogBreadcrumbSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  mb: 1.5,
  fontSize: "13px",
  color: "#888888",
  flexWrap: "wrap",
};
