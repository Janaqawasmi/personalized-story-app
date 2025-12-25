// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const COLORS = {
  // Brand colors
  primary: "#617891",     // Blue (main brand color)
  secondary: "#824D5C",   // Rose accent

  // Backgrounds
  background: "#E5DFD9",  // Frost / page background
  surface: "#FFFFFF",    // Cards, panels
  beige: "#FAF4E8",      // Light beige (MeaningfulStepsSection)
  beigeLight: "#F5F1EC", // Light beige (LoginPage)
  beigeLighter: "#EBE5DC", // Lighter beige (hover states)
  grayLight: "#f5f5f5",  // Light gray (Footer)

  // Text
  textPrimary: "#000000",
  textSecondary: "#4A4A4A",
  textDark: "#111827",   // Dark gray text
  textMedium: "#374151", // Medium gray text

  // UI
  border: "#D0C8C0",
  darkGreen: "#1F4F46",  // Dark green (icon circles in MeaningfulStepsSection)
  iconCircleBg: "#1F4F46", // Icon circle background (can change this to any color)
  iconCircleText: "#FFFFFF", // Icon circle text color
  darkButton: "#1C1C1C", // Dark button background

  // Overlays & Opacity
  overlay: "rgba(0,0,0,0.35)",
  borderLight: "rgba(0,0,0,0.08)",
  hoverBg: "rgba(0,0,0,0.04)",
  activeBg: "rgba(17,24,39,0.08)",
  mutedBg: "rgba(0,0,0,0.03)",
  textMuted: "rgba(17,24,39,0.65)",
  textMutedLight: "rgba(17,24,39,0.55)",
  textMutedMedium: "rgba(0,0,0,0.7)",
  textMutedSecondary: "rgba(0,0,0,0.6)",

  // Category colors
  categoryEmotional: "#E6F4F1",
  categoryFamily: "#F3EFEA",
  categorySocial: "#EEF2F8",
  categoryEducational: "#F6F3FF",

  // External brand colors
  googleBlue: "#4285F4",

  // States
  success: "#4CAF50",
  error: "#E53935",
};

const theme = createTheme({
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
    error: {
      main: COLORS.error,
    },
    success: {
      main: COLORS.success,
    },
  },

  typography: {
    fontFamily: `"Tajawal", "Alef", "Roboto", sans-serif`,
    h1: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 12,
  },
});

export default theme;
