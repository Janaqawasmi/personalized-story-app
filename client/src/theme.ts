// src/theme.ts
import { createTheme, Theme } from "@mui/material/styles";
import type { Direction } from "./i18n/context/LanguageContext";

export const DESIGN_TOKENS = {
  fontDisplay: "'Cormorant Garamond', serif",
  fontBody: "'DM Sans', sans-serif",

  ink: "#1c1118",
  ink2: "#5a4a52",
  ink3: "#9a8a92",
  rose: "#824D5C",
  rose2: "#B07A8A",
  rose3: "#d4a8b4",
  rosebg: "#fdf0f3",
  gold: "#c4965a",
  cream: "#f8f4ef",
  parchment: "#efe8df",
  border: "#ddd4ca",
  night: "#170d1e",
  night2: "#2a1a35",
  night3: "#3d2548",

  springBounce: "cubic-bezier(0.34, 1.26, 0.64, 1)",
  easeStd: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const COLORS = {
  // Brand colors
  primary: "#617891",     // Blue (main brand color)
  secondary: "#824D5C",   // Rose accent

  // Backgrounds
  background: "#E5DFD9",  // Frost / page background
  surface: "#FFFFFF",    // Cards, panels

  // Text
  textPrimary: "#000000",
  textSecondary: "#4A4A4A",

  // UI
  border: "#D0C8C0",

  // States
  success: "#4CAF50",
  warning: "#ED9B40",
  error: "#E53935",
};

export function createAppTheme(direction: Direction = "rtl"): Theme {
  return createTheme({
    direction,
    palette: {
      primary: {
        main: COLORS.primary,
      },
      secondary: {
        main: COLORS.secondary,
      },
      background: {
        default: COLORS.background,
        paper: COLORS.surface,
      },
      text: {
        primary: COLORS.textPrimary,
        secondary: COLORS.textSecondary,
      },
      divider: COLORS.border,
      error: {
        main: COLORS.error,
      },
      success: {
        main: COLORS.success,
      },
      warning: {
        main: COLORS.warning,
      },
    },

    typography: {
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      h1: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 },
      h2: { fontFamily: "'Playfair Display', Georgia, serif" },
      h3: { fontFamily: "'Playfair Display', Georgia, serif" },
      h4: { fontFamily: "'Playfair Display', Georgia, serif" },
      h5: { fontFamily: "'Playfair Display', Georgia, serif" },
      h6: { fontFamily: "'Playfair Display', Georgia, serif" },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },

    shape: {
      borderRadius: 12,
    },
  });
}

// Default theme for backward compatibility (RTL)
const theme = createAppTheme("rtl");

export default theme;
